import fs from "node:fs";
import path from "node:path";

const androidRoot = path.resolve("android");
if (!fs.existsSync(androidRoot)) {
  console.log("Android project not generated yet; native playback templates are ready for the next generation run.");
  process.exit(0);
}

const packageDir = path.join(androidRoot, "app", "src", "main", "java", "com", "musek", "app");
const playbackDir = path.join(packageDir, "playback");
fs.mkdirSync(playbackDir, { recursive: true });
for (const file of ["MusekPlaybackPlugin.kt", "MusekPlaybackService.kt"]) {
  fs.copyFileSync(path.resolve("native", "android", file), path.join(playbackDir, file));
}

const gradlePath = path.join(androidRoot, "app", "build.gradle");
if (!fs.existsSync(gradlePath)) throw new Error("Android app/build.gradle was not found.");
let gradle = fs.readFileSync(gradlePath, "utf8");
if (!gradle.includes("androidx.media3:media3-exoplayer")) {
  if (!/dependencies\s*\{/.test(gradle)) throw new Error("Could not find dependencies block in app/build.gradle.");
  gradle = gradle.replace(/dependencies\s*\{/, match => match + '\n    implementation "androidx.media3:media3-exoplayer:1.4.1"\n    implementation "androidx.media3:media3-session:1.4.1"');
  fs.writeFileSync(gradlePath, gradle);
}

const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");
const permissions = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.WAKE_LOCK"
];
for (const permission of permissions) {
  if (!manifest.includes(`android:name="${permission}"`)) {
    manifest = manifest.replace("<application", `<uses-permission android:name="${permission}" />\n    <application`);
  }
}
if (!manifest.includes("MusekPlaybackService")) {
  manifest = manifest.replace("</application>", `
        <service
            android:name="com.musek.app.playback.MusekPlaybackService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
                <action android:name="android.media.browse.MediaBrowserService" />
            </intent-filter>
        </service>
    </application>`);
}
fs.writeFileSync(manifestPath, manifest);

const javaRoot = path.join(androidRoot, "app", "src", "main", "java");
function findMainActivity(directory) {
  if (!fs.existsSync(directory)) return null;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(fullPath);
      if (found) return found;
    } else if (entry.name === "MainActivity.kt" || entry.name === "MainActivity.java") {
      return fullPath;
    }
  }
  return null;
}

const activityPath = findMainActivity(javaRoot);
if (!activityPath) throw new Error("Could not locate MainActivity.kt or MainActivity.java under " + javaRoot);
let activity = fs.readFileSync(activityPath, "utf8");
if (!activity.includes("MusekPlaybackPlugin")) {
  if (activityPath.endsWith(".kt")) {
    activity = activity.replace(/(package [^\\n]+\\n)/, '$1\\nimport com.musek.app.playback.MusekPlaybackPlugin\\n');
    activity = activity.replace(/class MainActivity\\s*:\\s*BridgeActivity(?:\\(\\))?\\s*(?:\\{\\s*\\})?/, `class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(MusekPlaybackPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}`);
    if (!activity.includes("registerPlugin(MusekPlaybackPlugin::class.java)")) {
      throw new Error("Could not safely register MusekPlaybackPlugin in Kotlin MainActivity.");
    }
  } else {
    if (!activity.includes("import com.musek.app.playback.MusekPlaybackPlugin;")) {
      activity = activity.replace(/(package [^;]+;)/, '$1\\n\\nimport com.musek.app.playback.MusekPlaybackPlugin;');
    }
    activity = activity.replace(/public class MainActivity extends BridgeActivity\\s*\\{\\s*\\}/, `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MusekPlaybackPlugin.class);
        super.onCreate(savedInstanceState);
    }
}`);
    if (!activity.includes("registerPlugin(MusekPlaybackPlugin.class);")) {
      throw new Error("Could not safely register MusekPlaybackPlugin in Java MainActivity.");
    }
  }
  fs.writeFileSync(activityPath, activity);
}
console.log("Configured Android Media3 background playback service and Capacitor bridge.");
