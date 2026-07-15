#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "==> Installing dependencies"
npm ci

echo "==> Generating native Android project"
rm -rf android
npx expo prebuild --platform android --non-interactive

echo "==> Building debug APK with Gradle (no Expo token required)"
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon

mkdir -p /app/dist
cp app/build/outputs/apk/debug/app-debug.apk /app/dist/live-tv-debug.apk

echo "==> Build complete"
ls -lh /app/dist/live-tv-debug.apk
echo "APK ready: dist/live-tv-debug.apk"
