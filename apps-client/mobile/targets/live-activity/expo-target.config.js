// The Live Activity widget extension (docs/interactive-notifications.md,
// "Live Activity (iOS)"). No `entitlements` on purpose: defining
// them would make @bacons/apple-targets mirror the main app's app group onto
// this target, which the bundle id is not registered for.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'LiveActivity',
  displayName: 'PPLE Today',
  bundleIdentifier: '.LiveActivity',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
})
