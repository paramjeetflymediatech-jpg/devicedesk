# 🔬 ESP32 Biometric Hardware Diagnostic Suite

Welcome to the standalone hardware testing suite for the Fly Media Technology Biometric Lab Door system. Each component has its own dedicated folder containing:
1. **Isolated Arduino Test Sketch (`.ino`)** — Tests only that specific component without any Wi-Fi, database, or server dependencies.
2. **High-Resolution Wiring Diagram (`.png`)** — Exact pinouts for the 38-Pin ESP32 DevKit.

---

## 📁 Test Folders Overview

| Test # | Folder | Component | ESP32 Pins | Diagnostic Key Features |
|---|---|---|---|---|
| **Test 1** | [`test_r307_fingerprint/`](file:///d:/Tanmay/Desktop%20Support/esp32/hardware_tests/test_r307_fingerprint/test_r307_fingerprint.ino) | **R307 Optical Fingerprint** | `VCC->V5 (5V)`, `GND->GND`, `TX->G16`, `RX->G17` | Auto-detects baud rate, checks optical camera, controls Aura blue light, live finger scan test |
| **Test 2** | [`test_oled_display/`](file:///d:/Tanmay/Desktop%20Support/esp32/hardware_tests/test_oled_display/test_oled_display.ino) | **0.96" SSD1306 OLED** | `VCC->3V3`, `GND->GND`, `SDA->G21`, `SCL->G22` | I2C scanner (`0x3C`), pixel test, border box, interactive text from Serial Monitor |
| **Test 3** | [`test_rgb_led/`](file:///d:/Tanmay/Desktop%20Support/esp32/hardware_tests/test_rgb_led/test_rgb_led.ino) | **5mm RGB LED (4-Pin)** | `Red->G25`, `Green->G26`, `Blue->G33`, `Longest->3V3/GND` | Cycles R/G/B/Yellow/Cyan/White, toggles Common Anode vs Common Cathode mode with 'A'/'C' |
| **Test 4** | [`test_buzzer/`](file:///d:/Tanmay/Desktop%20Support/esp32/hardware_tests/test_buzzer/test_buzzer.ino) | **Active / Passive Buzzer** | `VCC->3V3`, `GND->GND`, `I/O->G27` | Tests Active-HIGH, Active-LOW, and PWM Musical Frequencies (2kHz-4kHz) |

---

## ⚡ Quick Troubleshooting Guide

### 1. R307 Fingerprint Sensor Blue Light Rapid Blinking
- **Primary Cause**: VCC connected to `3.3V` instead of `5V`. The optical sensor draws up to 120mA during imaging and brownouts on 3.3V. **Plug VCC into `V5` (or `VIN`)!**
- **TX/RX Swapped**: Sensor TX must connect to ESP32 RX (`GPIO 16`), Sensor RX must connect to ESP32 TX (`GPIO 17`).

### 2. RGB LED Not Turning ON
- Check which pin is the **Longest Pin (Leg 2)**.
- If Common Anode: Connect Leg 2 to `3V3`.
- If Common Cathode: Connect Leg 2 to `GND`, and type `C` in Serial Monitor.
- Always use `220Ω` resistors on Red, Green, and Blue legs!

### 3. Buzzer Silent
- If it only clicks: You have a **Passive Buzzer**. It requires frequency waves (Phase C in `test_buzzer.ino`).
- If you have an Active Buzzer module with a transistor, it might be **Active-LOW** (Phase B in `test_buzzer.ino`).
