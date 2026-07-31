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
import { LocationChip, LocationPickerModal } from '../components/LocationPicker';
import { POST_LEVELS } from '../lib/mockData';
import { EMPTY_PROFILE, displayName } from '../lib/profile';
import { sessionType, spotsLabel, isFull, SESSION_TYPES, SPOT_OPTIONS } from '../lib/sessionTypes';
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
  const [locOpen, setLocOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // post being edited (or null)
  const [menuPost, setMenuPost] = useState(null); // post whose ⋯ menu is open
  const [tab, setTab] = useState('nearby'); // 'nearby' | 'mine'
  const [joinCounts, setJoinCounts] = useState({});
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [myHits, setMyHits] = useState({ upcoming: [], pending: [], past: [] });

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
      // How many people are in on each post, so cards can show spots left.
      const ids = (result || []).map((p) => p.id).filter((id) => !String(id).startsWith('local-'));
      setJoinCounts(await api.getCourtPostJoinCounts(ids));
      setLoading(false);
      setRefreshing(false);
    },
    [sport, maxDistance, activeCoords, isSupabaseConfigured]
  );

  // Badge on the My Hits tab: things confirmed plus anything awaiting your reply.
  const upcomingCount =
    myHits.upcoming.length + myHits.pending.filter((h) => h.awaitingMe).length;

  // Everything the user has arranged, for the My Hits tab.
  const loadMyHits = useCallback(async () => {
    const hits = await api.getMyHits();
    setMyHits(hits);
    // Posts you've already joined shouldn't offer "I'm in" again.
    const joined = new Set(
      [...hits.upcoming, ...hits.pending, ...hits.past]
        .map((h) => h.courtPostId)
        .filter(Boolean)
    );
    setJoinedIds(joined);
  }, []);

  useEffect(() => {
    loadMyHits();
  }, [loadMyHits]);

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

  // "I'm in" — commits you to the session and drops a reply carrying the post's
  // details into your thread with the author, so they can see what it's about.
  async function joinPost(post) {
    if (!post?.author || post.author.id === myId) return;
    setJoinedIds((prev) => new Set(prev).add(post.id));
    setJoinCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));

    const res = await api.joinCourtPost({ ...post, authorId: post.author.id });
    if (res && res.ok === false) {
      // Roll back so the card doesn't claim you're in when you aren't.
      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
      setJoinCounts((prev) => ({ ...prev, [post.id]: Math.max((prev[post.id] || 1) - 1, 0) }));
      Alert.alert('Could not join', 'Please try again.');
      return;
    }
    notifyCourtBoardReply(me);
    navigation.navigate('ChatDetail', {
      player: post.author,
      chatId: res?.conversationId || undefined,
      sport: post.sport || sport,
    });
  }

  // Ask a question without committing.
  async function messageAuthor(post) {
    if (!post?.author || post.author.id === myId) return;
    const postSport = post.sport || sport;
    const conv = await api.getOrCreateConversation(post.author.id, postSport);
    navigation.navigate('ChatDetail', {
      player: post.author,
      chatId: conv?.id || undefined,
      sport: postSport,
    });
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
    if (res && res.ok === false) {
      // Roll the optimistic post back so the feed matches reality, and say so
      // rather than letting the post quietly vanish on the next refresh.
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      Alert.alert('Could not post', 'Your post was not saved. Please try again.');
      return;
    }
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

      {/* Nearby vs what you've already arranged — both live here so everything
          about organising a hit is in one place. */}
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, tab === 'nearby' && styles.segmentBtnActive]}
          onPress={() => setTab('nearby')}
        >
          <Text style={[styles.segmentText, tab === 'nearby' && styles.segmentTextActive]}>
            Nearby
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, tab === 'mine' && styles.segmentBtnActive]}
          onPress={() => {
            setTab('mine');
            loadMyHits();
          }}
        >
          <Text style={[styles.segmentText, tab === 'mine' && styles.segmentTextActive]}>
            My Hits
          </Text>
          {upcomingCount > 0 ? (
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentBadgeText}>{upcomingCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {tab === 'mine' ? (
        <MyHitsView
          hits={myHits}
          onOpenChat={(hit) =>
            hit.player &&
            navigation.navigate('ChatDetail', { player: hit.player, sport: hit.sport })
          }
          onRefresh={loadMyHits}
        />
      ) : (
      <>
      <View style={styles.toggleRow}>
        <SportToggle />
        {/* Same active location as Browse — shown here so it's clear which
            place the distance filter below is measuring from. */}
        <LocationChip onPress={() => setLocOpen(true)} style={{ marginTop: spacing.sm }} />
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
              joined={joinedIds.has(item.id)}
              joinCount={joinCounts[item.id] || 0}
              onMenu={() => setMenuPost(item)}
              onPress={() => item.author && navigation.navigate('PlayerProfile', { player: item.author })}
              onJoin={() => joinPost(item)}
              onMessage={() => messageAuthor(item)}
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
      </>
      )}

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

      <LocationPickerModal visible={locOpen} onClose={() => setLocOpen(false)} />
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
  const [type, setType] = useState(editingPost?.sessionType || null);
  const [spots, setSpots] = useState(
    editingPost?.spotsNeeded !== undefined ? editingPost.spotsNeeded : 1
  );

  function post() {
    if (!text.trim() || !court.trim()) return;
    onSubmit({
      text: text.trim(),
      court: court.trim(),
      city: location || defaultLocation,
      when: when.trim() || 'Flexible',
      level: levels.includes(level) ? level : levels[0],
      sessionType: type,
      spotsNeeded: spots,
    });
    setText('');
    setCourt('');
    setWhen('');
    setLevel(levels[0]);
    setType(null);
    setSpots(1);
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

              <Text style={styles.levelLabel}>What are you after?</Text>
              <View style={styles.levelWrap}>
                {SESSION_TYPES.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => setType(type === s.key ? null : s.key)}
                    style={[styles.levelChip, type === s.key && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelChipText, type === s.key && { color: colors.white }]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.levelLabel}>How many players do you need?</Text>
              <View style={styles.levelWrap}>
                {SPOT_OPTIONS.map((o) => (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => setSpots(o.value)}
                    style={[styles.levelChip, spots === o.value && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelChipText, spots === o.value && { color: colors.white }]}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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

function CourtPost({ post, isMine, joined, joinCount = 0, onMenu, onPress, onJoin, onMessage }) {
  const type = sessionType(post.sessionType);
  const full = isFull(post.spotsNeeded, joinCount);
  const spots = spotsLabel(post.spotsNeeded, joinCount);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable style={styles.cardHeadMain} onPress={onPress}>
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.author}>{displayName(post.author)}</Text>
              {isMine ? <Text style={styles.youTag}>You</Text> : null}
              {post.author.verified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.blue} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <Text style={styles.meta}>
              {post.timeAgo} ago{post.distance != null ? ` · ${post.distance} mi away` : ''}
            </Text>
          </View>
        </Pressable>
        {isMine ? (
          <Pressable onPress={onMenu} hitSlop={8} style={styles.postMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.slate500} />
          </Pressable>
        ) : null}
      </View>

      {/* What kind of session + who it's for, up front so people can tell at a
          glance whether it's for them. */}
      <View style={styles.tagStrip}>
        {type ? <Tag label={type.label} tone="blue" icon={type.icon} /> : null}
        {post.level ? <Tag label={post.level} tone="neutral" /> : null}
        <View style={[styles.spotsPill, full && styles.spotsPillFull]}>
          <Ionicons
            name={full ? 'checkmark-circle' : 'people-outline'}
            size={12}
            color={full ? colors.green : colors.slate600}
          />
          <Text style={[styles.spotsText, full && { color: colors.green }]}>{spots}</Text>
        </View>
      </View>

      <Text style={styles.text}>{post.text}</Text>

      <View style={styles.detailRow}>
        <Detail icon="tennisball-outline" text={post.court} />
        <Detail icon="calendar-outline" text={post.when} />
      </View>

      {isMine ? (
        <View style={styles.ownerFooter}>
          <Ionicons name="people" size={15} color={colors.slate500} />
          <Text style={styles.ownerFooterText}>
            {joinCount > 0
              ? `${joinCount} ${joinCount === 1 ? 'person is' : 'people are'} in — check Messages`
              : 'No one has joined yet'}
          </Text>
        </View>
      ) : (
        <View style={styles.cardFooter}>
          <Pressable style={styles.msgBtn} onPress={onMessage}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.slate600} />
            <Text style={styles.msgBtnText}>Message</Text>
          </Pressable>
          <Pressable
            style={[
              styles.joinBtn,
              joined && styles.joinBtnDone,
              full && !joined && styles.joinBtnFull,
            ]}
            onPress={onJoin}
            disabled={joined || full}
          >
            <Ionicons
              name={joined ? 'checkmark-circle' : 'hand-right'}
              size={19}
              color={colors.white}
            />
            <Text style={styles.joinText}>
              {joined ? "You're in" : full ? 'Full' : "I'm in"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Everything you've arranged, in one place: what's confirmed, what's still
// waiting on someone, and what's already happened.
function MyHitsView({ hits, onOpenChat, onRefresh }) {
  const sections = [
    { key: 'upcoming', title: 'Upcoming', data: hits.upcoming },
    { key: 'pending', title: 'Waiting on a reply', data: hits.pending },
    { key: 'past', title: 'Past', data: hits.past },
  ].filter((s) => s.data.length);

  if (!sections.length) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={undefined}
      >
        <EmptyState
          icon="calendar-outline"
          title="Nothing booked yet"
          subtitle="Join a session on the board, or ask someone to hit from their profile."
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={(s) => s.key}
      onRefresh={onRefresh}
      refreshing={false}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: section }) => (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.data.map((h) => (
            <Pressable key={h.id} style={styles.hitRow} onPress={() => onOpenChat(h)}>
              <View style={styles.hitRowIcon}>
                <SportIcon sport={h.sport || 'tennis'} size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hitRowWhen}>
                  {h.whenText || 'Time to be confirmed'}
                </Text>
                <Text style={styles.hitRowWho} numberOfLines={1}>
                  {displayName(h.player)}
                  {h.court ? ` · ${h.court}` : ''}
                </Text>
              </View>
              {h.awaitingMe ? (
                <View style={styles.hitRowBadge}>
                  <Text style={styles.hitRowBadgeText}>Reply</Text>
                </View>
              ) : h.status === 'proposed' ? (
                <Text style={styles.hitRowPending}>Sent</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    />
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

  // Joining is the point of the board, so "I'm in" is the biggest thing on the
  // card; asking a question sits beside it as the quieter option.
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    height: 52,
    borderRadius: radius.md,
  },
  joinBtnDone: { backgroundColor: colors.green },
  joinBtnFull: { backgroundColor: colors.slate300 },
  joinText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.slate100,
  },
  msgBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.slate600 },

  tagStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: spacing.sm },
  spotsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  spotsPillFull: { backgroundColor: colors.greenLight },
  spotsText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.slate600 },

  ownerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  ownerFooterText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500, flex: 1 },

  segment: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.slate100,
    borderRadius: radius.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: radius.sm,
  },
  segmentBtnActive: { backgroundColor: colors.white, ...shadow.soft },
  segmentText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.slate500 },
  segmentTextActive: { color: colors.navy },
  segmentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  segmentBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },

  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.slate500,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  hitRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitRowWhen: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  hitRowWho: { fontFamily: fonts.body, fontSize: 13, color: colors.slate500, marginTop: 2 },
  hitRowBadge: {
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  hitRowBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  hitRowPending: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400 },

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
