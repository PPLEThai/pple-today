#!/bin/bash
# This script initializes Fastlane supply for the Android project and copies metadata back.

# Ensure the script is run from the project directory
cd "$(dirname "$0")/.."
# echo "Current directory: $(pwd)"

# Run Fastlane
pushd ./android
fastlane supply init --track internal 
popd

# Copy metadata files to the Fastlane directory
cp -r ./android/fastlane/metadata/ ./fastlane/android/fastlane/metadata/
