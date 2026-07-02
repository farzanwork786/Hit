// Skill Level picker: a scrollable list of level cards (number + plain-English
// description) for the given sport. Tap a card to select.
//
// Also exports LevelGuideModal — a read-only "What's my level?" sheet that
// shows the same descriptions for the current sport, and SkillLevelPickerModal
// — the same picker inside a bottom sheet (used by Edit Profile).

import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPORTS, skillLevelsFor } from '../lib/ratings';
import SportIcon from './SportIcon';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function RatingSelector({ sport, value, onSelect }) {
  const levels = skillLevelsFor(sport);

  return (
    <View>
      {levels.map((l) => {
        const active = value === l.value;
        return (
          <Pressable
            key={l.value}
            onPress={() => onSelect(l.value)}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={[styles.levelBadge, active && styles.levelBadgeActive]}>
              <Text style={[styles.levelBadgeText, active && { color: colors.white }]}>
                {l.value.toFixed(1)}
              </Text>
            </View>
            <Text style={[styles.cardDesc, active && { color: colors.navy }]}>{l.desc}</Text>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.selfReportNote}>
        Self-reported skill level for matchmaking only. You can update it anytime.
      </Text>
    </View>
  );
}

// Bottom-sheet version of the picker (used by Edit Profile).
export function SkillLevelPickerModal({ visible, sport, value, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const meta = SPORTS[sport] || SPORTS.tennis;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <SportIcon sport={sport} size={20} color={colors.navy} />
              <Text style={styles.sheetTitle}>{meta.label} Skill Level</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.slate500} />
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>Pick the description that sounds most like you.</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <RatingSelector
              sport={sport}
              value={value}
              onSelect={(v) => {
                onSelect(v);
                onClose();
              }}
            />
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Read-only level guide ("What's my level?") for the given sport.
export function LevelGuideModal({ visible, sport, onClose }) {
  const insets = useSafeAreaInsets();
  const levels = skillLevelsFor(sport);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <SportIcon sport={sport} size={20} color={colors.navy} />
              <Text style={styles.sheetTitle}>What's my level?</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.slate500} />
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>
            Skill Level runs from {levels[0].value.toFixed(1)} to{' '}
            {levels[levels.length - 1].value.toFixed(1)}. Find the description that sounds like you.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {levels.map((l) => (
              <View key={l.value} style={styles.guideRow}>
                <Text style={styles.guideTitle}>{l.value.toFixed(1)}</Text>
                <Text style={styles.cardDescPlain}>{l.desc}</Text>
              </View>
            ))}
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  cardActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  levelBadge: {
    minWidth: 46,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  levelBadgeActive: { backgroundColor: colors.blue },
  levelBadgeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  cardDesc: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.slate500 },
  cardDescPlain: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate500, marginTop: 4 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: colors.blue, borderColor: colors.blue },

  selfReportNote: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, lineHeight: 16, marginTop: spacing.md, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    marginBottom: spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.slate500, marginTop: 4, marginBottom: spacing.md },
  guideRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  guideTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.navy },
});
