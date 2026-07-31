// "Ask to hit" — the sheet that turns a conversation into an actual plan.
//
// Deliberately low-friction: a few tap-to-pick day and time options rather than
// a full calendar, because the common case is "today or tomorrow, evening".
// Court is free text since courts aren't a fixed list.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, DONE_BAR_ID } from './ui';
import { SESSION_TYPES } from '../lib/sessionTypes';
import { colors, fonts, spacing, radius } from '../theme';

// Next 7 days as pickable chips.
function buildDays() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setSeconds(0, 0);
    const label =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' });
    out.push({ key: d.toDateString(), label, date: d });
  }
  return out;
}

// Half-hour slots from 6am to 10pm.
function buildTimes() {
  const out = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      out.push({
        key: `${h}:${m}`,
        hour: h,
        minute: m,
        label: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      });
    }
  }
  return out;
}

export default function AskToHitSheet({
  visible,
  playerName,
  defaultCourt,
  defaultSessionType = null,
  mode = 'ask', // 'ask' | 'reschedule'
  onClose,
  onSubmit,
}) {
  const insets = useSafeAreaInsets();
  const days = useMemo(buildDays, [visible]);
  const times = useMemo(buildTimes, []);

  const [dayKey, setDayKey] = useState(null);
  const [timeKey, setTimeKey] = useState(null);
  const [court, setCourt] = useState(defaultCourt || '');
  const [note, setNote] = useState('');
  const [type, setType] = useState(defaultSessionType);

  const ready = Boolean(dayKey && timeKey);
  const rescheduling = mode === 'reschedule';

  function submit() {
    const day = days.find((d) => d.key === dayKey);
    const time = times.find((t) => t.key === timeKey);
    if (!day || !time) return;
    const when = new Date(day.date);
    when.setHours(time.hour, time.minute, 0, 0);
    onSubmit({
      scheduledAt: when.toISOString(),
      court: court.trim() || null,
      note: note.trim() || null,
      sessionType: type,
    });
    // Reset so the next open starts clean.
    setDayKey(null);
    setTimeKey(null);
    setNote('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {rescheduling ? 'Change the time' : `Ask ${playerName || 'them'} to hit`}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.slate500} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>What kind of session?</Text>
            <View style={styles.typeRow}>
              {SESSION_TYPES.map((s) => {
                const active = type === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setType(active ? null : s.key)}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                  >
                    <Ionicons
                      name={s.icon}
                      size={18}
                      color={active ? colors.blue : colors.slate500}
                    />
                    <Text style={[styles.typeLabel, active && { color: colors.blue }]}>{s.label}</Text>
                    <Text style={styles.typeBlurb}>{s.blurb}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {days.map((d) => (
                <Chip key={d.key} label={d.label} active={dayKey === d.key} onPress={() => setDayKey(d.key)} />
              ))}
            </ScrollView>

            <Text style={styles.label}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {times.map((t) => (
                <Chip key={t.key} label={t.label} active={timeKey === t.key} onPress={() => setTimeKey(t.key)} />
              ))}
            </ScrollView>

            <Text style={styles.label}>Court</Text>
            <TextInput
              value={court}
              onChangeText={setCourt}
              placeholder="Where are you playing?"
              placeholderTextColor={colors.slate400}
              style={styles.input}
              inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
            />

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Singles? Bring balls?"
              placeholderTextColor={colors.slate400}
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
            />

            <View style={{ height: spacing.lg }} />
            <AppButton
              title={rescheduling ? 'Send new time' : 'Send request'}
              icon="tennisball"
              onPress={submit}
              disabled={!ready}
            />
            {!ready ? <Text style={styles.hint}>Pick a day and time to continue.</Text> : null}
            <View style={{ height: spacing.md }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy, flex: 1 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.slate700, marginTop: spacing.md, marginBottom: 8 },
  chipRow: { gap: 8, paddingRight: spacing.xl },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.navy,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, textAlign: 'center', marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  typeCardActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  typeLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.navy },
  typeBlurb: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14, color: colors.slate500 },
});
