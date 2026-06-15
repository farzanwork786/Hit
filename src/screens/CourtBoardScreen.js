// Court Board — a feed of location-tagged "looking to play" posts with a
// distance filter chip row and a create-post composer sheet.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Tag, IconButton, EmptyState, Field, AppButton, KeyboardDoneBar } from '../components/ui';
import SportToggle from '../components/SportToggle';
import SportIcon from '../components/SportIcon';
import CityField from '../components/CityField';
import { currentUser, POST_LEVELS } from '../lib/mockData';
import * as api from '../lib/api';
import { notifyCourtBoardReply } from '../lib/notifications';
import { SPORTS } from '../lib/ratings';
import { useSport } from '../context/SportContext';
import { useLocation } from '../context/LocationContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const DISTANCES = [5, 10, 25, 50];

export default function CourtBoardScreen({ navigation }) {
  const { sport } = useSport();
  const { activeLocation, activeCoords } = useLocation();
  const [maxDistance, setMaxDistance] = useState(25);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api.getCourtPosts({ sport, maxDistance });
    setPosts(result);
    setLoading(false);
  }, [sport, maxDistance]);

  useEffect(() => { load(); }, [load]);

  const data = posts;

  async function addPost(draft) {
    const optimistic = {
      id: `local-${Date.now()}`,
      sport,
      author: currentUser,
      timeAgo: 'now',
      city: draft.city || activeLocation || currentUser.city,
      distance: 0,
      likes: 0,
      comments: 0,
      ...draft,
    };
    setPosts((prev) => [optimistic, ...prev]);
    setComposerOpen(false);
    await api.createCourtPost({
      ...draft,
      sport,
      lat: activeCoords?.lat ?? null,
      lng: activeCoords?.lng ?? null,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Court Board</Text>
          <Text style={styles.title}>Who's playing?</Text>
        </View>
        <IconButton name="add" bg={colors.blue} color={colors.white} onPress={() => setComposerOpen(true)} />
      </View>

      <View style={styles.toggleRow}>
        <SportToggle />
      </View>

      {/* Distance filter chips */}
      <View style={styles.filterRow}>
        <Ionicons name="location-outline" size={16} color={colors.slate400} />
        <Text style={styles.filterLabel}>Within</Text>
        {DISTANCES.map((d) => (
          <Pressable
            key={d}
            onPress={() => setMaxDistance(d)}
            style={[styles.distChip, maxDistance === d && styles.distChipActive]}
          >
            <Text style={[styles.distChipText, maxDistance === d && { color: colors.white }]}>{d} mi</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={loading ? [] : data}
        keyExtractor={(p) => p.id}
        onRefresh={load}
        refreshing={false}
        renderItem={({ item }) => (
          <CourtPost
            post={item}
            onPress={() => item.author && navigation.navigate('PlayerProfile', { player: item.author })}
            onReply={async () => {
              if (!item.author || item.author.id === currentUser.id) return;
              notifyCourtBoardReply(currentUser);
              const conv = await api.getOrCreateConversation(item.author.id);
              navigation.navigate('ChatDetail', {
                player: item.author,
                chatId: conv?.id || undefined,
                isRequest: !conv?.id,
              });
            }}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
            <EmptyState
              icon="megaphone-outline"
              title="Nothing here yet"
              subtitle="Be the first to post — let people know you're looking to play."
              action="Post now"
              onAction={() => setComposerOpen(true)}
            />
          )
        }
      />

      <ComposerSheet
        key={`${sport}-${activeLocation}`} // remount on sport/location switch
        visible={composerOpen}
        sport={sport}
        defaultLocation={activeLocation || currentUser.city}
        onClose={() => setComposerOpen(false)}
        onSubmit={addPost}
      />
    </SafeAreaView>
  );
}

// --- Create post bottom sheet --------------------------------------------
function ComposerSheet({ visible, sport, defaultLocation, onClose, onSubmit }) {
  const insets = useSafeAreaInsets();
  const levels = POST_LEVELS[sport];
  const [text, setText] = useState('');
  const [court, setCourt] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [editingLoc, setEditingLoc] = useState(false);
  const [when, setWhen] = useState('');
  const [level, setLevel] = useState(levels[0]);

  function post() {
    if (!text.trim() || !court.trim()) return;
    onSubmit({
      text: text.trim(),
      court: court.trim(),
      city: location || defaultLocation,
      when: when.trim() || 'Flexible',
      level: levels.includes(level) ? level : levels[0],
    });
    setText('');
    setCourt('');
    setWhen('');
    setLevel(levels[0]);
  }

  const canPost = text.trim().length > 0 && court.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <SportIcon sport={sport} size={20} color={colors.navy} />
                <Text style={styles.sheetTitle}>Post to the board</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.slate500} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Field
                label="What are you looking for?"
                placeholder="Looking for a hitting partner tonight…"
                value={text}
                onChangeText={setText}
                multiline
              />
              <Field
                label="Court"
                icon="tennisball-outline"
                placeholder={sport === 'pickleball' ? 'e.g. Riverside Pickle Courts' : 'e.g. Riverside Tennis Center'}
                value={court}
                onChangeText={setCourt}
              />

              {/* Location auto-fills from your active location; tap Change to override */}
              <Text style={styles.levelLabel}>Location</Text>
              {editingLoc ? (
                <CityField
                  value={location}
                  onChange={setLocation}
                  onSelect={() => setEditingLoc(false)}
                  label={null}
                  autoFocus
                />
              ) : (
                <View style={styles.locRow}>
                  <Ionicons name="location" size={16} color={colors.blue} />
                  <Text style={styles.locText} numberOfLines={1}>
                    {location || 'Set a location'}
                  </Text>
                  <Pressable onPress={() => setEditingLoc(true)} hitSlop={8}>
                    <Text style={styles.changeLink}>Change</Text>
                  </Pressable>
                </View>
              )}

              <Field
                label="When"
                icon="calendar-outline"
                placeholder="Today, 6:30 PM"
                value={when}
                onChangeText={setWhen}
              />

              <Text style={styles.levelLabel}>Level</Text>
              <View style={styles.levelWrap}>
                {levels.map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setLevel(l)}
                    style={[styles.levelChip, level === l && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelChipText, level === l && { color: colors.white }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <AppButton title="Post" icon="megaphone-outline" onPress={post} disabled={!canPost} />
          </View>
        </KeyboardAvoidingView>
      </View>
      <KeyboardDoneBar />
    </Modal>
  );
}

function CourtPost({ post, onPress, onReply }) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHead} onPress={onPress}>
        <Image source={{ uri: post.author.avatar }} style={styles.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.author}>{post.author.name}</Text>
            {post.author.verified ? (
              <Ionicons name="checkmark-circle" size={14} color={colors.blue} style={{ marginLeft: 4 }} />
            ) : null}
          </View>
          <Text style={styles.meta}>{post.timeAgo} ago · {post.distance} mi away</Text>
        </View>
        <Tag label={post.level} tone="navy" />
      </Pressable>

      <Text style={styles.text}>{post.text}</Text>

      <View style={styles.detailRow}>
        <Detail icon="tennisball-outline" text={post.court} />
        <Detail icon="calendar-outline" text={post.when} />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.actions}>
          <Action icon="heart-outline" label={post.likes} />
          <Action icon="chatbubble-outline" label={post.comments} />
        </View>
        <Pressable style={styles.replyBtn} onPress={onReply}>
          <Ionicons name="paper-plane-outline" size={15} color={colors.white} />
          <Text style={styles.replyText}>I'm in</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Detail({ icon, text }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={15} color={colors.blue} />
      <Text style={styles.detailText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function Action({ icon, label }) {
  return (
    <Pressable style={styles.action}>
      <Ionicons name={icon} size={18} color={colors.slate500} />
      <Text style={styles.actionText}>{label}</Text>
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
    paddingBottom: spacing.md,
  },
  kicker: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.navy },
  toggleRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  filterLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500, marginRight: 2 },
  distChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  distChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate600 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slate200 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  author: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.navy },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginTop: 1 },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate700, marginTop: spacing.md },
  detailRow: { gap: 6, marginTop: spacing.md },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  actions: { flexDirection: 'row', gap: spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500 },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.pill,
  },
  replyText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },

  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.lg,
  },
  locText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.navy },
  changeLink: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.blue },
  sheetScroll: { flexGrow: 0, marginBottom: spacing.lg },
  levelLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 8 },
  levelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  levelChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate600 },
});
