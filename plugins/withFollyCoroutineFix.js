const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withFollyCoroutineFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosDir, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("withFollyCoroutineFix")) {
        return config; // Already applied
      }

      // Ruby code to insert into post_install
      // Uses build phase script (runs AFTER [RNDeps], BEFORE compile)
      // AND sets FOLLY_HAS_COROUTINES=0 as compiler flag
      const fix = [
        "",
        "    # withFollyCoroutineFix: create folly/coro/Coroutine.h stub",
        "    installer.pods_project.targets.each do |_target|",
        "      next unless _target.name == 'RNReanimated'",
        "      _phase = _target.new_shell_script_build_phase('Fix Folly Coro Header')",
        "      _phase.shell_script = 'CORO_DIR=\"${PODS_ROOT}/Headers/Public/ReactNativeDependencies/folly/coro\" && mkdir -p \"${CORO_DIR}\" && printf '\\''#pragma once\\n'\\'' > \"${CORO_DIR}/Coroutine.h\"'",
        "      _target.build_phases.delete(_phase)",
        "      _target.build_phases.unshift(_phase)",
        "      _target.build_configurations.each do |_cfg|",
        "        _cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFOLLY_HAS_COROUTINES=0 -DFOLLY_CFG_NO_COROUTINES=1'",
        "      end",
        "    end",
      ].join("\n");

      // Find the last "  end" followed by blank line + "end" (close of post_install + target)
      // Use lastIndexOf for reliability
      const marker = "\n  end\n\nend";
      const lastIdx = podfile.lastIndexOf(marker);

      if (lastIdx !== -1) {
        podfile = podfile.slice(0, lastIdx) + fix + "\n  end\n\nend\n";
        fs.writeFileSync(podfilePath, podfile);
        console.log("[withFollyCoroutineFix] Podfile patched successfully");
      } else {
        console.warn(
          "[withFollyCoroutineFix] Could not find insertion point in Podfile!"
        );
        console.warn(
          "[withFollyCoroutineFix] Podfile ends with:",
          JSON.stringify(podfile.slice(-100))
        );
      }

      return config;
    },
  ]);
};

module.exports = withFollyCoroutineFix;
