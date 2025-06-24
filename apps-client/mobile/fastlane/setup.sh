#!/bin/bash
# Run this file after running `expo prebuild` to set up Fastlane for Android.

# Ensure the script is run from the project directory
cd "$(dirname "$0")/.."
# echo "Current directory: $(pwd)"

# Load environment variables
source .env

# Copy the Fastlane directory to the android folder
if [ ! -d "./android" ]; then
  echo "Error: The 'android' directory does not exist. Please ensure you have run \`expo prebuild\` first."
  exit 1
fi
# TODO: copy ios
if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
  echo "Error: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set."
  exit 1
fi
echo $FIREBASE_SERVICE_ACCOUNT_JSON | base64 -d > ./android/key.json
echo "Firebase service account JSON file created at ./android/key.json."

cp -r ./fastlane/android/ ./android
echo "Fastlane directory copied to android folder."
