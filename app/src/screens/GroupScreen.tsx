import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { getGroup, listExpenses, listMembers } from '../db/repo';
import type { Expense, Group, Member } from '../db/types';
import { computeCurrentNet } from '../domain/groupLogic';
import { buildShareText } from '../domain/share';
import { useStore } from '../store/useStore';
import { formatMoney } from '../utils/format';

export default function GroupScreen({ groupId }: { groupId: string }) {
  const navigate = useStore((s) => s.navigate);
  const refreshKey = useStore((s) => s.refreshKey);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [net, setNet] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const g = getGroup(groupId);
    setGroup(g);
    if (g) {
      setMembers(listMembers(groupId));
      setExpenses(listExpenses(groupId));
      setNet(computeCurrentNet(groupId));
    }
  }, [groupId, refreshKey]);

  if (!group) return <Text style={styles.pad}>群组不存在</Text>;

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'home' })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={[styles.title, styles.titleFlex]}>{group.name}</Text>
        <Pressable onPress={() => navigate({ name: 'stats', groupId })}>
          <Text style={styles.statsLink}>统计</Text>
        </Pressable>
      </View>

      <ScrollView>
        {group.inviteCode && (
          <Pressable
            style={styles.inviteCard}
            onPress={() =>
              Share.share({
                message: `加入我的分账群组「${group.name}」，邀请码：${group.inviteCode}`,
              })
            }
          >
            <Text style={styles.inviteLabel}>邀请码</Text>
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <Text style={styles.inviteHint}>点击分享给朋友，输入邀请码即可加入</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>成员</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <View key={m.id} style={styles.memberChip}>
              <Text>{m.name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>余额</Text>
        {[...net.entries()].map(([id, v]) => (
          <View key={id} style={styles.balanceRow}>
            <Text>{memberName(id)}</Text>
            <Text style={v > 0 ? styles.positive : v < 0 ? styles.negative : styles.zero}>
              {formatMoney(v, group.baseCurrency)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>支出</Text>
        {expenses.map((e) => (
          <View key={e.id} style={styles.expenseRow}>
            <Text style={styles.expensePayer}>{memberName(e.payerId)} 垫付</Text>
            <Text>{formatMoney(e.amountCents, e.currency)}</Text>
          </View>
        ))}
        {expenses.length === 0 && <Text style={styles.empty}>还没有记录</Text>}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={styles.button}
          onPress={() => navigate({ name: 'addExpense', groupId })}
        >
          <Text style={styles.buttonText}>记一笔</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigate({ name: 'settle', groupId })}
        >
          <Text style={styles.buttonText}>结算</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonGhost]}
          onPress={() => Share.share({ message: buildShareText(groupId) })}
        >
          <Text style={styles.buttonGhostText}>分享</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pad: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { fontSize: 18, color: '#3478f6', marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  titleFlex: { flex: 1 },
  statsLink: { fontSize: 16, color: '#3478f6' },
  inviteCard: {
    backgroundColor: '#eef2fb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  inviteLabel: { fontSize: 13, color: '#666' },
  inviteCode: { fontSize: 28, fontWeight: '700', color: '#3478f6', letterSpacing: 4 },
  inviteHint: { fontSize: 12, color: '#999', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    backgroundColor: '#f2f3f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  positive: { color: '#34c759' },
  negative: { color: '#ff3b30' },
  zero: { color: '#999' },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  expensePayer: { color: '#666' },
  empty: { color: '#999', textAlign: 'center', marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    flex: 1,
    backgroundColor: '#3478f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: '#8e8e93' },
  buttonGhost: {
    backgroundColor: '#eef2fb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonGhostText: { color: '#3478f6', fontSize: 16, fontWeight: '600' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
