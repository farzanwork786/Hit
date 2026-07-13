// Privacy Policy screen.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Last updated: June 14, 2026</Text>

        <Text style={styles.lead}>
          Hit ("we", "our", or "us") is committed to protecting your privacy. This
          policy explains what information we collect, how we use it, and your choices.
        </Text>

        <S title="1. Information We Collect">
          <B>Account information</B> — name, email address, date of birth (age
          verified at sign-up), profile photos, bio, and password.{'\n\n'}
          <B>Sports & skill data</B> — the sports you play and self-reported skill
          estimates you enter. These are not verified or shared with any rating
          organisation.{'\n\n'}
          <B>Location</B> — your chosen home city. We use this to show nearby players.
          We do not collect or store GPS coordinates.{'\n\n'}
          <B>Usage data</B> — features used, screens visited, and in-app interactions,
          used to improve the app.{'\n\n'}
          <B>Device data</B> — device type, OS version, and push notification token
          (only if you grant notification permission).{'\n\n'}
          In{' '}
          <B>demo mode</B>, all data is stored locally on your device only and is not
          transmitted to any server.
        </S>

        <S title="2. How We Use Your Data">
          We use your information to:{'\n\n'}
          • Connect you with nearby players and communities.{'\n'}
          • Facilitate messaging between connected players.{'\n'}
          • Send push notifications you have opted in to receive.{'\n'}
          • Improve app features, fix bugs, and understand usage patterns.{'\n'}
          • Comply with legal obligations and enforce our Terms of Service.{'\n\n'}
          <B>We do not sell your personal data to third parties.</B>
        </S>

        <S title="3. Skill Levels Are Self-Reported">
          Skill Levels you enter are visible to other users for matchmaking purposes
          only. They are self-reported, not validated by any rating body, and are
          not shared with any rating organisation.
        </S>

        <S title="4. What We Share">
          Your public profile — name, photos, bio, approximate location, sport and
          skill level — is visible to other Hit users, subject to your Privacy settings.
          We do not share your personal data with third parties for advertising or
          marketing purposes.{'\n\n'}
          We may share data if required by law or to protect the safety of our users.
        </S>

        <S title="5. Location & Distance">
          Distance shown to other users is based on your chosen home city, not live GPS.
          Your exact address is never shown to other users or stored by Hit.
        </S>

        <S title="6. Your Rights & Choices">
          You can at any time:{'\n\n'}
          • Edit your profile information from My Profile → Edit.{'\n'}
          • Control who can see your profile, friends list, and communities from
          Settings → Privacy.{'\n'}
          • Turn off push notifications from Settings → Notifications.{'\n'}
          • Delete your account and all associated data from Settings → Account actions
          → Delete account.{'\n\n'}
          Deleting your account removes your profile, photos, messages, and connections
          permanently from our servers.
        </S>

        <S title="7. Data Retention">
          We retain your account data for as long as your account is active. When you
          delete your account, we delete or anonymise your personal data within 30 days,
          except where retention is required by law.
        </S>

        <S title="8. Security">
          We use industry-standard measures (encryption in transit, hashed passwords) to
          protect your data. However, no transmission over the internet is 100% secure.
          Use a strong, unique password and do not share your login credentials.
        </S>

        <S title="9. Children">
          Hit is intended for users 18 and older. We do not knowingly collect personal
          information from anyone under 18. If you believe a minor has created an
          account, contact us and we will remove it promptly.
        </S>

        <S title="10. Third-Party Services">
          Hit uses third-party services including Supabase (database and
          authentication) and Expo (push notifications). These services have their own
          privacy policies. We recommend reviewing them if you have concerns.
        </S>

        <S title="11. Changes to This Policy">
          We may update this Privacy Policy from time to time and will update the "Last
          updated" date at the top. Your continued use of Hit after changes constitutes
          acceptance of the updated policy.
        </S>

        <S title="12. Contact">
          Questions or requests about your data? Reach us at:{'\n'}
          <B>privacy@hit.app</B>
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
  updated: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginBottom: spacing.sm },
  lead: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate600,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.blueTint,
    borderRadius: radius.md,
  },
  section: { marginBottom: spacing.xl },
  secTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy, marginBottom: 6 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.slate600 },
  bold: { fontFamily: fonts.bodyBold, color: colors.slate800 },
});
