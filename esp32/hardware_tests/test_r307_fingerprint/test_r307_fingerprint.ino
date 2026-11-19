/*
 * ============================================================================
 *  TEST 1: R307 OPTICAL FINGERPRINT SENSOR DIAGNOSTIC TOOL
 * ============================================================================
 *  Use this sketch to test your R307 fingerprint sensor in complete isolation.
 *  It checks power, UART communication, optical camera, LED control, and finger scans.
 *
 *  HARDWARE CONNECTIONS (ESP32 38-Pin DevKit):
 *  ----------------------------------------------------------------------------
 *  R307 Wire Color   R307 Pin Name   ESP32 Pin        Description
 *  ----------------------------------------------------------------------------
 *  Red               VCC             V5 (VIN)         5V Power (Do NOT use 3.3V!)
 *  Black             GND             GND              Ground (Common)
 *  Yellow / Green    TX              GPIO 16 (RX2)    Sensor TX -> ESP32 RX2
 *  White / Blue      RX              GPIO 17 (TX2)    Sensor RX <- ESP32 TX2
 *  ----------------------------------------------------------------------------
 *  Note on wire colors: Some factory cables swap Yellow/Green/White/Blue.
 *  Always follow the pin labels on your R307 module connector:
 *    Pin 1: VCC (5V)
 *    Pin 2: GND
 *    Pin 3: TX  -> ESP32 GPIO 16
 *    Pin 4: RX  -> ESP32 GPIO 17
 *
 *  HOW TO USE:
 *  1. Open Arduino IDE -> Tools -> Board -> "ESP32 Dev Module"
 *  2. Tools -> Port -> Select your ESP32 COM port
 *  3. Upload this sketch
 *  4. Open Tools -> Serial Monitor (Baud: 115200, Line Ending: Both NL & CR)
 *  5. Watch the diagnostic report and place your finger on the sensor!
 * ============================================================================
 */

#include <Adafruit_Fingerprint.h>

#define FP_RX_PIN  16   // ESP32 GPIO 16 receives from R307 TX
#define FP_TX_PIN  17   // ESP32 GPIO 17 transmits to R307 RX

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

bool sensorOnline = false;
uint32_t detectedBaud = 57600;

// Supported standard R307 baud rates
const uint32_t BAUD_RATES[] = { 57600, 9600, 19200, 38400, 115200 };
const int NUM_BAUDS = sizeof(BAUD_RATES) / sizeof(BAUD_RATES[0]);

void printBanner() {
  Serial.println(F("\n======================================================="));
  Serial.println(F("    🔍 R307 FINGERPRINT SENSOR HARDWARE DIAGNOSTIC     "));
  Serial.println(F("======================================================="));
  Serial.println(F("ESP32 Pins: TX->GPIO 17, RX<-GPIO 16, VCC->V5/VIN, GND->GND"));
  Serial.println(F("Probing communication with R307 sensor...\n"));
}

