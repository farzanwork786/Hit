// Top-level navigation. Decides between the onboarding flow and the main app
// based on auth + onboarding state from AuthContext.

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import SignInScreen from '../screens/SignInScreen';
import AgeGateScreen from '../screens/AgeGateScreen';
import AccountTypeScreen from '../screens/AccountTypeScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import MainTabs from './MainTabs';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import CommunityDetailScreen from '../screens/CommunityDetailScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.blue },
};

export default function RootNavigator() {
  const { isAuthenticated, onboarding, initializing } = useAuth();

  // While restoring the persisted Supabase session, hold on a branded spinner
  // so returning users don't briefly flash the Splash screen.
  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  // Determine the starting onboarding screen.
  let onboardingInitial = 'Splash';
  if (onboarding.ageVerified && !onboarding.accountType) onboardingInitial = 'AccountType';
  else if (onboarding.ageVerified && onboarding.accountType) onboardingInitial = 'Registration';

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {!isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="AgeGate" component={AgeGateScreen} />
            <Stack.Screen name="AccountType" component={AccountTypeScreen} />
            <Stack.Screen name="Registration" component={RegistrationScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="PlayerProfile"
              component={PlayerProfileScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="CommunityDetail"
              component={CommunityDetailScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
