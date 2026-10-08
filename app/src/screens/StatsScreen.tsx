import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGroup } from '../db/repo';
import type { Group } from '../db/types';
import { computeStats } from '../domain/stats';
import type { GroupStats } from '../domain/stats';
import { useStore } from '../store/useStore';
import { formatMoney } from '../utils/format';

export default function StatsScreen({ groupId }: { groupId: string }) {
  const navigate = useStore((s) => s.navigate);
  const refreshKey = useStore((s) => s.refreshKey);
  const [group, setGroup] = useState<Group | null>(null);
  const [stats, setStats] = useState<GroupStats | null>(null);

  useEffect(() => {
    const g = getGroup(groupId);
    setGroup(g);
    if (g) setStats(computeStats(groupId));
  }, [groupId, refreshKey]);

  if (!group || !stats) return <Text style={styles.pad}>加载中…</Text>;

  const maxMember = Math.max(...stats.members.map((m) => m.cents), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'group', groupId })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>统计</Text>
      </View>

      <ScrollView>
        <Text style={styles.sectionTitle}>总支出</Text>
        <Text style={styles.total}>{formatMoney(stats.totalCents, stats.baseCurrency)}</Text>

        <Text style={styles.sectionTitle}>每人消费</Text>
        {stats.members.map((m) => (
          <View key={m.memberId} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {m.name}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, (m.cents / maxMember) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{formatMoney(m.cents, stats.baseCurrency)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>分类占比</Text>
        {stats.categories.length === 0 && <Text style={styles.empty}>暂无数据</Text>}
        {stats.categories.map((c) => (
          <View key={c.category} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {c.category}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, styles.barFillCat, { width: `${c.ratio * 100}%` }]}
              />
            </View>
            <Text style={styles.barValue}>
              {formatMoney(c.cents, stats.baseCurrency)}（{(c.ratio * 100).toFixed(0)}%）
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pad: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { fontSize: 18, color: '#3478f6', marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  total: { fontSize: 28, fontWeight: '700', color: '#3478f6' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barLabel: { width: 56, fontSize: 13, color: '#333' },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#eef0f3',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#3478f6', borderRadius: 5 },
  barFillCat: { backgroundColor: '#34c759' },
  barValue: { fontSize: 13, color: '#666', width: 110, textAlign: 'right' },
  empty: { color: '#999', textAlign: 'center', marginTop: 12 },
});
