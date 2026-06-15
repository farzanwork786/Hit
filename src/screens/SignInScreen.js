// Sign in — for returning users (or after confirming their email). New users go
// through the Get-started onboarding flow instead.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, Field, KeyboardDoneBar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing } from '../theme';

export default function SignInScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setSubmitting(true);
    const { error: e } = await signIn({ email: email.trim(), password });
    setSubmitting(false);
    if (e) setError(e.message);
    // On success the auth state change swaps to the main app automatically.
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.navy} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.lead}>Sign in to pick up where you left off.</Text>

          <Field
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton title="Sign in" onPress={submit} loading={submitting} style={{ marginTop: spacing.md }} />

          <Pressable onPress={() => navigation.navigate('AgeGate')} hitSlop={8} style={styles.altRow}>
            <Text style={styles.altText}>New to Hit? </Text>
            <Text style={styles.altLink}>Create an account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, height: 44 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  scroll: { padding: spacing.xl },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.navy },
  lead: { fontFamily: fonts.body, fontSize: 15, color: colors.slate500, marginBottom: spacing.xl, marginTop: spacing.xs },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginBottom: spacing.sm },
  altRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  altText: { fontFamily: fonts.body, fontSize: 14, color: colors.slate500 },
  altLink: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.blue },
});
