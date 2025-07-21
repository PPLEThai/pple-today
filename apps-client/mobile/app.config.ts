import { version } from './package.json'

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
    newArchEnabled: true,
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
