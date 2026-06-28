import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Footprints, Bike, Trash2, Zap } from 'lucide-react-native';
import { ActivityLog, ActivityType } from '../types';

interface HistoryListProps {
  history: ActivityLog[];
  onClear: () => void;
  onPressItem: (log: ActivityLog) => void;
}

export default function HistoryList({ history, onClear, onPressItem }: HistoryListProps) {
  const renderActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'running':
        return <Zap color="#fc5200" size={18} strokeWidth={2.5} />;
      case 'walking':
        return <Footprints color="#fc5200" size={18} strokeWidth={2.5} />;
      case 'cycling':
        return <Bike color="#fc5200" size={18} strokeWidth={2.5} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Riwayat Latihan</Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.7}>
            <Trash2 color="#71717a" size={14} />
            <Text style={styles.clearText}>Hapus</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Belum ada aktivitas. Yuk gas olahraga!</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyCard} onPress={() => onPressItem(item)} activeOpacity={0.8}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrapper}>{renderActivityIcon(item.type)}</View>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>

              <Text style={styles.distanceText}>
                {item.distance.toFixed(2)} <Text style={styles.kmUnit}>km</Text>
              </Text>

              <Text style={styles.statText} numberOfLines={1}>
                {item.formattedStat}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  titleText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  clearText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    marginHorizontal: 24,
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 4,
  },
  historyCard: {
    backgroundColor: '#18181b',
    width: 140,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: '#09090b',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  dateText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceText: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  kmUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717a',
  },
  statText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});