/*
 * ============================================================================
 *  TEST 2: 0.96" I2C SSD1306 OLED DISPLAY (128x64) DIAGNOSTIC TOOL
 * ============================================================================
 *  Use this sketch to test your 0.96" OLED display in complete isolation.
 *  It checks I2C address detection, pixel drawing, contrast, and interactive text.
 *
 *  HARDWARE CONNECTIONS (ESP32 38-Pin DevKit):
 *  ----------------------------------------------------------------------------
 *  OLED Pin Name   ESP32 Pin        Description
 *  ----------------------------------------------------------------------------
 *  VCC             3V3              3.3V Power
 *  GND             GND              Ground (Common)
 *  SCL / SCK       GPIO 22          I2C Clock
 *  SDA             GPIO 21          I2C Data
 *  ----------------------------------------------------------------------------
 *
 *  LIBRARIES REQUIRED (Arduino IDE -> Manage Libraries):
 *  1. Adafruit SSD1306
 *  2. Adafruit GFX Library
 *
 *  HOW TO USE:
 *  1. Upload this sketch to your ESP32
 *  2. Open Serial Monitor (115200 baud)
 *  3. Look at both Serial Monitor and the OLED screen.
 *  4. You can also TYPE any text into Serial Monitor to display it on OLED!
 * ============================================================================
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_SDA_PIN  21
#define OLED_SCL_PIN  22

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

uint8_t oledAddress = 0;
int testFrame = 0;

void printBanner() {
  Serial.println(F("\n======================================================="));
  Serial.println(F("     🖥️  0.96\" SSD1306 OLED DISPLAY DIAGNOSTIC TOOL    "));
  Serial.println(F("======================================================="));
  Serial.println(F("ESP32 Pins: SDA->GPIO 21, SCL->GPIO 22, VCC->3V3, GND->GND\n"));
}

uint8_t scanI2C() {
  Serial.println(F("[I2C SCANNER] Scanning I2C bus on GPIO 21 (SDA) and GPIO 22 (SCL)..."));
  uint8_t foundAddr = 0;
  int nDevices = 0;

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
      Serial.printf("  ✅ I2C Device found at address: 0x%02X ", addr);
      if (addr == 0x3C) {
        Serial.println(F("(Standard 0.96\" SSD1306 OLED)"));
        foundAddr = addr;
      } else if (addr == 0x3D) {
        Serial.println(F("(Alternate SSD1306 OLED)"));
        foundAddr = addr;
      } else {
        Serial.println(F("(Other I2C device)"));
      }
      nDevices++;
    }
  }

  if (nDevices == 0) {
    Serial.println(F("❌ No I2C devices found!"));
    Serial.println(F("CHECK WIRING:"));
    Serial.println(F("  - SDA -> GPIO 21"));
    Serial.println(F("  - SCL -> GPIO 22"));
    Serial.println(F("  - VCC -> 3V3"));
    Serial.println(F("  - GND -> GND"));
  }
  return foundAddr;
}

void showScreenInfo(uint8_t addr) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Top header bar
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(6, 2);
  display.print(F("FLY MEDIA TECH"));

  // Body content
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 18);
  display.println(F("OLED Status: OK! [v]"));
  display.printf("I2C Addr: 0x%02X\n", addr);
  display.println(F("Res: 128x64 px"));
  display.printf("Frame: #%d\n", testFrame);

  // Bottom border line
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
  display.display();
}

void runVisualTests() {
  Serial.println(F("\n[TEST 1] Pixel Pattern Test (Check for dead pixels/lines)..."));
  
  // Full white screen test
  display.clearDisplay();
  display.fillRect(0, 0, 128, 64, SSD1306_WHITE);
  display.display();
  delay(1200);

  // Outer border test
  display.clearDisplay();
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
  display.drawRect(2, 2, 124, 60, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(16, 28);
  display.print(F("BORDER CHECK OK"));
  display.display();
  delay(1200);

  // Contrast / Inversion test
  Serial.println(F("[TEST 2] Inversion & Contrast Test..."));
  display.invertDisplay(true);
  delay(600);
  display.invertDisplay(false);
  delay(600);

  Serial.println(F("\n✅ OLED hardware tests completed successfully!"));
  Serial.println(F("💡 You can type any text in Serial Monitor to display it on OLED!\n"));
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  printBanner();

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  oledAddress = scanI2C();

  if (oledAddress == 0) {
    // Default fallback try 0x3C
    oledAddress = 0x3C;
  }

  Serial.printf("\nInitializing SSD1306 OLED at 0x%02X...\n", oledAddress);
  if (!display.begin(SSD1306_SWITCHCAPVCC, oledAddress)) {
    Serial.println(F("❌ SSD1306 allocation failed! Check power and connections."));
    while (true) delay(1000);
  }

  Serial.println(F("✅ OLED Initialized successfully!"));
  runVisualTests();
}

void loop() {
  // Check if user typed a message to display
  if (Serial.available()) {
    String msg = Serial.readStringUntil('\n');
    msg.trim();
    if (msg.length() > 0) {
      Serial.printf("Showing on OLED: '%s'\n", msg.c_str());
      display.clearDisplay();
      display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
      display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(4, 2);
      display.print(F("CUSTOM MESSAGE"));

      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(2);
      display.setCursor(4, 24);
      display.print(msg.substring(0, 10)); // Truncate to fit
      
      display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
      display.display();
      delay(3000);
    }
  }

  // Update status screen with live heartbeat counter
  testFrame++;
  showScreenInfo(oledAddress);
  delay(1000);
}
