// Hit — tennis player matching app.
// Root component: loads fonts, wires up providers and the navigation tree.

import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { PushProvider } from './src/context/PushContext';
import { LocationProvider } from './src/context/LocationContext';
import { SportProvider } from './src/context/SportContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    // Hold on the native splash colour until fonts are ready.
    return <View style={{ flex: 1, backgroundColor: colors.navy }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <PushProvider>
          <LocationProvider>
            <SportProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </SportProvider>
          </LocationProvider>
          </PushProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
