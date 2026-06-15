// Bottom tab navigation for the main app.
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import BrowseScreen from '../screens/BrowseScreen';
import CourtBoardScreen from '../screens/CourtBoardScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS = {
  Browse: ['tennisball', 'tennisball-outline'],
  CourtBoard: ['megaphone', 'megaphone-outline'],
  Communities: ['people', 'people-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
  MyProfile: ['person', 'person-outline'],
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Browse" component={BrowseScreen} options={{ title: 'Browse' }} />
      <Tab.Screen name="CourtBoard" component={CourtBoardScreen} options={{ title: 'Court Board' }} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} options={{ title: 'Communities' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
      <Tab.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
