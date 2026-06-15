// Small, reusable presentational components shared across screens.
import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, fonts, radius, spacing, shadow } from '../theme';

// --- Button -------------------------------------------------------------
export function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  icon,
  loading,
  disabled,
  style,
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary
    ? colors.blue
    : isDanger
    ? colors.red
    : isSecondary
    ? colors.white
    : 'transparent';
  const fg = isPrimary || isDanger ? colors.white : isSecondary ? colors.navy : colors.blue;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        isSecondary && styles.btnBordered,
        isGhost && styles.btnGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// --- Pill / Tag ---------------------------------------------------------
export function Tag({ label, icon, tone = 'neutral', style }) {
  const tones = {
    neutral: { bg: colors.slate100, fg: colors.slate600 },
    blue: { bg: colors.blueTint, fg: colors.blue },
    green: { bg: colors.greenLight, fg: colors.green },
    navy: { bg: colors.navy, fg: colors.white },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// --- Avatar -------------------------------------------------------------
export function Avatar({ uri, size = 48, ring, verified, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring ? 2 : 0,
          borderColor: colors.blue,
          backgroundColor: colors.slate200,
        }}
        contentFit="cover"
        transition={200}
      />
      {verified ? (
        <View style={[styles.verifyDot, { right: -2, bottom: -2 }]}>
          <Ionicons name="checkmark" size={11} color={colors.white} />
        </View>
      ) : null}
    </View>
  );
}

// --- Keyboard "Done" accessory bar ---------------------------------------
// iOS only: renders a dismiss bar above the keyboard. Inputs opt in via
// inputAccessoryViewID={DONE_BAR_ID} (Field does this automatically).
// Android keyboards have their own done/dismiss keys, so this is a no-op there.
export const DONE_BAR_ID = 'hit-keyboard-done';

export function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={styles.doneBar}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
          <Text style={styles.doneBarText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

// --- Text input field ---------------------------------------------------
export function Field({ label, icon, error, style, multiline, ...props }) {
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.fieldBox,
          multiline && styles.fieldBoxMultiline,
          error && { borderColor: colors.red },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.slate400} style={{ marginRight: 8 }} /> : null}
        <TextInput
          placeholderTextColor={colors.slate400}
          style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
          multiline={multiline}
          returnKeyType={multiline ? undefined : 'done'}
          inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
          {...props}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// --- Section header -----------------------------------------------------
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// --- Card ---------------------------------------------------------------
export function Card({ children, style, onPress }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={({ pressed } = {}) => [styles.card, pressed && { opacity: 0.95 }, style]}
    >
      {children}
    </Comp>
  );
}

// --- Stat chip ----------------------------------------------------------
export function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// --- Circular icon button ----------------------------------------------
export function IconButton({ name, onPress, size = 20, color = colors.navy, bg = colors.slate100, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

// --- Empty state --------------------------------------------------------
export function EmptyState({ icon = 'tennisball-outline', title, subtitle, action, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={32} color={colors.slate400} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action ? (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnBordered: { borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  btnGhost: { height: 44 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontFamily: fonts.bodySemiBold, fontSize: 16 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  verifyDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600, marginBottom: 6 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  fieldBoxMultiline: { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.md },
  fieldInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.navy, height: '100%' },
  fieldInputMultiline: { height: undefined, minHeight: 68, textAlignVertical: 'top' },
  fieldError: { fontFamily: fonts.body, fontSize: 12, color: colors.red, marginTop: 4 },

  doneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: colors.slate100,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate300,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  doneBarText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.blue },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy },
  sectionAction: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.blue },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.navy },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.slate500, marginTop: 2 },

  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, paddingTop: 48 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.navy, marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.slate500, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    marginTop: spacing.lg,
    backgroundColor: colors.blue,
    paddingHorizontal: 24,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
});

export default {
  AppButton,
  Tag,
  Avatar,
  Field,
  KeyboardDoneBar,
  SectionHeader,
  Card,
  Stat,
  IconButton,
  EmptyState,
};
