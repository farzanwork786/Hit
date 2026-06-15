// Reusable active-location controls.
//
//  • LocationChip — compact chip showing the active location; tap to open the
//    picker. Used as a first-class control in the Browse filter panel.
//  • LocationPickerModal — bottom sheet to switch between saved locations,
//    detect the device location, or search any city/town inline.

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CityField from './CityField';
import { useLocation } from '../context/LocationContext';
import { colors, fonts, spacing, radius } from '../theme';

export function LocationChip({ onPress, style }) {
  const { activeLocation } = useLocation();
  return (
    <Pressable onPress={onPress} style={[styles.chip, style]} hitSlop={6}>
      <Ionicons name="location" size={14} color={colors.blue} />
      <Text style={styles.chipText} numberOfLines={1}>
        {activeLocation || 'Set location'}
      </Text>
      <Ionicons name="chevron-down" size={14} color={colors.slate400} />
    </Pressable>
  );
}

export function LocationPickerModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const {
    activeLocation,
    savedLocations,
    setActiveLocation,
    removeSavedLocation,
    detectDeviceLocation,
    detecting,
  } = useLocation();
  const [query, setQuery] = useState('');

  function choose(label) {
    setActiveLocation(label);
    setQuery('');
    onClose();
  }

  async function useDevice() {
    const label = await detectDeviceLocation();
    if (label) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Location</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.slate500} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Search any city */}
            <CityField
              label="Search a city or town"
              value={query}
              onChange={setQuery}
              onSelect={choose}
            />

            {/* Use device location */}
            <Pressable style={styles.deviceBtn} onPress={useDevice} disabled={detecting}>
              {detecting ? (
                <ActivityIndicator size="small" color={colors.blue} />
              ) : (
                <Ionicons name="navigate" size={18} color={colors.blue} />
              )}
              <Text style={styles.deviceText}>
                {detecting ? 'Finding you…' : 'Use my current location'}
              </Text>
            </Pressable>

            {/* Saved locations */}
            {savedLocations.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Saved locations</Text>
                {savedLocations.map((loc) => {
                  const active = loc === activeLocation;
                  return (
                    <Pressable
                      key={loc}
                      onPress={() => choose(loc)}
                      style={[styles.savedRow, active && styles.savedRowActive]}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={active ? colors.blue : colors.slate300}
                      />
                      <Text style={styles.savedText}>{loc}</Text>
                      {!active ? (
                        <Pressable onPress={() => removeSavedLocation(loc)} hitSlop={8}>
                          <Ionicons name="close-circle" size={18} color={colors.slate300} />
                        </Pressable>
                      ) : (
                        <Text style={styles.activeTag}>Active</Text>
                      )}
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.slate100,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.navy, flexShrink: 1 },

  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.slate300, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  deviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.blueTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  deviceText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.blue },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  savedRowActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  savedText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.navy },
  activeTag: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.blue },
});

export default { LocationChip, LocationPickerModal };
