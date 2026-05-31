module.exports = {
  expo: {
    "name": "كابتن شو عبالك",
    "slug": "shu-driver",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "shu-driver",
    "userInterfaceStyle": "light",
    "backgroundColor": "#FCF3DC",
    "icon": "./assets/images/icon.png",
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "package": "com.shoabalak.driver",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FCF3DC"
      },
      "usesCleartextTraffic": true
    },
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#FCF3DC"
        }
      ],
      [
        "expo-notifications",
        {
          "color": "#E6781E"
        }
      ]
    ],
    "extra": {
      "supportsRTL": true,
      "eas": {
        "projectId": "d12c42f8-3d02-4dc6-be8e-9c4f1bff62f6"
      }
    },
    "experiments": {
      "typedRoutes": true
    }
  }
};
