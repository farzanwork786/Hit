// My Profile.
//  • Player accounts: per-sport ratings + Friends and Communities grids.
//  • Community accounts: a club page (no ratings anywhere).
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Tag } from '../components/ui';
import SportIcon, { SportChip } from '../components/SportIcon';
import { pickImage } from '../lib/imagePicker';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { currentUser } from '../lib/mockData';
import { SPORTS, SPORT_KEYS, playsSport, ratingShort } from '../lib/ratings';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const TILE = (width - spacing.xl * 2 - GRID_GAP * 2) / 3;

export default function MyProfileScreen({ navigation }) {
  const { profile, signOut, updateProfile, session } = useAuth();
  const user = profile || currentUser;
  useIsFocused(); // re-render on focus so joins/edits reflect immediately

  const [friends, setFriends] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);

  // Load my friends + communities (live with mock fallback) whenever focused.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const uid = session?.user?.id;
        const [f, c] = await Promise.all([api.getFriends(uid || 'me'), api.getMyCommunities()]);
        if (active) {
          setFriends(f);
          setMyCommunities(c);
        }
      })();
      return () => {
        active = false;
      };
    }, [session?.user?.id])
  );

  // Pick → upload to Storage → save the resulting public URL. We optimistically
  // show the local URI first so the change feels instant, then swap to the URL.
  async function changeAvatar() {
    const uri = await pickImage({ aspect: [1, 1] });
    if (!uri) return;
    updateProfile({ avatar: uri });
    const { url } = await api.uploadImage(session?.user?.id, uri, 'avatar');
    if (url && url !== uri) updateProfile({ avatar: url });
  }

  async function changeCover() {
    const uri = await pickImage({ aspect: [16, 9] });
    if (!uri) return;
    updateProfile({ cover: uri });
    const { url } = await api.uploadImage(session?.user?.id, uri, 'cover');
    if (url && url !== uri) updateProfile({ cover: url });
  }

  function shareProfile() {
    Share.share({
      message: `Find me on Hit — ${user.name}${user.city ? ` · ${user.city}` : ''}`,
      title: 'My Hit profile',
    });
  }

  if (user.isCommunity) {
    return (
      <CommunityAccountView
        user={user}
        navigation={navigation}
        onSignOut={signOut}
        onChangeCover={changeCover}
      />
    );
  }

  const sports = SPORT_KEYS.filter((s) => playsSport(user, s));
  const photos = Array.isArray(user.photos) ? user.photos : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>My Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundBtn icon="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
            <RoundBtn icon="settings-outline" onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>

        {/* Header card */}
        <View style={styles.headerCard}>
          <Pressable style={styles.cover} onPress={changeCover}>
            <Image source={{ uri: user.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(15,23,42,0.5)']} style={StyleSheet.absoluteFill} />
            <View style={styles.coverEditBadge}>
              <Ionicons name="camera" size={13} color={colors.white} />
            </View>
          </Pressable>
          <Pressable style={styles.avatarWrap} onPress={changeAvatar}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={13} color={colors.white} />
            </View>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {user.name}
              {user.age ? `, ${user.age}` : ''}
            </Text>
            <View style={styles.locRow}>
              <Ionicons name="location" size={14} color={colors.slate400} />
              <Text style={styles.loc}>{user.city || 'No location set'}</Text>
            </View>
            <View style={styles.tagRow}>
              {sports.map((s) => (
                <SportChip key={s} sport={s} tone="blue" />
              ))}
              {user.hand ? <Tag label={`${user.hand}-handed`} tone="neutral" /> : null}
            </View>
          </View>
        </View>

        {/* Per-sport ratings */}
        {sports.length > 0 ? (
          <View style={styles.statsRow}>
            {sports.map((s) => (
              <View key={s} style={styles.statBox}>
                <Text style={styles.statValue}>{ratingShort(user, s)}</Text>
                <View style={styles.statLabelRow}>
                  <SportIcon sport={s} size={12} color={colors.slate500} />
                  <Text style={styles.statLabel}>{SPORTS[s].ratingName}</Text>
                </View>
                {user.sports?.[s]?.style ? (
                  <Text style={styles.statStyle} numberOfLines={1}>
                    {user.sports[s].style}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Edit / share */}
        <View style={styles.actionRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={18} color={colors.navy} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={shareProfile}>
            <Ionicons name="share-social-outline" size={18} color={colors.white} />
          </Pressable>
        </View>

        {/* Bio */}
        {user.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        ) : null}

        {/* Photos */}
        <View style={styles.photosHeader}>
          <Text style={styles.gridTabText}>Photos</Text>
          <Pressable onPress={() => navigation.navigate('EditProfile')} hitSlop={8}>
            <Text style={styles.managePhotos}>Manage</Text>
          </Pressable>
        </View>
        {photos.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {photos.map((uri, i) => (
              <Pressable key={`${uri}-${i}`} onPress={() => navigation.navigate('EditProfile')}>
                <Image source={{ uri }} style={styles.photoStripImg} contentFit="cover" transition={150} />
                {i === 0 ? (
                  <View style={styles.photoMainBadge}>
                    <Text style={styles.photoMainText}>Main</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable style={styles.addPhotosCard} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="images-outline" size={20} color={colors.blue} />
            <Text style={styles.addPhotosText}>Add photos to show off your game</Text>
          </Pressable>
        )}

        {/* Friends grid */}
        <SectionHeader icon="people" title="Friends" count={`${friends.length} connected`} />
        {friends.length ? (
          <View style={styles.grid}>
            {friends.map((f) => (
              <Pressable
                key={f.id}
                style={styles.tile}
                onPress={() => navigation.navigate('PlayerProfile', { player: f })}
              >
                <Image source={{ uri: f.avatar }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                <LinearGradient colors={['transparent', 'rgba(15,23,42,0.7)']} style={StyleSheet.absoluteFill} />
                {f.verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                ) : null}
                <Text style={styles.tileName} numberOfLines={1}>
                  {f.name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyNote}>No friends yet — connect with players from their profile.</Text>
        )}

        {/* Communities grid */}
        <SectionHeader icon="people-circle" title="Communities" count={`${myCommunities.length} joined`} />
        {myCommunities.length ? (
          <View style={styles.grid}>
            {myCommunities.map((c) => (
              <Pressable
                key={c.id}
                style={styles.tile}
                onPress={() => navigation.navigate('CommunityDetail', { communityId: c.id })}
              >
                <Image source={{ uri: c.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                <LinearGradient colors={['transparent', 'rgba(15,23,42,0.75)']} style={StyleSheet.absoluteFill} />
                <View style={styles.tileSports}>
                  {c.sports.map((s) => (
                    <SportIcon key={s} sport={s} size={11} color={colors.white} />
                  ))}
                </View>
                <Text style={styles.tileName} numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable onPress={() => navigation.navigate('Communities')}>
            <Text style={styles.emptyNote}>Not in any communities yet — tap to discover clubs near you.</Text>
          </Pressable>
        )}

        <Pressable style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Community account profile (no ratings anywhere) --------------------
function CommunityAccountView({ user, navigation, onSignOut, onChangeCover }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>My Page</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundBtn icon="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
            <RoundBtn icon="settings-outline" onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>

        <Pressable style={styles.communityCover} onPress={onChangeCover}>
          <Image source={{ uri: user.photo || user.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(15,23,42,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={styles.coverEditBadge}>
            <Ionicons name="camera" size={13} color={colors.white} />
          </View>
          <View style={styles.communityCoverInfo}>
            <View style={styles.communityTypeBadge}>
              <Ionicons name="business" size={12} color={colors.white} />
              <Text style={styles.communityTypeText}>{user.communityType || 'Community'}</Text>
            </View>
            <Text style={styles.communityName}>{user.name}</Text>
            <View style={styles.locRow}>
              <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.communityLoc}>{user.city || 'No location set'}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.communityBody}>
          <View style={styles.tagRow}>
            {(user.sports || []).map((s) => (
              <SportChip key={s} sport={s} tone="blue" />
            ))}
          </View>
          {user.bio ? <Text style={styles.communityDesc}>{user.bio}</Text> : null}

          <Pressable style={styles.editBtnFull} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={18} color={colors.navy} />
            <Text style={styles.editText}>Edit page</Text>
          </Pressable>

          <View style={styles.infoNote}>
            <Ionicons name="megaphone-outline" size={18} color={colors.blue} />
            <Text style={styles.infoNoteText}>
              As a community account you can pin announcements to the top of your board so members
              see them first.
            </Text>
          </View>
        </View>

        <Pressable style={styles.signOut} onPress={onSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title, count }) {
  return (
    <View style={styles.gridHeader}>
      <View style={styles.gridTabActive}>
        <Ionicons name={icon} size={18} color={colors.navy} />
        <Text style={styles.gridTabText}>{title}</Text>
      </View>
      <Text style={styles.gridCount}>{count}</Text>
    </View>
  );
}

function RoundBtn({ icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.roundBtn}>
      <Ionicons name={icon} size={20} color={colors.navy} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  brand: { fontFamily: fonts.serif, fontSize: 24, color: colors.navy },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  cover: { height: 110 },
  coverEditBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: { alignSelf: 'center', marginTop: -44 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.white, backgroundColor: colors.slate200 },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerInfo: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, marginTop: spacing.sm },
  name: { fontFamily: fonts.serif, fontSize: 24, color: colors.navy },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  loc: { fontFamily: fonts.body, fontSize: 13, color: colors.slate500 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.blue },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate500 },
  statStyle: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  editBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
  editText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.navy },
  shareBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  bioCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  bio: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate600 },
  photosHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  managePhotos: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.blue },
  photoStrip: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  photoStripImg: { width: 120, height: 150, borderRadius: radius.md, backgroundColor: colors.slate200 },
  photoMainBadge: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(15,23,42,0.7)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  photoMainText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },
  addPhotosCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, padding: spacing.lg, backgroundColor: colors.blueTint, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.blueLight },
  addPhotosText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.blue },
  gridHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  gridTabActive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridTabText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  gridCount: { fontFamily: fonts.body, fontSize: 13, color: colors.slate400 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingHorizontal: spacing.xl },
  tile: { width: TILE, height: TILE, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.slate200, justifyContent: 'flex-end', padding: 6 },
  verifiedBadge: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  tileSports: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 3 },
  tileName: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  emptyNote: { fontFamily: fonts.body, fontSize: 13, color: colors.slate400, paddingHorizontal: spacing.xl, lineHeight: 19 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xxl, padding: spacing.md },
  signOutText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.red },

  // Community account view
  communityCover: { height: 220, marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.slate200 },
  communityCoverInfo: { padding: spacing.lg },
  communityTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.55)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.sm },
  communityTypeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white, textTransform: 'capitalize' },
  communityName: { fontFamily: fonts.serif, fontSize: 26, color: colors.white },
  communityLoc: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  communityBody: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  communityDesc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate600, marginTop: spacing.md },
  infoNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  infoNoteText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate600 },
});
