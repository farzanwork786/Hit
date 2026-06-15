// Settings — the full account/privacy/notifications hub.
//
// Everything that can work offline persists via AsyncStorage (privacy &
// notification prefs in SettingsContext; profile fields via AuthContext).
// Things that genuinely need a backend (email/password change, UTR/DUPR
// verification) show a polished "set up your account" notice instead of a dead
// button. A search bar at the top filters every row by keyword.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardDoneBar, DONE_BAR_ID } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { currentUser, blockedIds } from '../lib/mockData';
import { colors, fonts, spacing, radius } from '../theme';

const VIS_3 = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'matches', label: 'Matches only' },
  { key: 'nobody', label: 'Nobody' },
];
const VIS_FRIENDS = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'friends', label: 'Friends only' },
  { key: 'me', label: 'Only me' },
];

export default function SettingsScreen({ navigation }) {
  const { profile, updateProfile, signOut, deleteAccount } = useAuth();
  const { settings, update } = useSettings();
  const user = profile || currentUser;

  const [query, setQuery] = useState('');
  const [formType, setFormType] = useState(null); // 'email'|'password'|'phone'|'username'
  const [notice, setNotice] = useState(null); // backend-needed message string

  const q = query.trim().toLowerCase();
  const showBackendNotice = () =>
    setNotice("You'll be able to do this once your account is fully set up and connected to the Hit backend.");

  function confirmLogout() {
    Alert.alert('Log out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, photos, matches and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'Your account will be deleted right away.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: deleteAccount },
            ]),
        },
      ]
    );
  }

  // Build the screen as data so the search bar can filter every row.
  const sections = useMemo(() => {
    const p = settings.privacy;
    const n = settings.notifications;
    const a = settings.account;
    return [
      {
        title: 'Account',
        items: [
          { type: 'nav', icon: 'mail-outline', label: 'Email address', value: user.email || 'Not set', onPress: () => setFormType('email'), kw: 'email login' },
          { type: 'nav', icon: 'lock-closed-outline', label: 'Password', value: '••••••••', onPress: () => setFormType('password'), kw: 'password security' },
          { type: 'nav', icon: 'call-outline', label: 'Phone number', value: user.phone || 'Add', onPress: () => setFormType('phone'), kw: 'phone number recovery' },
          { type: 'nav', icon: 'at-outline', label: 'Username', value: `@${user.username || 'set-username'}`, onPress: () => setFormType('username'), kw: 'username handle' },
          { type: 'link', icon: 'link-outline', label: 'Link UTR account', connected: a.utrLinked, kw: 'utr link tennis rating verify' },
          { type: 'link', icon: 'link-outline', label: 'Link DUPR account', connected: a.duprLinked, kw: 'dupr link pickleball rating verify' },
        ],
      },
      {
        title: 'Profile',
        desc: 'Edit how you appear to other players.',
        items: [
          { type: 'nav', icon: 'tennisball-outline', label: 'Sports', value: 'Edit', onPress: () => navigation.navigate('EditProfile'), kw: 'sport tennis pickleball add remove' },
          { type: 'nav', icon: 'stats-chart-outline', label: 'Skill level', value: 'Edit', onPress: () => navigation.navigate('EditProfile'), kw: 'skill level utr dupr rating' },
          { type: 'nav', icon: 'options-outline', label: 'Playing style', value: 'Edit', onPress: () => navigation.navigate('EditProfile'), kw: 'playing style' },
          { type: 'nav', icon: 'calendar-outline', label: 'Availability', value: 'Edit', onPress: () => navigation.navigate('EditProfile'), kw: 'availability when play schedule' },
        ],
      },
      {
        title: 'Privacy',
        desc: 'Control who can find and contact you.',
        items: [
          { type: 'segment', icon: 'eye-outline', label: 'Who can see my profile', options: VIS_3, value: p.profileVisibility, onChange: (v) => update('privacy', { profileVisibility: v }), kw: 'profile visibility privacy see' },
          { type: 'segment', icon: 'people-outline', label: 'Who can see my friends', options: VIS_FRIENDS, value: user.friendsVisibility || 'everyone', onChange: (v) => updateProfile({ friendsVisibility: v }), kw: 'friends list visibility' },
          { type: 'segment', icon: 'people-circle-outline', label: 'Who can see my communities', options: VIS_FRIENDS, value: user.communitiesVisibility || 'everyone', onChange: (v) => updateProfile({ communitiesVisibility: v }), kw: 'communities clubs visibility' },
          { type: 'segment', icon: 'chatbubble-outline', label: 'Who can message me', options: VIS_3, value: p.whoCanMessage, onChange: (v) => update('privacy', { whoCanMessage: v }), kw: 'message dm who' },
          { type: 'toggle', icon: 'calendar-clear-outline', label: 'Hide my age', value: p.hideAge, onChange: (v) => update('privacy', { hideAge: v }), kw: 'hide age' },
          { type: 'toggle', icon: 'navigate-outline', label: 'Hide my distance', value: p.hideDistance, onChange: (v) => update('privacy', { hideDistance: v }), kw: 'hide distance location' },
          { type: 'toggle', icon: 'search-outline', label: 'Show me in Browse', desc: 'Turn off to pause discovery.', value: p.showInBrowse, onChange: (v) => update('privacy', { showInBrowse: v }), kw: 'show browse discovery pause' },
        ],
      },
      {
        title: 'Notifications',
        items: [
          { type: 'toggle', icon: 'notifications-outline', label: 'Push notifications', desc: 'Master switch for all push alerts.', value: n.push, onChange: (v) => update('notifications', { push: v }), kw: 'push notifications master' },
          { type: 'toggle', icon: 'tennisball-outline', label: 'New match requests', value: n.matchRequests, disabled: !n.push, onChange: (v) => update('notifications', { matchRequests: v }), kw: 'match requests' },
          { type: 'toggle', icon: 'chatbubbles-outline', label: 'New messages', value: n.messages, disabled: !n.push, onChange: (v) => update('notifications', { messages: v }), kw: 'messages chat' },
          { type: 'toggle', icon: 'people-outline', label: 'Community posts', value: n.communityPosts, disabled: !n.push, onChange: (v) => update('notifications', { communityPosts: v }), kw: 'community posts board' },
          { type: 'toggle', icon: 'megaphone-outline', label: 'Court Board replies', value: n.courtBoardReplies, disabled: !n.push, onChange: (v) => update('notifications', { courtBoardReplies: v }), kw: 'court board replies' },
          { type: 'toggle', icon: 'sparkles-outline', label: 'App updates & tips', value: n.appUpdates, disabled: !n.push, onChange: (v) => update('notifications', { appUpdates: v }), kw: 'app updates tips news' },
        ],
      },
      {
        title: 'Account actions',
        items: [
          { type: 'nav', icon: 'ban-outline', label: 'Blocked players', value: String(blockedIds.size), onPress: () => Alert.alert('Blocked players', blockedIds.size ? `You've blocked ${blockedIds.size} player(s). Unblock from their profile.` : "You haven't blocked anyone."), kw: 'blocked players' },
          { type: 'danger', icon: 'log-out-outline', label: 'Log out', onPress: confirmLogout, kw: 'log out sign out' },
          { type: 'danger', icon: 'trash-outline', label: 'Delete account', onPress: confirmDelete, kw: 'delete account remove permanent' },
        ],
      },
      {
        title: 'Legal',
        items: [
          { type: 'nav', icon: 'document-text-outline', label: 'Terms of Service', onPress: () => navigation.navigate('Terms'), kw: 'terms service legal agreement' },
          { type: 'nav', icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy'), kw: 'privacy policy data protection' },
        ],
      },
    ];
  }, [settings, user, update, updateProfile, navigation]);

  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (i) => i.label.toLowerCase().includes(q) || (i.kw || '').includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [sections, q]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.slate400} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search settings"
          placeholderTextColor={colors.slate400}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.slate400} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <Text style={styles.noResults}>No settings match “{query}”.</Text>
        ) : null}

        {filtered.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.desc ? <Text style={styles.sectionDesc}>{section.desc}</Text> : null}
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <SettingRow key={item.label} item={item} last={idx === section.items.length - 1} onBackendNotice={showBackendNotice} />
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>
          Hit v1.0.0 · Not affiliated with UTR or DUPR · Made for players
        </Text>
      </ScrollView>

      <AccountFormModal
        formType={formType}
        user={user}
        onClose={() => setFormType(null)}
        onBackendNotice={(msg) => {
          setFormType(null);
          setNotice(msg);
        }}
        onSaveLocal={(patch) => {
          updateProfile(patch);
          setFormType(null);
        }}
      />

      <NoticeModal message={notice} onClose={() => setNotice(null)} />
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

