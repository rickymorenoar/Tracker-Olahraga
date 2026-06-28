import React, { useRef } from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import { X, Share2, Footprints, Bike, Zap } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Logo from './Logo';
import { ActivityType, LocationCoordinate } from '../types';

interface WorkoutSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  distance: number;
  duration: number;
  type: ActivityType;
  routeCoordinates: LocationCoordinate[];
  steps?: number;
}

const { width } = Dimensions.get('window');

// Tile gratis tanpa API key, tema gelap (sama seperti map utama)
const DARK_TILE_URL = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

export default function WorkoutSummaryModal({
  visible,
  onClose,
  distance,
  duration,
  type,
  routeCoordinates,
  steps,
}: WorkoutSummaryModalProps) {
  const cardRef = useRef<any>(null);

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m ${s}d`;
    return `${m}m ${s}d`;
  };

  const getDynamicMetric = () => {
    if (type === 'running') {
      if (distance === 0) return { label: 'Pace', value: '0:00', unit: '/km' };
      const paceInSeconds = duration / distance;
      const mins = Math.floor(paceInSeconds / 60);
      const secs = Math.floor(paceInSeconds % 60);
      return {
        label: 'Pace',
        value: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        unit: '/km',
      };
    }

    if (type === 'cycling') {
      if (duration === 0) return { label: 'Kecepatan', value: '0.0', unit: 'km/h' };
      const hours = duration / 3600;
      const speed = distance / hours;
      return {
        label: 'Kecepatan',
        value: speed.toFixed(1),
        unit: 'km/h',
      };
    }

    const finalSteps = steps ?? Math.round(distance * 1320);
    return {
      label: 'Langkah',
      value: finalSteps.toLocaleString('id-ID'),
      unit: 'steps',
    };
  };

  const handleDownloadAndShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Fitur berbagi tidak didukung di perangkat ini');
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
      });

      await Sharing.shareAsync(uri, {
        dialogTitle: 'Simpan atau Bagikan Hasil Latihan KYYS',
        mimeType: 'image/png',
      });
    } catch (error) {
      console.error('Gagal membagikan rangkuman:', error);
      Alert.alert('Gagal', 'Gagal memproses gambar rangkuman olahraga.');
    }
  };

  const renderBadgeIcon = () => {
    const iconSize = 14;
    const iconColor = '#fc5200';
    if (type === 'cycling') {
      return <Bike color={iconColor} size={iconSize} strokeWidth={2.5} />;
    }
    if (type === 'running') {
      return <Zap color={iconColor} size={iconSize} strokeWidth={2.5} />;
    }
    return <Footprints color={iconColor} size={iconSize} strokeWidth={2.5} />;
  };

  const renderActivityIcon = () => {
    const iconColor = '#fc5200';
    switch (type) {
      case 'cycling':
        return <Bike color={iconColor} size={56} strokeWidth={1.5} />;
      case 'walking':
        return <Footprints color={iconColor} size={56} strokeWidth={1.5} />;
      case 'running':
      default:
        return <Zap color={iconColor} size={56} strokeWidth={1.5} />;
    }
  };

  const metric = getDynamicMetric();
  const hasRoute = routeCoordinates && routeCoordinates.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }} style={styles.stravaCard}>
            <View style={styles.badgeContainer}>
              {renderBadgeIcon()}
              <Text style={styles.activityBadgeText}>
                {type === 'running' ? 'RUNNING' : type === 'walking' ? 'WALKING' : 'CYCLING'}
              </Text>
            </View>

            <View style={styles.metricGroup}>
              <Text style={styles.label}>Jarak</Text>
              <Text style={styles.value}>
                {distance.toFixed(2)} <Text style={styles.unit}>km</Text>
              </Text>
            </View>

            <View style={styles.metricGroup}>
              <Text style={styles.label}>Waktu</Text>
              <Text style={styles.value}>{formatDuration(duration)}</Text>
            </View>

            <View style={styles.metricGroup}>
              <Text style={styles.label}>{metric.label}</Text>
              <Text style={styles.value}>
                {metric.value} <Text style={styles.unit}>{metric.unit}</Text>
              </Text>
            </View>

            {hasRoute ? (
              <View style={styles.mapLineContainer}>
                <MapView
                  style={styles.miniMap}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  initialRegion={{
                    latitude: routeCoordinates[0].latitude,
                    longitude: routeCoordinates[0].longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <UrlTile urlTemplate={DARK_TILE_URL} maximumZ={19} flipY={false} />
                  {routeCoordinates.length > 1 && (
                    <Polyline coordinates={routeCoordinates} strokeColor="#fc5200" strokeWidth={4} />
                  )}
                </MapView>
              </View>
            ) : (
              <View style={styles.iconPlaceholderContainer}>
                {renderActivityIcon()}
                <Text style={styles.iconSubtext}>Sesi Pendek / 0 km</Text>
              </View>
            )}

            <View style={styles.brandPrintContainer}>
              <Logo size={18} />
              <Text style={styles.brandLogo}>KYYS</Text>
            </View>
          </ViewShot>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#ffffff" size={18} />
              <Text style={styles.btnText}>Tutup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8} onPress={handleDownloadAndShare}>
              <Share2 color="#ffffff" size={18} />
              <Text style={styles.btnText}>Bagikan Rangkuman</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.88, alignItems: 'center', gap: 16 },
  stravaCard: {
    width: '100%',
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  activityBadgeText: { color: '#fc5200', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  metricGroup: { alignItems: 'center', marginBottom: 14 },
  label: { color: '#ffffff', fontSize: 14, fontWeight: '500', opacity: 0.6, marginBottom: 2 },
  value: { color: '#ffffff', fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  unit: { fontSize: 18, fontWeight: '600', color: '#ffffff', opacity: 0.8 },
  mapLineContainer: { width: 260, height: 140, justifyContent: 'center', alignItems: 'center', marginVertical: 10, borderRadius: 12, overflow: 'hidden' },
  miniMap: { width: '100%', height: '100%' },
  iconPlaceholderContainer: { width: 260, height: 140, justifyContent: 'center', alignItems: 'center', marginVertical: 10, backgroundColor: '#121214', borderRadius: 12, borderWidth: 1, borderColor: '#2c2c2e', gap: 4 },
  iconSubtext: { color: '#71717a', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  brandPrintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    opacity: 0.95,
  },
  brandLogo: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  closeBtn: { flex: 1, backgroundColor: '#2c2c2e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, gap: 8 },
  downloadBtn: { flex: 2, backgroundColor: '#fc5200', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, gap: 8 },
  btnText: { color: '#fafafa', fontWeight: '700', fontSize: 14 },
});