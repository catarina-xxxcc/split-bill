import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listGroups } from '../db/repo';
import type { Group } from '../db/types';
import { useStore } from '../store/useStore';

export default function HomeScreen() {
  const navigate = useStore((s) => s.navigate);
  const refreshKey = useStore((s) => s.refreshKey);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    setGroups(listGroups());
  }, [refreshKey]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>分账</Text>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigate({ name: 'group', groupId: item.id })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>主币种 {item.baseCurrency}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>还没有群组，点下方新建</Text>}
      />
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => navigate({ name: 'newGroup' })}>
          <Text style={styles.buttonText}>新建群组</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigate({ name: 'join' })}
        >
          <Text style={styles.buttonText}>加入群组</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f2f3f5',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardSub: { fontSize: 14, color: '#666', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  button: {
    flex: 1,
    backgroundColor: '#3478f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: '#8e8e93' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
});
