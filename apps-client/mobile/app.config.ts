export default {
  expo: {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.anonymous.mobile',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-font',
        {
          fonts: [
            'node_modules/@expo-google-fonts/inter/Inter_300Light.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/Inter_700Bold.ttf',
            'node_modules/@expo-google-fonts/noto-sans-thai-looped/400Regular/NotoSansThaiLooped_400Regular.ttf',
            // {
            //   fontFamily: 'Anakotmai',
            //   fontDefinitions: [
            //     {
            //       path: './assets/fonts/Anakotmai-Light.ttf',
            //       weight: 300,
            //     },
            //     {
            //       path: './assets/fonts/Anakotmai-Medium.ttf',
            //       weight: 500,
            //     },
            //     {
            //       path: './assets/fonts/Anakotmai-Bold.ttf',
            //       weight: 700,
            //     },
            //   ],
            // },
          ],
          // android: {
          //   fonts: [
          //     {
          //       fontFamily: 'Anakotmai',
          //       fontDefinitions: [
          //         {
          //           path: './assets/fonts/Anakotmai-Light.ttf',
          //           weight: 300,
          //         },
          //         {
          //           path: './assets/fonts/Anakotmai-Medium.ttf',
          //           weight: 500,
          //         },
          //         {
          //           path: './assets/fonts/Anakotmai-Bold.ttf',
          //           weight: 700,
          //         },
          //       ],
          //     },
          //   ],
          // },
          // ios: [
          //   './assets/fonts/Anakotmai-Light.ttf',
          //   './assets/fonts/Anakotmai-Medium.ttf',
          //   './assets/fonts/Anakotmai-Bold.ttf',
          // ],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
}
