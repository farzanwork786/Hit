// Registration wizard. Two flows depending on the chosen account type:
//   • Player (self):    Account → Your sports → Your level → Location
//   • Community/club:   Your club → Sports → Location   (no skill/ratings)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Field, KeyboardDoneBar } from '../components/ui';
import RatingSelector, { LevelGuideModal } from '../components/RatingSelector';
import CityField from '../components/CityField';
import PhotoGrid from '../components/PhotoGrid';
import SportIcon from '../components/SportIcon';
import { pickImage } from '../lib/imagePicker';
import { useAuth } from '../context/AuthContext';
import { SPORTS, SPORT_KEYS } from '../lib/ratings';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const COMMUNITY_TYPES = ['Club', 'Park', 'Group'];

// Browse cards look dead when profiles have no imagery, so new players add a
// couple of photos up front rather than leaving blank placeholders behind.
const MIN_PHOTOS = 2;

const emptySport = () => ({ rating: null });

// Resolve a sport's wizard selections into the stored shape.
function resolveSports(formSports) {
  const out = {};
  for (const s of SPORT_KEYS) {
    const sp = formSports[s];
    if (!sp) continue;
    const meta = SPORTS[s];
    let value = typeof sp.rating === 'number' ? sp.rating : null;
    if (value != null) {
      value = Math.round(Math.min(Math.max(value, meta.min), meta.max) * 10) / 10;
    }
    out[s] = { rating: value };
  }
  return out;
}

