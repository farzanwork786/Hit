// Bottom tab navigation for the main app.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import FirstRunGuide from '../components/FirstRunGuide';
import BrowseScreen from '../screens/BrowseScreen';
import CourtBoardScreen from '../screens/CourtBoardScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import { TABS, TAB_BAR_HEIGHT, TAB_BAR_PADDING_TOP, TAB_BAR_PADDING_BOTTOM } from './tabs';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();

const SCREENS = {
  CourtBoard: CourtBoardScreen,
  Browse: BrowseScreen,
  Communities: CommunitiesScreen,
  Messages: MessagesScreen,
  MyProfile: MyProfileScreen,
};

export default function MainTabs() {
  return (
    <>
    <FirstRunGuide />
    <Tab.Navigator
      initialRouteName="CourtBoard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT,
          paddingTop: TAB_BAR_PADDING_TOP,
          paddingBottom: TAB_BAR_PADDING_BOTTOM,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => {
          const tab = TABS.find((t) => t.name === route.name);
          return <Ionicons name={focused ? tab.icon : tab.iconOutline} size={size} color={color} />;
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREENS[tab.name]}
          options={{ title: tab.title }}
        />
      ))}
    </Tab.Navigator>
    </>
  );
}
