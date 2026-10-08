import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { joinGroupByCode, pullAll } from '../sync/sync';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../store/useStore';

export default function JoinScreen() {
  const navigate = useStore((s) => s.navigate);
  const refresh = useStore((s) => s.refresh);
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState(user?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const groupId = await joinGroupByCode(code.trim(), name.trim());
    if (groupId) {
      await pullAll();
      refresh();
      navigate({ name: 'group', groupId });
    } else {
      setError('邀请码无效，请检查后重试');
    }
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'home' })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>加入群组</Text>
      </View>

      <Text style={styles.label}>邀请码</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="6 位邀请码"
        autoCapitalize="characters"
        maxLength={6}
      />

      <Text style={styles.label}>你的昵称</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="显示名"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={join} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? '加入中…' : '加入'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { fontSize: 18, color: '#3478f6', marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  error: { color: '#ff3b30', marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#3478f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
