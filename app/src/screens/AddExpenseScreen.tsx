import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { convert, splitExpense, splitWithItems, type ShareFraction } from '@split/engine';
import { addExpense, getGroup, listMembers, uuid } from '../db/repo';
import type { Group, Member, NewShare, SplitType } from '../db/types';
import { CURRENCIES, fetchLiveRate, getRate } from '../domain/rates';
import { CATEGORIES } from '../domain/categories';
import { useStore } from '../store/useStore';

interface Item {
  key: string;
  name: string;
  amountText: string;
  participantIds: string[];
}

const toCents = (t: string) => Math.round((parseFloat(t) || 0) * 100);

export default function AddExpenseScreen({ groupId }: { groupId: string }) {
  const navigate = useStore((s) => s.navigate);
  const refresh = useStore((s) => s.refresh);

  const group = getGroup(groupId) as Group;
  const members = listMembers(groupId) as Member[];

  const [mode, setMode] = useState<'split' | 'items'>('split');
  const [amountText, setAmountText] = useState('');
  const [currency, setCurrency] = useState(group.baseCurrency);
  const [payerId, setPayerId] = useState<string | null>(members[0]?.id ?? null);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participantIds, setParticipantIds] = useState<Set<string>>(
    new Set(members.map((m) => m.id)),
  );
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const [ratioInputs, setRatioInputs] = useState<Record<string, string>>({});
  const [shareNumInputs, setShareNumInputs] = useState<Record<string, string>>({});
  const [shareDenInputs, setShareDenInputs] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState<string | null>(null);

  const [liveRate, setLiveRate] = useState<number | null>(null);
  useEffect(() => {
    setLiveRate(null);
    if (currency !== group.baseCurrency) {
      fetchLiveRate(currency, group.baseCurrency).then(setLiveRate);
    }
  }, [currency, group.baseCurrency]);

  const rate =
    currency === group.baseCurrency
      ? 1
      : (liveRate ?? getRate(currency, group.baseCurrency) ?? 1);

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleItemParticipant = (key: string, id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? {
              ...it,
              participantIds: it.participantIds.includes(id)
                ? it.participantIds.filter((x) => x !== id)
                : [...it.participantIds, id],
            }
          : it,
      ),
    );
  };

  const updateItem = (key: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: uuid(), name: '', amountText: '', participantIds: [] },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const save = () => {
    const amountCents = toCents(amountText);
    if (amountCents <= 0 || payerId == null || participantIds.size === 0) return;

    const baseAmountCents = convert(
      { amountCents, currency },
      rate,
      group.baseCurrency,
    ).amountCents;

    const ids = [...participantIds];
    let shareMap: Map<string | number, number>;
    let finalSplitType: SplitType = splitType;

    if (mode === 'items') {
      const expenseItems = items.map((it) => ({
        name: it.name,
        amountCents: toCents(it.amountText),
        participants: it.participantIds,
      }));
      shareMap = splitWithItems(amountCents, expenseItems, ids);
      finalSplitType = 'by_items';
    } else if (splitType === 'equal') {
      shareMap = splitExpense(amountCents, { type: 'equal', members: ids });
    } else if (splitType === 'by_member') {
      const memberAmounts: Record<string, number> = {};
      for (const id of ids) memberAmounts[id] = toCents(amountInputs[id] ?? '');
      shareMap = splitExpense(amountCents, { type: 'by_member', memberAmounts });
    } else if (splitType === 'by_ratio') {
      const ratios: Record<string, number> = {};
      for (const id of ids) ratios[id] = parseFloat(ratioInputs[id] ?? '') || 0;
      shareMap = splitExpense(amountCents, { type: 'by_ratio', ratios });
    } else {
      const shares: Record<string, ShareFraction> = {};
      for (const id of ids) {
        const num = parseFloat(shareNumInputs[id] ?? '') || 0;
        const den = parseFloat(shareDenInputs[id] ?? '') || 1;
        shares[id] = { num, den };
      }
      shareMap = splitExpense(amountCents, { type: 'by_share', shares });
    }

    const sharesOut: NewShare[] = [...shareMap].map(([id, cents]) => ({
      memberId: String(id),
      itemName: null,
      shareCents: cents,
      baseShareCents: convert({ amountCents: cents, currency }, rate, group.baseCurrency)
        .amountCents,
    }));

    addExpense({
      groupId,
      payerId,
      amountCents,
      currency,
      rate,
      baseAmountCents,
      splitType: finalSplitType,
      shares: sharesOut,
      category,
      note: null,
    });
    refresh();
    navigate({ name: 'group', groupId });
  };

  const showMemberInput = mode === 'split' && splitType !== 'equal';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate({ name: 'group', groupId })}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>记一笔</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>金额</Text>
        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text style={styles.label}>币种</Text>
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
        {currency !== group.baseCurrency && (
          <Text style={styles.hint}>按 1 {currency} = {rate} {group.baseCurrency} 折算</Text>
        )}

        <Text style={styles.label}>付款人</Text>
        <View style={styles.chips}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.chip, payerId === m.id && styles.chipActive]}
              onPress={() => setPayerId(m.id)}
            >
              <Text style={payerId === m.id ? styles.chipTextActive : styles.chipText}>
                {m.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>分类</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory((prev) => (prev === c ? null : c))}
            >
              <Text style={category === c ? styles.chipTextActive : styles.chipText}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>记账方式</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, mode === 'split' && styles.chipActive]}
            onPress={() => setMode('split')}
          >
            <Text style={mode === 'split' ? styles.chipTextActive : styles.chipText}>简单分摊</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, mode === 'items' && styles.chipActive]}
            onPress={() => setMode('items')}
          >
            <Text style={mode === 'items' ? styles.chipTextActive : styles.chipText}>分项（菜品级）</Text>
          </Pressable>
        </View>

        {mode === 'split' && (
          <>
            <Text style={styles.label}>分摊方式</Text>
            <View style={styles.chips}>
              {(
                [
                  ['equal', '均分'],
                  ['by_member', '按人头'],
                  ['by_ratio', '按比例'],
                  ['by_share', '按份额'],
                ] as [SplitType, string][]
              ).map(([t, label]) => (
                <Pressable
                  key={t}
                  style={[styles.chip, splitType === t && styles.chipActive]}
                  onPress={() => setSplitType(t)}
                >
                  <Text style={splitType === t ? styles.chipTextActive : styles.chipText}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>参与人</Text>
        {members.map((m) => {
          const selected = participantIds.has(m.id);
          return (
            <View key={m.id} style={styles.participantRow}>
              <Pressable
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => toggleParticipant(m.id)}
              >
                <Text style={selected ? styles.chipTextActive : styles.chipText}>{m.name}</Text>
              </Pressable>
              {showMemberInput && selected && (
                <View style={styles.inputGroup}>
                  {splitType === 'by_member' && (
                    <TextInput
                      style={styles.inlineInput}
                      value={amountInputs[m.id] ?? ''}
                      onChangeText={(t) =>
                        setAmountInputs((prev) => ({ ...prev, [m.id]: t }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="金额"
                    />
                  )}
                  {splitType === 'by_ratio' && (
                    <TextInput
                      style={styles.inlineInput}
                      value={ratioInputs[m.id] ?? ''}
                      onChangeText={(t) =>
                        setRatioInputs((prev) => ({ ...prev, [m.id]: t }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="比例"
                    />
                  )}
                  {splitType === 'by_share' && (
                    <View style={styles.shareInputs}>
                      <TextInput
                        style={[styles.inlineInput, styles.shareField]}
                        value={shareNumInputs[m.id] ?? ''}
                        onChangeText={(t) =>
                          setShareNumInputs((prev) => ({ ...prev, [m.id]: t }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="分子"
                      />
                      <Text>/</Text>
                      <TextInput
                        style={[styles.inlineInput, styles.shareField]}
                        value={shareDenInputs[m.id] ?? ''}
                        onChangeText={(t) =>
                          setShareDenInputs((prev) => ({ ...prev, [m.id]: t }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="分母"
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {mode === 'items' && (
          <View style={styles.itemsSection}>
            <View style={styles.itemsHeader}>
              <Text style={styles.label}>明细项</Text>
              <Pressable style={styles.addItemButton} onPress={addItem}>
                <Text style={styles.addItemText}>+ 添加明细</Text>
              </Pressable>
            </View>
            {items.length === 0 && (
              <Text style={styles.hint}>未填明细时，全额按参与人均分</Text>
            )}
            {items.map((it) => (
              <View key={it.key} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <TextInput
                    style={[styles.input, styles.itemName]}
                    value={it.name}
                    onChangeText={(t) => updateItem(it.key, { name: t })}
                    placeholder="明细名（如 牛排）"
                  />
                  <TextInput
                    style={[styles.input, styles.itemAmount]}
                    value={it.amountText}
                    onChangeText={(t) => updateItem(it.key, { amountText: t })}
                    keyboardType="decimal-pad"
                    placeholder="金额"
                  />
                  <Pressable onPress={() => removeItem(it.key)}>
                    <Text style={styles.removeItem}>✕</Text>
                  </Pressable>
                </View>
                <View style={styles.chips}>
                  {members.map((m) => {
                    const sel = it.participantIds.includes(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        style={[styles.chip, sel && styles.chipActive]}
                        onPress={() => toggleItemParticipant(it.key, m.id)}
                      >
                        <Text style={sel ? styles.chipTextActive : styles.chipText}>
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>保存</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
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
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f3f5',
  },
  chipActive: { backgroundColor: '#3478f6' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextActive: { fontSize: 14, color: '#fff' },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  inputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  inlineInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    flex: 1,
  },
  shareInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareField: { flex: 1 },
  itemsSection: { marginTop: 8 },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addItemButton: { paddingVertical: 8 },
  addItemText: { color: '#3478f6', fontSize: 14 },
  itemCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemName: { flex: 2, padding: 8 },
  itemAmount: { flex: 1, padding: 8 },
  removeItem: { color: '#ff3b30', fontSize: 16, paddingHorizontal: 4 },
  button: {
    backgroundColor: '#3478f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
