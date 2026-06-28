import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoordinate } from './types';

export const LOCATION_TASK_NAME = 'kyys-background-location-task';
const PENDING_POINTS_KEY = '@kyys_pending_points';

/**
 * Background task ini dipanggil oleh OS sendiri (walau App di-minimize),
 * jadi TIDAK BISA langsung setState ke komponen React.
 * Solusinya: tulis titik baru ke AsyncStorage sebagai "antrian",
 * lalu komponen App akan polling/membaca antrian ini secara berkala
 * selama tracking aktif (lihat useLocationSync di App.tsx).
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  try {
    const raw = await AsyncStorage.getItem(PENDING_POINTS_KEY);
    const pending: LocationCoordinate[] = raw ? JSON.parse(raw) : [];

    const newPoints: LocationCoordinate[] = locations.map((loc) => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    }));

    const merged = [...pending, ...newPoints];
    await AsyncStorage.setItem(PENDING_POINTS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Gagal menyimpan titik lokasi background:', e);
  }
});

export async function requestAllLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foreground: false, background: false };
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.status === 'granted' };
}

export async function startBackgroundLocationTracking(): Promise<boolean> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (alreadyRunning) return true;

  const { background } = await requestAllLocationPermissions();
  if (!background) return false;

  await AsyncStorage.removeItem(PENDING_POINTS_KEY);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 2,
    timeInterval: 2000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'KYYS Workout sedang merekam aktivitasmu',
      notificationBody: 'Tap untuk kembali ke aplikasi',
      notificationColor: '#fc5200',
    },
    pausesUpdatesAutomatically: false,
  });

  return true;
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  await AsyncStorage.removeItem(PENDING_POINTS_KEY);
}

/**
 * Dipanggil secara berkala oleh App.tsx selagi tracking aktif.
 * Mengambil semua titik yang masuk dari background task,
 * lalu mengosongkan antrian.
 */
export async function drainPendingLocationPoints(): Promise<LocationCoordinate[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_POINTS_KEY);
    if (!raw) return [];
    const points: LocationCoordinate[] = JSON.parse(raw);
    await AsyncStorage.removeItem(PENDING_POINTS_KEY);
    return points;
  } catch (e) {
    console.error('Gagal membaca titik lokasi pending:', e);
    return [];
  }
}