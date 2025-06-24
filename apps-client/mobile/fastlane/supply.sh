#!/bin/bash
# This script initializes Fastlane supply for the Android project and copies metadata files.

# Ensure the script is run from the project directory
cd "$(dirname "$0")/.."
# echo "Current directory: $(pwd)"

# Copy the Fastlane directory to the android folder
if [ ! -d "./android" ]; then
  echo "Error: The 'android' directory does not exist. Please ensure you are in the correct project directory."
  exit 1
fi
cp -r ./fastlane/android/ ./android

# Load environment variables
# source .env

# Run Fastlane
pushd ./android
fastlane supply init --track internal 
popd

# Copy metadata files to the Fastlane directory
cp -r ./android/fastlane/metadata/ ./fastlane/android/fastlane/metadata/
