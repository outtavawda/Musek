import fs from "node:fs";
import path from "node:path";

const iosInfo = path.join("ios", "App", "App", "Info.plist");
if (fs.existsSync(iosInfo)) {
  let plist = fs.readFileSync(iosInfo, "utf8");
  if (!plist.includes("<string>musek</string>")) {
    const urlTypes = "\n  <key>CFBundleURLTypes</key>\n  <array>\n    <dict>\n      <key>CFBundleURLName</key><string>com.musek.app</string>\n      <key>CFBundleURLSchemes</key><array><string>musek</string></array>\n    </dict>\n  </array>";
    plist = plist.replace(/<\/dict>\s*<\/plist>/, urlTypes + "\n</dict>\n</plist>");
  }
  if (!plist.includes("<string>audio</string>")) {
    const background = "\n  <key>UIBackgroundModes</key>\n  <array><string>audio</string></array>";
    plist = plist.replace(/<\/dict>\s*<\/plist>/, background + "\n</dict>\n</plist>");
  }
  fs.writeFileSync(iosInfo, plist);
}

const iosAppDelegate = path.join("ios", "App", "App", "AppDelegate.swift");
if (fs.existsSync(iosAppDelegate)) {
  let appDelegate = fs.readFileSync(iosAppDelegate, "utf8");
  if (!appDelegate.includes("YASUH audio session setup failed")) {
    if (!appDelegate.includes("import AVFoundation")) {
      appDelegate = appDelegate.replace("import UIKit", "import UIKit\nimport AVFoundation");
    }
    const launchMethod = /func\s+application\s*\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?->\s*Bool\s*\{/;
    if (launchMethod.test(appDelegate)) {
      appDelegate = appDelegate.replace(launchMethod, function (match) {
        return match + "\n        do {\n            let audioSession = AVAudioSession.sharedInstance()\n            try audioSession.setCategory(.playback, mode: .default, options: [.allowBluetooth, .allowAirPlay])\n            try audioSession.setActive(true)\n        } catch {\n            NSLog(\"YASUH audio session setup failed: %@\", error.localizedDescription)\n        }";
      });
    } else {
      console.warn("Could not locate AppDelegate launch method to configure AVAudioSession.");
    }
    fs.writeFileSync(iosAppDelegate, appDelegate);
  }
}

const androidManifest = path.join("android", "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(androidManifest)) {
  let manifest = fs.readFileSync(androidManifest, "utf8");
  if (!manifest.includes('android:scheme="musek"')) {
    const activityTag = /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*>)/;
    if (activityTag.test(manifest)) {
      const filter = "\n            <intent-filter>\n                <action android:name=\"android.intent.action.VIEW\" />\n                <category android:name=\"android.intent.category.DEFAULT\" />\n                <category android:name=\"android.intent.category.BROWSABLE\" />\n                <data android:scheme=\"musek\" />\n            </intent-filter>";
      manifest = manifest.replace(activityTag, "$1" + filter);
    }
  }
  if (!manifest.includes("android.permission.FOREGROUND_SERVICE")) {
    manifest = manifest.replace("<application", '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />\n    <application');
  }
  fs.writeFileSync(androidManifest, manifest);
}
