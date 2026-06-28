# Dependency yang dibutuhkan

Jalankan semua ini lewat `npx expo install` (BUKAN `npm install`), supaya versi
native-nya otomatis cocok dengan SDK Expo kamu:

```
npx expo install expo-task-manager expo-sharing react-native-view-shot
npx expo install expo-location react-native-maps @react-native-async-storage/async-storage
```

`react-native-view-shot` dan `expo-sharing` dipakai di `WorkoutSummaryModal.tsx`
untuk fitur "Bagikan Rangkuman" (screenshot card lalu share sebagai gambar).

## File yang HARUS ada tapi tidak disertakan di sini

`src/components/Logo.tsx` — dipakai oleh `WelcomeScreen.tsx` dan
`WorkoutSummaryModal.tsx`. File ini tidak diupload sebelumnya, jadi tidak
saya buat ulang. Pastikan file aslinya tetap ada di folder yang sama,
atau build akan gagal karena import error.

## Setelah app.json & dependency diupdate

Karena app.json menambahkan plugin baru (expo-location dengan konfigurasi
background), kamu WAJIB regenerate native project sebelum build APK:

```
npx expo prebuild --clean
```

Lalu build:

```
eas build -p android --profile production
```

atau untuk testing lokal dengan development build:

```
npx expo run:android
```

## Perubahan penting dari kode asli (kenapa app crash sebelumnya)

1. **Icon "SportShoe" tidak ada di lucide-react-native** — ini kemungkinan
   besar SUMBER UTAMA force close kamu. Icon ini dipakai di 3 file
   (HistoryList, ActivitySelector, WorkoutSummaryModal) tapi tidak pernah
   benar-benar ada di library lucide, sehingga saat di-import nilainya
   `undefined` dan React Native crash saat mencoba render komponen yang
   tidak terdefinisi. Sudah diganti ke `Zap` di semua file.

2. **Google Maps API key** — `WorkoutSummaryModal` masih pakai
   `PROVIDER_GOOGLE` tanpa API key terdaftar di app.json, sama seperti
   masalah di App.tsx sebelumnya. Sudah diganti ke `UrlTile` gratis
   (CartoDB Dark Matter) di kedua tempat (map utama dan mini-map summary).

3. **Background location tracking** ditambahkan via `expo-task-manager`
   supaya rute tetap terekam walau app diminimize (lihat src/locationTask.ts).

## Catatan izin lokasi Android 10+

Dialog pertama HANYA menawarkan "Allow only while using the app" atau
"Don't allow" — tidak ada opsi "Allow all the time" di situ. User harus
membuka Settings > Apps > KYYS Workout > Permissions > Location lalu ubah
manual ke "Allow all the time" agar background tracking benar-benar aktif.
Ini batasan sistem Android, bukan bug di kode.