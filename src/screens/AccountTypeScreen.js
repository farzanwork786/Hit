// Account type — personal player profile or a community/club page. Hit is
// 18+ only (enforced by the age gate before this screen).
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const OPTIONS = [
  {
    key: 'self',
    icon: 'person-circle-outline',
    title: 'For myself',
    desc: 'Create your own player profile and start connecting with players near you.',
  },
  {
    key: 'community',
    icon: 'business-outline',
    title: 'Community or club',
    desc: 'A page for your club, park or group. Post announcements, pin them to your board, and grow your member base.',
  },
];

export default function AccountTypeScreen({ navigation }) {
  const { setAccountType } = useAuth();
  const [selected, setSelected] = useState('self');

  function handleContinue() {
    setAccountType(selected);
    navigation.navigate('Registration');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.backBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Who is this{'\n'}account for?</Text>
        <Text style={styles.subtitle}>Set up a player profile, or a page for your club or group.</Text>

        <View style={{ marginTop: spacing.xl }}>
          {OPTIONS.map((o) => {
            const active = selected === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => setSelected(o.key)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={[styles.optIcon, active && { backgroundColor: colors.blue }]}>
                  <Ionicons name={o.icon} size={26} color={active ? colors.white : colors.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{o.title}</Text>
                  <Text style={styles.optDesc}>{o.desc}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  backBar: { height: 44, justifyContent: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  body: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.slate500, marginTop: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  optionActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  optIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.navy },
  optDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate500, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  footer: { paddingBottom: spacing.lg },
});
