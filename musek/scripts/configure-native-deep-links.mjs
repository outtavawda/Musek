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
