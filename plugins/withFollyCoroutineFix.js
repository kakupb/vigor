const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withFollyCoroutineFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = config.modRequest.platformProjectRoot;

      // 1. Erstelle folly/coro/Coroutine.h Stub
      const follyCoroDir = path.join(iosDir, "folly", "coro");
      fs.mkdirSync(follyCoroDir, { recursive: true });
      fs.writeFileSync(
        path.join(follyCoroDir, "Coroutine.h"),
        "#pragma once\n"
      );

      // 2. Modifiziere Podfile: füge -I Flag für RNReanimated hinzu
      const podfilePath = path.join(iosDir, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      // Idempotenz-Check
      if (podfile.includes("withFollyCoroutineFix")) return config;

      const fix = `
    # withFollyCoroutineFix: ios/folly/coro/Coroutine.h stub
    _ios_root = File.expand_path(__dir__)
    installer.pods_project.targets.each do |target|
      next unless target.name == 'RNReanimated'
      target.build_configurations.each do |cfg|
        cfg.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) -I\#{_ios_root}"
      end
    end
`;

      // Einfügen vor dem letzten 'end' des post_install Blocks
      podfile = podfile.replace(
        /(\n  end\n\nend\s*)$/,
        `\n${fix}\n  end\n\nend\n`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withFollyCoroutineFix;
