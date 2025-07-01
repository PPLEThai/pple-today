#!/bin/bash
# Run this file after running `expo prebuild` to set up Fastlane for Android.

# Ensure the script is run from the project directory
cd "$(dirname "$0")/.."
# echo "Current directory: $(pwd)"

# Load environment variables
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create a .env file with the required environment variables."
  exit 1
fi
export $(cat .env | xargs)

if [ ! -d "./android" ]; then
  echo "Warning: The 'android' directory does not exist. Please ensure you have run \`expo prebuild\` first."
else
  cp -r ./fastlane/android/* ./android
  echo "Fastlane directory copied to android folder."

  if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
    echo "Error: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set."
  else
    echo $FIREBASE_SERVICE_ACCOUNT_JSON | base64 -d > ./android/key.json
    echo "Firebase service account JSON file created at ./android/key.json."
  fi
fi
if [ ! -d "./ios" ]; then
  echo "Warning: The 'ios' directory does not exist. Please ensure you have run \`expo prebuild\` first."
else 
  cp -r ./fastlane/ios/* ./ios
  echo "Fastlane directory copied to ios folder."

  echo "FASTLANE_USER=$FASTLANE_USER\nFASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=$FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD" > ./ios/fastlane/.env.default
  echo "Fastlane TestFlight environment variables file created at ./ios/fastlane/.env.default"
fi
