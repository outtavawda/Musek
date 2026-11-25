import fs from "node:fs";
import path from "node:path";

const androidRoot = path.resolve("android");
if (!fs.existsSync(androidRoot)) {
  console.log("Android project not generated yet; native playback templates are ready for the next generation run.");
  process.exit(0);
}

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
const isKotlin = activityPath.endsWith(".kt");
let activity = fs.readFileSync(activityPath, "utf8");
const packageMatch = activity.match(isKotlin ? /^package\s+([\w.]+)/m : /^package\s+([\w.]+);/m);
if (!packageMatch) throw new Error("Could not read the Android MainActivity package declaration.");
const appPackage = packageMatch[1];
const packageDir = path.join(javaRoot, ...appPackage.split("."));
const playbackDir = path.join(packageDir, "playback");
fs.mkdirSync(playbackDir, { recursive: true });

for (const file of ["MusekPlaybackPlugin.kt", "MusekPlaybackService.kt"]) {
  const sourcePath = path.resolve("native", "android", file);
  let source = fs.readFileSync(sourcePath, "utf8");
  if (!/^package\s+[\w.]+/m.test(source)) {
    throw new Error("Could not read package declaration in native template " + file);
  }
  source = source.replace(/^package\s+[\w.]+/m, "package " + appPackage + ".playback");
  fs.writeFileSync(path.join(playbackDir, file), source);
}

// Capacitor 6 uses a Groovy root build.gradle with a buildscript dependencies block.
const rootGradlePath = path.join(androidRoot, "build.gradle");
if (!fs.existsSync(rootGradlePath)) throw new Error("Android root build.gradle was not found.");
let rootGradle = fs.readFileSync(rootGradlePath, "utf8");
if (!rootGradle.includes("kotlin-gradle-plugin")) {
  const buildscriptStart = rootGradle.indexOf("buildscript {");
  const dependenciesStart = buildscriptStart < 0 ? -1 : rootGradle.indexOf("dependencies {", buildscriptStart);
  if (dependenciesStart < 0) {
    throw new Error("Could not find buildscript dependencies in Android root build.gradle.");
  }
  const insertAt = dependenciesStart + "dependencies {".length;
  rootGradle = rootGradle.slice(0, insertAt) +
    '\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24"' +
    rootGradle.slice(insertAt);
  fs.writeFileSync(rootGradlePath, rootGradle);
}

const gradlePath = path.join(androidRoot, "app", "build.gradle");
if (!fs.existsSync(gradlePath)) throw new Error("Android app/build.gradle was not found.");
let gradle = fs.readFileSync(gradlePath, "utf8");

const androidBlock = /android\s*\{/;
if (!androidBlock.test(gradle)) {
  throw new Error("Could not find the android block in app/build.gradle to align Kotlin and Java JVM targets.");
}
if (/kotlinOptions\s*\{/.test(gradle)) {
  if (/jvmTarget\s*=/.test(gradle)) {
    gradle = gradle.replace(/jvmTarget\s*=\s*["'][^"']+["']/, 'jvmTarget = "17"');
  } else {
    gradle = gradle.replace(/kotlinOptions\s*\{/, 'kotlinOptions { jvmTarget = "17"');
  }
} else {
  gradle = gradle.replace(androidBlock, match => match + '\n    kotlinOptions { jvmTarget = "17" }');
}
if (!gradle.includes("kotlin-android")) {
  gradle = "apply plugin: 'kotlin-android'\n" + gradle;
}
if (!gradle.includes("androidx.media3:media3-exoplayer")) {
  const dependenciesStart = gradle.indexOf("dependencies {");
  if (dependenciesStart < 0) throw new Error("Could not find dependencies block in app/build.gradle.");
  const insertAt = dependenciesStart + "dependencies {".length;
  gradle = gradle.slice(0, insertAt) +
    '\n    implementation "androidx.media3:media3-exoplayer:1.4.1"' +
    '\n    implementation "androidx.media3:media3-session:1.4.1"' +
    gradle.slice(insertAt);
}
fs.writeFileSync(gradlePath, gradle);

const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");
const permissions = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.WAKE_LOCK"
];
for (const permission of permissions) {
  if (!manifest.includes('android:name="' + permission + '"')) {
    manifest = manifest.replace("<application", '    <uses-permission android:name="' + permission + '" />\n    <application');
  }
}
if (!manifest.includes("MusekPlaybackService")) {
  const serviceBlock = '        <service\n' +
    '            android:name="' + appPackage + '.playback.MusekPlaybackService"\n' +
    '            android:exported="true"\n' +
    '            android:foregroundServiceType="mediaPlayback">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="androidx.media3.session.MediaSessionService" />\n' +
    '                <action android:name="android.media.browse.MediaBrowserService" />\n' +
    '            </intent-filter>\n' +
    '        </service>\n';
  manifest = manifest.replace("</application>", serviceBlock + "    </application>");
}
fs.writeFileSync(manifestPath, manifest);

if (!activity.includes("MusekPlaybackPlugin")) {
  if (isKotlin) {
    const importLine = "import " + appPackage + ".playback.MusekPlaybackPlugin";
    if (!activity.includes(importLine)) {
      activity = activity.replace(packageMatch[0], packageMatch[0] + "\n\n" + importLine);
    }
    const classStart = /class\s+MainActivity\s*:\s*BridgeActivity(?:\(\))?\s*\{/;
    if (!classStart.test(activity)) throw new Error("Could not locate the Kotlin MainActivity class body.");
    activity = activity.replace(classStart, match => match +
      "\n    override fun onCreate(savedInstanceState: android.os.Bundle?) {\n" +
      "        registerPlugin(MusekPlaybackPlugin::class.java)\n" +
      "        super.onCreate(savedInstanceState)\n" +
      "    }\n");
  } else {
    const importLine = "import " + appPackage + ".playback.MusekPlaybackPlugin;";
    if (!activity.includes(importLine)) {
      activity = activity.replace(packageMatch[0], packageMatch[0] + "\n\n" + importLine);
    }
    const classStart = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/;
    if (!classStart.test(activity)) throw new Error("Could not locate the Java MainActivity class body.");
    activity = activity.replace(classStart, match => match +
      "\n    @Override\n" +
      "    public void onCreate(android.os.Bundle savedInstanceState) {\n" +
      "        registerPlugin(MusekPlaybackPlugin.class);\n" +
      "        super.onCreate(savedInstanceState);\n" +
      "    }\n");
  }
  fs.writeFileSync(activityPath, activity);
}
console.log("Configured Android Media3 background playback service and Capacitor bridge.");
