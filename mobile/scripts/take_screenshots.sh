#!/bin/bash

# Exit on error
set -e

# Create screenshots directory
WORKSPACE_DIR="$(pwd)"
SCREENSHOTS_DIR="${WORKSPACE_DIR}/screenshots"
mkdir -p "${SCREENSHOTS_DIR}"

echo "============================================="
echo "  DeviceDesk App Store Screenshot Generator"
echo "============================================="
echo "Screenshots will be saved to: ${SCREENSHOTS_DIR}"
echo ""

# 1. Build the app for the simulator
echo "Building DeviceDeskMobile app for iOS Simulator..."
xcodebuild -workspace ios/DeviceDeskMobile.xcworkspace \
           -scheme DeviceDeskMobile \
           -configuration Debug \
           -sdk iphonesimulator \
           -derivedDataPath ios/build \
           ENABLE_USER_SCRIPT_SANDBOXING=NO \
           -quiet

APP_PATH="${WORKSPACE_DIR}/ios/build/Build/Products/Debug-iphonesimulator/DeviceDeskMobile.app"

if [ ! -d "$APP_PATH" ]; then
    echo "ERROR: Compiled app not found at ${APP_PATH}"
    exit 1
fi
echo "Successfully built simulator app bundle at: ${APP_PATH}"
echo ""

# 2. Find latest iOS runtime
RUNTIME_LINE=$(xcrun simctl list runtimes | grep -E '^iOS' | tail -1)
RUNTIME_ID=$(echo "$RUNTIME_LINE" | awk '{print $NF}')
RUNTIME_NAME=$(echo "$RUNTIME_LINE" | awk -F' - ' '{print $1}')

echo "Detected latest iOS runtime: ${RUNTIME_NAME} (${RUNTIME_ID})"
echo ""

# 3. Define App Store required screenshot devices
# Array format: "Display Name|Device Type ID"
DEVICES=(
    "iPhone_6.5_inch|com.apple.CoreSimulator.SimDeviceType.iPhone-13-Pro-Max"
    "iPad_12.9_inch|com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB"
)

# 4. Iterate over devices to boot, run, and take screenshots
for DEV_INFO in "${DEVICES[@]}"; do
    NAME=$(echo "$DEV_INFO" | cut -d'|' -f1)
    TYPE=$(echo "$DEV_INFO" | cut -d'|' -f2)
    
    echo "---------------------------------------------"
    echo "Preparing device: ${NAME}"
    echo "---------------------------------------------"
    
    # Check if a simulator for this device name already exists
    DEV_UUID=$(xcrun simctl list devices | grep -i "${NAME}" | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' | head -n 1 || true)
    
    if [ -z "$DEV_UUID" ]; then
        echo "Creating new simulator '${NAME}'..."
        DEV_UUID=$(xcrun simctl create "${NAME}" "${TYPE}" "${RUNTIME_ID}" 2>/dev/null || true)
    fi
    
    # Verify if DEV_UUID is a valid UUID pattern
    if [[ ! "$DEV_UUID" =~ ^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$ ]]; then
        echo "⚠️ Warning: Device '${NAME}' (${TYPE}) is incompatible with runtime ${RUNTIME_NAME}. Skipping..."
        echo ""
        continue
    fi
    
    echo "Booting simulator: ${NAME} (UUID: ${DEV_UUID})..."
    xcrun simctl boot "${DEV_UUID}" || true
    open -a Simulator
    
    echo "Waiting for simulator to finish booting..."
    xcrun simctl bootstatus "${DEV_UUID}" -b > /dev/null 2>&1 || true
    sleep 3
    
    echo "Installing app onto simulator..."
    xcrun simctl install "${DEV_UUID}" "$APP_PATH"
    
    echo "Launching App..."
    xcrun simctl launch "${DEV_UUID}" com.devicedesk.app
    
    mkdir -p "${SCREENSHOTS_DIR}/${NAME}"
    
    SCREEN_NUM=1
    while true; do
        echo ""
        read -p "👉 Navigate to screen #${SCREEN_NUM} in Simulator. Press [Enter] to capture, or type 'next' to finish this device: " USER_INPUT
        
        if [ "$USER_INPUT" = "next" ]; then
            break
        fi
        
        FILE_PATH="${SCREENSHOTS_DIR}/${NAME}/screenshot_${SCREEN_NUM}.png"
        echo "Capturing screenshot..."
        xcrun simctl io "${DEV_UUID}" screenshot "${FILE_PATH}"
        echo "✅ Saved: ${FILE_PATH}"
        
        # If this is the 6.5" iPhone, auto-generate the 5.5" iPhone screenshot (1242 x 2208 px)
        if [ "$NAME" = "iPhone_6.5_inch" ]; then
            FILE_5_5_DIR="${SCREENSHOTS_DIR}/iPhone_5.5_inch"
            mkdir -p "${FILE_5_5_DIR}"
            FILE_5_5_PATH="${FILE_5_5_DIR}/screenshot_${SCREEN_NUM}.png"
            echo "Auto-generating 5.5\" iPhone version (1242 x 2208 px)..."
            sips -z 2208 1242 "${FILE_PATH}" --out "${FILE_5_5_PATH}" > /dev/null 2>&1
            echo "✅ Saved: ${FILE_5_5_PATH}"
        fi
        
        SCREEN_NUM=$((SCREEN_NUM + 1))
    done
    
    echo "Shutting down ${NAME}..."
    xcrun simctl shutdown "${DEV_UUID}"
    echo ""
done

echo "============================================="
echo "🎉 Finished! Screenshots are ready in:"
echo "   ${SCREENSHOTS_DIR}"
echo "============================================="
