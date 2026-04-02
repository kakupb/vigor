#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const FOLLY_FIX =
  "// withFollyCoroutineFix\n#define FOLLY_CFG_NO_COROUTINES 1\n#undef FOLLY_HAS_COROUTINES\n#define FOLLY_HAS_COROUTINES 0\n";

// Fix 1: FOLLY_HAS_COROUTINES für alle .cpp Dateien
function patchFolly(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("withFollyCoroutineFix")) return;
  fs.writeFileSync(filePath, FOLLY_FIX + content);
  console.log("[patch] Folly fix:", path.basename(filePath));
}

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) patchDir(full);
    else if (entry.name.endsWith(".cpp")) patchFolly(full);
  }
}

// Fix 2: shadowTreeDidMount Signatur — RN 0.81.5 hat double mountTime entfernt
function patchMountHook(reanimatedDir) {
  const headerPath = path.join(
    reanimatedDir,
    "reanimated/Fabric/ReanimatedMountHook.h"
  );
  const cppPath = path.join(
    reanimatedDir,
    "reanimated/Fabric/ReanimatedMountHook.cpp"
  );

  if (fs.existsSync(headerPath)) {
    let content = fs.readFileSync(headerPath, "utf8");
    const before = content;
    // Entferne ", double mountTime" aus dem Funktionsparameter
    content = content.replace(
      /,\s*\n(\s*)double mountTime(\s*\)\s*noexcept\s*override)/g,
      "$2"
    );
    content = content.replace(
      /,\s*double mountTime(\s*\)\s*noexcept\s*override)/g,
      "$1"
    );
    if (content !== before) {
      fs.writeFileSync(headerPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.h");
    }
  }

  if (fs.existsSync(cppPath)) {
    let content = fs.readFileSync(cppPath, "utf8");
    const before = content;
    // Entferne ", double mountTime" aus der Implementierung
    content = content.replace(
      /,\s*\n(\s*)double mountTime(\s*\)\s*noexcept\s*\{)/g,
      "$2"
    );
    content = content.replace(
      /,\s*double mountTime(\s*\)\s*noexcept\s*\{)/g,
      "$1"
    );
    // mountTime Variable durch 0.0 ersetzen falls noch verwendet
    content = content.replace(/\bmountTime\b/g, "0.0");
    if (content !== before) {
      fs.writeFileSync(cppPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.cpp");
    }
  }
}

const root = process.cwd();
const cppDir = path.join(
  root,
  "node_modules/react-native-reanimated/Common/cpp"
);

if (!fs.existsSync(cppDir)) {
  console.log("[patch] react-native-reanimated nicht gefunden, überspringe");
  process.exit(0);
}

patchDir(cppDir);
patchMountHook(cppDir);
console.log("[patch] Fertig");