// --- A single settings row, polymorphic on item.type --------------------
function SettingRow({ item, last, onBackendNotice }) {
  const rowStyle = [styles.row, !last && styles.rowDivider];

  if (item.type === 'toggle') {
    return (
      <View style={[rowStyle, item.disabled && { opacity: 0.45 }]}>
        <RowIcon icon={item.icon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.desc ? <Text style={styles.rowDesc}>{item.desc}</Text> : null}
        </View>
        <Switch
          value={item.value}
          disabled={item.disabled}
          onValueChange={item.onChange}
          trackColor={{ false: colors.slate200, true: colors.blue }}
          thumbColor={colors.white}
        />
      </View>
    );
  }

  if (item.type === 'segment') {
    return (
      <View style={[rowStyle, { alignItems: 'flex-start' }]}>
        <RowIcon icon={item.icon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <View style={styles.segWrap}>
            {item.options.map((opt) => {
              const active = item.value === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => item.onChange(opt.key)}
                  style={[styles.segChip, active && styles.segChipActive]}
                >
                  <Text style={[styles.segChipText, active && { color: colors.white }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (item.type === 'link') {
    return (
      <Pressable style={rowStyle} onPress={onBackendNotice}>
        <RowIcon icon={item.icon} />
        <Text style={[styles.rowLabel, { flex: 1 }]}>{item.label}</Text>
        <View style={[styles.linkBadge, item.connected ? styles.linkOn : styles.linkOff]}>
          <Text style={[styles.linkBadgeText, { color: item.connected ? colors.green : colors.slate500 }]}>
            {item.connected ? 'Connected' : 'Connect'}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (item.type === 'danger') {
    return (
      <Pressable style={rowStyle} onPress={item.onPress}>
        <View style={[styles.rowIcon, { backgroundColor: colors.redLight }]}>
          <Ionicons name={item.icon} size={18} color={colors.red} />
        </View>
        <Text style={[styles.rowLabel, { flex: 1, color: colors.red }]}>{item.label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.slate300} />
      </Pressable>
    );
  }

  // 'nav'
  return (
    <Pressable style={rowStyle} onPress={item.onPress}>
      <RowIcon icon={item.icon} />
      <Text style={[styles.rowLabel, { flex: 1 }]}>{item.label}</Text>
      {item.value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {item.value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.slate300} />
    </Pressable>
  );
}

function RowIcon({ icon }) {
  return (
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={18} color={colors.blue} />
    </View>
  );
}

// --- Account edit forms (email / password / phone / username) -----------
function AccountFormModal({ formType, user, onClose, onBackendNotice, onSaveLocal }) {
  const [vals, setVals] = useState({});
  const visible = Boolean(formType);

  // Reset field state whenever a new form opens.
  React.useEffect(() => {
    setVals({});
  }, [formType]);

  const cfg = FORM_CONFIG[formType];
  if (!cfg) return <Modal visible={false} transparent />;

  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }));

  function submit() {
    if (cfg.backend) {
      onBackendNotice(cfg.noticeMessage);
      return;
    }
    // Local save (phone / username).
    const patch = cfg.toPatch(vals);
    if (cfg.validate) {
      const err = cfg.validate(vals);
      if (err) {
        Alert.alert('Hmm', err);
        return;
      }
    }
    onSaveLocal(patch);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={sheet.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={sheet.card}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>{cfg.title}</Text>
          {cfg.subtitle ? <Text style={sheet.subtitle}>{cfg.subtitle}</Text> : null}

          {cfg.fields.map((f) => (
            <View key={f.key} style={sheet.fieldWrap}>
              <Text style={sheet.fieldLabel}>{f.label}</Text>
              <TextInput
                value={f.key === '_current' ? f.current(user) : vals[f.key] || ''}
                editable={f.key !== '_current'}
                onChangeText={(t) => set(f.key, t)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.slate400}
                secureTextEntry={f.secure}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={f.keyboardType || 'default'}
                style={[sheet.input, f.key === '_current' && sheet.inputReadonly]}
                inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
              />
            </View>
          ))}

          {cfg.backend ? (
            <View style={sheet.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
              <Text style={sheet.noteText}>This change will sync once your account is fully set up.</Text>
            </View>
          ) : null}

          <Pressable style={sheet.primary} onPress={submit}>
            <Text style={sheet.primaryText}>{cfg.cta}</Text>
          </Pressable>
          <Pressable style={sheet.cancel} onPress={onClose}>
            <Text style={sheet.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const FORM_CONFIG = {
  email: {
    title: 'Change email',
    backend: true,
    cta: 'Request change',
    noticeMessage: "You'll be able to change your email once your account is fully set up and connected to the Hit backend.",
    fields: [
      { key: '_current', label: 'Current email', current: (u) => u.email || 'Not set' },
      { key: 'email', label: 'New email', placeholder: 'you@example.com', keyboardType: 'email-address' },
    ],
  },
  password: {
    title: 'Change password',
    backend: true,
    cta: 'Update password',
    noticeMessage: "You'll be able to change your password once your account is fully set up and connected to the Hit backend.",
    fields: [
      { key: 'current', label: 'Current password', placeholder: 'Current password', secure: true },
      { key: 'next', label: 'New password', placeholder: 'New password', secure: true },
      { key: 'confirm', label: 'Confirm new password', placeholder: 'Re-enter new password', secure: true },
    ],
  },
  phone: {
    title: 'Phone number',
    subtitle: 'Optional — used for account recovery. Saved on this device in demo mode.',
    cta: 'Save phone number',
    fields: [{ key: 'phone', label: 'Phone number', placeholder: '+1 555 123 4567', keyboardType: 'phone-pad' }],
    toPatch: (v) => ({ phone: (v.phone || '').trim() }),
  },
  username: {
    title: 'Username',
    subtitle: 'Your unique @handle. Saved on this device in demo mode.',
    cta: 'Save username',
    fields: [{ key: 'username', label: 'Username', placeholder: 'username' }],
    validate: (v) => {
      const u = (v.username || '').trim();
      if (u.length < 3) return 'Usernames must be at least 3 characters.';
      if (!/^[a-zA-Z0-9_.]+$/.test(u)) return 'Use only letters, numbers, _ and .';
      return null;
    },
    toPatch: (v) => ({ username: (v.username || '').trim().toLowerCase().replace(/\s+/g, '') }),
  },
};

// --- "Needs backend" notice ---------------------------------------------
function NoticeModal({ message, onClose }) {
  return (
    <Modal visible={Boolean(message)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={notice.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={notice.card}>
          <View style={notice.iconWrap}>
            <Ionicons name="construct-outline" size={28} color={colors.blue} />
          </View>
          <Text style={notice.title}>Almost there</Text>
          <Text style={notice.body}>{message}</Text>
          <Pressable style={notice.btn} onPress={onClose}>
            <Text style={notice.btnText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 48 },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.navy },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.navy, height: '100%' },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  noResults: { fontFamily: fonts.body, fontSize: 14, color: colors.slate400, textAlign: 'center', marginTop: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.slate400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginLeft: spacing.xs },
  sectionDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.navy },
  rowDesc: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.slate400, marginTop: 2 },
  rowValue: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate400, marginRight: 4, maxWidth: 150 },

  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  segChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.border },
  segChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  segChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate600 },

  linkBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  linkOn: { backgroundColor: colors.greenLight, borderColor: colors.greenLight },
  linkOff: { backgroundColor: colors.slate100, borderColor: colors.border },
  linkBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12 },

  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, textAlign: 'center', marginTop: spacing.sm },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingTop: spacing.md,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.slate300, alignSelf: 'center', marginBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate500, marginTop: 4, marginBottom: spacing.sm },
  fieldWrap: { marginTop: spacing.md },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.navy,
  },
  inputReadonly: { backgroundColor: colors.slate100, color: colors.slate500 },
  noteBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.blueTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.slate600 },
  primary: { backgroundColor: colors.blue, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  primaryText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
  cancel: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate500 },
});

const notice = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', width: '100%', maxWidth: 340 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy, marginBottom: spacing.xs },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate600, textAlign: 'center', marginBottom: spacing.lg },
  btn: { backgroundColor: colors.navy, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  btnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
});
