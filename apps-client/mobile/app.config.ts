import 'tsx/cjs'

import { version } from './package.json'
import withPlugin from './plugins/withPlugin'

// TODO: update config when production release https://docs.expo.dev/versions/latest/config/app/

export default {
  expo: {
    name: 'PPLE Today',
    slug: 'pple-today',
    scheme: 'pple-today',
    version: version,
    orientation: 'portrait',
    icon: './assets/images/favicon1024.png',
    userInterfaceStyle: 'automatic',
    // newArchEnabled: true, // this is true by default
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'th.or.peoplesparty.ppletoday',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FF6A13',
      },
      edgeToEdgeEnabled: true,
      package: 'th.or.peoplesparty.ppletoday',
      softwareKeyboardLayoutMode: 'pan',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.svg',
    },
    plugins: [
      withPlugin,
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
            newArchEnabled: false,
          },
          /**
           * Unfortunately, the performance issue with scrolling (Android) is really deep
           * I dug in and found that its related to the "new arch" (fabric)
           * https://github.com/software-mansion/react-native-reanimated/issues/6992
           * https://github.com/bluesky-social/social-app/issues/8535
           * https://github.com/facebook/react-native/pull/52314
           *
           * https://github.com/bluesky-social/social-app/releases/tag/1.104.0
           * Bluesky fixes this by disabling new arch (which i try and it successfully solves the problem)
           * but expo go only support new arch and this may lead to unexpected behavior
           * we have to double test them on native builds
           */
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            newArchEnabled: false,
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
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // for local build like .apk
    // extra: {
    //   eas: {
    //     projectId: '90a95f98-0504-4546-bc89-dc954e009f22',
    //   },
    // },
  },
}
