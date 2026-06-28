import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoordinate } from './src/types';

export const LOCATION_TASK_NAME = 'kyys-background-location-task';
const PENDING_POINTS_KEY = '@kyys_pending_points';

/**
 * ⚠️ PENTING: TaskManager.defineTask HARUS dipanggil di root level
 * (bukan di dalam useEffect atau conditional)
 * Karena OS perlu tahu task ini sudah exist sebelum app mulai
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
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
    console.log('✅ Background location saved:', newPoints.length, 'points');
  } catch (e) {
    console.error('❌ Gagal menyimpan titik lokasi background:', e);
  }
});

export async function requestAllLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    console.log('Foreground permission:', fg.status);
    
    if (fg.status !== 'granted') {
      return { foreground: false, background: false };
    }

    const bg = await Location.requestBackgroundPermissionsAsync();
    console.log('Background permission:', bg.status);
    
    return { foreground: true, background: bg.status === 'granted' };
  } catch (e) {
    console.error('❌ Error requesting permissions:', e);
    return { foreground: false, background: false };
  }
}

export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
      () => false
    );
    
    if (alreadyRunning) {
      console.log('✅ Background location tracking already running');
      return true;
    }

    const { background } = await requestAllLocationPermissions();
    if (!background) {
      console.warn('⚠️ Background location permission not granted');
      return false;
    }

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

    console.log('✅ Background location tracking started');
    return true;
  } catch (e) {
    console.error('❌ Error starting background tracking:', e);
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
      () => false
    );
    
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('✅ Background location tracking stopped');
    }
    
    await AsyncStorage.removeItem(PENDING_POINTS_KEY);
  } catch (e) {
    console.error('❌ Error stopping background tracking:', e);
  }
}

export async function drainPendingLocationPoints(): Promise<LocationCoordinate[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_POINTS_KEY);
    if (!raw) return [];
    
    const points: LocationCoordinate[] = JSON.parse(raw);
    await AsyncStorage.removeItem(PENDING_POINTS_KEY);
    
    if (points.length > 0) {
      console.log('✅ Drained', points.length, 'pending location points');
    }
    
    return points;
  } catch (e) {
    console.error('❌ Gagal membaca titik lokasi pending:', e);
    return [];
  }
}