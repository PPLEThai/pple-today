#!/bin/bash

# Ensure the script is run from the project directory
cd "$(dirname "$0")/.."
mkdir -p ./credentials

echo "$FIREBASE_IOS_SERVICE_FILE" | base64 -d > ./credentials/GoogleService-Info.plist
echo "$FIREBASE_ANDROID_SERVICE_FILE" | base64 -d > ./credentials/google-services.json
