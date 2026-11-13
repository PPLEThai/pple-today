import 'tsx/cjs'

import { AppJSONConfig } from 'expo/config'

import { getMiniAppDeepLinkNativeConfig } from './deeplink.config'
import { version } from './package.json'

const miniAppDeepLink = getMiniAppDeepLinkNativeConfig()

export default {
  expo: {
    name: 'PPLE Today',
    slug: 'pple-today',
    scheme: 'pple-today',
    version: version,
    orientation: 'portrait',
    icon: './assets/images/favicon1024.png',
    // The app has no dark theme: keep native controls (Liquid Glass buttons,
    // alerts, pickers) light when the phone is in dark mode.
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      // Expo SDK 56+ requires 16.4. ActivityKit (16.1) and AppIntents (16.0) are
      // always available from here, so the Live Activity code links them normally.
      deploymentTarget: '16.4',
      googleServicesFile: './credentials/GoogleService-Info.plist',
      bundleIdentifier: process.env.DEVELOPER_APP_IDENTIFIER,
      // Live Activity: @bacons/apple-targets signs the widget target with this team.
      appleTeamId: process.env.DEVELOPER_PORTAL_TEAM_ID,
      ...(miniAppDeepLink.ios?.associatedDomains
        ? { associatedDomains: miniAppDeepLink.ios.associatedDomains }
        : {}),
      entitlements: {
        'aps-environment': 'development',
        'com.apple.security.application-groups': [
          `group.${process.env.DEVELOPER_APP_IDENTIFIER}.nse`,
        ],
      },
      infoPlist: {
        UIBackgroundModes: ['fetch', 'remote-notification'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FF6A13',
      },
      package: process.env.DEVELOPER_APP_IDENTIFIER,
      googleServicesFile: './credentials/google-services.json',
      softwareKeyboardLayoutMode: 'pan',
      ...(miniAppDeepLink.android?.intentFilters
        ? { intentFilters: miniAppDeepLink.android.intentFilters }
        : {}),
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      'expo-video',
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/transparent-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-web-browser',
        {
          experimentalLauncherActivity: true,
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            reactNativeReleaseLevel: 'experimental',

            // React Native Firebase 27 installs the Firebase Apple SDK (13+, only on
            // Swift Package Manager), which needs dynamic frameworks.
            // https://rnfirebase.io/migrating-to-v27
            useFrameworks: 'dynamic',
          },
          android: {
            targetSdkVersion: 36,
            reactNativeReleaseLevel: 'experimental',

            // Run R8 on release builds: shrinks and obfuscates the DEX. Play Console
            // flags apps under 25% obfuscation, and without this we sat at ~1%.
            // https://developer.android.com/topic/performance/vitals/code-optimization
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],

      [
        'react-native-fbsdk-next',
        {
          appID: process.env.FACEBOOK_APP_ID,
          clientToken: process.env.FACEBOOK_CLIENT_TOKEN,
          displayName: process.env.FACEBOOK_DISPLAY_NAME,
          scheme: `fb${process.env.FACEBOOK_APP_ID}`,
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: true,
        },
      ],
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission:
            'This permission will be required to login with Facebook due to their policy.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you set up your profile image.',
          cameraPermission: 'The app accesses your camera to let you take a photo.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow PPLE Today to use your location.',
        },
      ],
      ['./plugins/withAndroidPlugin'],
      ['./plugins/withIosPlugin'],
      // Live Activity: generates the targets/live-activity widget extension.
      '@bacons/apple-targets',

      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      'expo-notifications',
      [
        'expo-notification-service-extension-plugin',
        {
          mode: 'development',
          iosNSEFilePath: './assets/NotificationService.m',
          // Plugin defaults to 11.0, which Xcode 27 rejects (min 15.0). Match the app.
          iPhoneDeploymentTarget: '16.4',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
} satisfies AppJSONConfig
