// The share extension's Xcode target can't be called "Wishpool" too (the app
// target has that name, and EAS then matched the extension's provisioning
// profile to the app), so expo-share-intent gets a different target name and
// this plugin puts the name people see in the share sheet back to "Wishpool".
//
// Listed before expo-share-intent in app.json: mods registered earlier run
// later, so this runs after the extension's Info.plist has been written.

const fs = require("fs");
const path = require("path");
const { withXcodeProject } = require("@expo/config-plugins");

module.exports = function withShareExtensionDisplayName(config, { target, name }) {
  return withXcodeProject(config, (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, target, "ShareExtension-Info.plist");
    if (fs.existsSync(file)) {
      const xml = fs.readFileSync(file, "utf8");
      fs.writeFileSync(file, xml.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${name}$2`));
    }
    return cfg;
  });
};
