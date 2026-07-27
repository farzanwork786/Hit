// Browse players — list of nearby players for the selected sport with a
// collapsible filter panel (location, distance, rating range).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import PlayerCard from '../components/PlayerCard';
import SportToggle from '../components/SportToggle';
import { LevelGuideModal } from '../components/RatingSelector';
import { LocationChip, LocationPickerModal } from '../components/LocationPicker';
import { IconButton, EmptyState } from '../components/ui';
import { isBlocked } from '../lib/mockData';
import { APP_STORE_URL, withAppLink } from '../lib/appLinks';
import * as api from '../lib/api';
import { SPORTS, filterRangesFor, matchesRange } from '../lib/ratings';
import { useSport } from '../context/SportContext';
import { useLocation } from '../context/LocationContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEFAULT_FILTERS = { distance: 25, rangeId: 'all' };

export default function BrowseScreen({ navigation }) {
  const { sport } = useSport();
  const { activeLocation, activeCoords } = useLocation();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [guideOpen, setGuideOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  const [rawPlayers, setRawPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch players from Supabase (PostGIS distance + sport + rating) with mock
  // fallback. Re-runs when sport, distance, rating range or location change.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const range = filterRangesFor(sport).find((r) => r.id === filters.rangeId);
    try {
      const data = await api.browsePlayers({
        sport,
        lat: activeCoords?.lat ?? null,
        lng: activeCoords?.lng ?? null,
        radius: filters.distance,
        min: range && !range.all && !range.nrOnly ? range.min : null,
        max: range && !range.all && !range.nrOnly ? range.max : null,
        includeNr: !range || range.all || range.nrOnly,
      });
      setRawPlayers(data);
    } catch (e) {
      setError('Could not load players. Pull to retry.');
      setRawPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [sport, filters.distance, filters.rangeId, activeCoords]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on focus so newly-blocked players disappear when returning.
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  // Reset sport-specific filters when switching sport.
  useEffect(() => {
    setFilters((f) => ({ ...f, rangeId: 'all' }));
  }, [sport]);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }

  // Client-side refinements the RPC doesn't cover: NR-only range, playing style,
  // and locally-blocked players (instant hide before the next fetch).
  const filtered = useMemo(() => {
    const range = filterRangesFor(sport).find((r) => r.id === filters.rangeId);
    return rawPlayers.filter((p) => {
      if (isBlocked(p.id)) return false;
      const rv = p.sports?.[sport]?.[SPORTS[sport].ratingKey] ?? null;
      if (range?.nrOnly && rv !== null) return false;
      return true;
    });
  }, [rawPlayers, filters.rangeId, sport]);

  const activeCount =
    (filters.distance !== DEFAULT_FILTERS.distance ? 1 : 0) +
    (filters.rangeId !== 'all' ? 1 : 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Players near</Text>
          <Pressable onPress={() => setLocOpen(true)} hitSlop={6}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {activeLocation || 'Set your location'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.slate400} />
            </View>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton name="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
          <Pressable onPress={toggle} style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
            <Text style={styles.filterBtnText}>Filters</Text>
            {activeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <SportToggle />
      </View>

      {open ? (
        <FilterPanel
          sport={sport}
          filters={filters}
          setFilters={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          onClose={toggle}
          onOpenGuide={() => setGuideOpen(true)}
          onOpenLocation={() => setLocOpen(true)}
        />
      ) : null}

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(p) => p.id}
        onRefresh={load}
        refreshing={loading && filtered.length > 0}
        renderItem={({ item }) => (
          <PlayerCard
            player={item}
            sport={sport}
            onPress={() => navigation.navigate('PlayerProfile', { player: item })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !loading && filtered.length > 0 ? (
            <Text style={styles.resultCount}>
              {filtered.length} {SPORTS[sport].label.toLowerCase()}{' '}
              {filtered.length === 1 ? 'player' : 'players'} found
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.blue} />
              <Text style={styles.loadingText}>Finding players near you…</Text>
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load players"
              subtitle={error}
              action="Try again"
              onAction={load}
            />
          ) : !activeLocation ? (
            <EmptyState
              icon="location-outline"
              title="Set your location"
              subtitle="Choose a city to find tennis and pickleball players near you."
              action="Choose location"
              onAction={() => setLocOpen(true)}
            />
          ) : activeCount > 0 ? (
            <EmptyState
              icon="options-outline"
              title="No players match these filters"
              subtitle="Try widening your distance or rating range, or reset to see everyone."
              action="Reset filters"
              onAction={() => setFilters(DEFAULT_FILTERS)}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No players near you yet"
              subtitle={`Hit is growing fast! Invite a friend and get your first ${SPORTS[sport].label.toLowerCase()} match going.`}
              action="Invite a friend"
              onAction={() =>
                Share.share({
                  message: withAppLink(
                    "I'm on Hit — the app for finding tennis & pickleball players nearby. Come join me!"
                  ),
                  title: 'Hit app',
                  url: APP_STORE_URL,
                })
              }
            />
          )
        }
      />

      <LevelGuideModal visible={guideOpen} sport={sport} onClose={() => setGuideOpen(false)} />
      <LocationPickerModal visible={locOpen} onClose={() => setLocOpen(false)} />
    </SafeAreaView>
  );
}

// --- Collapsible filter panel ------------------------------------------
function FilterPanel({ sport, filters, setFilters, onReset, onClose, onOpenGuide, onOpenLocation }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const meta = SPORTS[sport];
  const ranges = filterRangesFor(sport);

  return (
    <View style={styles.panel}>
      <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Location — first-class control */}
        <Text style={styles.filterLabel}>Location</Text>
        <LocationChip onPress={onOpenLocation} style={{ marginTop: 6, marginBottom: spacing.md }} />

        <RangeRow label="Max distance" value={`${Math.round(filters.distance)} mi`}>
          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={filters.distance}
            onValueChange={(v) => set({ distance: v })}
            minimumTrackTintColor={colors.blue}
            maximumTrackTintColor={colors.slate200}
            thumbTintColor={colors.blue}
          />
        </RangeRow>

        <View style={styles.rangeHead}>
          <Text style={styles.filterLabel}>Skill Level range</Text>
          <Pressable onPress={onOpenGuide} hitSlop={8}>
            <Text style={styles.guideLink}>What's my level?</Text>
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {ranges.map((r) => (
            <FilterChip
              key={r.id}
              label={r.label}
              active={filters.rangeId === r.id}
              onPress={() => set({ rangeId: r.id })}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.panelActions}>
        <Pressable onPress={onReset} hitSlop={8}>
          <Text style={styles.reset}>Reset</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.applyBtn}>
          <Text style={styles.applyText}>Apply filters</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RangeRow({ label, value, children }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={styles.rangeHead}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.rangeValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.styleChip, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}
    >
      <Text style={[styles.styleChipText, active && { color: colors.white }]}>{label}</Text>
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
    gap: spacing.md,
  },
  kicker: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.navy, flexShrink: 1 },
  toggleRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
  },
  filterBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  panel: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  panelScroll: { maxHeight: Dimensions.get('window').height * 0.5 },
  filterLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.slate700 },
  rangeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rangeValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue },
  guideLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.blue },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  styleChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate600 },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  reset: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.slate500 },
  applyBtn: { backgroundColor: colors.blue, paddingHorizontal: 20, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  resultCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500, marginBottom: spacing.md },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  loadingText: { fontFamily: fonts.body, fontSize: 14, color: colors.slate500 },
});
