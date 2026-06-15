// Renders the correct sport icon. Pickleball has no dedicated glyph in the
// icon sets, so we use MaterialCommunityIcons "racquetball" (a paddle-sport
// icon) — never the ping-pong/table-tennis emoji. Tennis uses a tennis ball.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SPORTS, SPORT_KEYS, playsSport, ratingLabel } from '../lib/ratings';
import { colors, fonts, radius } from '../theme';

const ICONS = {
  tennis: { lib: Ionicons, name: 'tennisball' },
  pickleball: { lib: MaterialCommunityIcons, name: 'racquetball' },
};

export default function SportIcon({ sport, size = 16, color = colors.navy, style }) {
  const cfg = ICONS[sport] || ICONS.tennis;
  const Comp = cfg.lib;
  return <Comp name={cfg.name} size={size} color={color} style={style} />;
}

// Icon + label inline (e.g. "🎾 Tennis" replacement).
export function SportLabel({ sport, size = 14, color = colors.navy, style, textStyle }) {
  const meta = SPORTS[sport];
  return (
    <View style={[styles.row, style]}>
      <SportIcon sport={sport} size={size} color={color} />
      <Text style={[{ fontFamily: fonts.bodyMedium, fontSize: size - 1, color }, textStyle]}>
        {meta.label}
      </Text>
    </View>
  );
}

// Pill-style sport chip used where a sport tag is shown.
export function SportChip({ sport, tone = 'blue', style }) {
  const meta = SPORTS[sport];
  const tones = {
    blue: { bg: colors.blueTint, fg: colors.blue },
    neutral: { bg: colors.slate100, fg: colors.slate600 },
    navy: { bg: colors.navy, fg: colors.white },
  };
  const t = tones[tone] || tones.blue;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }, style]}>
      <SportIcon sport={sport} size={13} color={t.fg} />
      <Text style={[styles.chipText, { color: t.fg }]}>{meta.label}</Text>
    </View>
  );
}

// Inline sport-icon + rating-label summary (e.g. "[tennis] UTR 7.8 · [pickleball] NR").
// Skips ratings entirely for community accounts.
export function RatingSummary({ player, size = 12, color = colors.slate400, textStyle }) {
  if (player?.isCommunity) return null;
  const sports = SPORT_KEYS.filter((s) => playsSport(player, s));
  if (sports.length === 0) return null;
  return (
    <View style={styles.row}>
      {sports.map((s, i) => (
        <View key={s} style={styles.summaryItem}>
          {i > 0 ? <Text style={[styles.summaryDot, { color }]}>·</Text> : null}
          <SportIcon sport={s} size={size} color={color} />
          <Text style={[{ fontFamily: fonts.body, fontSize: size, color }, textStyle]}>
            {ratingLabel(player, s)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryDot: { marginHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
});
