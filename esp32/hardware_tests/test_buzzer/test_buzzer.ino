/*
 * ============================================================================
 *  TEST 4: BUZZER DIAGNOSTIC TOOL (ACTIVE & PASSIVE BUZZERS)
 * ============================================================================
 *  Use this sketch to test your buzzer and instantly find out:
 *    1. Is it an ACTIVE buzzer (Active-HIGH vs Active-LOW)?
 *    2. Or is it a PASSIVE buzzer (which requires PWM frequency to produce sound)?
 *
 *  HARDWARE CONNECTIONS (ESP32 38-Pin DevKit):
 *  ----------------------------------------------------------------------------
 *  Buzzer Pin          ESP32 Pin        Description
 *  ----------------------------------------------------------------------------
 *  For 3-Pin Modules:
 *    VCC               3V3 (or 5V)      Module Power
 *    GND               GND              Ground
 *    I/O / SIG         GPIO 27          Signal Control
 *
 *  For 2-Pin Buzzers:
 *    Long Leg (+)      GPIO 27          Positive Trigger
 *    Short Leg (-)     GND              Ground
 *  ----------------------------------------------------------------------------
 *
 *  HOW TO USE:
 *  1. Upload this sketch to your ESP32
 *  2. Open Serial Monitor (115200 baud)
 *  3. The sketch will run 3 diagnostic phases:
 *     - Phase A: Digital HIGH (Active Buzzer - Active HIGH)
 *     - Phase B: Digital LOW  (Active Buzzer - Active LOW module)
 *     - Phase C: PWM Tone     (Passive Buzzer 2kHz, 3kHz, 4kHz frequencies)
 *  4. Listen carefully to hear during WHICH phase your buzzer sounds!
 * ============================================================================
 */

#define BUZZER_PIN 27

void printBanner() {
  Serial.println(F("\n======================================================="));
  Serial.println(F("              🔊 BUZZER DIAGNOSTIC TOOL                "));
  Serial.println(F("======================================================="));
  Serial.println(F("ESP32 Pin: Signal->GPIO 27, VCC->3V3/5V, GND->GND\n"));
  Serial.println(F("Interactive Serial Commands:"));
  Serial.println(F("  1  or HIGH   -> Pulse GPIO 27 HIGH for 500ms"));
  Serial.println(F("  2  or LOW    -> Pulse GPIO 27 LOW for 500ms"));
  Serial.println(F("  3  or TONE   -> Play PWM musical scale (for Passive buzzer)"));
  Serial.println(F("  4  or BEEP   -> Fast double beep (Lab Door entry sound)"));
  Serial.println(F("  AUTO         -> Resume automatic diagnostic loop"));
  Serial.println(F("=======================================================\n"));
}

bool autoMode = true;

// Active HIGH Beep
void beepActiveHigh(int durationMs) {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, LOW);
}

// Active LOW Beep
void beepActiveLow(int durationMs) {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, HIGH);
}

// PWM Tone (Passive Buzzer support)
void playTone(int freq, int durationMs) {
  #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    ledcAttach(BUZZER_PIN, freq, 8);
    ledcWriteTone(BUZZER_PIN, freq);
    delay(durationMs);
    ledcWriteTone(BUZZER_PIN, 0);
    ledcDetach(BUZZER_PIN);
  #else
    // ESP32 core 2.x
    ledcSetup(0, freq, 8);
    ledcAttachPin(BUZZER_PIN, 0);
    ledcWriteTone(0, freq);
    delay(durationMs);
    ledcWriteTone(0, 0);
    ledcDetachPin(BUZZER_PIN);
  #endif
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  printBanner();
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd == "1" || cmd == "HIGH") {
      autoMode = false;
      Serial.println(F("🔊 MANUAL: Triggering Active-HIGH pulse (500ms)..."));
      beepActiveHigh(500);
    } else if (cmd == "2" || cmd == "LOW") {
      autoMode = false;
      Serial.println(F("🔊 MANUAL: Triggering Active-LOW pulse (500ms)..."));
      beepActiveLow(500);
    } else if (cmd == "3" || cmd == "TONE") {
      autoMode = false;
      Serial.println(F("🎵 MANUAL: Playing PWM tone sequence (2500Hz -> 3500Hz)..."));
      playTone(2500, 250);
      delay(50);
      playTone(3500, 350);
    } else if (cmd == "4" || cmd == "BEEP") {
      autoMode = false;
      Serial.println(F("🔔 MANUAL: Playing Lab Door double beep..."));
      beepActiveHigh(80);
      playTone(3000, 80);
      delay(80);
      beepActiveHigh(120);
      playTone(3000, 120);
    } else if (cmd == "AUTO") {
      autoMode = true;
      Serial.println(F("▶️ Resuming AUTO diagnostic cycle..."));
    }
  }

  if (autoMode) {
    // -------------------------------------------------------------
    // PHASE A: Active Buzzer - Active HIGH Test
    // -------------------------------------------------------------
    Serial.println(F("🔊 [TEST A] Testing Active-HIGH pulse on GPIO 27..."));
    Serial.println(F("   -> If your buzzer beeps NOW: It is an ACTIVE buzzer (Active-HIGH)."));
    beepActiveHigh(250);
    delay(200);
    beepActiveHigh(250);
    delay(2000);

    // -------------------------------------------------------------
    // PHASE B: Active Buzzer - Active LOW Module Test
    // -------------------------------------------------------------
    Serial.println(F("🔊 [TEST B] Testing Active-LOW pulse on GPIO 27..."));
    Serial.println(F("   -> If your buzzer beeps NOW: It is an ACTIVE buzzer (Active-LOW module)."));
    beepActiveLow(250);
    delay(200);
    beepActiveLow(250);
    delay(2000);

    // -------------------------------------------------------------
    // PHASE C: Passive Buzzer - PWM Frequency Test
    // -------------------------------------------------------------
    Serial.println(F("🎵 [TEST C] Testing PWM Tones (2000Hz, 3000Hz, 4000Hz)..."));
    Serial.println(F("   -> If your buzzer only made sound NOW: It is a PASSIVE buzzer!"));
    playTone(2000, 200);
    delay(100);
    playTone(3000, 200);
    delay(100);
    playTone(4000, 300);
    delay(3000);

    Serial.println(F("--- Cycle complete. Repeating in 3 seconds...\n"));
  } else {
    delay(100);
  }
}
