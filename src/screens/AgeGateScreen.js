// Age gate — user must confirm they are 18+ before continuing.
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, KeyboardDoneBar, DONE_BAR_ID } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

export default function AgeGateScreen({ navigation }) {
  const { verifyAge } = useAuth();
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  function computeAge() {
    const { d, m, y } = dob;
    if (!d || !m || !y || y.length < 4) return null;
    const birth = new Date(Number(y), Number(m) - 1, Number(d));
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const mm = now.getMonth() - birth.getMonth();
    if (mm < 0 || (mm === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }

  const age = computeAge();
  const isAdult = age !== null && age >= 18 && age < 120;
  const tooYoung = age !== null && age < 18;

  function handleContinue() {
    verifyAge();
    navigation.navigate('AccountType');
  }

  // Auto-advance DD → MM → YYYY, and dismiss the keyboard once the full
  // date has been entered.
  function setPart(part, value, nextRef) {
    const next = { ...dob, [part]: value };
    setDob(next);
    if (next.d.length === 2 && next.m.length === 2 && next.y.length === 4) {
      Keyboard.dismiss();
      return;
    }
    const filled = part === 'y' ? value.length === 4 : value.length === 2;
    if (filled && nextRef) nextRef.current?.focus();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BackBar onBack={() => navigation.goBack()} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.blue} />
          </View>
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.subtitle}>
            Hit is for adults only. You must be 18 or older to create an account.
          </Text>

          <View style={styles.dobRow}>
            <DobBox label="DD" value={dob.d} max={2} inputRef={dayRef} onChange={(v) => setPart('d', v, monthRef)} />
            <DobBox label="MM" value={dob.m} max={2} inputRef={monthRef} onChange={(v) => setPart('m', v, yearRef)} />
            <DobBox label="YYYY" value={dob.y} max={4} flex={1.4} inputRef={yearRef} onChange={(v) => setPart('y', v, null)} />
          </View>

          {tooYoung ? (
            <View style={styles.warn}>
              <Ionicons name="alert-circle" size={16} color={colors.red} />
              <Text style={styles.warnText}>You must be at least 18 to use Hit.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <AppButton title="Continue" onPress={handleContinue} disabled={!isAdult} />
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

function DobBox({ label, value, onChange, max, flex = 1, inputRef }) {
  return (
    <View style={[styles.dobBox, { flex }]}>
      <Text style={styles.dobLabel}>{label}</Text>
      <View style={styles.dobInputWrap}>
        <TextInputNumeric inputRef={inputRef} value={value} onChange={onChange} max={max} placeholder={label} />
      </View>
    </View>
  );
}

// Tiny numeric input wrapper kept local to this screen.
function TextInputNumeric({ value, onChange, max, placeholder, inputRef }) {
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, max))}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.slate400}
      style={styles.dobInput}
      maxLength={max}
      inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
    />
  );
}

function BackBar({ onBack }) {
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.navy} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  backBar: { height: 44, justifyContent: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  body: { flexGrow: 1, marginTop: spacing.xl, paddingBottom: spacing.lg },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate500, marginTop: spacing.sm },
  dobRow: { flexDirection: 'row', marginTop: spacing.xxl, gap: spacing.md },
  dobBox: {},
  dobLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate500, marginBottom: 6 },
  dobInputWrap: {},
  dobInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.navy,
  },
  warn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: 6 },
  warnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red },
  footer: { paddingBottom: spacing.lg },
});