export default function RegistrationScreen({ navigation }) {
  const { onboarding, updateDraft, signUp, completeDemoOnboarding, isSupabaseConfigured } = useAuth();
  const isCommunity = onboarding.accountType === 'community';

  const STEPS = isCommunity
    ? ['Your club', 'Sports', 'Location']
    : ['Account', 'Your sports', 'Your level', 'Photos', 'Location'];

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [guideSport, setGuideSport] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    sports: { tennis: null, pickleball: null }, // player: object; community uses communitySports
    communitySports: [],
    communityType: 'Club',
    photo: '',
    photos: [],
    hand: 'Right',
    bio: '',
    city: '',
    ...onboarding.draft,
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const selectedSports = SPORT_KEYS.filter((s) => form.sports[s]);

  function toggleSport(sport) {
    set({
      sports: { ...form.sports, [sport]: form.sports[sport] ? null : emptySport(sport) },
    });
  }
  function toggleCommunitySport(sport) {
    const arr = form.communitySports;
    set({ communitySports: arr.includes(sport) ? arr.filter((s) => s !== sport) : [...arr, sport] });
  }
  function setSportField(sport, patch) {
    set({ sports: { ...form.sports, [sport]: { ...form.sports[sport], ...patch } } });
  }

  function validateStep() {
    const e = {};
    const label = STEPS[step];
    if (label === 'Account') {
      if (!form.name.trim()) e.name = 'Required';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
      if (form.password.length < 6) e.password = 'Min 6 characters';
    }
    if (label === 'Your club') {
      if (!form.name.trim()) e.name = 'Required';
      if (!form.photo) e.photo = 'Add a cover photo so players recognise your community.';
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
      if (form.password.length < 6) e.password = 'Min 6 characters';
    }
    if (label === 'Your sports' && selectedSports.length === 0) {
      e.sports = 'Pick at least one sport to continue.';
    }
    if (label === 'Sports' && form.communitySports.length === 0) {
      e.sports = 'Pick at least one sport.';
    }
    if (label === 'Your level') {
      for (const s of selectedSports) {
        const sp = form.sports[s];
        if (sp.rating == null) e[`level-${s}`] = `Pick your ${SPORTS[s].label.toLowerCase()} skill level.`;
      }
    }
    if (label === 'Photos' && (form.photos?.length || 0) < MIN_PHOTOS) {
      e.photos = `Add at least ${MIN_PHOTOS} photos so players can see who they're meeting.`;
    }
    if (label === 'Location' && !form.city.trim()) e.city = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep()) return;
    updateDraft(form);
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  }
  function back() {
    if (step === 0) navigation.goBack();
    else setStep(step - 1);
  }

  async function submit() {
    setSubmitting(true);
    const payload = isCommunity
      ? {
          isCommunity: true,
          name: form.name,
          email: form.email,
          password: form.password,
          communityType: form.communityType,
          sports: form.communitySports,
          photo: form.photo,
          cover: form.photo,
          bio: form.bio,
          city: form.city,
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          sports: resolveSports(form.sports),
          hand: form.hand,
          bio: form.bio,
          city: form.city,
          // Seed the avatar and card background from the photos they just
          // added, so their Browse card is complete the moment they join.
          // saveProfile uploads these local URIs and stores the public URLs.
          photos: form.photos,
          avatar: form.photos[0],
          cover: form.photos[1] || form.photos[0],
        };

    if (isSupabaseConfigured) {
      const { error, needsConfirmation } = await signUp(payload);
      if (error) {
        setSubmitting(false);
        setErrors({ submit: error.message });
        return;
      }
      if (needsConfirmation) {
        setSubmitting(false);
        Alert.alert(
          'Confirm your email',
          `We sent a confirmation link to ${form.email}. Tap it, then come back and sign in to finish setting up your profile.`,
          [{ text: 'Go to sign in', onPress: () => navigation.navigate('SignIn') }]
        );
        return;
      }
      // No confirmation needed → session is live; auth state swaps to the app.
    } else {
      await completeDemoOnboarding(payload);
    }
    setSubmitting(false);
  }

  const label = STEPS[step];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.navy} />
          </Pressable>
          <Text style={styles.stepCount}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.progressTrack}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressSeg, { backgroundColor: i <= step ? colors.blue : colors.slate200 }]} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{label}</Text>

          {label === 'Account' && <StepAccount form={form} set={set} errors={errors} />}
          {label === 'Your club' && <StepClub form={form} set={set} errors={errors} />}
          {(label === 'Your sports' || label === 'Sports') && (
            <StepSports
              isCommunity={isCommunity}
              selected={isCommunity ? form.communitySports : form.sports}
              onToggle={isCommunity ? toggleCommunitySport : toggleSport}
              error={errors.sports}
            />
          )}
          {label === 'Your level' && (
            <StepLevel
              form={form}
              selectedSports={selectedSports}
              setSportField={setSportField}
              set={set}
              errors={errors}
              onOpenGuide={setGuideSport}
            />
          )}
          {label === 'Photos' && <StepPhotos form={form} set={set} errors={errors} />}
          {label === 'Location' && (
            <StepLocation form={form} set={set} errors={errors} isCommunity={isCommunity} />
          )}

          {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step === STEPS.length - 1 ? (
            <Text style={styles.consentText}>
              By creating an account you agree to our{' '}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('Terms')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                Privacy Policy
              </Text>
              .
            </Text>
          ) : null}
          <AppButton
            title={step === STEPS.length - 1 ? (isCommunity ? 'Create page' : 'Create account') : 'Continue'}
            onPress={next}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>

      <LevelGuideModal visible={Boolean(guideSport)} sport={guideSport || 'tennis'} onClose={() => setGuideSport(null)} />
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

// --- Account ------------------------------------------------------------
function StepAccount({ form, set, errors }) {
  return (
    <View>
      <Text style={styles.lead}>Let's set up your login. We'll keep your details private.</Text>
      <Field label="Full name" icon="person-outline" placeholder="Alex Rivera" value={form.name} onChangeText={(t) => set({ name: t })} error={errors.name} />
      <Field
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={form.email}
        onChangeText={(t) => set({ email: t })}
        error={errors.email}
      />
      <Field label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" secureTextEntry value={form.password} onChangeText={(t) => set({ password: t })} error={errors.password} />
    </View>
  );
}

