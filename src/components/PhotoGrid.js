// Editable photo grid (up to `max` photos).
//  • Tap the dashed "add" tile to pick one or more photos from the library.
//  • Long-press a photo, then drag it over another to reorder.
//  • Tap the trash badge to delete a photo.
// The first photo is the "Main" photo (used as the avatar fallback).
//
// Drag is implemented with the core Animated + PanResponder APIs (no extra
// native deps) so it runs in Expo Go. While a drag is active we ask the parent
// to disable its ScrollView via onDragStateChange so the gesture stays smooth.

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { pickImages } from '../lib/imagePicker';
import { colors, fonts, spacing, radius } from '../theme';

const { width } = Dimensions.get('window');
const COLS = 3;
const H_PADDING = spacing.xl; // matches Edit screen content padding
const GAP = spacing.sm;
const TILE = (width - H_PADDING * 2 - GAP * (COLS - 1)) / COLS;

export default function PhotoGrid({ photos = [], onChange, max = 6, onDragStateChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Tile centers in grid-local coordinates, keyed by index.
  const centers = useRef({});
  const longPressTimer = useRef(null);
  const dragState = useRef({ index: null, hover: null });

  function tileCenter(i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: col * (TILE + GAP) + TILE / 2,
      y: row * (TILE + GAP) + TILE / 2,
    };
  }

  function nearestIndex(px, py) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < photos.length; i += 1) {
      const c = centers.current[i] || tileCenter(i);
      const d = (c.x - px) ** 2 + (c.y - py) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  function startDrag(index) {
    dragState.current = { index, hover: index };
    setDragIndex(index);
    setHoverIndex(index);
    onDragStateChange?.(true);
  }

  function endDrag(commit) {
    const { index, hover } = dragState.current;
    if (commit && index != null && hover != null && index !== hover) {
      const next = [...photos];
      const [moved] = next.splice(index, 1);
      next.splice(hover, 0, moved);
      onChange?.(next);
    }
    dragState.current = { index: null, hover: null };
    setDragIndex(null);
    setHoverIndex(null);
    pan.setValue({ x: 0, y: 0 });
    onDragStateChange?.(false);
  }

  function makeResponder(index) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => dragState.current.index === index,
      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
        longPressTimer.current = setTimeout(() => startDrag(index), 180);
      },
      onPanResponderMove: (e, g) => {
        // If the finger moves meaningfully before the long-press fires, cancel
        // the timer so a quick swipe doesn't accidentally grab the tile.
        if (dragState.current.index == null) {
          if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) {
            clearTimeout(longPressTimer.current);
          }
          return;
        }
        pan.setValue({ x: g.dx, y: g.dy });
        const base = centers.current[index] || tileCenter(index);
        const hovered = nearestIndex(base.x + g.dx, base.y + g.dy);
        if (hovered !== dragState.current.hover) {
          dragState.current.hover = hovered;
          setHoverIndex(hovered);
        }
      },
      onPanResponderRelease: () => {
        clearTimeout(longPressTimer.current);
        if (dragState.current.index != null) endDrag(true);
      },
      onPanResponderTerminate: () => {
        clearTimeout(longPressTimer.current);
        if (dragState.current.index != null) endDrag(false);
      },
    });
  }

  async function addPhotos() {
    const remaining = max - photos.length;
    if (remaining <= 0) return;
    const picked = await pickImages(remaining);
    if (picked.length) onChange?.([...photos, ...picked].slice(0, max));
  }

  function removeAt(i) {
    onChange?.(photos.filter((_, idx) => idx !== i));
  }

  return (
    <View>
      <View style={styles.grid}>
        {photos.map((uri, i) => {
          const responder = makeResponder(i);
          const isDragging = dragIndex === i;
          const isHover = hoverIndex === i && dragIndex !== i;
          return (
            <Animated.View
              key={`${uri}-${i}`}
              onLayout={(e) => {
                const { x, y, width: w, height: h } = e.nativeEvent.layout;
                centers.current[i] = { x: x + w / 2, y: y + h / 2 };
              }}
              {...responder.panHandlers}
              style={[
                styles.tile,
                isHover && styles.tileHover,
                isDragging && {
                  zIndex: 20,
                  elevation: 8,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: 1.06 },
                  ],
                },
              ]}
            >
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
              {i === 0 ? (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              ) : null}
              <Pressable style={styles.trash} onPress={() => removeAt(i)} hitSlop={6}>
                <Ionicons name="trash" size={13} color={colors.white} />
              </Pressable>
            </Animated.View>
          );
        })}

        {photos.length < max ? (
          <Pressable style={styles.addTile} onPress={addPhotos}>
            <Ionicons name="add" size={26} color={colors.blue} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.hint}>
        {photos.length}/{max} photos · long-press and drag to reorder · the first is your main photo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
  },
  tileHover: { borderWidth: 2, borderColor: colors.blue },
  mainBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mainBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },
  trash: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.blue,
    borderStyle: 'dashed',
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.blue },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginTop: spacing.sm, lineHeight: 17 },
});
