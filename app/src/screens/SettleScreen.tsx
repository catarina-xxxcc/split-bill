import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addSettlement, getGroup, listMembers } from '../db/repo';
import type { Group, Member } from '../db/types';
import { computeCurrentNet, computeSettlementPlan } from '../domain/groupLogic';
import type { PlanTransfer } from '../domain/groupLogic';
import { useStore } from '../store/useStore';
import { formatMoney } from '../utils/format';

export default function SettleScreen({ groupId }: { groupId: string }) {
  const navigate = useStore((s) => s.navigate);
  const refresh = useStore((s) => s.refresh);
  const refreshKey = useStore((s) => s.refreshKey);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [net, setNet] = useState<Map<string, number>>(new Map());
  const [plan, setPlan] = useState<PlanTransfer[]>([]);

  useEffect(() => {
    const g = getGroup(groupId);
    setGroup(g);
    if (g) {
      setMembers(listMembers(groupId));
      setNet(computeCurrentNet(groupId));
      setPlan(computeSettlementPlan(groupId));
    }
  }, [groupId, refreshKey]);

  if (!group) return <Text style={styles.pad}>群组不存在</Text>;

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  const markPaid = (t: PlanTransfer) => {
    addSettlement(groupId, t.from, t.to, t.amountCents);
    refresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'group', groupId })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>结算</Text>
      </View>

      <ScrollView>
        <Text style={styles.sectionTitle}>当前余额</Text>
        {[...net.entries()].map(([id, v]) => (
          <View key={id} style={styles.balanceRow}>
            <Text>{memberName(id)}</Text>
            <Text style={v > 0 ? styles.positive : v < 0 ? styles.negative : styles.zero}>
              {formatMoney(v, group.baseCurrency)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>最少转账方案</Text>
        {plan.length === 0 ? (
          <Text style={styles.empty}>已结清，无需转账 🎉</Text>
        ) : (
          plan.map((t, i) => (
            <View key={i} style={styles.transferRow}>
              <Text>
                {memberName(t.from)} → {memberName(t.to)}：{formatMoney(t.amountCents, group.baseCurrency)}
              </Text>
              <Pressable style={styles.payButton} onPress={() => markPaid(t)}>
                <Text style={styles.payButtonText}>标记已还</Text>
              </Pressable>
            </View>
          ))
        )}
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
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
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
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  payButton: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  payButtonText: { color: '#fff', fontSize: 14 },
  empty: { color: '#999', textAlign: 'center', marginTop: 16 },
});
