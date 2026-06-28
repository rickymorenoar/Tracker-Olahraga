import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Footprints, Bike, Zap } from 'lucide-react-native';
import { ActivityType } from '../types';

interface ActivitySelectorProps {
  currentType: ActivityType;
  onSelectType: (type: ActivityType) => void;
  isTracking: boolean;
}

export default function ActivitySelector({ currentType, onSelectType, isTracking }: ActivitySelectorProps) {
  const options = [
    { id: 'running', label: 'Lari', icon: Zap },
    { id: 'walking', label: 'Jalan', icon: Footprints },
    { id: 'cycling', label: 'Sepeda', icon: Bike },
  ] as const;

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentType === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.tab, isActive && styles.tabActive, isTracking && styles.disabled]}
            onPress={() => !isTracking && onSelectType(opt.id)}
            disabled={isTracking}
          >
            <Icon color={isActive ? '#09090b' : '#a1a1aa'} size={15} strokeWidth={2.5} />
            <Text style={[styles.labelText, isActive && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    marginHorizontal: 20,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: { backgroundColor: '#fafafa' },
  disabled: { opacity: 0.5 },
  labelText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#09090b', fontWeight: '700' },
});