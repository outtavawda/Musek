import fs from "node:fs";
import path from "node:path";

const iosInfo = path.join("ios", "App", "App", "Info.plist");
if (fs.existsSync(iosInfo)) {
  let plist = fs.readFileSync(iosInfo, "utf8");
  if (!plist.includes("<string>musek</string>")) {
    const urlTypes = `
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key><string>com.musek.app</string>
      <key>CFBundleURLSchemes</key><array><string>musek</string></array>
    </dict>
  </array>`;
    plist = plist.replace(/<\/dict>\s*<\/plist>/, urlTypes + "\n</dict>\n</plist>");
  }
  if (!plist.includes("<string>audio</string>")) {
    const background = `
  <key>UIBackgroundModes</key>
  <array><string>audio</string></array>`;
    plist = plist.replace(/<\/dict>\s*<\/plist>/, background + "\n</dict>\n</plist>");
  }
  fs.writeFileSync(iosInfo, plist);
}

const iosAppDelegate = path.join("ios", "App", "App", "AppDelegate.swift");
if (fs.existsSync(iosAppDelegate)) {
  let appDelegate = fs.readFileSync(iosAppDelegate, "utf8");
  if (!appDelegate.includes("AVAudioSession.sharedInstance().setCategory(.playback")) {
    if (!appDelegate.includes("import AVFoundation")) {
      appDelegate = appDelegate.replace("import UIKit", "import UIKit\nimport AVFoundation");
    }
    const launchMethod = /(func application\\([\\s\\S]*?didFinishLaunchingWithOptions[\\s\\S]*?-> Bool \\{)/;
    if (launchMethod.test(appDelegate)) {
      appDelegate = appDelegate.replace(launchMethod, `$1
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default, options: [.allowBluetooth, .allowAirPlay])
            try audioSession.setActive(true)
        } catch {
            NSLog("MUSEK audio session setup failed: %@", error.localizedDescription)
        }`);
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
    manifest = manifest.replace(/(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*>)/, `$1
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="musek" />
            </intent-filter>`);
  }
  if (!manifest.includes("android.permission.FOREGROUND_SERVICE")) {
    manifest = manifest.replace("<application", `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <application`);
  }
  fs.writeFileSync(androidManifest, manifest);
}
