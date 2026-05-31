module.exports = {
  expo: {
    "name": "شو عبالك؟ — المنشأة",
    "slug": "shu-business",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "shu-business",
    "userInterfaceStyle": "light",
    "backgroundColor": "#FCF3DC",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash.png",
      "backgroundColor": "#FCF3DC",
      "resizeMode": "contain"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "package": "com.shoabalak.business",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      "adaptiveIcon": {
        "backgroundColor": "#FCF3DC"
      },
      "usesCleartextTraffic": true
    },
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-notifications",
        {
          "color": "#E6781E"
        }
      ]
    ],
    "extra": {
      "supportsRTL": true
    },
    "experiments": {
      "typedRoutes": true
    }
  }
};
