const IS_STAGING = process.env.APP_VARIANT === 'staging';

module.exports = {
  expo: {
    name: IS_STAGING ? 'تاجر شو عبالك [S]' : 'تاجر شو عبالك',
    slug: 'shu-business',
    version: '1.0.0',
    updates: {
      url: "https://u.expo.dev/5f92873e-10a5-458d-aa01-78921fd2d17b"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    orientation: 'portrait',
    scheme: IS_STAGING ? 'shu-business-staging' : 'shu-business',
    userInterfaceStyle: 'light',
    backgroundColor: '#FCF3DC',
    icon: './assets/images/icon.png',
    ios: {
      supportsTablet: false,
    },
    android: {
      package: IS_STAGING ? 'com.shoabalak.business.staging' : 'com.shoabalak.business',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: IS_STAGING ? '#E6781E' : '#FCF3DC',
      },
      usesCleartextTraffic: true,
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#FCF3DC',
        },
      ],
      [
        'expo-notifications',
        {
          color: '#E6781E',
        },
      ],
    ],
    extra: {
      supportsRTL: true,
      eas: {
        projectId: '5f92873e-10a5-458d-aa01-78921fd2d17b',
      },
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
