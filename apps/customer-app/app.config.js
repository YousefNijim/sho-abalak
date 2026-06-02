const IS_STAGING = process.env.APP_VARIANT === 'staging';

module.exports = {
  expo: {
    name: IS_STAGING ? 'شو عبالك [S]' : 'شو عبالك',
    slug: 'shu-customer',
    version: '1.0.0',
    updates: {
      url: "https://u.expo.dev/6df81a2e-aece-42e7-b24c-bcaed3e37add"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    orientation: 'portrait',
    scheme: IS_STAGING ? 'shu-customer-staging' : 'shu-customer',
    userInterfaceStyle: 'light',
    backgroundColor: '#FCF3DC',
    icon: './assets/images/icon.png',
    ios: {
      supportsTablet: false,
    },
    android: {
      package: IS_STAGING ? 'com.shoabalak.customer.staging' : 'com.shoabalak.customer',
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
      [
        'expo-image-picker',
        {
          photosPermission: 'يستخدم التطبيق الصور لتحديث صورة ملفك الشخصي.',
        },
      ],
    ],
    extra: {
      supportsRTL: true,
      router: {},
      eas: {
        projectId: '6df81a2e-aece-42e7-b24c-bcaed3e37add',
      },
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
