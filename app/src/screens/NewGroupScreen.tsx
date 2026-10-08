import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addMember, createGroup } from '../db/repo';
import { CURRENCIES } from '../domain/rates';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../store/useStore';

export default function NewGroupScreen() {
  const navigate = useStore((s) => s.navigate);
  const refresh = useStore((s) => s.refresh);
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [membersText, setMembersText] = useState('');

  const save = () => {
    if (!name.trim()) return;
    const groupId = createGroup(name.trim(), currency);
    if (user) addMember(groupId, user.email ?? '我', user.id);
    const members = membersText
      .split(/[,，\n]/)
      .map((m) => m.trim())
      .filter(Boolean);
    for (const m of members) addMember(groupId, m);
    refresh();
    navigate({ name: 'group', groupId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'home' })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>新建群组</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>群组名称</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="如：东京之旅"
        />

        <Text style={styles.label}>主币种</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, currency === c && styles.chipActive]}
                onPress={() => setCurrency(c)}
              >
                <Text style={currency === c ? styles.chipTextActive : styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>成员（逗号分隔）</Text>
        <TextInput
          style={styles.input}
          value={membersText}
          onChangeText={setMembersText}
          placeholder="如：小明, 小红, 小刚"
        />
      </ScrollView>

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>创建</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 18, color: '#3478f6', marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { paddingBottom: 24 },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f3f5',
  },
  chipActive: { backgroundColor: '#3478f6' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextActive: { fontSize: 14, color: '#fff' },
  button: {
    backgroundColor: '#3478f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
