#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const FOLLY_FIX =
  "// withFollyCoroutineFix\n#define FOLLY_CFG_NO_COROUTINES 1\n#undef FOLLY_HAS_COROUTINES\n#define FOLLY_HAS_COROUTINES 0\n";

function patchFolly(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes("withFollyCoroutineFix")) return;
  fs.writeFileSync(filePath, FOLLY_FIX + content);
  console.log("[patch] Folly fix:", path.basename(filePath));
}

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) patchDir(full);
    else if (entry.name.endsWith(".cpp") || entry.name.endsWith(".mm"))
      patchFolly(full);
  }
}

const reanimatedRoot = path.join(
  process.cwd(),
  "node_modules/react-native-reanimated"
);
if (!fs.existsSync(reanimatedRoot)) {
  console.log("[patch] nicht gefunden");
  process.exit(0);
}
patchDir(path.join(reanimatedRoot, "Common/cpp"));
patchDir(path.join(reanimatedRoot, "apple"));
console.log("[patch] Fertig");
