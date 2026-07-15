# Live TV Mobile App

Direct-play Android and iOS app. Uses your **existing Go API** — no extra server setup.

## How it works

```text
Mobile App → https://proxy.previewcloud.cloud/mobile/channels → MongoDB
```

No `tv-proxy-ui` needed. Streams play **directly from the phone** (like NSPlayer) with Referer/User-Agent headers on every HLS request.

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
| `GET /mobile/channels` | Channel list (URL + Referer/User-Agent headers) |
| `GET /mobile/config` | Security settings |

## Notes

- Admin panel (`tv-proxy-ui`) is only for adding channels
- Streams play directly from the phone (NSPlayer-style), with Referer/User-Agent sent on every HLS request via ExoPlayer
- HTTP (`http://`) streams are allowed on Android (`usesCleartextTraffic`)
- Private IPTV URLs (`172.x`, `10.x`) only work when your phone can reach that network (same Wi‑Fi/VPN as the stream source), same as NSPlayer
- Rebuild native app after changing `modules/device-security` or `app.json` Android settings

## Distribute APK via GitHub (no Android Studio)

Build in the cloud and publish to **GitHub Releases** so users can download and install.

### One-time setup

1. Create a free [Expo](https://expo.dev) account
2. Create a GitHub repo and push this project
3. Get an Expo token: https://expo.dev/accounts/[account]/settings/access-tokens
4. Add GitHub repo secret: `EXPO_TOKEN` = your Expo token
5. Link this app to Expo **once** on your Mac (fixes "EAS project not configured"):

```bash
cd tv-proxy-mobile
npm install -g eas-cli
eas login
eas init
git add app.json
git commit -m "Link Expo EAS project"
git push origin main
```

After `eas init`, `app.json` will contain an `extra.eas.projectId` — commit that file.

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

## Build debug APK with Docker (no Java / Android Studio / Expo token)

Everything runs inside a Linux container (Java + Android SDK included).
Produces a **debug APK** for testing on your phone — not a signed production release.

### Setup

Make sure Docker Desktop is running.

### Build

```bash
cd tv-proxy-mobile
docker compose run --rm apk-builder
```

Or:

```bash
npm run build:apk:docker
```

When finished, APK is at:

```text
dist/live-tv-debug.apk
```

Install on your phone (enable install from unknown sources if asked).

First build may take 15–30 minutes (downloads Android SDK + Gradle deps). Later builds are faster thanks to Docker volume caches.

For **signed production APK**, use GitHub Actions or `eas build --platform android --profile production` (requires `EXPO_TOKEN`).

