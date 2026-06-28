import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import MapView, { Polyline, Marker, UrlTile } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Play, Square, Pause } from 'lucide-react-native';
import { LocationCoordinate, ActivityType, ActivityLog } from './src/types';
import ActivitySelector from './src/components/ActivitySelector';
import StatsPanel from './src/components/StatsPanel';
import HistoryList from './src/components/HistoryList';
import WorkoutSummaryModal from './src/components/WorkoutSummaryModal';
import WelcomeScreen from './src/components/WelcomeScreen';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  drainPendingLocationPoints,
  requestAllLocationPermissions,
} from './initializeBackgroundTask';

const STORAGE_KEY = '@kyys_workout_history';

// Tile gratis tanpa API key, tema gelap ala CartoDB Dark Matter
const DARK_TILE_URL = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function App() {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  const [activityType, setActivityType] = useState<ActivityType>('running');
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LocationCoordinate[]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [mapReady, setMapReady] = useState<boolean>(false);

  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{
    distance: number;
    duration: number;
    type: ActivityType;
    coords: LocationCoordinate[];
  }>({
    distance: 0,
    duration: 0,
    type: 'running',
    coords: [],
  });

  const timerRef = useRef<any>(null);
  const syncIntervalRef = useRef<any>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Ref ini selalu menyimpan titik terakhir, dipakai untuk hitung jarak
  // tanpa kena masalah stale-closure dari setState async.
  const lastPointRef = useRef<LocationCoordinate | null>(null);
  const distanceRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 Requesting location permissions...');
        const { foreground, background } = await requestAllLocationPermissions();
        
        if (!foreground) {
          console.error('❌ Foreground location permission denied');
          Alert.alert(
            'Izin lokasi dibutuhkan',
            'KYYS Workout butuh akses lokasi untuk merekam aktivitasmu.'
          );
          return;
        }

        console.log('✅ Foreground location granted');
        console.log('Background location:', background ? '✅ Granted' : '⚠️ Not granted (optional)');

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const newLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(newLocation);
        console.log('📍 Initial location:', newLocation);
      } catch (e) {
        console.error('❌ Gagal mengambil lokasi awal:', e);
        Alert.alert(
          'Error Lokasi',
          'Gagal mengambil posisi awal. Pastikan izin lokasi sudah diberikan di Settings.'
        );
      }
    })();

    loadHistoryFromDB();

    return () => {
      stopLocationTracking(true).catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  const loadHistoryFromDB = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        console.log('✅ Loaded', parsed.length, 'history items');
      }
    } catch (e) {
      console.error('❌ Gagal memuat riwayat:', e);
    }
  };

  const appendNewPoints = useCallback((newPoints: LocationCoordinate[]) => {
    if (newPoints.length === 0) return;

    setRouteCoordinates((prev) => {
      const updated = [...prev];

      for (const point of newPoints) {
        if (lastPointRef.current) {
          const diff = calculateHaversineDistance(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            point.latitude,
            point.longitude
          );
          // Filter noise GPS: lompatan absurd (>0.3km dalam satu tick) diabaikan
          if (diff < 0.3) {
            distanceRef.current += diff;
          } else {
            console.warn('⚠️ GPS noise detected, skipped jump:', diff.toFixed(4), 'km');
          }
        }
        lastPointRef.current = point;
        updated.push(point);
      }

      return updated;
    });

    setCurrentLocation(newPoints[newPoints.length - 1]);
    setDistance(distanceRef.current);
  }, []);

  // Polling antrian titik dari background task selama tracking aktif.
  // Ini juga menangkap update saat app kembali ke foreground.
  useEffect(() => {
    if (isTracking) {
      syncIntervalRef.current = setInterval(async () => {
        try {
          const pending = await drainPendingLocationPoints();
          if (pending.length > 0) {
            appendNewPoints(pending);
          }
        } catch (e) {
          console.error('❌ Error syncing pending points:', e);
        }
      }, 2000);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isTracking, appendNewPoints]);

  const startLocationTracking = async () => {
    try {
      console.log('▶️ Starting location tracking...');
      
      lastPointRef.current = routeCoordinates.length > 0 ? routeCoordinates[routeCoordinates.length - 1] : null;
      distanceRef.current = distance;

      // Foreground watcher: update halus selagi app dibuka
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 2000,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          appendNewPoints([{ latitude, longitude }]);
        }
      );

      console.log('✅ Foreground location tracking started');

      // Background watcher: tetap jalan walau app diminimize
      const backgroundOk = await startBackgroundLocationTracking();
      if (!backgroundOk) {
        Alert.alert(
          'Lokasi latar belakang tidak aktif',
          'Tracking tetap berjalan selama aplikasi dibuka, tapi tidak akan merekam saat aplikasi diminimize. Aktifkan izin lokasi "Selalu Izinkan" di Settings untuk merekam di background.'
        );
      }

      setIsTracking(true);
    } catch (e) {
      console.error('❌ Gagal memulai tracking:', e);
      Alert.alert(
        'Gagal memulai tracking',
        'Error: ' + (e instanceof Error ? e.message : String(e)) + '\n\nCoba periksa izin lokasi di Settings dan ulangi.'
      );
    }
  };

  const pauseLocationTracking = async () => {
    try {
      console.log('⏸️ Pausing location tracking...');
      setIsTracking(false);
      
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      
      await stopBackgroundLocationTracking();
      console.log('✅ Tracking paused');
    } catch (e) {
      console.error('❌ Error pausing tracking:', e);
    }
  };

  const stopLocationTracking = async (isUnmountingOrEvent?: any) => {
    const isUnmounting = isUnmountingOrEvent === true;

    try {
      console.log('⏹️ Stopping location tracking...');
      
      setIsTracking(false);
      
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      
      await stopBackgroundLocationTracking().catch(console.error);
      console.log('✅ Tracking stopped');

      if (isUnmounting) return;

      const finalDistance = distanceRef.current;

      if (finalDistance >= 0) {
        let finalStat = '';

        if (activityType === 'cycling') {
          const speed = duration > 0 ? finalDistance / (duration / 3600) : 0;
          finalStat = `${speed.toFixed(1)} km/h`;
        } else {
          const totalMins = duration / 60;
          const paceMin = finalDistance > 0 ? totalMins / finalDistance : 0;
          const m = Math.floor(paceMin);
          const s = Math.floor((paceMin - m) * 60);
          finalStat = `${m}'${s.toString().padStart(2, '0')}" pace`;
        }

        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        const finalCoordinates = finalDistance >= 0.4 ? [...routeCoordinates] : [];

        const newLog: ActivityLog = {
          id: Math.random().toString(36).substring(2, 9),
          type: activityType,
          date: formattedDate,
          distance: finalDistance,
          duration: duration,
          formattedStat: finalStat,
          coordinates: finalCoordinates,
        };

        try {
          const newHistory = [newLog, ...history];
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
          setHistory(newHistory);

          setSummaryData({
            distance: finalDistance,
            duration: duration,
            type: activityType,
            coords: finalCoordinates,
          });
          setShowSummary(true);
          
          console.log('✅ Activity saved:', newLog);
        } catch (e) {
          console.error('❌ Gagal menyimpan riwayat:', e);
          Alert.alert('Error', 'Gagal menyimpan aktivitas');
        }
      }

      lastPointRef.current = null;
      distanceRef.current = 0;
      setRouteCoordinates([]);
      setDistance(0);
      setDuration(0);
    } catch (e) {
      console.error('❌ Error stopping tracking:', e);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory([]);
      console.log('✅ History cleared');
    } catch (e) {
      console.error('❌ Gagal menghapus riwayat:', e);
    }
  };

  const handleOpenSummaryFromHistory = (log: ActivityLog) => {
    setSummaryData({
      distance: log.distance,
      duration: log.duration,
      type: log.type,
      coords: log.coordinates || [],
    });
    setShowSummary(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {showWelcome ? (
        <WelcomeScreen onStart={() => setShowWelcome(false)} />
      ) : (
        <>
          {currentLocation ? (
            <MapView
              style={styles.map}
              showsUserLocation={true}
              followsUserLocation={true}
              onMapReady={() => setMapReady(true)}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <UrlTile urlTemplate={DARK_TILE_URL} maximumZ={19} flipY={false} />

              {routeCoordinates.length > 0 && (
                <Polyline coordinates={routeCoordinates} strokeColor="#fc5200" strokeWidth={5} />
              )}
              {routeCoordinates.length > 0 && (
                <Marker coordinate={routeCoordinates[0]} pinColor="#5a7fa4" />
              )}
            </MapView>
          ) : (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>MENGUNCI KOORDINAT SATELIT...</Text>
            </View>
          )}

          <View style={styles.dashboard}>
            <HistoryList history={history} onClear={clearHistory} onPressItem={handleOpenSummaryFromHistory} />

            <ActivitySelector
              currentType={activityType}
              onSelectType={setActivityType}
              isTracking={isTracking || routeCoordinates.length > 0}
            />

            <StatsPanel distance={distance} duration={duration} type={activityType} />

            <View style={styles.actionRow}>
              {isTracking ? (
                <TouchableOpacity style={styles.pauseBtn} onPress={pauseLocationTracking}>
                  <Pause color="#fafafa" size={20} strokeWidth={2.5} />
                  <Text style={styles.pauseText}>PAUSE</Text>
                </TouchableOpacity>
              ) : routeCoordinates.length > 0 ? (
                <>
                  <TouchableOpacity style={styles.resumeBtn} onPress={startLocationTracking}>
                    <Play color="#fafafa" size={18} strokeWidth={2.5} fill="#fafafa" />
                    <Text style={styles.resumeText}>Lanjutkan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.finishBtn} onPress={() => stopLocationTracking(false)}>
                    <Square color="#fafafa" size={16} fill="#fafafa" />
                    <Text style={styles.finishText}>Selesaikan</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.startBtn} onPress={startLocationTracking}>
                  <Play color="#09090b" size={18} strokeWidth={2.5} fill="#09090b" />
                  <Text style={styles.startText}>START {activityType.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <WorkoutSummaryModal
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            distance={summaryData.distance}
            duration={summaryData.duration}
            type={summaryData.type}
            routeCoordinates={summaryData.coords}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  map: { flex: 1 },
  loading: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#71717a', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  dashboard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#09090b',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#18181b',
    gap: 14,
  },
  actionRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 24 },
  startBtn: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startText: { color: '#09090b', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  pauseText: { color: '#fafafa', fontSize: 14, fontWeight: '700' },
  resumeBtn: {
    flex: 1,
    backgroundColor: '#fc5200',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeText: { color: '#fafafa', fontSize: 14, fontWeight: '700' },
  finishBtn: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  finishText: { color: '#fafafa', fontSize: 14, fontWeight: '700' },
});