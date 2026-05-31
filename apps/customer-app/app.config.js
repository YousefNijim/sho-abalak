// Converted from app.json so googleServicesFile can come from an EAS *file*
// environment variable (GOOGLE_SERVICES_JSON) on EAS Build — the file is
// gitignored and never uploaded with the git tree. Locally (expo run:android),
// the env var is unset and we fall back to the on-disk ./google-services.json.
module.exports = {
  expo: {
    name: 'شو عبالك',
    slug: 'shu-customer',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'shu-customer',
    userInterfaceStyle: 'light',
    backgroundColor: '#FCF3DC',
    icon: './assets/images/icon.png',
    ios: {
      supportsTablet: false,
    },
    android: {
      package: 'com.shoabalak.customer',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FCF3DC',
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
