// Splash / welcome screen — branded intro with a "Get started" CTA.
import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppButton } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

const { height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1000&q=80' }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(15,23,42,0.35)', 'rgba(15,23,42,0.85)', '#0F172A']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="tennisball" size={20} color={colors.navy} />
          </View>
          <Text style={styles.brand}>Hit</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Find your{'\n'}next hit.</Text>
          <Text style={styles.subtitle}>
            Connect with tennis and pickleball players near you by skill, style and schedule.
            Find players, play more, level up.
          </Text>
        </View>

        <View style={styles.footer}>
          <AppButton title="Get started" icon="arrow-forward" onPress={() => navigation.navigate('AgeGate')} />
          <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={8} style={styles.signInRow}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  safe: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.white },
  hero: { marginBottom: height * 0.04 },
  title: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: colors.white },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.md,
    maxWidth: 320,
  },
  footer: { marginBottom: spacing.lg },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  signInText: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  signInLink: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
  legal: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
