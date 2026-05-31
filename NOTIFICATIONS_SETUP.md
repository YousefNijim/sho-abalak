# Push Notifications (FCM) — Setup & Testing

Real push notifications via **Firebase Cloud Messaging (FCM)**, delivered to the 3 mobile apps even when closed/backgrounded. In-app sockets still fire too — **push is additive, not a replacement**.

- **Backend:** `firebase-admin` server SDK in a NestJS `NotificationsModule`. Device tokens stored per user. Pushes triggered alongside the existing socket emits.
- **Mobile:** `expo-notifications` + the FCM `google-services.json` via the Expo config plugin. Each app registers its device token on login, removes it on logout, shows foreground notifications, and deep-links on tap.

---

## 1. Firebase project (one-time)

1. Firebase Console → create/open project **`shoabalak`**.
2. Add **3 Android apps** with these exact package names (they must match `android.package` in each `app.json`):
   - `com.shoabalak.customer`
   - `com.shoabalak.business`
   - `com.shoabalak.driver`
3. For each Android app, download its **`google-services.json`**.
4. Project Settings → **Service accounts** → **Generate new private key** → download the JSON (this is the backend secret).

> **Cloud Messaging API (V1)** must be enabled for the project (it is by default for new projects). The server uses the V1 API via `firebase-admin`.

---

## 2. Where each file goes

| File | Destination | Notes |
|---|---|---|
| Service-account private key | `apps/api/secrets/firebase-service-account.json` | Backend secret. **Gitignored.** |
| Customer `google-services.json` | `apps/customer-app/google-services.json` | package `com.shoabalak.customer` |
| Business `google-services.json` | `apps/business-app/google-services.json` | package `com.shoabalak.business` |
| Driver `google-services.json` | `apps/driver-app/google-services.json` | package `com.shoabalak.driver` |

All four are **gitignored** (`.gitignore` excludes `apps/api/secrets/*.json` and `apps/*/google-services.json`).

> ⚠️ **Verify the package_name inside each `google-services.json` matches its app.** Each file's `client[].client_info.android_client_info.package_name` must equal that app's `android.package`. A file dropped into the wrong app (e.g. a business file in the driver folder) silently breaks FCM for that app — re-download the correct one from the Firebase Console.

---

## 3. Backend env

In `apps/api/.env` (see `.env.example`):

```
FIREBASE_SERVICE_ACCOUNT_PATH="./secrets/firebase-service-account.json"
```

Path is relative to the API process cwd (`apps/api`). If the file is missing, the API **still boots** — pushes are skipped and logged as `FCM disabled`. Token storage + triggers keep working, so dev is unaffected.

---

## 4. How it works

### Backend (`apps/api/src/notifications/`)
- `NotificationsService.onModuleInit()` loads the service-account key and initializes `firebase-admin`.
- **Endpoints** (JWT-guarded):
  - `POST /notifications/register-token` — body `{ token, platform?, app? }`. Upserts the device token for the current user (idempotent on `token`).
  - `DELETE /notifications/token` — body `{ token }`. Removes the token (called on logout).
- `NotificationsService.send(userId, { title, body, data })` — looks up the user's tokens and sends an FCM multicast. **Never throws** (a push failure can't break the order flow). Stale/invalid tokens are auto-pruned from the DB.
- **Triggers** (in `OrdersService`, additive to socket emits):
  | Event | Recipient | Title / Body |
  |---|---|---|
  | order created (`order:new`) | business owner | "طلب جديد 🛎️" |
  | status → CONFIRMED/PREPARING/READY/PICKED_UP/DELIVERED/CANCELLED | customer | "تحديث طلبك" + Arabic status line |
  | driver request (dispatch & PICKED_UP) | selected driver | "طلب توصيل جديد 🛵" |

  Every push carries `data: { type, orderId, role }` for deep-linking.

### Mobile (`apps/*/src/hooks/usePushNotifications.ts`)
- On login: requests permission, gets the **native FCM device token** (`getDevicePushTokenAsync` — no EAS projectId needed since sending is server-side), POSTs it to `/notifications/register-token` with the app name.
- On logout: `DELETE /notifications/token`.
- Foreground notifications are shown (handler set). Tapping deep-links:
  - **Customer** → `/tracking?orderId=…` (also stored in an in-app notifications list, shown on the Notifications screen).
  - **Business** → `/order/[id]`.
  - **Driver** → `/request-alert`.

---

## 5. Testing on a real device (what you must do)

> Push tokens only work on **physical devices** (not simulators/Expo Go web). FCM also requires a **native build** because of the `google-services.json` config plugin — **Expo Go won't pick it up**. Use a dev build.

1. Place all files per §2 and set the env per §3.
2. Build a dev client for each app (native, includes the FCM plugin):
   ```bash
   cd apps/customer-app && npx expo run:android   # repeat for business-app, driver-app
   # or: eas build --profile development --platform android
   ```
3. Start the backend: `pnpm api` (watch the logs for `FCM initialized (project: shoabalak)`).
4. Log into an app on the device → accept the notification permission prompt.
   - Confirm a row appears in the `device_tokens` table for that user.
5. Trigger an event:
   - Place an order (customer) → the **business** device should get "طلب جديد".
   - Advance the order status (business) → the **customer** device should get "تحديث طلبك".
   - Send a driver request (business) → the **driver** device should get "طلب توصيل جديد".
6. Background/close the receiving app and repeat — the notification should still arrive.
7. Tap a notification → confirm it deep-links to the right screen.

### Quick server-side sanity check (no device)
You can confirm the credential + send pipeline without a device — a bogus token returns a clean per-token failure (proving auth works):
```bash
cd apps/api
node -e "const a=require('firebase-admin');a.initializeApp({credential:a.credential.cert(require('./secrets/firebase-service-account.json'))});a.messaging().sendEachForMulticast({tokens:['bogus'],notification:{title:'t',body:'b'}}).then(r=>console.log('ok',r.successCount,'fail',r.failureCount,r.responses[0].error?.code))"
```
Expect: `ok 0 fail 1 messaging/invalid-argument` → FCM auth is good; a real device token would deliver.

---

## 6. Troubleshooting

- **`FCM disabled` in logs:** key file not found at `FIREBASE_SERVICE_ACCOUNT_PATH`. Check the path (relative to `apps/api`).
- **No token row after login:** running on a simulator, in Expo Go, or permission denied. Use a real device + dev build, grant permission.
- **Notifications never arrive but token stored:** wrong `google-services.json` for that app (package mismatch), or app built without the config plugin. Rebuild natively.
- **`messaging/registration-token-not-registered`:** stale token — the backend auto-prunes these; the device re-registers on next login.
