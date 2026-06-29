import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
// Ganti react-native-maps dengan WebView
import { WebView } from 'react-native-webview';
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

// 📄 RAW HTML PETA LEAFLET (OpenStreetMap) - 100% Gratis & Anti-Crash
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #09090b; }
    /* Membikin background tile peta agak gelap mencocokkan tema dark */
    .leaflet-tile-container { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([-6.2000, 106.8166], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var pathLine = L.polyline([], { color: '#fc5200', weight: 5 }).addTo(map);
    var currentMarker = null;
    var startMarker = null;

    // Fungsi update lokasi saat tracking aktif
    function updateLocation(lat, lng, isTracking) {
      var pos = [lat, lng];
      
      if (!currentMarker) {
        currentMarker = L.circleMarker(pos, { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, radius: 7 }).addTo(map);
        map.setView(pos, 16);
      } else {
        currentMarker.setLatLng(pos);
      }

      if (isTracking) {
        pathLine.addLatLng(pos);
        if (!startMarker && pathLine.getLatLngs().length === 1) {
          startMarker = L.circleMarker(pos, { color: '#5a7fa4', radius: 6 }).addTo(map);
        }
        map.panTo(pos);
      }
    }

    // Fungsi menggambar ulang rute lama pas klik item history
    function drawStaticRoute(coordsJSON) {
      var coords = JSON.parse(coordsJSON);
      if (coords.length === 0) return;
      
      // Bersihkan rute lama
      pathLine.setLatLngs([]);
      if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
      if (currentMarker) { map.removeLayer(currentMarker); currentMarker = null; }

      var points = coords.map(function(c) { return [c.latitude, c.longitude]; });
      pathLine.setLatLngs(points);
      
      startMarker = L.circleMarker(points[0], { color: '#5a7fa4', radius: 6 }).addTo(map);
      currentMarker = L.circleMarker(points[points.length - 1], { color: '#fc5200', radius: 6 }).addTo(map);
      
      var bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  </script>
</body>
</html>
`;

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
  const webViewRef = useRef<WebView>(null); // Tambah ref untuk jembatan komunikasi WebView

  const lastPointRef = useRef<LocationCoordinate | null>(null);
  const distanceRef = useRef<number>(0);

  // Trigger update koordinat ke dalam WebView secara real-time
  const sendLocationToMap = (lat: number, lng: number, trackingStatus: boolean) => {
    webViewRef.current?.injectJavaScript(`
      if (typeof updateLocation === 'function') {
        updateLocation(${lat}, ${lng}, ${trackingStatus});
      }
      true;
    `);
  };

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
  }, []);

  // Kirim lokasi awal ketika WebView sudah siap render
  useEffect(() => {
    if (mapReady && currentLocation) {
      sendLocationToMap(currentLocation.latitude, currentLocation.longitude, isTracking);
    }
  }, [mapReady, currentLocation]);

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
          if (diff < 0.3) {
            distanceRef.current += diff;
          } else {
            console.warn('⚠️ GPS noise detected, skipped jump:', diff.toFixed(4), 'km');
          }
        }
        lastPointRef.current = point;
        updated.push(point);
        
        // Push koordinat satu per satu ke peta Leaflet
        sendLocationToMap(point.latitude, point.longitude, true);
      }

      return updated;
    });

    setCurrentLocation(newPoints[newPoints.length - 1]);
    setDistance(distanceRef.current);
  }, []);

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

    // Kirim perintah gambar rute statis lama ke WebView
    if (log.coordinates && log.coordinates.length > 0) {
      const coordsJSON = JSON.stringify(log.coordinates);
      webViewRef.current?.injectJavaScript(`
        if (typeof drawStaticRoute === 'function') {
          drawStaticRoute('${coordsJSON}');
        }
        true;
      `);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {showWelcome ? (
        <WelcomeScreen onStart={() => setShowWelcome(false)} />
      ) : (
        <>
          {currentLocation ? (
            <View style={styles.mapContainer}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: LEAFLET_HTML }}
                onLoadEnd={() => setMapReady(true)}
                style={styles.map}
              />
            </View>
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
  mapContainer: { flex: 1 }, // Membikin container pembungkus WebView
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