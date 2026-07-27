// Community page — photo, description, members, join button and a message
// board. Community-account posts can be pinned announcements that stay on top.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Tag, KeyboardDoneBar, DONE_BAR_ID } from '../components/ui';
import { SportChip } from '../components/SportIcon';
import { getPlayer } from '../lib/mockData';
import { EMPTY_PROFILE } from '../lib/profile';
import { isSupabaseConfigured } from '../lib/supabase';
import { APP_STORE_URL, withAppLink } from '../lib/appLinks';
import * as api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function CommunityDetailScreen({ route, navigation }) {
  const { communityId } = route.params;
  const { profile } = useAuth();
  const me = profile || EMPTY_PROFILE;
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [board, setBoard] = useState([]);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const c = await api.getCommunity(communityId);
      if (active) {
        setCommunity(c);
        setJoined(Boolean(c?.joined));
        setBoard(c?.board || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [communityId]);

  const members = useMemo(() => {
    if (!community) return [];
    // Live: profiles came back with the community — that's the only source.
    if (isSupabaseConfigured) return community.memberProfiles || [];
    // Demo mode only: resolve seed ids through the mock directory.
    return (community.members || []).map((id) => getPlayer(id)).filter(Boolean);
  }, [community]);

  async function toggleJoin() {
    const next = !joined;
    setJoined(next);
    // Optimistic local update so the list + count reflect immediately.
    setCommunity((c) =>
      c ? { ...c, joined: next, memberCount: Math.max(0, (c.memberCount || 0) + (next ? 1 : -1)) } : c
    );
    // Demo write-through to seed objects so the Communities list updates too.
    if (community) {
      community.joined = next;
      if (Array.isArray(community.members)) {
        const has = community.members.includes('me');
        if (next && !has) community.members = [...community.members, 'me'];
        else if (!next && has) community.members = community.members.filter((id) => id !== 'me');
      }
    }
    if (next) await api.joinCommunity(communityId);
    else await api.leaveCommunity(communityId);
  }

  async function postToBoard() {
    const text = draft.trim();
    if (!text) return;
    setBoard((prev) => [
      {
        id: `local-${Date.now()}`,
        authorType: 'player',
        author: me,
        text,
        timeAgo: 'now',
        pinned: false,
        likes: 0,
      },
      ...prev,
    ]);
    setDraft('');
    await api.createCommunityPost(communityId, text);
  }

  // Pinned announcements stay on top of the board.
  const sortedBoard = useMemo(
    () => [...board].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [board]
  );

  if (loading || !community) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <SafeAreaView edges={['top']} style={styles.loadingNav}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.navy} />
          </Pressable>
        </SafeAreaView>
        {loading ? (
          <ActivityIndicator color={colors.blue} />
        ) : (
          <Text style={styles.notFound}>This community couldn't be found.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={sortedBoard}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <BoardPost
              post={item}
              communityName={community.name}
              communityPhoto={community.photo}
              onPressAuthor={(player) =>
                player && player.id !== 'me' && navigation.navigate('PlayerProfile', { player })
              }
            />
          )}
          ListHeaderComponent={
            <CommunityHeader
              community={community}
              members={members}
              joined={joined}
              onToggleJoin={toggleJoin}
              onBack={() => navigation.goBack()}
              onOptions={() => setMenuOpen(true)}
              onPressMember={(m) =>
                m.id !== 'me' && navigation.navigate('PlayerProfile', { player: m })
              }
              onMessageMember={(m) =>
                m.id !== 'me' &&
                navigation.navigate('ChatDetail', { player: m, isRequest: true })
              }
            />
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        />

        {/* Board composer — members only */}
        {joined ? (
          <SafeAreaView edges={['bottom']} style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Post to the board…"
              placeholderTextColor={colors.slate400}
              style={styles.input}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
            />
            <Pressable
              onPress={postToBoard}
              disabled={!draft.trim()}
              hitSlop={6}
              style={[styles.sendBtn, { backgroundColor: draft.trim() ? colors.blue : colors.slate300 }]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </Pressable>
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.joinHint}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.slate400} />
            <Text style={styles.joinHintText}>Join to post on the board and message members.</Text>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
      <KeyboardDoneBar />

      {/* ⋯ Community options sheet */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
        statusBarTranslucent
      >
        <View style={csheet.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setMenuOpen(false)} />
          <View style={csheet.card}>
            <View style={csheet.handle} />
            <Text style={csheet.subjectName} numberOfLines={1}>{community.name}</Text>

            {joined ? (
              <CommSheetRow
                icon="exit-outline"
                label="Leave community"
                onPress={() => {
                  setMenuOpen(false);
                  Alert.alert(
                    'Leave community?',
                    `You'll lose access to the board and member messaging for ${community.name}.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Leave', style: 'destructive', onPress: toggleJoin },
                    ]
                  );
                }}
                destructive
              />
            ) : null}

            <CommSheetRow
              icon="flag-outline"
              label="Report community"
              onPress={() => {
                setMenuOpen(false);
                Alert.alert(
                  'Report submitted',
                  "Thanks — we'll review this community and take action if needed.",
                  [{ text: 'OK' }]
                );
              }}
            />
            <CommSheetRow
              icon="share-social-outline"
              label="Share community"
              onPress={() => {
                setMenuOpen(false);
                Share.share({
                  message: withAppLink(
                    `Check out ${community.name} on Hit — ${community.city} · ${community.memberCount} members`
                  ),
                  title: `${community.name} on Hit`,
                  url: APP_STORE_URL,
                });
              }}
            />
            <View style={csheet.sep} />
            <CommSheetRow icon="close-outline" label="Cancel" onPress={() => setMenuOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CommSheetRow({ icon, label, onPress, destructive }) {
  return (
    <Pressable onPress={onPress} style={csheet.row}>
      <View style={csheet.rowIconWrap}>
        <Ionicons name={icon} size={20} color={destructive ? colors.red : colors.navy} />
      </View>
      <Text style={[csheet.rowLabel, destructive && csheet.rowDestructive]}>{label}</Text>
    </Pressable>
  );
}

function CommunityHeader({ community, members, joined, onToggleJoin, onBack, onOptions, onPressMember, onMessageMember }) {
  return (
    <View>
      {/* Cover */}
      <View style={styles.cover}>
        <Image source={{ uri: community.photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(15,23,42,0.45)', 'transparent', 'rgba(15,23,42,0.9)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.coverNav}>
          <Pressable onPress={onBack} style={styles.roundBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Pressable onPress={onOptions} style={styles.roundBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
          </Pressable>
        </SafeAreaView>
        <View style={styles.coverInfo}>
          <Text style={styles.name}>{community.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.meta}>
              {community.city} · {community.distance} mi · {community.memberCount} members
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Sport tags + join */}
        <View style={styles.actionRow}>
          <View style={styles.tagRow}>
            {community.sports.map((s) => (
              <SportChip key={s} sport={s} tone="blue" />
            ))}
          </View>
          <Pressable
            onPress={onToggleJoin}
            style={[styles.joinBtn, joined && styles.joinedBtn]}
          >
            <Ionicons
              name={joined ? 'checkmark' : 'add'}
              size={16}
              color={joined ? colors.green : colors.white}
            />
            <Text style={[styles.joinText, joined && { color: colors.green }]}>
              {joined ? 'Joined' : 'Join'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.desc}>{community.description}</Text>

        {/* Members */}
        <Text style={styles.sectionTitle}>Members</Text>
        <FlatList
          horizontal
          data={members}
          keyExtractor={(m) => m.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item: m }) => (
            <Pressable style={styles.member} onPress={() => onPressMember(m)}>
              <Image source={{ uri: m.avatar }} style={styles.memberAvatar} contentFit="cover" />
              <Text style={styles.memberName} numberOfLines={1}>
                {m.id === 'me' ? 'You' : m.name.split(' ')[0]}
              </Text>
              {joined && m.id !== 'me' ? (
                <Pressable onPress={() => onMessageMember(m)} hitSlop={6} style={styles.hitBtn}>
                  <Ionicons name="tennisball-outline" size={11} color={colors.white} />
                  <Text style={styles.hitBtnText}>Hit</Text>
                </Pressable>
              ) : null}
            </Pressable>
          )}
        />

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Message board</Text>
      </View>
    </View>
  );
}

function BoardPost({ post, communityName, communityPhoto, onPressAuthor }) {
  const isCommunity = post.authorType === 'community';
  return (
    <View style={[styles.post, post.pinned && styles.postPinned]}>
      {post.pinned ? (
        <View style={styles.pinRow}>
          <Ionicons name="pin" size={13} color={colors.blue} />
          <Text style={styles.pinText}>Pinned announcement</Text>
        </View>
      ) : null}
      <Pressable
        style={styles.postHead}
        onPress={() => !isCommunity && onPressAuthor(post.author)}
      >
        <Image
          source={{ uri: isCommunity ? communityPhoto : post.author.avatar }}
          style={styles.postAvatar}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{isCommunity ? communityName : post.author.name}</Text>
          <Text style={styles.postTime}>{post.timeAgo} ago</Text>
        </View>
        {isCommunity ? <Tag label="Official" tone="navy" /> : null}
      </Pressable>
      <Text style={styles.postText}>{post.text}</Text>
      <View style={styles.postFooter}>
        <Ionicons name="heart-outline" size={16} color={colors.slate400} />
        <Text style={styles.postLikes}>{post.likes}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingNav: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing.lg },
  notFound: { fontFamily: fonts.body, fontSize: 15, color: colors.slate500 },
  cover: { height: 240, justifyContent: 'flex-end' },
  coverNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  coverInfo: { padding: spacing.xl, paddingBottom: spacing.lg },
  name: { fontFamily: fonts.serif, fontSize: 28, color: colors.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
  },
  joinedBtn: { backgroundColor: colors.greenLight },
  joinText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
  desc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate600, marginTop: spacing.lg },

  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy, marginTop: spacing.xl, marginBottom: spacing.md },
  member: { alignItems: 'center', width: 68 },
  memberAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.slate200 },
  memberName: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate600, marginTop: 4 },
  hitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.blue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  hitBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },

  post: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  postPinned: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  pinText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.blue },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.slate200 },
  postAuthor: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.navy },
  postTime: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, marginTop: 1 },
  postText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate700, marginTop: spacing.sm },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  postLikes: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.slate100,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.navy,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  joinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  joinHintText: { fontFamily: fonts.body, fontSize: 13, color: colors.slate400 },
});

const csheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  subjectName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: spacing.md },
  rowIconWrap: { width: 24, alignItems: 'center' },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.navy, flex: 1 },
  rowDestructive: { color: colors.red },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
