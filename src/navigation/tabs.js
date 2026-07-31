// Single source of truth for the bottom tab bar.
//
// FirstRunGuide draws a spotlight on top of the real tab bar to show a new user
// exactly which button each step is talking about, so it has to agree with
// MainTabs precisely — same order, same icons, same geometry. Driving both off
// this one list means the highlight can never drift out of alignment.

import { Platform } from 'react-native';

export const TABS = [
  { name: 'CourtBoard', title: 'Court Board', icon: 'megaphone', iconOutline: 'megaphone-outline' },
  { name: 'Browse', title: 'Browse', icon: 'tennisball', iconOutline: 'tennisball-outline' },
  { name: 'Communities', title: 'Communities', icon: 'people', iconOutline: 'people-outline' },
  { name: 'Messages', title: 'Messages', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline' },
  { name: 'MyProfile', title: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;
export const TAB_BAR_PADDING_TOP = 8;
export const TAB_BAR_PADDING_BOTTOM = Platform.OS === 'ios' ? 28 : 10;

export function tabIndex(name) {
  return TABS.findIndex((t) => t.name === name);
}

export default { TABS, TAB_BAR_HEIGHT, TAB_BAR_PADDING_TOP, TAB_BAR_PADDING_BOTTOM, tabIndex };
