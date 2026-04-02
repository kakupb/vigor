#!/usr/bin/env node
// Patcht react-native-reanimated .cpp Dateien damit FOLLY_HAS_COROUTINES=0 ist
// Verhindert den Fehler: 'folly/coro/Coroutine.h' file not found
const fs = require("fs");
const path = require("path");

const PATCH =
  "// withFollyCoroutineFix\n#define FOLLY_CFG_NO_COROUTINES 1\n#undef FOLLY_HAS_COROUTINES\n#define FOLLY_HAS_COROUTINES 0\n";

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("withFollyCoroutineFix")) return;
  fs.writeFileSync(filePath, PATCH + content);
  console.log(
    "[patchReanimated] Patched:",
    path.relative(process.cwd(), filePath)
  );
}

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) patchDir(full);
    else if (entry.name.endsWith(".cpp")) patchFile(full);
  }
}

const cppDir = path.join(
  __dirname,
  "../node_modules/react-native-reanimated/Common/cpp"
);
if (!fs.existsSync(cppDir)) {
  console.log("[patchReanimated] react-native-reanimated not found, skipping");
  process.exit(0);
}

patchDir(cppDir);
console.log("[patchReanimated] Done");
