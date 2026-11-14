// Home-screen widgets (Premium): the nearest birthday and Secret Santa.
// Built by @bacons/apple-targets; the app writes the data into the shared
// App Group (src/settings/WidgetSync.tsx) and the widgets read it.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: "widget",
  name: "WishpoolWidgets",
  deploymentTarget: "17.0",
  entitlements: {
    // the same group the app already has through expo-share-intent
    "com.apple.security.application-groups": ["group.app.wishpool.ios"],
  },
  colors: {
    $accent: "#0A82F9",
    $widgetBackground: "#15181D",
  },
});
