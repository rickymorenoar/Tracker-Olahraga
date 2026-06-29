# KYYS Workout - Sports Activity Tracker

Aplikasi tracking olahraga berbasis React Native + Expo dengan fitur:
- Real-time location tracking menggunakan GPS
- Pencatatan rute workout
- Summary dan sharing workout
- Penyimpanan data lokal

## Prerequisites

- Node.js 16+ dan npm/yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (untuk build APK): `npm install -g eas-cli`
- Akun Expo (untuk EAS build)

## Setup Awal

### 1. Install Dependencies

**PENTING:** Gunakan `npx expo install` (BUKAN `npm install`) agar versi native cocok dengan SDK Expo Anda:

```bash
npx expo install expo-task-manager expo-sharing react-native-view-shot
npx expo install expo-location react-native-maps @react-native-async-storage/async-storage
```

**Penjelasan dependencies:**
- `expo-location` — Akses GPS dan location tracking
- `react-native-maps` — Menampilkan peta real-time
- `expo-task-manager` — Background task untuk tracking saat app minimized
- `react-native-view-shot` — Capture screenshot untuk fitur share summary
- `expo-sharing` — Share file/gambar
- `@react-native-async-storage/async-storage` — Penyimpanan data lokal

### 2. Regenerate Native Project

Setelah dependencies diinstall, regenerate native project dengan plugin terbaru:

```bash
npx expo prebuild --clean
```

### 3. Run Aplikasi

**Development (lokal):**
```bash
npx expo run:android
# atau
npx expo run:ios
```

**Production Build (APK):**
```bash
eas build -p android --profile production
```

Setelah build selesai, download APK dari dashboard EAS dan install di perangkat.

---

## File Struktur

```
Tracker-Olahraga-Main/
├── src/
│   ├── components/
│   │   ├── Logo.tsx                    ← HARUS ada (custom component)
│   │   ├── WelcomeScreen.tsx
│   │   ├── ActivitySelector.tsx
│   │   ├── HistoryList.tsx
│   │   ├── StatPanel.tsx
│   │   └── WorkoutSummaryModal.tsx
│   ├── locationTask.ts                 ← Background location task
│   ├── initializeBackgroundTasks.ts
│   ├── types.ts
│   └── App.tsx
├── assets/                             ← Images, icons, fonts
├── node_modules/
├── app.json                            ← Config Expo (plugins, permissions)
├── eas.json                            ← EAS Build config
├── package.json
├── tsconfig.json
├── metro.config.js
├── README.MD
└── .gitignore
```

---

## Fitur Utama

### 📍 Real-time Location Tracking
- Menggunakan `expo-location` untuk akses GPS
- Background tracking via `expo-task-manager` saat app minimized
- Polyline rute ditampilkan di peta real-time

### 🗺️ Peta Interaktif
- `react-native-maps` dengan custom tile provider (CartoDB)
- Zoom, pan, dan tracking current location
- Mini-map di workout summary

### 🎨 Icon Library

Aplikasi menggunakan icon dari **lucide-react** termasuk:
- `SportShoe` — Icon sepatu untuk activity tracking
- `Zap`, `MapPin`, `Clock`, dll — Untuk UI elements lainnya

Semua icon berfungsi baik di React Native dengan setup saat ini.
- Screenshot card workout menggunakan `react-native-view-shot`
- Share sebagai gambar via `expo-sharing`
- Data tersimpan di `@react-native-async-storage/async-storage`

### ⏱️ Workout Tracking
- Durasi, distance, speed real-time
- Kalori estimasi
- History workout dengan sorting

---

## Izin Lokasi Android 10+

### Cara Kerja Permission Dialog

Saat app pertama kali jalan, akan muncul dialog sistem Android:
- **"Allow only while using the app"** → Tracking hanya saat app aktif
- **"Don't allow"** → Tidak ada akses lokasi

**Untuk Background Tracking (saat app minimized):**

Dialog Android tidak menawarkan opsi "Allow all the time" pada prompt pertama. User harus:

1. Buka **Settings** → **Apps** → **KYYS Workout** → **Permissions** → **Location**
2. Ubah ke **"Allow all the time"** (atau "Always" tergantung Android version)
3. Tutup Settings, lalu minimize app → background tracking aktif

Ini adalah batasan sistem Android, bukan bug di aplikasi.

### Code Location Permission (app.json)

```json
{
  "plugins": [
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermissions": ["Allow access to your location"]
      }
    ]
  ]
}
```

---

## File Penting yang Sudah Ada

### `src/components/Logo.tsx` ✅

File ini **sudah tersedia** di proyek Anda dan digunakan oleh:
- `WelcomeScreen.tsx`
- `WorkoutSummaryModal.tsx`

Pastikan file ini tetap ada di folder `src/components/`, karena import akan error jika hilang.

---

## Troubleshooting

### ❌ App Force Close / Crash

**Solusi:**
1. Pastikan semua dependencies terinstall: `npx expo prebuild --clean`
2. Clear cache: `npx expo start --clear`
3. Cek console error di Expo go atau via Android Studio

### ❌ Maps Tidak Muncul / Error

**Sebab:** Google Maps API key tidak terdaftar
**Solusi:** Aplikasi ini menggunakan **CartoDB (free tile provider)**, bukan Google Maps API. Tidak perlu API key.

### ❌ Background Tracking Tidak Bekerja

**Solusi:**
1. Cek apakah permission sudah "Allow all the time" di Settings
2. Pastikan `locationTask.ts` ter-register di app start
3. Test di development build: `npx expo run:android`

### ❌ "Cannot find module 'expo-location'" dll

**Solusi:**
```bash
npx expo prebuild --clean
npx expo run:android  # rebuild native
```

---

## Development Tips

### Hot Reload
```bash
npx expo start
# Di Expo Go app: Press 'r' untuk reload
```

### Debug di Android Studio
```bash
npx expo run:android
# App otomatis install dan jalan di emulator/device
```

### View Logs
```bash
npx expo start --clear
```

---

## Versioning

- **React Native:** 0.73+ (via Expo)
- **Expo SDK:** 50+
- **Node.js:** 16+

---

## License

Proprietary - KYYS Workout

---

## Support

Jika ada error atau pertanyaan, check:
1. Console error di Expo
2. Android logcat: `adb logcat`
3. Pastikan `app.json` sudah update dengan plugin terbaru
4. Regenerate native: `npx expo prebuild --clean`