// --- Community: club basics --------------------------------------------
function StepClub({ form, set, errors }) {
  return (
    <View>
      <Text style={styles.lead}>Set up your club, park or group page.</Text>
      <Field label="Name" icon="business-outline" placeholder="Zilker Park Tennis Club" value={form.name} onChangeText={(t) => set({ name: t })} error={errors.name} />

      <Text style={styles.fieldLabel}>Type</Text>
      <View style={styles.chipWrap}>
        {COMMUNITY_TYPES.map((t) => (
          <Chip key={t} label={t} active={form.communityType === t} onPress={() => set({ communityType: t })} />
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Cover photo</Text>
      <Pressable
        style={styles.coverPick}
        onPress={async () => {
          const uri = await pickImage({ aspect: [16, 9] });
          if (uri) set({ photo: uri });
        }}
      >
        {form.photo ? (
          <>
            <Image source={{ uri: form.photo }} style={StyleSheet.absoluteFill} />
            <View style={styles.coverPickBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
              <Text style={styles.coverPickBadgeText}>Change photo</Text>
            </View>
          </>
        ) : (
          <View style={styles.coverPickEmpty}>
            <Ionicons name="image-outline" size={26} color={colors.slate400} />
            <Text style={styles.coverPickText}>Add a cover photo</Text>
          </View>
        )}
      </Pressable>
      {errors.photo ? <Text style={styles.submitError}>{errors.photo}</Text> : null}

      <View style={{ marginTop: spacing.lg }}>
        <Field label="Login email" icon="mail-outline" placeholder="club@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={form.email} onChangeText={(t) => set({ email: t })} error={errors.email} />
        <Field label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" secureTextEntry value={form.password} onChangeText={(t) => set({ password: t })} error={errors.password} />
        <Field label="Description" placeholder="Tell players what your community is about…" value={form.bio} onChangeText={(t) => set({ bio: t })} multiline style={{ marginBottom: 0 }} />
      </View>
    </View>
  );
}

// --- Sports (shared) ----------------------------------------------------
function StepSports({ isCommunity, selected, onToggle, error }) {
  const isOn = (key) => (isCommunity ? selected.includes(key) : Boolean(selected[key]));
  return (
    <View>
      <Text style={styles.lead}>
        {isCommunity
          ? 'Which sports does your community offer? Pick one or both.'
          : "Pick one or both. Each sport keeps its own Skill Level — skill doesn't transfer between them."}
      </Text>
      {SPORT_KEYS.map((key) => {
        const active = isOn(key);
        return (
          <Pressable key={key} onPress={() => onToggle(key)} style={[styles.sportCard, active && styles.sportCardActive]}>
            <SportIcon sport={key} size={30} color={active ? colors.blue : colors.slate500} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sportTitle}>{SPORTS[key].label}</Text>
              <Text style={styles.sportDesc}>
                {key === 'tennis'
                  ? 'Skill levels from 2.0 to 7.0'
                  : 'Skill levels from 2.0 to 5.5'}
              </Text>
            </View>
            <View style={[styles.check, active && styles.checkActive]}>
              {active ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
            </View>
          </Pressable>
        );
      })}
      {error ? <Text style={styles.submitError}>{error}</Text> : null}
    </View>
  );
}

// --- Player: simplified skill level ------------------------------------
function StepLevel({ form, selectedSports, setSportField, set, errors, onOpenGuide }) {
  const [showBio, setShowBio] = useState(Boolean(form.bio));
  return (
    <View>
      <Text style={styles.lead}>Pick the Skill Level that sounds most like you.</Text>

      {/* One-time self-assessment disclosure */}
      <View style={styles.ratingNote}>
        <Ionicons name="information-circle-outline" size={16} color={colors.blue} style={{ marginTop: 1 }} />
        <Text style={styles.ratingNoteText}>
          The level you choose is a{' '}
          <Text style={{ fontFamily: fonts.bodyBold }}>self-assessment for matchmaking only</Text>
          . You can update it anytime from your profile.
        </Text>
      </View>

      {selectedSports.map((sport) => (
        <SportLevelBlock
          key={sport}
          sport={sport}
          sp={form.sports[sport]}
          setSportField={(patch) => setSportField(sport, patch)}
          error={errors[`level-${sport}`]}
          onOpenGuide={() => onOpenGuide(sport)}
        />
      ))}

      <Text style={styles.fieldLabel}>Dominant hand</Text>
      <View style={styles.chipWrap}>
        {['Right', 'Left'].map((h) => (
          <Chip key={h} label={h} active={form.hand === h} onPress={() => set({ hand: h })} />
        ))}
      </View>

      {/* Bio collapsed behind an optional link */}
      {showBio ? (
        <View style={{ marginTop: spacing.lg }}>
          <Field label="Short bio (optional)" placeholder="What are you looking for in a partner?" value={form.bio} onChangeText={(t) => set({ bio: t })} multiline style={{ marginBottom: 0 }} />
        </View>
      ) : (
        <Pressable onPress={() => setShowBio(true)} hitSlop={8} style={styles.bioLinkRow}>
          <Ionicons name="add-circle-outline" size={18} color={colors.blue} />
          <Text style={styles.guideLink}>Add a short bio (optional)</Text>
        </Pressable>
      )}
    </View>
  );
}

function SportLevelBlock({ sport, sp, setSportField, error, onOpenGuide }) {
  const meta = SPORTS[sport];

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={styles.sportHead}>
        <View style={styles.sportHeadLeft}>
          <SportIcon sport={sport} size={18} color={colors.navy} />
          <Text style={styles.sportHeadTitle}>{meta.label} Skill Level</Text>
        </View>
        <Pressable onPress={onOpenGuide} hitSlop={8}>
          <Text style={styles.guideLink}>What's my level?</Text>
        </Pressable>
      </View>

      <RatingSelector
        sport={sport}
        value={sp.rating}
        onSelect={(v) => setSportField({ rating: v })}
      />

      {error ? <Text style={styles.submitError}>{error}</Text> : null}
    </View>
  );
}

// --- Player: photos -----------------------------------------------------
function StepPhotos({ form, set, errors }) {
  const count = form.photos?.length || 0;
  return (
    <View>
      <Text style={styles.lead}>
        Add at least {MIN_PHOTOS} photos. Players are far more likely to reach out
        when they can see who they'd be meeting.
      </Text>

      <PhotoGrid photos={form.photos || []} onChange={(photos) => set({ photos })} max={6} />

      <Text style={styles.photoHint}>
        {count === 0
          ? 'Your first photo becomes your profile picture.'
          : `${count} of ${MIN_PHOTOS} added${count >= MIN_PHOTOS ? ' — you can add more later.' : '.'}`}
      </Text>

      {errors.photos ? <Text style={styles.submitError}>{errors.photos}</Text> : null}
    </View>
  );
}

// --- Location -----------------------------------------------------------
function StepLocation({ form, set, errors, isCommunity }) {
  return (
    <View>
      <Text style={styles.lead}>
        {isCommunity ? 'Where is your community based?' : 'Where do you play? We use this to find players near you.'}
      </Text>
      <CityField value={form.city} onChange={(city) => set({ city })} error={errors.city} />
      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
        <Text style={styles.privacyText}>
          Your exact location is never shared. Others only see approximate distance.
        </Text>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, height: 44 },
  stepCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  progressTrack: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.navy, marginBottom: spacing.xs },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.slate500, marginBottom: spacing.xl },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600 },

  sportCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.border, marginBottom: spacing.md, ...shadow.soft },
  sportCardActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  sportTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.navy },
  sportDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.slate500, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.slate300, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.blue, borderColor: colors.blue },

  sportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sportHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sportHeadTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy },
  guideLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.blue },

  newCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.blueTint, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.blueLight, padding: spacing.lg, marginBottom: spacing.md },
  newCardActive: { borderColor: colors.blue },
  newSprout: { fontSize: 26 },
  newTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  newDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.slate600, marginTop: 2 },

  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupCard: { flexGrow: 1, flexBasis: '47%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md },
  groupCardActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  groupLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.navy },
  groupBlurb: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.slate500, marginTop: 2 },

  detailToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, marginBottom: spacing.sm },
  bioLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },

  coverPick: {
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.slate100,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  coverPickEmpty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverPickText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate500 },
  coverPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: spacing.md,
  },
  coverPickBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.white },

  privacyNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate600 },
  submitError: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: spacing.md },
  photoHint: { fontFamily: fonts.body, fontSize: 13, color: colors.slate500, marginTop: spacing.md },
  footer: { padding: spacing.xl, paddingTop: spacing.md },

  ratingNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.blueTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  ratingNoteText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate600 },

  consentText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.slate400,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  consentLink: { fontFamily: fonts.bodySemiBold, color: colors.blue },
});
