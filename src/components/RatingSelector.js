// Friendly rating picker: plain-English skill cards per sport (UTR bands for
// tennis, DUPR bands for pickleball). Tap a card to select; players who know
// their exact rating can type it instead.
//
// Also exports LevelGuideModal — a read-only "What's my level?" sheet that
// shows the same descriptions for the current sport.

import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPORTS, bandsFor } from '../lib/ratings';
import { DONE_BAR_ID } from './ui';
import SportIcon from './SportIcon';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function RatingSelector({ sport, selectedBandId, onSelectBand, exactValue, onChangeExact }) {
  const meta = SPORTS[sport];
  const bands = bandsFor(sport);

  return (
    <View>
      {bands.map((b) => {
        const active = selectedBandId === b.id;
        return (
          <Pressable
            key={b.id}
            onPress={() => onSelectBand(b)}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={styles.cardHead}>
              <Text style={[styles.cardTitle, active && { color: colors.blue }]}>{b.title}</Text>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
            </View>
            <Text style={styles.cardDesc}>{b.desc}</Text>
          </Pressable>
        );
      })}

      <View style={styles.exactRow}>
        <Text style={styles.exactLabel}>Know your exact {meta.ratingName}? (optional)</Text>
        <TextInput
          value={exactValue}
          onChangeText={(t) => onChangeExact(t.replace(/[^0-9.]/g, '').slice(0, 5))}
          keyboardType="decimal-pad"
          placeholder={`e.g. ${sport === 'pickleball' ? '3.5' : '6.5'}`}
          placeholderTextColor={colors.slate400}
          style={styles.exactInput}
          inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
        />
      </View>
      <Text style={styles.selfReportNote}>
        Self-reported skill level for matchmaking — not an official {meta.ratingName} rating.
        Hit is not affiliated with {sport === 'pickleball' ? 'DUPR' : 'UTR'}.
      </Text>
    </View>
  );
}

// Read-only level guide ("What's my level?") for the given sport.
export function LevelGuideModal({ visible, sport, onClose }) {
  const insets = useSafeAreaInsets();
  const meta = SPORTS[sport];
  const bands = bandsFor(sport);

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
            {meta.label} uses {meta.ratingName}. Find the description that sounds like you.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {bands.map((b) => (
              <View key={b.id} style={styles.guideRow}>
                <Text style={styles.guideTitle}>{b.title}</Text>
                <Text style={styles.cardDesc}>{b.desc}</Text>
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
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  cardActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  cardDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate500, marginTop: 4 },
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

  exactRow: { marginTop: spacing.md },
  exactLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 6 },
  selfReportNote: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, lineHeight: 16, marginTop: spacing.md, textAlign: 'center' },
  exactInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.navy,
  },

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
