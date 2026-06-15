// City/location input with live autocomplete. Uses Google Places when an API
// key is configured, otherwise a large offline list (see lib/places.js).
// Prevents spelling errors so same-city players actually connect.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Field } from './ui';
import { searchPlaces } from '../lib/places';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function CityField({ value, onChange, onSelect, label = 'City', error, style, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  // Debounced async search whenever the typed value changes.
  useEffect(() => {
    if (picked || !focused) {
      setResults([]);
      return;
    }
    const q = (value || '').trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort?.();
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      abortRef.current = controller;
      try {
        const r = await searchPlaces(q, { signal: controller?.signal });
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [value, focused, picked]);

  const open = focused && !picked && (loading || results.length > 0);

  return (
    <View style={[{ zIndex: 10 }, style]}>
      <Field
        label={label}
        icon="location-outline"
        placeholder="Start typing your city…"
        value={value}
        onChangeText={(t) => {
          setPicked(false);
          onChange(t);
        }}
        onFocus={() => setFocused(true)}
        // Delay so a tap on a suggestion lands before the dropdown hides.
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        autoCorrect={false}
        autoFocus={autoFocus}
        error={error}
        style={open ? { marginBottom: 0 } : null}
      />
      {open ? (
        <View style={styles.dropdown}>
          {loading && results.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          ) : (
            results.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  setPicked(true);
                  setResults([]);
                  onChange(r.label);
                  onSelect?.(r.label);
                }}
                style={({ pressed }) => [
                  styles.item,
                  i < results.length - 1 && styles.itemDivider,
                  pressed && { backgroundColor: colors.slate100 },
                ]}
              >
                <Ionicons name="location" size={14} color={colors.blue} />
                <Text style={styles.itemText}>{r.label}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.slate400 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  itemText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.navy },
});
