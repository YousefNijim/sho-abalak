module.exports = {
  expo: {
    "name": "تاجر شو عبالك",
    "slug": "shu-business",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "shu-business",
    "userInterfaceStyle": "light",
    "backgroundColor": "#FCF3DC",
    "icon": "./assets/images/icon.png",
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "package": "com.shoabalak.business",
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
        "projectId": "5f92873e-10a5-458d-aa01-78921fd2d17b"
      }
    },
    "experiments": {
      "typedRoutes": true
    }
  }
};
