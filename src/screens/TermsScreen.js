// Terms of Service screen.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Last updated: June 14, 2026</Text>

        <S title="1. Acceptance">
          By creating an account or using the Hit app, you agree to these Terms of
          Service. If you do not agree, please do not use the app.
        </S>

        <S title="2. Eligibility">
          You must be at least 18 years old to use Hit. By creating an account, you
          confirm that you are 18 or older. Hit is not intended for and may not be used
          by anyone under 18.
        </S>

        <Alert icon="warning-outline">
          <B>Skill Level Disclaimer</B>
          {'\n'}Skill Levels displayed in Hit are{' '}
          <B>self-reported estimates entered by users for matchmaking convenience
          only</B>. They are not official ratings, are not submitted to or verified
          by any rating organisation, and should not be treated as such. Hit does
          not verify any skill level a user claims. Use them as a rough guide only.
        </Alert>

        <Alert icon="information-circle-outline" color={colors.slate600} bg={colors.slate100}>
          <B>No Affiliation with any Rating Body</B>
          {'\n'}Hit is an{' '}
          <B>independent application</B> and is{' '}
          <B>
            NOT affiliated with, endorsed by, sponsored by, or partnered with
          </B>{' '}
          any official rating organisation or governing body for tennis or
          pickleball. Skill Levels in Hit exist solely to help users communicate
          approximate ability to each other.
        </Alert>

        <S title="3. In-Person Meetups — Safety & Your Responsibility">
          Hit helps players connect online. Any decision to meet another player in
          person is entirely your own. By using Hit you acknowledge that:{'\n\n'}
          • You arrange and attend in-person matches at{' '}
          <B>your own risk</B>.{'\n'}
          • Hit is{' '}
          <B>
            not responsible for any injuries, property damage, disputes, or other
            harm
          </B>{' '}
          arising from interactions arranged through the app.{'\n'}
          • You are responsible for your own safety. Never share your home address,
          financial details, or other sensitive personal information with other
          users.{'\n'}
          • Hit does not conduct background checks on users.
        </S>

        <S title="4. Your Account">
          You are responsible for maintaining the security of your account and all
          activity that occurs under it. You must provide accurate information during
          registration and keep it up to date. You may not use another person's account
          or share your login credentials with anyone.
        </S>

        <S title="5. User Conduct">
          You agree not to:{'\n\n'}
          • Impersonate another person or provide false information.{'\n'}
          • Harass, threaten, intimidate, or harm other users.{'\n'}
          • Post illegal, offensive, obscene, or misleading content.{'\n'}
          • Use Hit for commercial solicitation, spam, or promotion of external
          services.{'\n'}
          • Attempt to access, interfere with, or compromise other users' accounts or
          the app's infrastructure.
        </S>

        <S title="6. Account Termination">
          We reserve the right to suspend or permanently terminate any account that
          violates these Terms, engages in harmful behaviour, or for any other reason at
          our sole discretion, with or without notice. You may delete your account at
          any time from Settings → Account actions → Delete account.
        </S>

        <S title="7. Intellectual Property">
          All content, design, and code within the Hit app is owned by Hit and
          protected by applicable intellectual property laws. You may not copy,
          redistribute, or create derivative works from any part of the app without
          written permission.
        </S>

        <S title="8. Limitation of Liability">
          To the maximum extent permitted by applicable law, Hit, its creators, and
          operators are{' '}
          <B>not liable for any indirect, incidental, special, or consequential
          damages</B>{' '}
          arising from your use of, or inability to use, the app — including damages for
          personal injury sustained at in-person matches arranged through Hit. The app
          is provided{' '}
          <B>"as is"</B> without warranty of any kind, express or implied.
        </S>

        <S title="9. Governing Law">
          These Terms are governed by the laws of the State of Delaware, USA, without
          regard to its conflict of law principles. Any disputes arising under these
          Terms shall be resolved exclusively in the state or federal courts located in
          Delaware.
        </S>

        <S title="10. Changes to These Terms">
          We may update these Terms from time to time. We will indicate the revision
          date at the top of this page. Your continued use of Hit after any changes
          constitutes your acceptance of the updated Terms.
        </S>

        <S title="11. Contact">
          Questions about these Terms? Contact us at:{'\n'}
          <B>farzanwork786@gmail.com</B>
        </S>
      </ScrollView>
    </SafeAreaView>
  );
}

function S({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.secTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

function Alert({ icon, children, color = colors.red, bg = '#FEF2F2' }) {
  return (
    <View style={[styles.alert, { backgroundColor: bg, borderColor: color + '33' }]}>
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
      <Text style={[styles.alertText, { color: colors.slate700 }]}>{children}</Text>
    </View>
  );
}

function B({ children }) {
  return <Text style={styles.bold}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  updated: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  secTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy, marginBottom: 6 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.slate600 },
  bold: { fontFamily: fonts.bodyBold, color: colors.slate800 },
  alert: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
  },
  alertText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 21 },
});
