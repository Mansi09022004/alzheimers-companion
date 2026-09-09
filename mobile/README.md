# mobile — Patient app

React Native + Expo + TypeScript. Adaptive simple UI: large buttons, few words,
high contrast. Camera "Who is this?", "Why am I here?", Memory Moments, voice
assistant, reminders, SOS.

## Phase 4 (done): foundation

- Expo (SDK 57) blank-TypeScript app
- `src/config.ts` — API base URL from `EXPO_PUBLIC_API_URL`
- `src/theme.ts` — large / high-contrast design tokens
- `src/api/client.ts` — tiny fetch wrapper (`ApiError` on non-2xx)
- `src/auth/AuthContext.tsx` — device token in `expo-secure-store`; `pair()` / `signOut()`
- `src/screens/PairingScreen.tsx` — enter the 8-char pairing code from the caregiver app
- `src/screens/HomeScreen.tsx` — greeting by name + 3 primary action buttons (placeholders)
- No router yet — `App.tsx` renders Pairing vs Home from auth state (router added Phase 5)

## Requirements

- Node 18+ (works on 24)
- The backend running and reachable from your device/emulator
  (`cd ../backend && ...uvicorn app.main:app --host 0.0.0.0 --port 8000`)
- Expo Go app on your phone, **or** an Android/iOS emulator

## Setup

```bash
cd mobile
npm install
cp .env.example .env       # then set EXPO_PUBLIC_API_URL for your setup
```

`EXPO_PUBLIC_API_URL`:
- Android emulator -> `http://10.0.2.2:8000`
- iOS simulator -> `http://localhost:8000`
- Real phone -> `http://<your-computer-LAN-IP>:8000` (same Wi-Fi; run uvicorn with `--host 0.0.0.0`)

## Run

```bash
npm start            # then press a for Android, i for iOS, or scan the QR in Expo Go
```

## Pair a device (end-to-end)

1. Backend: register a caregiver, create a patient, then
   `POST /api/v1/patients/{id}/devices` -> copy the `pairing_code`.
2. App: type the code on the Pairing screen -> Connect.
3. Home screen greets the patient by name.
4. (Debug) tap the date 5 times to unpair.

## Typecheck

```bash
npx tsc --noEmit
```

## Layout

```
App.tsx                    # providers + Pairing/Home switch
src/
├── config.ts              # API URL
├── theme.ts               # design tokens
├── api/client.ts          # fetch wrapper
├── auth/AuthContext.tsx   # token storage + pair/signOut
├── components/
│   ├── Screen.tsx         # safe-area container
│   └── BigButton.tsx      # large touch target
└── screens/
    ├── PairingScreen.tsx
    └── HomeScreen.tsx
```
