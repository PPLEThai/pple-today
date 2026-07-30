// Custom entry point, ahead of `expo-router/entry`.
//
// An attributed Android push arrives as a data-only message, which FCM delivers by
// starting the app as a headless task. No root view is mounted, so expo-router
// never evaluates any route module — `app/_layout.tsx` included — and a background
// message handler registered from a component would not exist when the message
// arrived. It has to be registered while the bundle itself is evaluating.
//
// The notification channel is created here for the same reason, and because Play
// services can only honour the channel named in the manifest once that channel
// exists — which has to be true before the first notification arrives, not just
// once some screen has rendered.
//
// `require` rather than `import`: ES import declarations are hoisted, so an
// `import 'expo-router/entry'` would run before any statement in this file
// regardless of where it was written.
const notificationDisplay = require('./libs/notification-display')

notificationDisplay.registerBrandedPushBackgroundHandler()
notificationDisplay.ensureDefaultNotificationChannel()

require('expo-router/entry')
