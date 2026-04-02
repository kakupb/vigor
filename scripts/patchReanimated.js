#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const FOLLY_FIX =
  "// withFollyCoroutineFix\n#define FOLLY_CFG_NO_COROUTINES 1\n#undef FOLLY_HAS_COROUTINES\n#define FOLLY_HAS_COROUTINES 0\n";

// Fix 1: FOLLY_HAS_COROUTINES für alle .cpp und .mm Dateien
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

// Fix 2: ReanimatedMountHook — shadowTreeDidMount Inkompatibilität mit RN 0.81.5
// Das .h deklariert override, aber die Basisklasse hat die Signatur geändert.
// Lösung: 'override' entfernen + beide Signaturen vereinheitlichen (kein double Parameter)
function patchMountHook(cppDir) {
  const headerPath = path.join(
    cppDir,
    "reanimated/Fabric/ReanimatedMountHook.h"
  );
  const cppPath = path.join(
    cppDir,
    "reanimated/Fabric/ReanimatedMountHook.cpp"
  );

  // --- Header ---
  if (fs.existsSync(headerPath)) {
    let content = fs.readFileSync(headerPath, "utf8");
    const before = content;

    content = content.replace(
      /void shadowTreeDidMount\([^)]*\)\s*noexcept\s*override\s*;/gs,
      "void shadowTreeDidMount(\n      RootShadowNode::Shared const &rootShadowNode) noexcept;"
    );

    if (content !== before) {
      fs.writeFileSync(headerPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.h (removed override)");
    } else {
      console.log(
        "[patch] ReanimatedMountHook.h: no change (already patched or pattern not found)"
      );
    }
  }

  // --- CPP ---
  if (fs.existsSync(cppPath)) {
    let content = fs.readFileSync(cppPath, "utf8");
    const before = content;

    content = content.replace(
      /void ReanimatedMountHook::shadowTreeDidMount\([^)]*\)\s*noexcept\s*\{/gs,
      "void ReanimatedMountHook::shadowTreeDidMount(\n    RootShadowNode::Shared const &rootShadowNode) noexcept {"
    );

    content = content.replace(/\bmountTime\b/g, "0.0");

    if (content !== before) {
      fs.writeFileSync(cppPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.cpp");
    } else {
      console.log(
        "[patch] ReanimatedMountHook.cpp: no change (already patched or pattern not found)"
      );
    }
  }
}

const root = process.cwd();
const reanimatedRoot = path.join(root, "node_modules/react-native-reanimated");

if (!fs.existsSync(reanimatedRoot)) {
  console.log("[patch] react-native-reanimated nicht gefunden, überspringe");
  process.exit(0);
}

// Patche Common/cpp (enthält .cpp Dateien)
patchDir(path.join(reanimatedRoot, "Common/cpp"));

// Patche apple/ (enthält .mm Dateien wie REANodesManager.mm, REAModule.mm)
patchDir(path.join(reanimatedRoot, "apple"));

// Fix ReanimatedMountHook Signatur
patchMountHook(path.join(reanimatedRoot, "Common/cpp"));

console.log("[patch] Fertig");
