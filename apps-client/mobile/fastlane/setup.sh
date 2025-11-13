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

if [ ! -d "./android" ]; then
  echo "Warning: The 'android' directory does not exist. Please ensure you have run \`expo prebuild\` first."
else
  cp -r ./fastlane/android/* ./android
  echo "Fastlane directory copied to android folder."
  source .env  
  if [ -z "$FIREBASE_ANDROID_SERVICE_FILE" ]; then
    echo "Warning: FIREBASE_ANDROID_SERVICE_FILE environment variable is not set."
  else
    echo $FIREBASE_ANDROID_SERVICE_FILE | base64 -d > ./android/key.json
    echo "Firebase service account JSON file created at ./android/key.json."
  fi
  if [ -z "$ANDROID_UPLOAD_KEYSTORE" ]; then
    echo "Warning: ANDROID_UPLOAD_KEYSTORE environment variable is not set."
  else
    echo $ANDROID_UPLOAD_KEYSTORE | base64 -d > ./android/upload-keystore.jks
    cp ./android/upload-keystore.jks ./android/app/upload-keystore.jks
    echo "Android upload keystore file created at ./android/upload-keystore.jks."
  fi

  cp .env ./android/fastlane/.env.default
  echo "Fastlane environment variables file created at ./android/fastlane/.env.default"
fi
if [ ! -d "./ios" ]; then
  echo "Warning: The 'ios' directory does not exist. Please ensure you have run \`expo prebuild\` first."
else 
  cp -r ./fastlane/ios/* ./ios
  echo "Fastlane directory copied to ios folder."

  cp .env ./ios/fastlane/.env.default
  echo "Fastlane environment variables file created at ./ios/fastlane/.env.default"
fi
