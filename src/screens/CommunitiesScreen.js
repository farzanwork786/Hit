// Communities — clubs, parks and groups. "My Communities" plus nearby ones to
// discover, filtered by the app-wide sport toggle.
import React, { useCallback, useState } from 'react';

import { View, Text, StyleSheet, FlatList, Pressable, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import SportToggle from '../components/SportToggle';
import SportIcon from '../components/SportIcon';
import { LocationChip, LocationPickerModal } from '../components/LocationPicker';
import { EmptyState } from '../components/ui';
import * as api from '../lib/api';
import { SPORTS } from '../lib/ratings';
import { useSport } from '../context/SportContext';
import { APP_STORE_URL, withAppLink } from '../lib/appLinks';
import { useLocation } from '../context/LocationContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function CommunitiesScreen({ navigation }) {
  const { sport } = useSport();
  const { activeCoords } = useLocation();
  const [visible, setVisible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locOpen, setLocOpen] = useState(false);

  // Reload on focus so joins/leaves made on the detail screen are reflected.
  // Also re-runs when the active location changes so distances stay correct.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const data = await api.getCommunities(sport, {
          lat: activeCoords?.lat ?? null,
          lng: activeCoords?.lng ?? null,
        });
        if (active) {
          setVisible(data);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [sport, activeCoords])
  );

  const mine = visible.filter((c) => c.joined);
  const nearby = visible.filter((c) => !c.joined);

  const sections = [
    ...(mine.length ? [{ type: 'header', id: 'h-mine', title: 'My Communities' }] : []),
    ...mine.map((c) => ({ type: 'community', id: c.id, community: c })),
    ...(nearby.length ? [{ type: 'header', id: 'h-near', title: 'Discover' }] : []),
    ...nearby.map((c) => ({ type: 'community', id: c.id, community: c })),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Clubs, parks & groups</Text>
          <Text style={styles.title}>Communities</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <SportToggle />
        <LocationChip onPress={() => setLocOpen(true)} style={{ marginTop: spacing.sm }} />
      </View>

      <FlatList
        data={loading ? [] : sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Text style={styles.sectionTitle}>{item.title}</Text>
          ) : (
            <CommunityCard
              community={item.community}
              onPress={() =>
                navigation.navigate('CommunityDetail', {
                  communityId: item.community.id,
                })
              }
            />
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
          <EmptyState
            icon="people-circle-outline"
            title={`No ${SPORTS[sport].label} communities yet`}
            subtitle="No clubs or groups in your area have joined Hit yet. Be the first to invite your club!"
            action="Tell your club about Hit"
            onAction={() =>
              Share.share({
                message: withAppLink(
                  "My club should be on Hit — the app for finding tennis & pickleball players. Check it out!"
                ),
                title: 'Hit app',
                url: APP_STORE_URL,
              })
            }
          />
          )
        }
      />

      <LocationPickerModal visible={locOpen} onClose={() => setLocOpen(false)} />
    </SafeAreaView>
  );
}

function CommunityCard({ community, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}>
      <View style={styles.cover}>
        <Image source={{ uri: community.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={styles.sportBadge}>
          {community.sports.map((s) => (
            <SportIcon key={s} sport={s} size={14} color={colors.white} />
          ))}
        </View>
        {community.joined ? (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark" size={11} color={colors.white} />
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        ) : null}
        <View style={styles.coverFooter}>
          <Text style={styles.name} numberOfLines={1}>
            {community.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={styles.meta}>
              {[
                community.city,
                community.distance != null ? `${community.distance} mi` : null,
                `${community.memberCount} members`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.desc} numberOfLines={2}>
        {community.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  kicker: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.navy },
  toggleRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.navy,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  cover: { height: 140, justifyContent: 'flex-end' },
  sportBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  joinedBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  joinedText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  coverFooter: { padding: spacing.md },
  name: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate500,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});
