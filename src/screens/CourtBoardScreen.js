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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Tag, IconButton, EmptyState, Field, AppButton, KeyboardDoneBar } from '../components/ui';
import SportToggle from '../components/SportToggle';
import SportIcon from '../components/SportIcon';
import CityField from '../components/CityField';
import { POST_LEVELS } from '../lib/mockData';
import { EMPTY_PROFILE } from '../lib/profile';
import * as api from '../lib/api';
import { notifyCourtBoardReply } from '../lib/notifications';
import { SPORTS } from '../lib/ratings';
import { useSport } from '../context/SportContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const DISTANCES = [5, 10, 25, 50];

export default function CourtBoardScreen({ navigation }) {
  const { sport } = useSport();
  const { activeLocation, activeCoords } = useLocation();
  const { profile, session, isSupabaseConfigured } = useAuth();
  // Identifies "my" posts so only they get edit/delete.
  const me = profile || EMPTY_PROFILE;
  const myId = session?.user?.id || me.id;

  const [maxDistance, setMaxDistance] = useState(25);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // post being edited (or null)
  const [menuPost, setMenuPost] = useState(null); // post whose ⋯ menu is open

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setLoading(true);
      const result = await api.getCourtPosts({
        sport,
        lat: activeCoords?.lat ?? null,
        lng: activeCoords?.lng ?? null,
        maxDistance,
      });
      setPosts((prev) => {
        // Live mode: the server is the source of truth (a successful create
        // reload returns the real row), so replace wholesale.
        if (isSupabaseConfigured) return result;
        // Demo mode: there's no backend to persist to, so keep this session's
        // optimistic posts and merge in the mock feed.
        const locals = prev.filter((p) => String(p.id).startsWith('local-'));
        return [...locals, ...result.filter((r) => !locals.some((l) => l.id === r.id))];
      });
      setLoading(false);
      setRefreshing(false);
    },
    [sport, maxDistance, activeCoords, isSupabaseConfigured]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Reload on focus so new posts / edits / deletes made elsewhere show up.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load({ silent: true }));
    return unsub;
  }, [navigation, load]);

  function onRefresh() {
    setRefreshing(true);
    load({ silent: true });
  }

  const data = posts;

  // Author shape for optimistic posts — uses my real id so the post is
  // immediately recognised as mine (edit/delete available right away).
  const myAuthor = { ...me, id: myId };

  async function addPost(draft) {
    setComposerOpen(false);

    // Editing an existing post → optimistic in-place update, then persist.
    if (editingPost) {
      const target = editingPost;
      setEditingPost(null);
      setPosts((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, ...draft, city: draft.city || p.city } : p))
      );
      const res = await api.updateCourtPost(target.id, { ...draft });
      if (res && res.ok === false) {
        Alert.alert('Could not save changes', 'Please try again.');
      }
      load({ silent: true });
      return;
    }

    // Creating a new post → optimistic prepend, then persist + reconcile.
    const tempId = `local-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sport,
      author: myAuthor,
      timeAgo: 'now',
      city: draft.city || activeLocation || me.city,
      distance: 0,
      likes: 0,
      comments: 0,
      ...draft,
    };
    setPosts((prev) => [optimistic, ...prev]);
    const res = await api.createCourtPost({
      ...draft,
      sport,
      lat: activeCoords?.lat ?? null,
      lng: activeCoords?.lng ?? null,
    });
    // When live, pull the canonical row (real id, server ordering) so the post
    // persists correctly across refreshes.
    if (res && res.ok && !res.demo) {
      load({ silent: true });
    }
  }

  function openEdit(post) {
    setMenuPost(null);
    setEditingPost(post);
    setComposerOpen(true);
  }

  function confirmDelete(post) {
    setMenuPost(null);
    Alert.alert('Delete post?', 'This removes your post from the Court Board.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPosts((prev) => prev.filter((p) => p.id !== post.id));
          const res = await api.deleteCourtPost(post.id);
          if (res && res.ok === false) {
            Alert.alert('Could not delete', 'Please try again.');
            load({ silent: true });
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Court Board</Text>
          <Text style={styles.title}>Who's playing?</Text>
        </View>
        <IconButton
          name="add"
          bg={colors.blue}
          color={colors.white}
          onPress={() => {
            setEditingPost(null);
            setComposerOpen(true);
          }}
        />
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
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={({ item }) => {
          const isMine = item.author?.id === myId;
          return (
            <CourtPost
              post={item}
              isMine={isMine}
              onMenu={() => setMenuPost(item)}
              onPress={() => item.author && navigation.navigate('PlayerProfile', { player: item.author })}
              onReply={async () => {
                if (!item.author || isMine) return;
                notifyCourtBoardReply(me);
                const conv = await api.getOrCreateConversation(item.author.id, item.sport || sport);
                navigation.navigate('ChatDetail', {
                  player: item.author,
                  chatId: conv?.id || undefined,
                  isRequest: !conv?.id,
                  sport: item.sport || sport,
                });
              }}
            />
          );
        }}
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
        // Remount on sport/location switch, and whenever the edit target changes
        // so the form re-seeds with the right values.
        key={`${sport}-${activeLocation}-${editingPost?.id || 'new'}`}
        visible={composerOpen}
        sport={sport}
        defaultLocation={activeLocation || me.city}
        editingPost={editingPost}
        onClose={() => {
          setComposerOpen(false);
          setEditingPost(null);
        }}
        onSubmit={addPost}
      />

      {/* ⋯ menu for the current user's own posts */}
      <PostMenu
        post={menuPost}
        onClose={() => setMenuPost(null)}
        onEdit={openEdit}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

// --- Own-post options sheet (edit / delete) -----------------------------
function PostMenu({ post, onClose, onEdit, onDelete }) {
  return (
    <Modal visible={Boolean(post)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.menuOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.menuCard}>
          <View style={styles.menuHandle} />
          <Pressable style={styles.menuRow} onPress={() => post && onEdit(post)}>
            <Ionicons name="create-outline" size={20} color={colors.navy} />
            <Text style={styles.menuLabel}>Edit post</Text>
          </Pressable>
          <View style={styles.menuSep} />
          <Pressable style={styles.menuRow} onPress={() => post && onDelete(post)}>
            <Ionicons name="trash-outline" size={20} color={colors.red} />
            <Text style={[styles.menuLabel, { color: colors.red }]}>Delete post</Text>
          </Pressable>
          <View style={styles.menuSep} />
          <Pressable style={styles.menuRow} onPress={onClose}>
            <Ionicons name="close-outline" size={20} color={colors.slate500} />
            <Text style={[styles.menuLabel, { color: colors.slate500 }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// --- Create / edit post bottom sheet -------------------------------------
function ComposerSheet({ visible, sport, defaultLocation, editingPost, onClose, onSubmit }) {
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(editingPost);
  const levels = POST_LEVELS[sport];
  const [text, setText] = useState(editingPost?.text || '');
  const [court, setCourt] = useState(editingPost?.court || '');
  const [location, setLocation] = useState(editingPost?.city || defaultLocation);
  const [editingLoc, setEditingLoc] = useState(false);
  const [when, setWhen] = useState(editingPost && editingPost.when !== 'Flexible' ? editingPost.when : '');
  const [level, setLevel] = useState(
    editingPost && levels.includes(editingPost.level) ? editingPost.level : levels[0]
  );

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
                <Text style={styles.sheetTitle}>{isEditing ? 'Edit your post' : 'Post to the board'}</Text>
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

            <AppButton
              title={isEditing ? 'Save changes' : 'Post'}
              icon={isEditing ? 'checkmark' : 'megaphone-outline'}
              onPress={post}
              disabled={!canPost}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
      <KeyboardDoneBar />
    </Modal>
  );
}

function CourtPost({ post, isMine, onMenu, onPress, onReply }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable style={styles.cardHeadMain} onPress={onPress}>
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.author}>{post.author.name}</Text>
              {isMine ? <Text style={styles.youTag}>You</Text> : null}
              {post.author.verified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.blue} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <Text style={styles.meta}>
              {post.timeAgo} ago{post.distance ? ` · ${post.distance} mi away` : ''}
            </Text>
          </View>
        </Pressable>
        <Tag label={post.level} tone="navy" />
        {isMine ? (
          <Pressable onPress={onMenu} hitSlop={8} style={styles.postMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.slate500} />
          </Pressable>
        ) : null}
      </View>

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
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeadMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  postMenuBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slate200 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.navy },
  youTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.blue,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
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

  // ⋯ own-post menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  menuCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  menuLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.navy },
  menuSep: { height: 1, backgroundColor: colors.slate100 },
});
