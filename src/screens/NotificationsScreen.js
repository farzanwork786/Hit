// Notifications — a list of recent activity grouped by read/unread.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../components/ui';
import * as api from '../lib/api';
import { colors, fonts, spacing, radius } from '../theme';

const ICONS = {
  request: { name: 'tennisball', tone: colors.blue, bg: colors.blueTint },
  message: { name: 'chatbubble', tone: colors.green, bg: colors.greenLight },
  match: { name: 'checkmark-circle', tone: colors.green, bg: colors.greenLight },
  like: { name: 'heart', tone: colors.red, bg: colors.redLight },
  community: { name: 'people', tone: colors.blue, bg: colors.blueTint },
  system: { name: 'shield-checkmark', tone: colors.navy, bg: colors.slate100 },
};

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getNotifications();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    await api.markAllNotificationsRead();
  }

  async function markRead(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    await api.markNotificationRead(id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable hitSlop={8} onPress={markAllRead}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(n) => n.id}
        onRefresh={load}
        refreshing={false}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={async () => {
              markRead(item.id);
              if (item.type === 'message' && item.player) {
                const conv = await api.getOrCreateConversation(item.player.id);
                navigation.navigate('ChatDetail', { player: item.player, chatId: conv?.id || undefined, isRequest: !conv?.id });
              } else if (item.player) {
                navigation.navigate('PlayerProfile', { player: item.player });
              }
            }}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
            <EmptyState icon="notifications-outline" title="All caught up" subtitle="You have no new notifications." />
          )
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({ item, onPress }) {
  const cfg = ICONS[item.type] || ICONS.system;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, item.unread && styles.rowUnread, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.avatarWrap}>
        {item.player ? (
          <Image source={{ uri: item.player.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={cfg.name} size={22} color={cfg.tone} />
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.name} size={11} color={cfg.tone} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.text}>
          {item.player ? <Text style={styles.name}>{item.player.name} </Text> : null}
          {item.text}
        </Text>
        <Text style={styles.time}>{item.time} ago</Text>
      </View>

      {item.unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 48 },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.navy },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  markAll: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.blue },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs },
  rowUnread: { backgroundColor: colors.blueTint },
  avatarWrap: {},
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.slate200 },
  typeBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.slate700 },
  name: { fontFamily: fonts.bodySemiBold, color: colors.navy },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
});
