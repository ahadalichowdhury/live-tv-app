# Live TV Mobile App

Direct-play Android and iOS app. Uses your **existing Go API** — no extra server setup.

## How it works

```text
Mobile App → https://proxy.previewcloud.cloud/mobile/channels → MongoDB
```

No `tv-proxy-ui` needed. No `DISABLE_PROXY` needed. The mobile app never uses `/proxy`.

## Setup

```bash
cd tv-proxy-mobile
npm install
npx expo prebuild
npx expo run:android   # or run:ios
```

That's it. The app already points to `https://proxy.previewcloud.cloud`.

## Local testing only (optional)

If you want to test against Go running on your Mac:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8080
```

Find LAN IP: `ipconfig getifaddr en0`

## Deploy new mobile API

After adding `/mobile/channels` to Go, deploy once:

```bash
cd tv-proxy-go
./deploy-server.sh
```

Your existing `.env` on the server is enough — no new variables required.

## API endpoints used by app

| Endpoint | Purpose |
|----------|---------|
| `GET /mobile/channels` | Channel list |
| `GET /mobile/config` | Security settings |

## Notes

- Admin panel (`tv-proxy-ui`) is only for adding channels
- Streams play directly from the phone
- Rebuild native app after changing `modules/device-security`

## Distribute APK via GitHub (no Android Studio)

Build in the cloud and publish to **GitHub Releases** so users can download and install.

### One-time setup

1. Create a free [Expo](https://expo.dev) account
2. Create a GitHub repo and push this project
3. Get an Expo token: https://expo.dev/accounts/[account]/settings/access-tokens
4. Add GitHub repo secret: `EXPO_TOKEN` = your Expo token

### Publish a release

**Option A — Git tag (automatic)**

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds the APK and creates a Release with `live-tv.apk` attached.

**Option B — Manual trigger**

GitHub → Actions → **Release Android APK** → Run workflow → enter tag `v1.0.0`

### User install steps

1. Open your GitHub repo → **Releases**
2. Download `live-tv.apk`
3. Open on Android phone → Install
4. If blocked: Settings → allow install from browser/files

### Manual build (without GitHub Actions)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

Download the APK from the Expo build page, then upload it to a GitHub Release manually.