bool probeSensor() {
  for (int i = 0; i < NUM_BAUDS; i++) {
    uint32_t b = BAUD_RATES[i];
    Serial.printf("[PROBE] Testing baud rate: %u bps ... ", b);
    mySerial.begin(b, SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
    delay(100);

    finger.begin(b);
    if (finger.verifyPassword()) {
      Serial.println(F("✅ SENSOR FOUND & PASSWORD VERIFIED!"));
      detectedBaud = b;
      return true;
    } else {
      Serial.println(F("No response."));
    }
  }
  return false;
}

void printSensorDetails() {
  Serial.println(F("\n----------------- SENSOR SPECIFICATIONS -----------------"));
  Serial.printf("Status:           ONLINE ✅ (Baud: %u bps)\n", detectedBaud);
  Serial.printf("Sensor Capacity:  %d Fingerprint Templates\n", finger.capacity);
  Serial.printf("Security Level:   %d / 5\n", finger.security_level);
  Serial.printf("Device Address:   0x%X\n", finger.device_addr);
  Serial.printf("Packet Size:      %d bytes\n", finger.packet_len);
  
  finger.getTemplateCount();
  Serial.printf("Stored Templates: %d / %d enrolled\n", finger.templateCount, finger.capacity);
  Serial.println(F("---------------------------------------------------------\n"));

  Serial.println(F("💡 WHY WAS THE BLUE LIGHT BLINKING?"));
  Serial.println(F("1. Optical R307 turns its blue backlight ON whenever it takes"));
  Serial.println(F("   a snapshot (getImage). In continuous polling, it pulses."));
  Serial.println(F("2. If the light flashes rapidly without reading fingers, it means"));
  Serial.println(F("   VCC is receiving 3.3V instead of 5V (brownout reset)."));
  Serial.println(F("   -> Ensure VCC is plugged into the 'V5' (or 'VIN') pin on ESP32!\n"));

  Serial.println(F("📋 INTERACTIVE SERIAL COMMANDS (Type in Serial Monitor):"));
  Serial.println(F("  1  -> Turn Blue Optical LED ON"));
  Serial.println(F("  2  -> Turn Blue Optical LED OFF"));
  Serial.println(F("  3  -> Breathe Mode (Slow blue pulsing)"));
  Serial.println(F("  INFO   -> Refresh stored templates count"));
  Serial.println(F("  ENROLL <slot> -> Enroll test finger (e.g. ENROLL 1)"));
  Serial.println(F("  DELETE <slot> -> Delete slot (e.g. DELETE 1)"));
  Serial.println(F("  CLEAR  -> Erase all stored fingerprints"));
  Serial.println(F("---------------------------------------------------------"));
  Serial.println(F("👉 Place your finger on the glass anytime to test scanning...\n"));
}

void controlAura(uint8_t control, uint8_t speed, uint8_t color, uint8_t times) {
  // R307 Aura / Backlight control packet (0x35)
  // Control: 1=Breathe, 2=Flash, 3=Always ON, 4=Always OFF, 5=Fade in, 6=Fade out
  // Color: 1=Red, 2=Blue, 3=Purple
  uint8_t packet[] = {
    0xEF, 0x01,                   // Header
    0xFF, 0xFF, 0xFF, 0xFF,       // Address
    0x01,                         // Command packet identifier
    0x00, 0x07,                   // Length (7 bytes)
    0x35,                         // Instruction: Aura Config
    control, speed, color, times, // Parameters
    0x00, 0x00                    // Checksum (filled below)
  };
  
  uint16_t sum = 0x01 + 0x00 + 0x07 + 0x35 + control + speed + color + times;
  packet[14] = (sum >> 8) & 0xFF;
  packet[15] = sum & 0xFF;

  mySerial.write(packet, sizeof(packet));
}

void enrollFinger(int id) {
  if (id < 1 || id > 1000) {
    Serial.println(F("❌ Slot ID must be between 1 and 1000!"));
    return;
  }
  Serial.printf("\n>>> STARTING ENROLLMENT FOR SLOT #%d <<<\n", id);
  Serial.println(F("Step 1: Place finger on sensor..."));
  
  int p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) { delay(100); continue; }
    if (p == FINGERPRINT_OK) { Serial.println(F("✅ Image taken.")); break; }
    Serial.println(F("❌ Error capturing image."));
    return;
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println(F("❌ Failed to convert image to template (Char 1). Try again."));
    return;
  }

  Serial.println(F("Step 2: REMOVE finger from sensor..."));
  delay(1500);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  Serial.println(F("Step 3: Place the SAME finger again to confirm..."));
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) { delay(100); continue; }
    if (p == FINGERPRINT_OK) { Serial.println(F("✅ Image taken.")); break; }
    Serial.println(F("❌ Error capturing image."));
    return;
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println(F("❌ Failed to convert image to template (Char 2)."));
    return;
  }

  Serial.println(F("Step 4: Creating fingerprint model..."));
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println(F("❌ Fingerprints did not match. Enrollment cancelled."));
    return;
  }

  Serial.printf("Step 5: Storing model into Slot #%d...\n", id);
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.printf("🎉 ENROLLMENT SUCCESSFUL! Slot #%d is now registered!\n", id);
    controlAura(2, 0x20, 2, 3); // Flash 3 times
  } else {
    Serial.printf("❌ Error storing model in slot #%d (Error code: %d)\n", id, p);
  }
}

void deleteFinger(int id) {
  Serial.printf("\n>>> Deleting Slot #%d ... ", id);
  uint8_t p = finger.deleteModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.printf("✅ Slot #%d DELETED successfully!\n", id);
  } else {
    Serial.printf("❌ Failed to delete slot #%d (Code: %d)\n", id, p);
  }
}

void clearDatabase() {
  Serial.println(F("\n⚠️ WARNING: Erasing all stored fingerprints..."));
  uint8_t p = finger.emptyDatabase();
  if (p == FINGERPRINT_OK) {
    Serial.println(F("✅ All fingerprints CLEARED from sensor memory!"));
  } else {
    Serial.printf("❌ Failed to clear database (Code: %d)\n", p);
  }
}

void handleSerialCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  if (cmd.length() == 0) return;

  if (cmd == "1" || cmd == "LED ON" || cmd == "LEDON") {
    Serial.println(F("💡 Command: Turning Blue LED ON"));
    finger.LEDcontrol(FINGERPRINT_LED_ON);
    controlAura(3, 0xFF, 2, 0); // Always ON Blue
  } else if (cmd == "2" || cmd == "LED OFF" || cmd == "LEDOFF") {
    Serial.println(F("💡 Command: Turning Blue LED OFF"));
    finger.LEDcontrol(FINGERPRINT_LED_OFF);
    controlAura(4, 0xFF, 2, 0); // Always OFF
  } else if (cmd == "3" || cmd == "BREATHE" || cmd == "LEDBREATHE") {
    Serial.println(F("💡 Command: Blue LED Breathe Mode"));
    controlAura(1, 0x80, 2, 0); // Breathe Blue
  } else if (cmd == "INFO") {
    finger.getTemplateCount();
    Serial.printf("📊 Enrolled Templates: %d / %d\n", finger.templateCount, finger.capacity);
  } else if (cmd.startsWith("ENROLL")) {
    int spaceIdx = cmd.indexOf(' ');
    int slot = (spaceIdx != -1) ? cmd.substring(spaceIdx + 1).toInt() : 1;
    enrollFinger(slot);
  } else if (cmd.startsWith("DELETE")) {
    int spaceIdx = cmd.indexOf(' ');
    int slot = (spaceIdx != -1) ? cmd.substring(spaceIdx + 1).toInt() : 1;
    deleteFinger(slot);
  } else if (cmd == "CLEAR" || cmd == "EMPTY") {
    clearDatabase();
  } else {
    Serial.printf("❓ Unknown command: '%s'. Type 1, 2, 3, INFO, ENROLL <id>, DELETE <id>, CLEAR\n", cmd.c_str());
  }
}

void checkFingerprintScan() {
  uint8_t p = finger.getImage();
  
  if (p == FINGERPRINT_NOFINGER) {
    return; // Glass is idle
  }
  
  if (p != FINGERPRINT_OK) {
    Serial.println(F("⚠️ Finger detected, but optical image capture was unclear. Try again."));
    delay(500);
    return;
  }

  Serial.println(F("\n📸 Optical Image Captured!"));

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    Serial.println(F("⚠️ Image conversion error (unclear print or moved finger too fast)."));
    delay(500);
    return;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.println(F("================================================="));
    Serial.printf("🎉 MATCH FOUND! Slot ID: #%d\n", finger.fingerID);
    Serial.printf("📈 Confidence Match Score: %d\n", finger.confidence);
    Serial.println(F("================================================="));
    controlAura(2, 0x20, 2, 2); // Quick double flash blue
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println(F("================================================="));
    Serial.println(F("❓ FINGER NOT RECOGNIZED (Not enrolled in sensor)."));
    Serial.println(F("   -> Type 'ENROLL 1' to register this finger!"));
    Serial.println(F("================================================="));
  } else {
    Serial.printf("⚠️ Search error code: %d\n", p);
  }

  // Wait until finger is removed to prevent repeat spam
  delay(1000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(100);
  }
  Serial.println(F("👍 Finger removed. Ready for next scan...\n"));
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  printBanner();

  sensorOnline = probeSensor();

  if (sensorOnline) {
    printSensorDetails();
  } else {
    Serial.println(F("\n❌ FAILED TO COMMUNICATE WITH R307 SENSOR!"));
    Serial.println(F("\nTROUBLESHOOTING CHECKLIST:"));
    Serial.println(F("1. POWER: Is R307 Red wire plugged into 'V5' (VIN 5V)?"));
    Serial.println(F("   -> R307 requires 4.2V - 6V. It will NOT work reliably on 3.3V!"));
    Serial.println(F("2. GROUND: Is R307 Black wire plugged into ESP32 GND?"));
    Serial.println(F("3. TX/RX SWAP:"));
    Serial.println(F("   -> R307 TX wire MUST go to ESP32 GPIO 16 (RX2)"));
    Serial.println(F("   -> R307 RX wire MUST go to ESP32 GPIO 17 (TX2)"));
    Serial.println(F("   (Try swapping GPIO 16 and 17 if wire colors are uncertain)"));
    Serial.println(F("4. LOOSE JUMPERS: Push jumper wires firmly into header sockets."));
  }
}

void loop() {
  // Check for incoming user commands in Serial Monitor
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleSerialCommand(cmd);
  }

  // Scan finger if sensor is connected
  if (sensorOnline) {
    checkFingerprintScan();
  } else {
    // If not online, re-probe every 5 seconds
    delay(5000);
    Serial.println(F("Retrying R307 sensor probe..."));
    sensorOnline = probeSensor();
    if (sensorOnline) printSensorDetails();
  }
  
  delay(100);
}
