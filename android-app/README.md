# Gesture Recognition Android App

A simple WebView-based Android app for the Gesture Recognition system.

## Features

- 📱 Full-screen WebView for the gesture app
- ⚙️ Configurable server URL (tap menu → Settings)
- 🔄 Refresh button
- 📷 Camera permission handling for WebRTC
- 💾 URL persistence across app restarts

## Setup

### Option 1: Open in Android Studio

1. Open Android Studio
2. File → Open → Select the `android-app` folder
3. Wait for Gradle sync to complete
4. Click Run (▶️) to build and install

### Option 2: Build via Command Line

```bash
cd android-app

# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease
```

The APK will be in: `app/build/outputs/apk/debug/app-debug.apk`

## Configuration

### Change Default URL

Edit `MainActivity.java` line 24:
```java
private static final String DEFAULT_URL = "http://YOUR_SERVER:PORT";
```

### Or at Runtime

1. Open the app
2. Tap the ⚙️ (Settings) icon in the toolbar
3. Enter your server URL
4. Tap "Save"

## Requirements

- Android 7.0 (API 24) or higher
- Internet connection
- Camera permission (for gesture recognition via webcam)

## Build APK for Distribution

```bash
./gradlew assembleRelease
```

For signed release APK, you'll need to configure signing in `app/build.gradle`.
