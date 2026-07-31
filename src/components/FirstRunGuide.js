// One-time orientation for a brand-new user.
//
// The most common first-session failure is landing in the app and not knowing
// what any of it is for, so this names each tab in one line and gets out of the
// way. Shown once, skippable at any point, never again after that.

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, radius, shadow } from '../theme';

const STORAGE_KEY = 'hit.firstRunGuide.v1';

const STEPS = [
  {
    icon: 'megaphone',
    title: 'Court Board',
    body: "Sessions happening near you. Tap I'm in to join one, or post your own when you're looking to play.",
  },
  {
    icon: 'tennisball',
    title: 'Browse',
    body: 'Find players around your level nearby. Open a profile to ask them to hit.',
  },
  {
    icon: 'chatbubbles',
    title: 'Messages',
    body: 'Everything you arrange lands here — who replied, what time, and where.',
  },
];

export default function FirstRunGuide({ enabled = true }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && !seen) setVisible(true);
      } catch (e) {
        // If storage is unreadable, just don't show it — never block the app.
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled]);

  async function dismiss() {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // Worst case it shows once more; not worth surfacing.
    }
  }

  if (!visible) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { marginBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={26} color={colors.blue} />
          </View>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Pressable
            style={styles.next}
            onPress={() => (last ? dismiss() : setStep((v) => v + 1))}
          >
            <Text style={styles.nextText}>{last ? "Got it" : 'Next'}</Text>
          </Pressable>
          {!last ? (
            <Pressable onPress={dismiss} hitSlop={8}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.navy, marginBottom: 6 },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate600,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.slate200 },
  dotActive: { backgroundColor: colors.blue, width: 20 },
  next: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  skip: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate400, marginTop: spacing.md },
});
