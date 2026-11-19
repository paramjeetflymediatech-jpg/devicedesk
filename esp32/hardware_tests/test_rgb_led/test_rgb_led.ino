/*
 * ============================================================================
 *  TEST 3: 5mm RGB LED (4-PIN) DIAGNOSTIC TOOL
 * ============================================================================
 *  Use this sketch to test your RGB LED and identify whether it is:
 *    - COMMON ANODE (Longest pin to 3.3V, LOW = ON)  <-- Default
 *    - COMMON CATHODE (Longest pin to GND, HIGH = ON)
 *
 *  HARDWARE CONNECTIONS (ESP32 38-Pin DevKit):
 *  ----------------------------------------------------------------------------
 *  RGB LED Leg          ESP32 Pin     Resistor      Description
 *  ----------------------------------------------------------------------------
 *  Leg 1 (Red)          GPIO 25       220 Ohm       Red Channel
 *  Leg 2 (Longest pin)  3V3 or GND    None          Common pin (See note below!)
 *  Leg 3 (Green)        GPIO 26       220 Ohm       Green Channel
 *  Leg 4 (Blue)         GPIO 33       220 Ohm       Blue Channel
 *  ----------------------------------------------------------------------------
 *
 *  ⚠️ CRITICAL NOTE ON THE LONGEST PIN:
 *  - If Common Anode   -> Connect Leg 2 to '3V3'.
 *  - If Common Cathode -> Connect Leg 2 to 'GND'.
 *  (This sketch lets you toggle modes by typing 'A' or 'C' in Serial Monitor!)
 *
 *  HOW TO USE:
 *  1. Upload this sketch to your ESP32
 *  2. Open Serial Monitor (115200 baud)
 *  3. Watch the LED cycle: RED -> GREEN -> BLUE -> YELLOW -> CYAN -> MAGENTA -> WHITE
 *  4. If LED stays OFF:
 *     - Try switching Leg 2 between 3V3 and GND!
 *     - Type 'C' in Serial Monitor to switch software to Common Cathode mode.
 * ============================================================================
 */

#define PIN_RED    25
#define PIN_GREEN  26
#define PIN_BLUE   33

// Set true for Common Anode (default), false for Common Cathode
bool isCommonAnode = true;

void setRGB(bool r, bool g, bool b) {
  // Common Anode: LOW = ON, HIGH = OFF
  // Common Cathode: HIGH = ON, LOW = OFF
  digitalWrite(PIN_RED,   isCommonAnode ? (r ? LOW : HIGH) : (r ? HIGH : LOW));
  digitalWrite(PIN_GREEN, isCommonAnode ? (g ? LOW : HIGH) : (g ? HIGH : LOW));
  digitalWrite(PIN_BLUE,  isCommonAnode ? (b ? LOW : HIGH) : (b ? HIGH : LOW));
}

void printBanner() {
  Serial.println(F("\n======================================================="));
  Serial.println(F("           🌈 RGB LED 4-PIN DIAGNOSTIC TOOL            "));
  Serial.println(F("======================================================="));
  Serial.println(F("ESP32 Pins: Red->GPIO 25 (220Ω), Green->GPIO 26 (220Ω), Blue->GPIO 33 (220Ω)"));
  Serial.printf("Current Mode: %s\n", isCommonAnode ? "COMMON ANODE (Longest leg to 3.3V)" : "COMMON CATHODE (Longest leg to GND)");
  Serial.println(F("-------------------------------------------------------"));
  Serial.println(F("Type commands in Serial Monitor:"));
  Serial.println(F("  A    -> Switch to Common Anode mode (Longest leg = 3.3V)"));
  Serial.println(F("  C    -> Switch to Common Cathode mode (Longest leg = GND)"));
  Serial.println(F("  R    -> Force RED only"));
  Serial.println(F("  G    -> Force GREEN only"));
  Serial.println(F("  B    -> Force BLUE only"));
  Serial.println(F("  OFF  -> Turn all colors OFF"));
  Serial.println(F("  AUTO -> Resume automatic color cycle"));
  Serial.println(F("=======================================================\n"));
}

bool autoMode = true;

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);

  // Start with LED OFF
  setRGB(false, false, false);

  printBanner();
}

void loop() {
  // Check Serial commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd == "A") {
      isCommonAnode = true;
      Serial.println(F(" Switched to COMMON ANODE mode (Longest leg -> 3.3V, LOW = ON)"));
    } else if (cmd == "C") {
      isCommonAnode = false;
      Serial.println(F(" Switched to COMMON CATHODE mode (Longest leg -> GND, HIGH = ON)"));
    } else if (cmd == "R") {
      autoMode = false;
      setRGB(true, false, false);
      Serial.println(F("🔴 MANUAL: RED ONLY"));
    } else if (cmd == "G") {
      autoMode = false;
      setRGB(false, true, false);
      Serial.println(F("🟢 MANUAL: GREEN ONLY"));
    } else if (cmd == "B") {
      autoMode = false;
      setRGB(false, false, true);
      Serial.println(F("🔵 MANUAL: BLUE ONLY"));
    } else if (cmd == "OFF") {
      autoMode = false;
      setRGB(false, false, false);
      Serial.println(F("⚫ MANUAL: ALL OFF"));
    } else if (cmd == "AUTO") {
      autoMode = true;
      Serial.println(F("▶️ Resuming AUTO color cycle..."));
    }
  }

  if (autoMode) {
    // 1. RED
    Serial.println(F("🔴 [STEP 1/7] Glowing RED (GPIO 25)..."));
    setRGB(true, false, false);
    delay(1500);

    // 2. GREEN
    Serial.println(F("🟢 [STEP 2/7] Glowing GREEN (GPIO 26)..."));
    setRGB(false, true, false);
    delay(1500);

    // 3. BLUE
    Serial.println(F("🔵 [STEP 3/7] Glowing BLUE (GPIO 33)..."));
    setRGB(false, false, true);
    delay(1500);

    // 4. YELLOW (Red + Green)
    Serial.println(F("🟡 [STEP 4/7] Glowing YELLOW (Red + Green)..."));
    setRGB(true, true, false);
    delay(1500);

    // 5. CYAN (Green + Blue)
    Serial.println(F("🔷 [STEP 5/7] Glowing CYAN (Green + Blue)..."));
    setRGB(false, true, true);
    delay(1500);

    // 6. MAGENTA (Red + Blue)
    Serial.println(F("🟣 [STEP 6/7] Glowing MAGENTA (Red + Blue)..."));
    setRGB(true, false, true);
    delay(1500);

    // 7. WHITE (All three)
    Serial.println(F("⚪ [STEP 7/7] Glowing WHITE (All 3)..."));
    setRGB(true, true, true);
    delay(1500);

    // OFF pause
    setRGB(false, false, false);
    delay(500);
  } else {
    delay(100);
  }
}
