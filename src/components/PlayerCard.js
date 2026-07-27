// Player card used in the Browse list.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import SportIcon from './SportIcon';
import { SPORTS, ratingShort } from '../lib/ratings';
import { colors, fonts, radius, spacing, shadow } from '../theme';

export default function PlayerCard({ player, sport = 'tennis', onPress }) {
  const meta = SPORTS[sport];
  const level = ratingShort(player, sport); // null when skill level not set
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}>
      <View style={styles.cover}>
        <Image source={{ uri: player.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.85)']} style={StyleSheet.absoluteFill} />
        {level != null ? (
          <View style={styles.levelBadge}>
            <Ionicons name="stats-chart" size={11} color={colors.white} />
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
        ) : null}
        {player.distance != null ? (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color={colors.white} />
            <Text style={styles.distanceText}>{player.distance} mi</Text>
          </View>
        ) : null}
        <View style={styles.coverFooter}>
          <Image source={{ uri: player.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {player.name}, {player.age}
              </Text>
              {player.verified ? (
                <Ionicons name="checkmark-circle" size={16} color={colors.blue} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <Text style={styles.city}>{player.city}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.ratingRow}>
          {level != null ? (
            <>
              <Rating label="Skill Level" value={level} />
              <View style={styles.divider} />
            </>
          ) : null}
          <Rating label="Hand" value={player.hand} small />
          <View style={styles.divider} />
          <View style={styles.rating}>
            <SportIcon sport={sport} size={18} color={colors.navy} />
            <Text style={styles.ratingLabel}>{meta.label}</Text>
          </View>
        </View>
        {level != null ? (
          <Text style={styles.ratingDisclaimer}>Self-reported skill level</Text>
        ) : null}
        <Text numberOfLines={2} style={styles.bio}>
          {player.bio}
        </Text>
      </View>
    </Pressable>
  );
}

function Rating({ label, value, small }) {
  return (
    <View style={styles.rating}>
      <Text style={[styles.ratingValue, small && { fontSize: 14 }]}>{value}</Text>
      <Text style={styles.ratingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  cover: { height: 180, justifyContent: 'flex-end' },
  distanceBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  distanceText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.white },
  levelBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37,99,235,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  levelBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  coverFooter: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.white },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  city: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  body: { padding: spacing.lg },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { flex: 1, alignItems: 'center' },
  ratingValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.navy },
  ratingLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, marginTop: 1 },
  ratingDisclaimer: { fontFamily: fonts.body, fontSize: 10, color: colors.slate400, textAlign: 'center', marginTop: 8, marginBottom: 2 },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  tagRow: { flexDirection: 'row', marginTop: spacing.md },
  bio: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate500, marginTop: spacing.sm },
});
