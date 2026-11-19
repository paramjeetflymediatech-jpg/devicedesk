/*
 * ============================================================================
 *  FLY MEDIA TECHNOLOGY — ESP32 + R307 BIOMETRIC ATTENDANCE TERMINAL
 * ============================================================================
 *  Hardware Wiring (ESP32 DevKit V1 / ESP32 Dev Module):
 *    - R307 Fingerprint Sensor:
 *        VCC -> VIN (5V) [Verify your R307 module voltage label]
 *        GND -> GND
 *        TX  -> GPIO 16 (RX2)
 *        RX  -> GPIO 17 (TX2)
 *    - 0.96" SSD1306 OLED Display (I2C, 128x64):
 *        VCC -> 3V3
 *        GND -> GND
 *        SCL -> GPIO 22
 *        SDA -> GPIO 21
 *    - 5mm RGB LED (Common Anode - Longest leg to 3V3, 220 ohm on R/G/B):
 *        Red   -> GPIO 25
 *        Green -> GPIO 26
 *        Blue  -> GPIO 33
 *      LED COLOR BEHAVIOR:
 *        WHITE   (R+G+B) -> Sensor IDLE / Ready, waiting for finger
 *        BLUE    (B)     -> Fingerprint scan in progress (finger placed)
 *        MAGENTA (R+B)   -> Fingerprint ENROLLMENT in progress (Step 1 & 2)
 *        GREEN   (G)     -> SUCCESS (Verification OK / Enroll OK)
 *        RED     (R)     -> FAIL (Unrecognized finger / Enroll error)
 *    - Passive / Active Buzzer:
 *        VCC -> 3V3 (or 5V)
 *        GND -> GND
 *        I/O -> GPIO 27 (2.8 kHz PWM tone for crisp sound on passive buzzers)
 *
 *  Required Arduino Libraries (Install via Library Manager):
 *    1. Adafruit Fingerprint Sensor Library
 *    2. Adafruit SSD1306
 *    3. Adafruit GFX Library
 *
 *  Serial Monitor Commands (115200 baud, Newline):
 *    ENROLL <slot>   -> Enroll a new fingerprint into slot 1..1000 (e.g. ENROLL 2)
 *    DELETE <slot>   -> Delete a fingerprint from slot 1..1000 (e.g. DELETE 2)
 *    CLEAR           -> Erase all fingerprints from sensor memory
 *    STATUS          -> Print Wi-Fi, sensor count, and offline queue status
 *    TEST            -> Ping backend server heartbeat immediately
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_Fingerprint.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ===================== 1. USER CONFIGURATION =====================
// Multi-Wi-Fi List (2.4 GHz networks). ESP32 automatically connects to
// whichever saved Wi-Fi has the STRONGEST / CLOSEST signal!
struct WifiCred {
  const char* ssid;
  const char* password;
};

const WifiCred WIFI_NETWORKS[] = {
  { "CONNECT FIRST LAB",   "flymedia@23"  },
  { "Flymedia Lab 5G",     "flymedia@24"  },
  { "Airtel_2nd floor",    "Flymedia@123" },
  { "Airtel Flymedia Lab", "flymedia@22"  },
  { "Airtel_Fly media 20", "Air900555"    },
};
const int WIFI_NETWORK_COUNT = sizeof(WIFI_NETWORKS) / sizeof(WIFI_NETWORKS[0]);

// Smart Roaming: If current Wi-Fi drops weaker than -82 dBm while walking around,
// ESP32 automatically scans and switches if another saved Wi-Fi is stronger!
const int ROAM_RSSI_THRESHOLD = -82;

// Backend API Base URLs:
// Primary (Fastest on same LAN): Host PC LAN IP on Port 5000
const char* API_BASE_URL       = "http://192.168.1.72:5000/api/biometric";
// Auto-Fallback (If Wi-Fi is on a different subnet/router): Live Cloudflare HTTPS URL
const char* CLOUD_API_BASE_URL = "https://tray-colorado-substitute-chances.trycloudflare.com/api/biometric";
bool useCloudFallback          = false;

// Device Identity & Secret Key (Must match biometric_devices table on server)
const char* DEVICE_ID     = "DEVICE001";
const char* DEVICE_KEY    = "flymedia_esp32_key_2026";

// ===================== 2. PIN DEFINITIONS ========================
#define FP_RX_PIN        16   // Connect to R307 TX
#define FP_TX_PIN        17   // Connect to R307 RX

#define OLED_SDA_PIN     21
#define OLED_SCL_PIN     22
#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT    64
#define OLED_I2C_ADDR    0x3C

// 5mm Common Anode RGB LED (LOW = ON, HIGH = OFF)
#define RGB_RED_PIN      25
#define RGB_GREEN_PIN    26
#define RGB_BLUE_PIN     33
#define RGB_COMMON_ANODE true

// Buzzer Configuration:
// Set BUZZER_IS_PASSIVE = true for Passive Buzzer (uses PWM frequency),
// or false for Active Buzzer (uses direct digital HIGH/LOW).
#define BUZZER_PIN          27
#define BUZZER_IS_PASSIVE   true
#define BUZZER_ACTIVE_HIGH  true
#define BUZZER_DEFAULT_FREQ 2800  // 2.8 kHz resonant frequency for crisp, loud beep

// ===================== 3. TIMING & SECURITY ======================
const unsigned long LOCAL_SCAN_COOLDOWN_MS = 3000;   // 3s debounce on device
const unsigned long HEARTBEAT_INTERVAL_MS  = 5000;   // Live Wi-Fi status ping every 5s!
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;  // Retry Wi-Fi every 10s
const int MAX_FAILED_STRIKES               = 3;      // Lockout after 3 bad scans
const unsigned long LOCKOUT_DURATION_MS    = 10000;  // 10s lockout

// ===================== 4. HARDWARE OBJECTS =======================
HardwareSerial fpSerial(2);
Adafruit_Fingerprint finger(&fpSerial);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Preferences prefs;
WiFiMulti wifiMulti;
bool wifiMultiInitialized = false;
int weakSignalCount       = 0;

bool oledReady            = false;
bool sensorReady          = false;
uint16_t storedTemplates  = 0;
uint32_t bootCount        = 0;
uint32_t eventSeq         = 0;
String currentLine1       = "Booting...";
String currentLine2       = "Initializing";

unsigned long lastScanMs      = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long lastWifiRetryMs = 0;
int failedStrikes             = 0;
unsigned long lockoutUntilMs  = 0;

// ===================== 5. FEEDBACK HELPERS =======================
void setRGB(bool r, bool g, bool b) {
  if (RGB_COMMON_ANODE) {
    digitalWrite(RGB_RED_PIN,   r ? LOW : HIGH);
    digitalWrite(RGB_GREEN_PIN, g ? LOW : HIGH);
    digitalWrite(RGB_BLUE_PIN,  b ? LOW : HIGH);
  } else {
    digitalWrite(RGB_RED_PIN,   r ? HIGH : LOW);
    digitalWrite(RGB_GREEN_PIN, g ? HIGH : LOW);
    digitalWrite(RGB_BLUE_PIN,  b ? HIGH : LOW);
  }
}

// ================= RGB LED STATUS COLOR HELPERS ==================
// - WHITE   : Sensor IDLE / Ready, waiting for finger
// - BLUE    : Fingerprint scanning / capturing image
// - MAGENTA : Fingerprint enrollment in progress (Step 1 & Step 2)
// - GREEN   : Verification Success OR Enrollment Success
// - RED     : Verification Fail (Unrecognized) OR Enrollment Fail
void ledIdle()      { setRGB(true,  true,  true);  } // WHITE (Idle/Ready)
void ledScanning()  { setRGB(false, false, true);  } // BLUE (Scanning)
void ledEnrolling() { setRGB(true,  false, true);  } // MAGENTA (Enrolling)
void ledSuccess()   { setRGB(false, true,  false); } // GREEN (Success)
void ledFail()      { setRGB(true,  false, false); } // RED (Fail/Error)
void ledOff()       { setRGB(false, false, false); } // OFF

void playToneRaw(int freq, int durationMs) {
  #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    ledcAttach(BUZZER_PIN, freq, 8);
    ledcWriteTone(BUZZER_PIN, freq);
    delay(durationMs);
    ledcWriteTone(BUZZER_PIN, 0);
    ledcDetach(BUZZER_PIN);
  #else
    // ESP32 core 2.x
    ledcSetup(7, freq, 8);
    ledcAttachPin(BUZZER_PIN, 7);
    ledcWriteTone(7, freq);
    delay(durationMs);
    ledcWriteTone(7, 0);
    ledcDetachPin(BUZZER_PIN);
  #endif
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

void beep(int durationMs, int count = 1, int gapMs = 80, int freq = BUZZER_DEFAULT_FREQ) {
  for (int i = 0; i < count; i++) {
    if (BUZZER_IS_PASSIVE) {
      playToneRaw(freq, durationMs);
    } else {
      digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_HIGH ? HIGH : LOW);
      delay(durationMs);
      digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
    }
    if (i < count - 1) delay(gapMs);
  }
}

void runHardwareTest() {
  Serial.println("\n================ HARDWARE DIAGNOSTIC TEST ================");
  Serial.println("[LED TEST 1] Testing Common Anode mode (Longest leg on 3V3, pin=LOW):");
  digitalWrite(RGB_RED_PIN, HIGH); digitalWrite(RGB_GREEN_PIN, HIGH); digitalWrite(RGB_BLUE_PIN, HIGH);
  Serial.println("  -> RED (G25 = LOW)");
  digitalWrite(RGB_RED_PIN, LOW); delay(800); digitalWrite(RGB_RED_PIN, HIGH);
  Serial.println("  -> GREEN (G26 = LOW)");
  digitalWrite(RGB_GREEN_PIN, LOW); delay(800); digitalWrite(RGB_GREEN_PIN, HIGH);
  Serial.println("  -> BLUE (G33 = LOW)");
  digitalWrite(RGB_BLUE_PIN, LOW); delay(800); digitalWrite(RGB_BLUE_PIN, HIGH);

  Serial.println("[LED TEST 2] Testing Common Cathode mode (if longest leg is on GND, pin=HIGH):");
  digitalWrite(RGB_RED_PIN, LOW); digitalWrite(RGB_GREEN_PIN, LOW); digitalWrite(RGB_BLUE_PIN, LOW);
  Serial.println("  -> RED (G25 = HIGH)");
  digitalWrite(RGB_RED_PIN, HIGH); delay(800); digitalWrite(RGB_RED_PIN, LOW);
  Serial.println("  -> GREEN (G26 = HIGH)");
  digitalWrite(RGB_GREEN_PIN, HIGH); delay(800); digitalWrite(RGB_GREEN_PIN, LOW);
  Serial.println("  -> BLUE (G33 = HIGH)");
  digitalWrite(RGB_BLUE_PIN, HIGH); delay(800); digitalWrite(RGB_BLUE_PIN, LOW);

  Serial.println("[BUZZER TEST] Testing G27 in ALL 3 modes:");
  Serial.println("  -> Mode A: Active-HIGH (G27 = HIGH for 500ms)");
  digitalWrite(BUZZER_PIN, HIGH); delay(500); digitalWrite(BUZZER_PIN, LOW); delay(400);

  Serial.println("  -> Mode B: Active-LOW  (G27 = LOW for 500ms)");
  digitalWrite(BUZZER_PIN, LOW); delay(500); digitalWrite(BUZZER_PIN, HIGH); delay(400);

  Serial.println("  -> Mode C: Passive PWM tone (2000Hz on G27 for 500ms)");
  tone(BUZZER_PIN, 2000, 500); delay(600); noTone(BUZZER_PIN);

  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
  setRGB(false, false, true);
  Serial.println("================ TEST COMPLETE ================\n");
}

void showOLED(const String& line1, const String& line2 = "", const String& footer = "") {
  currentLine1 = line1;
  currentLine2 = line2;
  Serial.println("[OLED] " + line1 + (line2.length() ? " | " + line2 : ""));
  if (!oledReady) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header bar
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("FLY MEDIA");
  display.setCursor(80, 0);
  display.print(WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Main Line 1
  display.setTextSize(1);
  display.setCursor(0, 18);
  display.println(line1);

  // Main Line 2 (highlighted larger if short)
  if (line2.length() > 0) {
    display.setTextSize(line2.length() <= 10 ? 2 : 1);
    display.setCursor(0, 34);
    display.println(line2);
  }

  // Footer
  if (footer.length() > 0) {
    display.setTextSize(1);
    display.setCursor(0, 55);
    display.print(footer);
  }
  display.display();
}

void showReadyScreen() {
  ledIdle(); // WHITE = Ready/Idle (Waiting for finger)
  int queued = prefs.getInt("q_count", 0);
  String footer = queued > 0 ? ("Pending sync: " + String(queued)) : String(DEVICE_ID);
  showOLED("Place Your Finger", "READY", footer);
}

// Minimal JSON string field extractor (no external JSON library needed)
String extractJsonField(const String& json, const String& key) {
  String pattern = "\"" + key + "\":\"";
  int start = json.indexOf(pattern);
  if (start == -1) return "";
  start += pattern.length();
  int end = json.indexOf("\"", start);
  if (end == -1) return "";
  return json.substring(start, end);
}

int extractJsonInt(const String& json, const String& key) {
  String pattern = "\"" + key + "\":";
  int start = json.indexOf(pattern);
  if (start == -1) return -1;
  start += pattern.length();
  while (start < (int)json.length() && json[start] == ' ') start++;
  int end = start;
  while (end < (int)json.length() && (isDigit(json[end]) || json[end] == '-')) end++;
  if (end == start) return -1;
  return json.substring(start, end).toInt();
}

// ===================== 6. NETWORK & HTTP =========================
int rssiToPercent(int rssi) {
  if (rssi >= -50) return 100;
  if (rssi <= -100) return 0;
  return 2 * (rssi + 100);
}

const char* rssiToQuality(int rssi) {
  if (rssi >= -55) return "Excellent";
  if (rssi >= -67) return "Good";
  if (rssi >= -78) return "Fair";
  return "Weak";
}

bool isSavedNetwork(const String& ssid) {
  for (int i = 0; i < WIFI_NETWORK_COUNT; i++) {
    if (ssid == String(WIFI_NETWORKS[i].ssid)) return true;
  }
  return false;
}

void initWifiMulti() {
  if (wifiMultiInitialized) return;
  WiFi.mode(WIFI_STA);
  for (int i = 0; i < WIFI_NETWORK_COUNT; i++) {
    wifiMulti.addAP(WIFI_NETWORKS[i].ssid, WIFI_NETWORKS[i].password);
    Serial.printf("[WIFI] Registered saved network #%d: \"%s\"\n", i + 1, WIFI_NETWORKS[i].ssid);
  }
  wifiMultiInitialized = true;
}

void printTargetSignalScan() {
  Serial.println("[WIFI SCAN] Scanning 2.4 GHz networks for all saved Wi-Fi SSIDs...");
  int n = WiFi.scanNetworks();
  int foundSaved = 0;
  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    if (isSavedNetwork(s)) {
      int r = WiFi.RSSI(i);
      Serial.printf("  -> SAVED FOUND \"%s\" | Signal: %d dBm (%d%% - %s) | Ch: %d\n",
                    s.c_str(), r, rssiToPercent(r), rssiToQuality(r), WiFi.channel(i));
      foundSaved++;
    }
  }
  if (foundSaved == 0) {
    Serial.printf("  -> None of your %d saved Wi-Fi network(s) found in 2.4 GHz range (%d other APs visible).\n",
                  WIFI_NETWORK_COUNT, n);
  }
  WiFi.scanDelete();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  initWifiMulti();
  setRGB(false, false, true);
  showOLED("Scanning Wi-Fi...", "Closest Network");
  Serial.println("--------------------------------------------------");
  Serial.printf("[WIFI] Searching for STRONGEST among %d saved network(s)...\n", WIFI_NETWORK_COUNT);

  unsigned long start = millis();
  while (wifiMulti.run(5000) != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    weakSignalCount = 0;
    int rssi = WiFi.RSSI();
    Serial.println("[WIFI] CONNECTION SUCCESS! (Closest/Strongest Selected)");
    Serial.printf("  SSID    : %s\n", WiFi.SSID().c_str());
    Serial.printf("  IP      : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("  Signal  : %d dBm (%d%% - %s)\n", rssi, rssiToPercent(rssi), rssiToQuality(rssi));
    Serial.printf("  Channel : %d\n", WiFi.channel());
    Serial.println("--------------------------------------------------");
    showOLED(WiFi.SSID(), String(rssi) + " dBm");
    setRGB(false, true, false);
    beep(80, 2);
    delay(1000);
  } else {
    Serial.printf("[WIFI] CONNECTION FAILED! (WiFi.status() = %d)\n", (int)WiFi.status());
    printTargetSignalScan();
    Serial.println("  -> Running in Offline Queue mode. Will retry automatically.");
    Serial.println("--------------------------------------------------");
    showOLED("Wi-Fi Failed", "Offline Mode");
    setRGB(true, false, false);
    beep(250, 1);
    delay(1000);
  }
}

// Smart Roaming: If multiple Wi-Fi networks are saved and current signal gets weak,
// check if another saved router nearby is at least 12 dBm stronger and switch to it!
void checkSmartRoaming() {
  if (WIFI_NETWORK_COUNT <= 1 || WiFi.status() != WL_CONNECTED) return;

  int currentRssi = WiFi.RSSI();
  if (currentRssi > ROAM_RSSI_THRESHOLD) {
    weakSignalCount = 0;
    return;
  }

  weakSignalCount++;
  if (weakSignalCount < 2) return; // Confirm weak signal across 2 pings (10s)
  weakSignalCount = 0;

  Serial.printf("[ROAM] Current Wi-Fi \"%s\" is weak (%d dBm). Checking for a closer saved router...\n",
                WiFi.SSID().c_str(), currentRssi);

  String currentSsid = WiFi.SSID();
  int n = WiFi.scanNetworks();
  int bestRssi = currentRssi;
  String bestSsid = currentSsid;

  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    int r = WiFi.RSSI(i);
    if (isSavedNetwork(s) && s != currentSsid && r > bestRssi + 12) {
      bestRssi = r;
      bestSsid = s;
    }
  }
  WiFi.scanDelete();

  if (bestSsid != currentSsid) {
    Serial.printf("[ROAM] Stronger saved Wi-Fi found: \"%s\" (%d dBm vs %d dBm)! Switching...\n",
                  bestSsid.c_str(), bestRssi, currentRssi);
    WiFi.disconnect(false);
    delay(300);
    connectWiFi();
  }
}

int postToBase(const String& baseUrl, const String& path, const String& payload, String& responseOut) {
  String fullUrl = baseUrl + path;
  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (fullUrl.startsWith("https://")) {
    secureClient.setInsecure(); // Accepts Cloudflare edge TLS certificate
    http.begin(secureClient, fullUrl);
  } else {
    http.begin(plainClient, fullUrl);
  }

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  int code = http.POST(payload);
  if (code > 0) {
    responseOut = http.getString();
  } else {
    responseOut = http.errorToString(code);
  }
  http.end();
  return code;
}

int postJson(const String& path, const String& payload, String& responseOut) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  String primary = useCloudFallback ? String(CLOUD_API_BASE_URL) : String(API_BASE_URL);
  int code = postToBase(primary, path, payload, responseOut);

  // If LAN server unreachable, auto-switch to Cloudflare HTTPS URL!
  if (code <= 0) {
    String secondary = useCloudFallback ? String(API_BASE_URL) : String(CLOUD_API_BASE_URL);
    Serial.println("[HTTP] Primary failed (" + responseOut + "), trying fallback: " + secondary);
    int code2 = postToBase(secondary, path, payload, responseOut);
    if (code2 > 0) {
      useCloudFallback = !useCloudFallback;
      return code2;
    }
  }
  return code;
}

// ===================== 7. OFFLINE QUEUE (NVS) ====================
void enqueueOfflineEvent(uint16_t slot, const String& eventId) {
  int count = prefs.getInt("q_count", 0);
  if (count >= 25) {
    Serial.println("[QUEUE] Queue full (25 max), dropping oldest not implemented.");
    return;
  }
  String entry = String(slot) + "|" + eventId;
  prefs.putString(("q_" + String(count)).c_str(), entry);
  prefs.putInt("q_count", count + 1);
  Serial.println("[QUEUE] Saved offline event: " + entry);
}

void flushOfflineQueue() {
  if (WiFi.status() != WL_CONNECTED) return;
  int count = prefs.getInt("q_count", 0);
  if (count <= 0) return;

  Serial.printf("[QUEUE] Syncing %d offline scan(s)...\n", count);
  showOLED("Syncing Offline", String(count) + " event(s)");

  int remaining = 0;
  for (int i = 0; i < count; i++) {
    String key = "q_" + String(i);
    String entry = prefs.getString(key.c_str(), "");
    int sep = entry.indexOf('|');
    if (sep == -1) continue;

    int slot = entry.substring(0, sep).toInt();
    String evId = entry.substring(sep + 1);

    String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                     "\",\"fingerprint_slot\":" + String(slot) +
                     ",\"event_id\":\"" + evId + "\"}";
    String resp;
    int code = postJson("/scan", payload, resp);
    if (code >= 200 && code < 500) {
      Serial.println("[QUEUE] Synced: " + evId + " -> HTTP " + String(code));
    } else {
      // Keep unacknowledged event
      prefs.putString(("q_" + String(remaining)).c_str(), entry);
      remaining++;
    }
  }
  prefs.putInt("q_count", remaining);
  if (remaining == 0) {
    showOLED("Offline Synced!", "All Updated");
    delay(1000);
  }
  showReadyScreen();
}

// ===================== 8. ATTENDANCE SCAN SUBMIT =================
void submitAttendanceScan(uint16_t slotId) {
  eventSeq++;
  String eventId = String(DEVICE_ID) + "-" + String(bootCount) + "-" + String(eventSeq);

  String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                   "\",\"fingerprint_slot\":" + String(slotId) +
                   ",\"event_id\":\"" + eventId + "\"}";

  showOLED("Verified Slot #" + String(slotId), "Sending...");
  String resp;
  int code = postJson("/scan", payload, resp);

  Serial.printf("[SCAN] HTTP %d -> %s\n", code, resp.c_str());

  if (code >= 200 && code < 300) {
    String l1 = extractJsonField(resp, "display_line1");
    String l2 = extractJsonField(resp, "display_line2");
    if (l1.length() == 0) l1 = "Slot #" + String(slotId);
    if (l2.length() == 0) l2 = "Recorded!";

    ledSuccess(); // GREEN = Verification Success!
    showOLED(l1, l2, "Synced OK");
    beep(120, 1);
    delay(2200);
  } else if (code == 404 || code == 401 || code == 403) {
    String l1 = extractJsonField(resp, "display_line1");
    String l2 = extractJsonField(resp, "display_line2");
    if (l1.length() == 0) l1 = "Rejected";
    if (l2.length() == 0) l2 = "HTTP " + String(code);

    ledFail(); // RED = Verification Fail / Rejected
    showOLED(l1, l2);
    beep(350, 2);
    delay(2200);
  } else {
    // Network / Server unreachable -> Save in offline queue!
    enqueueOfflineEvent(slotId, eventId);
    ledSuccess(); // GREEN = Verification Success (Saved locally)
    showOLED("Saved Offline", "Slot #" + String(slotId), "Will auto-sync");
    beep(100, 2);
    delay(2000);
  }
  showReadyScreen();
}

// ===================== 9. ENROLLMENT & DELETION ==================
bool enrollFingerprint(uint16_t id) {
  if (id < 1 || id > 1000) {
    Serial.println("[ENROLL] Invalid slot ID (must be 1..1000).");
    return false;
  }

  Serial.printf("\n[ENROLL] Starting 2-scan enrollment for Slot #%d\n", id);
  ledEnrolling(); // MAGENTA = Fingerprint enrollment in progress!
  showOLED("Enroll Slot #" + String(id), "Place Finger");
  beep(100, 2);

  // --- First scan ---
  unsigned long start = millis();
  int p = -1;
  while (p != FINGERPRINT_OK) {
    if (millis() - start > 20000) {
      showOLED("Enroll Timeout", "Cancelled");
      ledFail(); // RED = Fail
      beep(400, 1);
      delay(1500);
      showReadyScreen();
      return false;
    }
    p = finger.getImage();
    delay(50);
  }

  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    showOLED("Scan 1 Error", "Try Again");
    ledFail(); // RED = Fail
    beep(300, 1);
    delay(1500);
    showReadyScreen();
    return false;
  }

  showOLED("Scan 1 OK!", "Remove Finger");
  beep(80, 1);
  
  // Quick Green Blink confirmation that 1st scan was captured successfully!
  ledSuccess(); // 🟢 Quick GREEN flash
  delay(300);
  ledOff();
  delay(120);
  ledEnrolling(); // 🟣 Return to MAGENTA (Pink) for 2nd scan
  
  delay(1000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(50);
  }

  // --- Second scan (confirmation) ---
  showOLED("Enroll Slot #" + String(id), "Place Again");
  ledEnrolling(); // 🟣 MAGENTA (Waiting for 2nd scan)
  start = millis();
  p = -1;
  while (p != FINGERPRINT_OK) {
    if (millis() - start > 20000) {
      showOLED("Enroll Timeout", "Cancelled");
      ledFail(); // RED = Fail
      beep(400, 1);
      delay(1500);
      showReadyScreen();
      return false;
    }
    p = finger.getImage();
    delay(50);
  }

  if (finger.image2Tz(2) != FINGERPRINT_OK) {
    showOLED("Scan 2 Error", "Try Again");
    ledFail(); // RED = Fail
    beep(300, 1);
    delay(1500);
    showReadyScreen();
    return false;
  }

  if (finger.createModel() != FINGERPRINT_OK) {
    showOLED("Fingers Did Not", "Match!");
    ledFail(); // RED = Fail
    beep(400, 2);
    delay(1800);
    showReadyScreen();
    return false;
  }

  if (finger.storeModel(id) != FINGERPRINT_OK) {
    showOLED("Store Failed", "Slot #" + String(id));
    ledFail(); // RED = Fail
    beep(400, 2);
    delay(1800);
    showReadyScreen();
    return false;
  }

  Serial.printf("[ENROLL] SUCCESS! Stored in Slot #%d\n", id);
  ledSuccess(); // GREEN = Enroll Success!
  showOLED("Enrolled OK!", "Slot #" + String(id));
  beep(100, 3);
  delay(2000);
  showReadyScreen(); // Returns to WHITE
  return true;
}

bool deleteFingerprint(uint16_t id) {
  uint8_t p = finger.deleteModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.printf("[DELETE] Deleted Slot #%d\n", id);
    ledSuccess(); // GREEN = Success
    showOLED("Template Deleted", "Slot #" + String(id));
    beep(120, 2);
    delay(1500);
    showReadyScreen();
    return true;
  }
  Serial.printf("[DELETE] Failed to delete Slot #%d (code %d)\n", id, p);
  showOLED("Delete Failed", "Slot #" + String(id));
  ledFail(); // RED = Fail
  delay(1500);
  showReadyScreen();
  return false;
}

// ===================== 10. HEARTBEAT & REMOTE COMMANDS ===========
void sendHeartbeatAndCheckCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("[LIVE 5s] Wi-Fi: FAILED / DISCONNECTED (status=%d)\n", (int)WiFi.status());
    printTargetSignalScan();
    return;
  }

  int rssi = WiFi.RSSI();
  String safeL1 = currentLine1; safeL1.replace("\"", "'");
  String safeL2 = currentLine2; safeL2.replace("\"", "'");
  String ssidStr = WiFi.SSID(); ssidStr.replace("\"", "'");

  String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                   "\",\"wifi_ssid\":\"" + ssidStr +
                   "\",\"ip_address\":\"" + WiFi.localIP().toString() +
                   "\",\"rssi\":" + String(rssi) +
                   ",\"sensor_ready\":" + String(sensorReady ? "true" : "false") +
                   ",\"oled_ready\":" + String(oledReady ? "true" : "false") +
                   ",\"templates_count\":" + String(storedTemplates) +
                   ",\"queued_events\":" + String(prefs.getInt("q_count", 0)) +
                   ",\"uptime_seconds\":" + String(millis() / 1000) +
                   ",\"display_line1\":\"" + safeL1 +
                   "\",\"display_line2\":\"" + safeL2 + "\"}";

  String resp;
  int code = postJson("/heartbeat", payload, resp);
  Serial.printf("[LIVE 5s] Wi-Fi: CONNECTED (%s) | Signal: %d dBm (%d%% - %s) | IP: %s | Server: %s (HTTP %d)\n",
                ssidStr.c_str(),
                rssi,
                rssiToPercent(rssi),
                rssiToQuality(rssi),
                WiFi.localIP().toString().c_str(),
                code == 200 ? "OK" : "FAILED",
                code);

  if (code == 200) {
    // Also flush any queued offline scans while server is reachable
    flushOfflineQueue();

    // Check if Admin/HR queued a remote ENROLL or DELETE command
    String cmd = extractJsonField(resp, "command");
    if (cmd.length() > 0) {
      int cmdId = extractJsonInt(resp, "command_id");
      int slot  = extractJsonInt(resp, "fingerprint_slot");
      bool ok   = false;
      String msg = "";

      if (cmd == "ENROLL" && slot > 0 && sensorReady) {
        ok = enrollFingerprint(slot);
        if (ok) { finger.getTemplateCount(); storedTemplates = finger.templateCount; }
        msg = ok ? "Enrolled on R307" : "Enrollment failed or timed out";
      } else if (cmd == "DELETE" && slot > 0 && sensorReady) {
        ok = deleteFingerprint(slot);
        if (ok) { finger.getTemplateCount(); storedTemplates = finger.templateCount; }
        msg = ok ? "Deleted from R307" : "Delete failed";
      } else if (cmd == "CLEAR_ALL" && sensorReady) {
        ok = (finger.emptyDatabase() == FINGERPRINT_OK);
        if (ok) storedTemplates = 0;
        msg = ok ? "Cleared all templates" : "Clear failed";
      } else {
        msg = "Sensor not ready";
      }

      if (cmdId > 0) {
        String resPayload = "{\"device_id\":\"" + String(DEVICE_ID) +
                            "\",\"command_id\":" + String(cmdId) +
                            ",\"success\":" + String(ok ? "true" : "false") +
                            ",\"message\":\"" + msg + "\"}";
        String ack;
        postJson("/command-result", resPayload, ack);
      }
    }
  }

  // If signal gets weak while walking around, automatically roam to a stronger saved Wi-Fi
  checkSmartRoaming();
}

// ===================== 11. SERIAL MONITOR COMMANDS ===============
void handleSerialCommands() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  if (line.startsWith("ENROLL ")) {
    int slot = line.substring(7).toInt();
    enrollFingerprint(slot);
  } else if (line.startsWith("DELETE ")) {
    int slot = line.substring(7).toInt();
    deleteFingerprint(slot);
  } else if (line == "CLEAR") {
    if (finger.emptyDatabase() == FINGERPRINT_OK) {
      Serial.println("[SENSOR] All fingerprint templates erased!");
      showOLED("Database Cleared", "0 Templates");
      delay(1500);
      showReadyScreen();
    }
  } else if (line == "TEST") {
    sendHeartbeatAndCheckCommands();
  } else if (line == "TESTHW") {
    runHardwareTest();
  } else if (line == "STATUS") {
    finger.getTemplateCount();
    Serial.println("========== TERMINAL STATUS ==========");
    Serial.println("Device ID : " + String(DEVICE_ID));
    Serial.println("API URL   : " + String(API_BASE_URL));
    Serial.println("Wi-Fi     : " + String(WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "OFFLINE"));
    Serial.println("Templates : " + String(finger.templateCount) + " / 1000");
    Serial.println("Queued    : " + String(prefs.getInt("q_count", 0)));
    Serial.println("=====================================");
  } else {
    Serial.println("Commands: ENROLL <1-1000> | DELETE <1-1000> | CLEAR | TEST | TESTHW | STATUS");
  }
}

// ===================== 12. SETUP & MAIN LOOP =====================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== Fly Media ESP32 Biometric Terminal Booting ===");

  pinMode(RGB_RED_PIN, OUTPUT);
  pinMode(RGB_GREEN_PIN, OUTPUT);
  pinMode(RGB_BLUE_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_IS_PASSIVE ? LOW : (BUZZER_ACTIVE_HIGH ? LOW : HIGH));
  setRGB(false, false, true);

  // Initialize NVS flash storage
  prefs.begin("biometric", false);
  bootCount = prefs.getUInt("boot_cnt", 0) + 1;
  prefs.putUInt("boot_cnt", bootCount);

  // Initialize OLED
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    oledReady = true;
    showOLED("DeviceDesk", "Initializing...");
  } else {
    Serial.println("[OLED] SSD1306 not found at 0x3C (continuing without OLED).");
  }

  // Initialize R307 Fingerprint Sensor on UART2
  fpSerial.begin(57600, SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
  finger.begin(57600);
  delay(200);

  if (finger.verifyPassword()) {
    sensorReady = true;
    // Set highest matching strictness (Security Level 5)
    finger.setSecurityLevel(5);
    finger.getTemplateCount();
    storedTemplates = finger.templateCount;
    Serial.printf("[R307] Sensor OK! Security Level=5 | Stored Templates=%d\n", storedTemplates);
    showOLED("R307 Sensor OK", String(storedTemplates) + " Enrolled");
    delay(800);
  } else {
    sensorReady = false;
    Serial.println("[R307] WARNING: Sensor not detected! Continuing Wi-Fi telemetry so web dashboard shows status.");
    setRGB(true, false, false);
    showOLED("R307 Not Found", "Check TX/RX Pin");
    beep(300, 2);
    delay(800);
  }

  connectWiFi();
  if (sensorReady) {
    showReadyScreen();
  } else {
    showOLED("Wi-Fi Online", "Check R307 Wire");
  }
  sendHeartbeatAndCheckCommands();
}

void loop() {
  handleSerialCommands();

  // Reconnect Wi-Fi periodically if disconnected
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetryMs > WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetryMs = millis();
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED) {
      flushOfflineQueue();
    }
    if (sensorReady) showReadyScreen();
  }

  // Periodic heartbeat every 5s (sends live Wi-Fi RSSI, IP, Sensor status & checks remote commands)
  if (millis() - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = millis();
    sendHeartbeatAndCheckCommands();
  }

  // If R307 sensor was not connected, skip fingerprint scanning and keep Wi-Fi heartbeat alive
  if (!sensorReady) {
    delay(100);
    return;
  }

  // Handle 3-strike lockout cooldown
  if (lockoutUntilMs > 0) {
    if (millis() < lockoutUntilMs) {
      delay(100);
      return;
    } else {
      lockoutUntilMs = 0;
      failedStrikes = 0;
      showReadyScreen();
    }
  }

  // Wait for finger on R307
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) {
    delay(60);
    return;
  }

  // Finger detected! LED turns BLUE during scan
  ledScanning(); // BLUE = Scanning in progress
  showOLED("Scanning Finger...", "Hold Steady");

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    ledFail(); // RED = Unclear scan fail
    showOLED("Unclear Scan", "Try Again");
    beep(250, 1);
    delay(1200);
    showReadyScreen(); // Returns to WHITE
    return;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    if (millis() - lastScanMs < LOCAL_SCAN_COOLDOWN_MS) {
      showReadyScreen();
      return;
    }
    lastScanMs = millis();
    failedStrikes = 0;

    Serial.printf("[R307] MATCH! Slot #%d (Confidence: %d)\n", finger.fingerID, finger.confidence);
    submitAttendanceScan(finger.fingerID); // Sets ledSuccess() [GREEN]
  } else if (p == FINGERPRINT_NOTFOUND) {
    failedStrikes++;
    Serial.printf("[R307] NOT RECOGNIZED (Strike %d/%d)\n", failedStrikes, MAX_FAILED_STRIKES);
    ledFail(); // RED = Verification Fail
    showOLED("Not Recognised", "Try Again", "Strike " + String(failedStrikes) + "/3");
    beep(300, 2);

    // Report failed attempt to server for audit
    String dummy;
    postJson("/scan-failed", "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"reason\":\"Unrecognized fingerprint\"}", dummy);

    if (failedStrikes >= MAX_FAILED_STRIKES) {
      lockoutUntilMs = millis() + LOCKOUT_DURATION_MS;
      showOLED("Too Many Fails", "Locked 10s");
      beep(600, 1);
    } else {
      delay(1500);
      showReadyScreen(); // Returns to WHITE
    }
  } else {
    ledFail(); // RED = Other error
    showOLED("Scan Error", "Code: " + String(p));
    beep(300, 1);
    delay(1200);
    showReadyScreen();
  }
  delay(100);
}
