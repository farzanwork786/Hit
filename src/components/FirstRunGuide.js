// One-time orientation for a brand-new user.
//
// The most common first-session failure is landing in the app and not knowing
// where to click, so this doesn't just name each tab — it lights up the real
// button at the bottom of the screen and points at it while it explains what
// that button is for. Every step is framed around the one thing the app is for:
// getting a hit on the calendar.
//
// The last step asks the user to invite the people they already play with.
// Onboarding is when hopes are highest, and Hit only beats a group text once
// the regulars are on it.
//
// Shown once, skippable at any point, never again after that.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Animated, Easing, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { APP_STORE_URL, withAppLink } from '../lib/appLinks';
import {
  TABS,
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING_TOP,
  TAB_BAR_PADDING_BOTTOM,
  tabIndex,
} from '../navigation/tabs';
import { colors, fonts, spacing, radius, shadow } from '../theme';

// Bumped when the guide's content changes, so existing testers see the new one.
const STORAGE_KEY = 'hit.firstRunGuide.v2';

const CARET_ROW_HEIGHT = 30;

const INVITE_MESSAGE =
  "I'm using Hit to line up tennis and pickleball — post when you're free, or ask someone " +
  'straight from their profile. Get on it so we can stop planning over text.';

const STEPS = [
  {
    tab: 'CourtBoard',
    title: 'Start here',
    body: "People near you post when they're looking to play. Tap I'm in on one and you're on the list — no back-and-forth needed.",
  },
  {
    tab: 'Browse',
    title: 'Or pick a player',
    body: 'Find people around your level nearby. Open a profile and tap Ask to Hit to propose a day.',
  },
  {
    tab: 'Messages',
    title: 'Your hits land here',
    body: 'Once someone agrees, the day, time and court show up here — and you can change or cancel from the same place.',
  },
  {
    invite: true,
    icon: 'person-add',
    title: 'Bring your regulars',
    body: 'Hit works best with the people you already play with. Invite a few now and your next hit is one tap instead of a group text.',
  },
];

// A downward caret that bobs over the tab the current step is describing.
function Caret() {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Ionicons name="caret-down" size={22} color={colors.blue} />
    </Animated.View>
  );
}

export default function FirstRunGuide({ enabled = true }) {
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

  async function invite() {
    try {
      await Share.share({ message: withAppLink(INVITE_MESSAGE), url: APP_STORE_URL });
    } catch (e) {
      // User dismissed the share sheet, or it failed to open. Either way the
      // guide is done — don't trap them behind a broken share.
    }
    dismiss();
  }

  if (!visible) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const highlight = s.tab ? tabIndex(s.tab) : -1;
  const highlighted = highlight >= 0 ? TABS[highlight] : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={highlighted ? highlighted.icon : s.icon} size={26} color={colors.blue} />
          </View>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
          {highlighted ? (
            <Text style={styles.where}>
              It's the <Text style={styles.whereName}>{highlighted.title}</Text> tab below
            </Text>
          ) : null}

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          {s.invite ? (
            <>
              <Pressable style={styles.next} onPress={invite}>
                <Ionicons name="share-outline" size={18} color={colors.white} />
                <Text style={styles.nextText}>Invite friends</Text>
              </Pressable>
              <Pressable onPress={dismiss} hitSlop={8}>
                <Text style={styles.skip}>Maybe later</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.next} onPress={() => setStep((v) => v + 1)}>
                <Text style={styles.nextText}>Next</Text>
              </Pressable>
              <Pressable onPress={dismiss} hitSlop={8}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Caret and spotlight sit in flex rows matching the real tab bar's five
            equal slots, so the highlight lands on the button no matter the
            screen width. Both rows always render to keep the card from jumping
            between steps; they're just empty when a step names no tab. */}
        <View style={styles.caretRow} pointerEvents="none">
          {TABS.map((t, i) => (
            <View key={t.name} style={styles.slot}>
              {i === highlight ? <Caret /> : null}
            </View>
          ))}
        </View>

        <View style={styles.spotlightRow} pointerEvents="none">
          {TABS.map((t, i) => (
            <View key={t.name} style={styles.slot}>
              {i === highlight ? (
                <View style={styles.spotlight}>
                  <Ionicons name={t.icon} size={24} color={colors.blue} />
                  <Text style={styles.spotlightLabel} numberOfLines={1}>
                    {t.title}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
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
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
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
  where: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  whereName: { fontFamily: fonts.bodyBold, color: colors.blue },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.slate200 },
  dotActive: { backgroundColor: colors.blue, width: 20 },
  next: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  skip: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate400, marginTop: spacing.md },

  caretRow: { flexDirection: 'row', height: CARET_ROW_HEIGHT, alignItems: 'flex-end' },
  spotlightRow: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: TAB_BAR_PADDING_BOTTOM,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spotlight: {
    flex: 1,
    alignSelf: 'stretch',
    marginHorizontal: 3,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    ...shadow.card,
  },
  spotlightLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.blue,
    marginTop: 2,
  },
});
