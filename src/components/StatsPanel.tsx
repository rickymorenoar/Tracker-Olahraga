import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Zap, Clock, Navigation, Gauge } from 'lucide-react-native';
import { ActivityType } from '../types';

interface StatsPanelProps {
  distance: number;
  duration: number;
  type: ActivityType;
}

export default function StatsPanel({ distance, duration, type }: StatsPanelProps) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const calculatePaceOrSpeed = () => {
    if (distance === 0) return type === 'cycling' ? '0.0' : "-'--\"";

    if (type === 'cycling') {
      const speed = distance / (duration / 3600);
      return speed.toFixed(1);
    } else {
      const totalMins = duration / 60;
      const paceMinPerKm = totalMins / distance;
      const mins = Math.floor(paceMinPerKm);
      const secs = Math.floor((paceMinPerKm - mins) * 60);
      if (mins > 99) return "-'--\"";
      return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statBox}>
        <View style={styles.iconLabelRow}>
          <Navigation color="#71717a" size={12} style={{ transform: [{ rotate: '45deg' }] }} />
          <Text style={styles.label}>JARAK</Text>
        </View>
        <Text style={styles.value}>
          {distance.toFixed(2)} <Text style={styles.unit}>KM</Text>
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statBox}>
        <View style={styles.iconLabelRow}>
          <Clock color="#71717a" size={12} />
          <Text style={styles.label}>DURASI</Text>
        </View>
        <Text style={styles.value}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statBox}>
        <View style={styles.iconLabelRow}>
          {type === 'cycling' ? <Gauge color="#71717a" size={12} /> : <Zap color="#71717a" size={12} />}
          <Text style={styles.label}>{type === 'cycling' ? 'SPEED' : 'PACE'}</Text>
        </View>
        <Text style={styles.value}>
          {calculatePaceOrSpeed()} <Text style={styles.unit}>{type === 'cycling' ? 'KM/H' : ''}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
  },
  statBox: { flex: 1, alignItems: 'center' },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  label: { color: '#71717a', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  value: { color: '#fafafa', fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  unit: { fontSize: 11, color: '#71717a', fontWeight: '500' },
  divider: { width: 1, backgroundColor: '#27272a', height: '70%', alignSelf: 'center' },
});