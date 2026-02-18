import 'tsx/cjs'

import { AppJSONConfig } from 'expo/config'

import { version } from './package.json'

export default {
  expo: {
    name: 'PPLE Today',
    slug: 'pple-today',
    scheme: 'pple-today',
    version: version,
    orientation: 'portrait',
    icon: './assets/images/favicon1024.png',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      googleServicesFile: './credentials/GoogleService-Info.plist',
      bundleIdentifier: process.env.DEVELOPER_APP_IDENTIFIER,
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
      edgeToEdgeEnabled: true,
      package: process.env.DEVELOPER_APP_IDENTIFIER,
      googleServicesFile: './credentials/google-services.json',
      softwareKeyboardLayoutMode: 'pan',
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
            deploymentTarget: '15.1',
            reactNativeReleaseLevel: 'experimental',

            // https://github.com/invertase/react-native-firebase/issues/8657#issuecomment-3309893085
            useFrameworks: 'static',
            forceStaticLinking: ['RNFBApp', 'RNFBMessaging'],
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            reactNativeReleaseLevel: 'experimental',
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

      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-notification-service-extension-plugin',
        {
          mode: 'development',
          iosNSEFilePath: './assets/NotificationService.m',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCanary: true,
      reactCompiler: true,
    },
  },
} satisfies AppJSONConfig
