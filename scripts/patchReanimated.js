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

  // HEADER: Füge HighResTimeStamp mountTime Parameter hinzu + override
  // RN 0.81.5 UIManagerMountHook::shadowTreeDidMount braucht diesen Parameter
  if (fs.existsSync(headerPath)) {
    let content = fs.readFileSync(headerPath, "utf8");
    if (content.includes("HighResTimeStamp")) {
      console.log("[patch] ReanimatedMountHook.h: already patched");
    } else {
      // Füge include für HighResTimeStamp hinzu
      content = content.replace(
        "#include <react/renderer/uimanager/UIManagerMountHook.h>",
        "#include <react/renderer/uimanager/UIManagerMountHook.h>\n#include <react/renderer/runtimescheduler/RuntimeScheduler.h>"
      );
      // Ersetze Deklaration: füge Parameter + override hinzu
      content = content.replace(
        /void shadowTreeDidMount\(\s*RootShadowNode::Shared const &rootShadowNode\)\s*noexcept;/,
        "void shadowTreeDidMount(\n      RootShadowNode::Shared const &rootShadowNode,\n      facebook::react::HighResTimeStamp mountTime) noexcept override;"
      );
      fs.writeFileSync(headerPath, content);
      console.log(
        "[patch] Fixed ReanimatedMountHook.h (added HighResTimeStamp + override)"
      );
    }
  }

  // CPP: Füge mountTime Parameter zur Implementierung hinzu (wird nicht verwendet)
  if (fs.existsSync(cppPath)) {
    let content = fs.readFileSync(cppPath, "utf8");
    if (content.includes("HighResTimeStamp")) {
      console.log("[patch] ReanimatedMountHook.cpp: already patched");
    } else {
      content = content.replace(
        /void ReanimatedMountHook::shadowTreeDidMount\(\s*RootShadowNode::Shared const &rootShadowNode\)\s*noexcept \{/,
        "void ReanimatedMountHook::shadowTreeDidMount(\n    RootShadowNode::Shared const &rootShadowNode,\n    facebook::react::HighResTimeStamp /*mountTime*/) noexcept {"
      );
      fs.writeFileSync(cppPath, content);
      console.log(
        "[patch] Fixed ReanimatedMountHook.cpp (added HighResTimeStamp param)"
      );
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
