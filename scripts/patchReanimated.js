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

function patchMountHook(cppDir) {
  const headerPath = path.join(
    cppDir,
    "reanimated/Fabric/ReanimatedMountHook.h"
  );
  const cppPath = path.join(
    cppDir,
    "reanimated/Fabric/ReanimatedMountHook.cpp"
  );

  if (fs.existsSync(headerPath)) {
    let content = fs.readFileSync(headerPath, "utf8");
    const before = content;
    // Entferne double mountTime Parameter UND override
    content = content.replace(
      /void shadowTreeDidMount\([\s\S]*?\)\s*noexcept\s*override\s*;/,
      "void shadowTreeDidMount(\n      RootShadowNode::Shared const &rootShadowNode) noexcept;"
    );
    if (content !== before) {
      fs.writeFileSync(headerPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.h");
    }
  }

  if (fs.existsSync(cppPath)) {
    let content = fs.readFileSync(cppPath, "utf8");
    const before = content;
    // Ersetze Funktionsdefinition — matche alles zwischen ( und ) noexcept {
    content = content.replace(
      /void ReanimatedMountHook::shadowTreeDidMount\([\s\S]*?\)\s*noexcept\s*\{/,
      "void ReanimatedMountHook::shadowTreeDidMount(\n    RootShadowNode::Shared const &rootShadowNode) noexcept {"
    );
    // mountTime Variable ersetzen falls noch im Body
    content = content.replace(/\bmountTime\b/g, "0.0");
    if (content !== before) {
      fs.writeFileSync(cppPath, content);
      console.log("[patch] Fixed ReanimatedMountHook.cpp");
    }
  }
}

const reanimatedRoot = path.join(
  process.cwd(),
  "node_modules/react-native-reanimated"
);
if (!fs.existsSync(reanimatedRoot)) {
  console.log("[patch] react-native-reanimated nicht gefunden");
  process.exit(0);
}

patchDir(path.join(reanimatedRoot, "Common/cpp"));
patchDir(path.join(reanimatedRoot, "apple"));
patchMountHook(path.join(reanimatedRoot, "Common/cpp"));
console.log("[patch] Fertig");
