// Edit Profile — opened from My Profile. Saving calls updateProfile() in
// AuthContext, so changes reflect across the app instantly (and persist in
// demo mode). Branches for community accounts (no skill / rating fields).
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Field, KeyboardDoneBar } from '../components/ui';
import { SkillLevelPickerModal } from '../components/RatingSelector';
import CityField from '../components/CityField';
import SportIcon from '../components/SportIcon';
import PhotoGrid from '../components/PhotoGrid';
import { pickImage } from '../lib/imagePicker';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { AVAILABILITY_OPTIONS } from '../lib/mockData';
import { EMPTY_PROFILE } from '../lib/profile';
import { SPORTS, SPORT_KEYS, levelDescription } from '../lib/ratings';
import { colors, fonts, spacing, radius } from '../theme';

const COMMUNITY_TYPES = ['Club', 'Park', 'Group'];

// Local device URIs that still need uploading to Storage.
const isLocalUri = (u) =>
  typeof u === 'string' &&
  (u.startsWith('file:') || u.startsWith('content:') || u.startsWith('ph:') || u.startsWith('assets-library:'));

export default function EditProfileScreen({ navigation }) {
  const { profile, updateProfile, session } = useAuth();
  const user = profile || EMPTY_PROFILE;
  const isCommunity = Boolean(user.isCommunity);

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [levelPickerSport, setLevelPickerSport] = useState(null);
  const [form, setForm] = useState({
    name: user.name || '',
    city: user.city || '',
    bio: user.bio || '',
    hand: user.hand || 'Right',
    communityType: user.communityType || 'Club',
    avatar: user.avatar || '',
    cover: user.cover || '',
    photos: Array.isArray(user.photos) ? [...user.photos] : [],
    availability: Array.isArray(user.availability) ? [...user.availability] : [],
    // deep-copy sports so edits don't mutate the live profile until save
    sports: JSON.parse(JSON.stringify(user.sports || (isCommunity ? [] : {}))),
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Player: sports is an object keyed by sport. Community: array of sport keys.
  const playsSport = (s) =>
    isCommunity ? (form.sports || []).includes(s) : Boolean(form.sports[s]);

  function toggleSport(s) {
    if (isCommunity) {
      const arr = form.sports || [];
      set({ sports: arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s] });
    } else {
      const next = { ...form.sports };
      if (next[s]) delete next[s];
      else next[s] = { rating: null };
      set({ sports: next });
    }
  }

  function setSportField(s, patch) {
    set({ sports: { ...form.sports, [s]: { ...form.sports[s], ...patch } } });
  }

  function toggleAvailability(slot) {
    const arr = form.availability || [];
    set({
      availability: arr.includes(slot) ? arr.filter((x) => x !== slot) : [...arr, slot],
    });
  }

  async function changeAvatar() {
    const uri = await pickImage({ aspect: [1, 1] });
    if (uri) set({ avatar: uri });
  }

  async function changeCover() {
    const uri = await pickImage({ aspect: [16, 9] });
    if (uri) set({ cover: uri });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const uid = session?.user?.id;

    // Upload any newly-picked local images to Supabase Storage → public URLs.
    let avatar = form.avatar;
    let cover = form.cover;
    let photos = [...form.photos];
    try {
      if (isLocalUri(avatar)) avatar = (await api.uploadImage(uid, avatar, 'avatar')).url;
      if (isLocalUri(cover)) cover = (await api.uploadImage(uid, cover, 'cover')).url;
      for (let i = 0; i < photos.length; i++) {
        if (isLocalUri(photos[i])) photos[i] = (await api.uploadImage(uid, photos[i], 'photo')).url;
      }
    } catch (e) {
      // Upload failed → keep local URIs so nothing is lost; save still proceeds.
    }

    const patch = {
      name: form.name.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
      avatar,
      cover,
    };
    if (isCommunity) {
      patch.communityType = form.communityType;
      patch.sports = form.sports;
      patch.photo = cover; // community pages use `photo` for the banner
    } else {
      patch.hand = form.hand;
      patch.sports = form.sports;
      patch.photos = photos;
      patch.availability = form.availability;
    }
    await updateProfile(patch);
    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{isCommunity ? 'Edit page' : 'Edit profile'}</Text>
          <Pressable onPress={save} hitSlop={12} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.blue} />
            ) : (
              <Text style={styles.save}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {/* Cover + avatar editors */}
          <Pressable style={styles.coverEdit} onPress={changeCover}>
            {form.cover ? (
              <Image source={{ uri: form.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : null}
            <LinearGradient colors={['transparent', 'rgba(15,23,42,0.5)']} style={StyleSheet.absoluteFill} />
            <View style={styles.coverEditBadge}>
              <Ionicons name="camera" size={15} color={colors.white} />
              <Text style={styles.coverEditText}>Edit cover</Text>
            </View>
          </Pressable>

          <Pressable style={styles.avatarEdit} onPress={changeAvatar}>
            {form.avatar ? (
              <Image source={{ uri: form.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color={colors.slate400} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </Pressable>

          <Field
            label={isCommunity ? 'Name' : 'Full name'}
            icon={isCommunity ? 'business-outline' : 'person-outline'}
            value={form.name}
            onChangeText={(t) => set({ name: t })}
          />

          {isCommunity ? (
            <>
              <Text style={styles.label}>Type</Text>
              <View style={styles.chipWrap}>
                {COMMUNITY_TYPES.map((t) => (
                  <Chip key={t} label={t} active={form.communityType === t} onPress={() => set({ communityType: t })} />
                ))}
              </View>
            </>
          ) : null}

          <CityField value={form.city} onChange={(city) => set({ city })} />

          {/* Photos (players only) */}
          {!isCommunity ? (
            <>
              <Text style={styles.label}>Photos</Text>
              <PhotoGrid
                photos={form.photos}
                onChange={(photos) => set({ photos })}
                max={6}
                onDragStateChange={(dragging) => setScrollEnabled(!dragging)}
              />
              <View style={{ height: spacing.lg }} />
            </>
          ) : null}

          {/* Sports */}
          <Text style={styles.label}>Sports</Text>
          {SPORT_KEYS.map((s) => {
            const on = playsSport(s);
            return (
              <View key={s} style={styles.sportBlock}>
                <Pressable style={styles.sportToggleRow} onPress={() => toggleSport(s)}>
                  <SportIcon sport={s} size={18} color={on ? colors.blue : colors.slate400} />
                  <Text style={[styles.sportToggleText, on && { color: colors.navy }]}>
                    {SPORTS[s].label}
                  </Text>
                  <View style={[styles.check, on && styles.checkActive]}>
                    {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                  </View>
                </Pressable>

                {/* Player-only: skill level + style per sport */}
                {on && !isCommunity ? (
                  <View style={styles.sportDetail}>
                    <Text style={styles.subLabel}>Skill Level</Text>
                    <Pressable style={styles.levelRow} onPress={() => setLevelPickerSport(s)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.levelValue}>
                          {form.sports[s].rating != null
                            ? form.sports[s].rating.toFixed(1)
                            : 'Not set'}
                        </Text>
                        {form.sports[s].rating != null &&
                        levelDescription(s, form.sports[s].rating) ? (
                          <Text style={styles.levelDesc} numberOfLines={1}>
                            {levelDescription(s, form.sports[s].rating)}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Player-only: availability + hand */}
          {!isCommunity ? (
            <>
              <Text style={styles.label}>When you usually play</Text>
              <View style={styles.chipWrap}>
                {AVAILABILITY_OPTIONS.map((slot) => (
                  <Chip
                    key={slot}
                    label={slot}
                    active={form.availability.includes(slot)}
                    onPress={() => toggleAvailability(slot)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Dominant hand</Text>
              <View style={styles.chipWrap}>
                {['Right', 'Left'].map((h) => (
                  <Chip key={h} label={h} active={form.hand === h} onPress={() => set({ hand: h })} />
                ))}
              </View>
            </>
          ) : null}

          <Field
            label={isCommunity ? 'Description' : 'Short bio'}
            placeholder={isCommunity ? 'Tell players about your club…' : 'What are you looking for in a partner?'}
            value={form.bio}
            onChangeText={(t) => set({ bio: t })}
            multiline
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SkillLevelPickerModal
        visible={Boolean(levelPickerSport)}
        sport={levelPickerSport || 'tennis'}
        value={levelPickerSport ? form.sports[levelPickerSport]?.rating ?? null : null}
        onSelect={(v) => levelPickerSport && setSportField(levelPickerSport, { rating: v })}
        onClose={() => setLevelPickerSport(null)}
      />
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.slate500 },
  save: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.blue },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },

  coverEdit: {
    height: 130,
    borderRadius: radius.lg,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  coverEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: spacing.md,
  },
  coverEditText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.white },
  avatarEdit: { alignSelf: 'center', marginTop: -40, marginBottom: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.bg, backgroundColor: colors.slate200 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },

  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.navy, marginBottom: spacing.sm, marginTop: spacing.xs },
  subLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600 },
  sportBlock: { marginBottom: spacing.md },
  sportToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sportToggleText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.slate500 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.slate300, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  sportDetail: { paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  levelValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  levelDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.slate500, marginTop: 2 },
});
