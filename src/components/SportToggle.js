// Segmented tennis/pickleball toggle that switches the app-wide sport context.
// Always shows both sports so anyone can move between tennis and pickleball
// without having to edit their profile first.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSport } from '../context/SportContext';
import { SPORTS, SPORT_KEYS } from '../lib/ratings';
import SportIcon from './SportIcon';
import { colors, fonts, radius } from '../theme';

export default function SportToggle({ style }) {
  const { sport, setSport } = useSport();

  return (
    <View style={[styles.track, style]}>
      {SPORT_KEYS.map((key) => {
        const s = SPORTS[key];
        const active = sport === key;
        return (
          <Pressable
            key={key}
            onPress={() => setSport(key)}
            style={[styles.seg, active && styles.segActive]}
            hitSlop={4}
          >
            <SportIcon sport={key} size={14} color={active ? colors.white : colors.slate500} />
            <Text style={[styles.segText, active && styles.segTextActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: radius.pill,
    padding: 3,
    alignSelf: 'flex-start',
  },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  segActive: {
    backgroundColor: colors.navy,
  },
  segText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate500 },
  segTextActive: { color: colors.white },
});
