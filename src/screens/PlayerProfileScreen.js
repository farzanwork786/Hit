// Full-screen player profile with cover, per-sport ratings, bio, friends,
// gallery and actions.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Tag } from '../components/ui';
import SportIcon, { SportChip } from '../components/SportIcon';
import { SPORTS, SPORT_KEYS, playsSport, ratingShort } from '../lib/ratings';
import { canSeeFriends, canSeeCommunities, displayName, firstName } from '../lib/profile';
import { APP_STORE_URL, withAppLink } from '../lib/appLinks';
import * as api from '../lib/api';
import { notifyMatchRequest } from '../lib/notifications';
import { useSport } from '../context/SportContext';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const { width } = Dimensions.get('window');
const COVER_H = 360;

const REPORT_REASONS = [
  'Inappropriate content',
  'Spam or self-promotion',
  'Harassment or threats',
  'Fake or impersonation',
  'Underaged user',
  'Other',
];

export default function PlayerProfileScreen({ route, navigation }) {
  const { player: routePlayer } = route.params;
  const { sport } = useSport();
  const { session } = useAuth();
  const viewerId = session?.user?.id ?? null;

  // Lists elsewhere in the app (Messages, Requests, Friends, Court Board
  // authors) build a player from the profiles row alone, without the per-sport
  // rows — so Skill Level would be missing here. Re-fetch the full profile and
  // merge it over what we were handed, keeping the passed-in data visible
  // immediately so the screen never flashes empty.
  const [full, setFull] = useState(null);
  const player = full ? { ...routePlayer, ...full } : routePlayer;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!routePlayer?.id) return;
      const fresh = await api.getProfile(routePlayer.id);
      if (active && fresh) setFull(fresh);
    })();
    return () => {
      active = false;
    };
  }, [routePlayer?.id]);

  const sports = SPORT_KEYS.filter((s) => playsSport(player, s));
  const friendsVisible = canSeeFriends(player, viewerId);
  const communitiesVisible = canSeeCommunities(player, viewerId);

  // Friends and communities come from the backend — never from demo data, so a
  // real profile can't show invented connections.
  const [friends, setFriends] = useState([]);
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [f, c] = await Promise.all([
        friendsVisible ? api.getFriends(player.id) : Promise.resolve([]),
        communitiesVisible ? api.getCommunitiesForUser(player.id) : Promise.resolve([]),
      ]);
      if (active) {
        setFriends(f || []);
        setCommunities(c || []);
      }
    })();
    return () => {
      active = false;
    };
  }, [player.id, friendsVisible, communitiesVisible]);

  const [menuOpen, setMenuOpen] = useState(false);
  // 0 = main options, 1 = pick reason, 2 = submitted
  const [reportStep, setReportStep] = useState(0);
  const [reportReason, setReportReason] = useState(null);

  function openMenu() {
    setReportStep(0);
    setReportReason(null);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setReportStep(0);
    setReportReason(null);
  }

  function handleBlock() {
    setMenuOpen(false);
    const first = firstName(player, 'this player');
    Alert.alert(
      `Block ${first}?`,
      "They won't be able to see your profile and won't appear in Browse or Requests.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await api.blockUser(player.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  function handleShare() {
    closeMenu();
    const locationBit = [player.city, player.distance != null ? `${player.distance} mi away` : null]
      .filter(Boolean)
      .join(' · ');
    Share.share({
      message: withAppLink(`Check out ${player.name}'s profile on Hit${locationBit ? ` — ${locationBit}` : ''}`),
      title: `${player.name} on Hit`,
      url: APP_STORE_URL,
    });
  }

  function submitReport() {
    if (!reportReason) return;
    api.reportUser({ userId: player.id, reason: reportReason });
    setReportStep(2);
    setTimeout(closeMenu, 2000);
  }

  async function sendRequest() {
    notifyMatchRequest({ id: player.id, name: 'You' });
    await api.sendMatchRequest(player.id, `Hey ${firstName(player, 'there')}! Want to hit sometime?`, sport);
    // Deliberately do NOT create a conversation here. It's created lazily when
    // the first message is actually sent, so the recipient sees this as a single
    // play request (Requests tab) rather than appearing in both Requests and
    // Chats at once.
    navigation.navigate('ChatDetail', {
      player,
      isRequest: true,
      sport,
    });
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover */}
        <View style={styles.cover}>
          <Image source={{ uri: player.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(15,23,42,0.4)', 'transparent', 'rgba(15,23,42,0.9)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={styles.coverNav}>
            <RoundBtn icon="chevron-back" onPress={() => navigation.goBack()} />
            <RoundBtn icon="ellipsis-horizontal" onPress={openMenu} />
          </SafeAreaView>

          <View style={styles.coverInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {player.name}, {player.age}
              </Text>
              {player.verified ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.blue} style={{ marginLeft: 6 }} />
              ) : null}
            </View>
            <View style={styles.locRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.loc}>
                {player.city} · {player.distance} mi away
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Per-sport ratings */}
          <View style={styles.sportsCard}>
            {sports.map((s, i) => {
              const meta = SPORTS[s];
              const entry = player.sports[s];
              return (
                <View key={s} style={[styles.sportRow, i > 0 && styles.sportRowDivider]}>
                  <View style={styles.sportIconWrap}>
                    <SportIcon sport={s} size={22} color={colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sportName}>{meta.label}</Text>
                  </View>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingValue}>{ratingShort(player, s) ?? 'Not set'}</Text>
                    <Text style={styles.ratingLabel}>Skill Level</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.ratingDisclaimer}>
            Self-reported skill level for matchmaking
          </Text>

          {/* Quick facts */}
          <View style={styles.tagRow}>
            <Tag label={`${player.hand}-handed`} tone="neutral" icon="hand-left-outline" />
            {sports.map((s) => (
              <SportChip key={s} sport={s} tone="blue" />
            ))}
          </View>

          {/* About */}
          <Section title="About">
            <Text style={styles.bio}>{player.bio}</Text>
          </Section>

          {/* Availability */}
          <Section title="Availability">
            <View style={styles.tagRow}>
              {(Array.isArray(player.availability) ? player.availability : []).map((a) => (
                <Tag key={a} label={a} tone="green" icon="time-outline" />
              ))}
            </View>
          </Section>

          {/* Friends */}
          <Section title={`Friends${friendsVisible ? ` · ${friends.length}` : ''}`}>
            {friendsVisible ? (
              friends.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                  {friends.map((f) => (
                    <Pressable
                      key={f.id}
                      style={styles.friend}
                      onPress={() => f.id !== 'me' && navigation.push('PlayerProfile', { player: f })}
                    >
                      <Image source={{ uri: f.avatar }} style={styles.friendAvatar} contentFit="cover" />
                      <Text style={styles.friendName} numberOfLines={1}>
                        {f.id === 'me' ? 'You' : firstName(f)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.privateNote}>No friends yet.</Text>
              )
            ) : (
              <View style={styles.privateRow}>
                <Ionicons name="lock-closed-outline" size={15} color={colors.slate400} />
                <Text style={styles.privateNote}>
                  {firstName(player, 'This player')} keeps their friends list private.
                </Text>
              </View>
            )}
          </Section>

          {/* Communities */}
          <Section title={`Communities${communitiesVisible ? ` · ${communities.length}` : ''}`}>
            {communitiesVisible ? (
              communities.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                  {communities.map((c) => (
                    <Pressable
                      key={c.id}
                      style={styles.friend}
                      onPress={() => navigation.navigate('CommunityDetail', { communityId: c.id })}
                    >
                      <Image source={{ uri: c.photo }} style={styles.communityLogo} contentFit="cover" />
                      <Text style={styles.friendName} numberOfLines={2}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.privateNote}>Not a member of any communities yet.</Text>
              )
            ) : (
              <View style={styles.privateRow}>
                <Ionicons name="lock-closed-outline" size={15} color={colors.slate400} />
                <Text style={styles.privateNote}>
                  {firstName(player, 'This player')} keeps their communities private.
                </Text>
              </View>
            )}
          </Section>

          {/* Gallery */}
          {player.gallery?.length ? (
            <Section title="On the court">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {player.gallery.map((g, i) => (
                  <Image key={i} source={{ uri: g }} style={styles.galleryImg} contentFit="cover" transition={200} />
                ))}
              </ScrollView>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <SafeAreaView edges={['bottom']} style={styles.actionBar}>
        <Pressable style={styles.passBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.slate500} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppButton
            title="Ask to play"
            icon="tennisball"
            onPress={sendRequest}
          />
        </View>
      </SafeAreaView>

      {/* ⋯ Options sheet */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={sheet.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
          <View style={sheet.card}>
            <View style={sheet.handle} />

            {reportStep === 0 ? (
              <>
                <Text style={sheet.subjectName} numberOfLines={1}>{player.name}</Text>
                <SheetRow icon="flag-outline" label="Report player" onPress={() => setReportStep(1)} />
                <SheetRow icon="ban-outline" label="Block player" onPress={handleBlock} destructive />
                <SheetRow icon="share-social-outline" label="Share profile" onPress={handleShare} />
                <View style={sheet.sep} />
                <SheetRow icon="close-outline" label="Cancel" onPress={closeMenu} />
              </>
            ) : reportStep === 1 ? (
              <>
                <Pressable onPress={() => setReportStep(0)} style={sheet.back}>
                  <Ionicons name="chevron-back" size={18} color={colors.navy} />
                  <Text style={sheet.backLabel}>Report player</Text>
                </Pressable>
                <Text style={sheet.reasonPrompt}>What's the issue?</Text>
                {REPORT_REASONS.map((r) => (
                  <Pressable key={r} onPress={() => setReportReason(r)} style={sheet.reasonRow}>
                    <Text style={[sheet.reasonText, reportReason === r && sheet.reasonActive]}>{r}</Text>
                    {reportReason === r ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.blue} />
                    ) : (
                      <View style={sheet.circle} />
                    )}
                  </Pressable>
                ))}
                <Pressable
                  onPress={submitReport}
                  disabled={!reportReason}
                  style={[sheet.submitBtn, !reportReason && sheet.submitDisabled]}
                >
                  <Text style={sheet.submitText}>Submit report</Text>
                </Pressable>
              </>
            ) : (
              <View style={sheet.doneWrap}>
                <Ionicons name="checkmark-circle" size={52} color={colors.green} />
                <Text style={sheet.doneTitle}>Report submitted</Text>
                <Text style={sheet.doneSub}>Thanks — we'll review this and take action if needed.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RoundBtn({ icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.roundBtn}>
      <Ionicons name={icon} size={22} color={colors.white} />
    </Pressable>
  );
}

function SheetRow({ icon, label, onPress, destructive }) {
  return (
    <Pressable onPress={onPress} style={sheet.row}>
      <View style={sheet.rowIconWrap}>
        <Ionicons name={icon} size={20} color={destructive ? colors.red : colors.navy} />
      </View>
      <Text style={[sheet.rowLabel, destructive && sheet.rowDestructive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  cover: { height: COVER_H, justifyContent: 'flex-end' },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  coverInfo: { padding: spacing.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: fonts.serif, fontSize: 34, color: colors.white },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  loc: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  body: { paddingHorizontal: spacing.xl },

  sportsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginTop: -spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  sportRowDivider: { borderTopWidth: 1, borderTopColor: colors.slate100 },
  sportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.navy },
  sportStyle: { fontFamily: fonts.body, fontSize: 12, color: colors.slate500, marginTop: 1 },
  ratingBox: { alignItems: 'center', minWidth: 56 },
  ratingValue: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.blue },
  ratingLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate400, marginTop: 1 },
  ratingDisclaimer: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, textAlign: 'center', marginTop: 6, marginBottom: 2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy, marginBottom: spacing.sm },
  bio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.slate600 },

  friend: { alignItems: 'center', width: 68 },
  friendAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.slate200 },
  communityLogo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.slate200 },
  friendName: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate600, marginTop: 4, textAlign: 'center' },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateNote: { fontFamily: fonts.body, fontSize: 13, color: colors.slate400 },

  galleryImg: { width: width * 0.5, height: 180, borderRadius: radius.md, backgroundColor: colors.slate200 },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'android' ? spacing.md : 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  passBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: spacing.md,
  },
  rowIconWrap: { width: 24, alignItems: 'center' },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.navy, flex: 1 },
  rowDestructive: { color: colors.red },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.navy },
  reasonPrompt: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.slate500,
    marginBottom: spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  reasonText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.navy },
  reasonActive: { color: colors.blue },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.slate300,
  },
  submitBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },

  doneWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  doneTitle: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.navy },
  doneSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
