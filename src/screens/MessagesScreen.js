// Messages — two tabs: Chats (active conversations) and Requests (pending).
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../components/ui';
import { RatingSummary } from '../components/SportIcon';
import SportToggle from '../components/SportToggle';
import { isBlocked } from '../lib/mockData';
import * as api from '../lib/api';
import { notifyMatchAccepted } from '../lib/notifications';
import { useSport } from '../context/SportContext';
import { colors, fonts, spacing, radius } from '../theme';

export default function MessagesScreen({ navigation }) {
  const { sport } = useSport();
  const [tab, setTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r] = await Promise.all([api.getConversations(), api.getIncomingRequests()]);
    setChats(c);
    setPendingRequests(r);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function acceptRequest(request) {
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    notifyMatchAccepted(request.player);
    await api.acceptRequest(request.id);
    const conv = await api.getOrCreateConversation(request.player.id, request.sport || sport);
    navigation.navigate('ChatDetail', {
      player: request.player,
      chatId: conv?.id || undefined,
      isRequest: !conv?.id,
      sport: request.sport || sport,
    });
  }

  async function declineRequest(request) {
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    await api.declineRequest(request.id);
  }

  // Untagged threads/requests (sport === null) show under both sports.
  const matchesSport = (item) => !item.sport || item.sport === sport;
  const visibleRequests = pendingRequests.filter(
    (r) => r.player && !isBlocked(r.player.id) && matchesSport(r)
  );

  // Someone with a still-pending request to you belongs in Requests only — not
  // in both tabs at once. Once you accept or reply, the request is no longer
  // pending and their thread appears here.
  const pendingFromIds = new Set(
    pendingRequests.filter((r) => r.player).map((r) => r.player.id)
  );
  const visibleChats = chats.filter(
    (c) =>
      c.player &&
      !isBlocked(c.player.id) &&
      matchesSport(c) &&
      !pendingFromIds.has(c.player.id)
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <View style={styles.toggleRow}>
        <SportToggle />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TabButton
          label="Chats"
          count={visibleChats.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0)}
          active={tab === 'chats'}
          onPress={() => setTab('chats')}
        />
        <TabButton
          label="Requests"
          count={visibleRequests.length}
          active={tab === 'requests'}
          onPress={() => setTab('requests')}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : tab === 'chats' ? (
        <FlatList
          data={visibleChats}
          keyExtractor={(c) => c.id}
          onRefresh={load}
          refreshing={false}
          renderItem={({ item }) => (
            <ChatRow chat={item} onPress={() => navigation.navigate('ChatDetail', { player: item.player, chatId: item.id, sport: item.sport })} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No chats yet" subtitle="Start a conversation from a player's profile." />}
        />
      ) : (
        <FlatList
          data={visibleRequests}
          keyExtractor={(r) => r.id}
          onRefresh={load}
          refreshing={false}
          renderItem={({ item }) => (
            <RequestRow
              request={item}
              onPress={() => navigation.navigate('PlayerProfile', { player: item.player })}
              onAccept={() => acceptRequest(item)}
              onDecline={() => declineRequest(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="mail-outline" title="No requests" subtitle="New play requests will show up here." />}
        />
      )}
    </SafeAreaView>
  );
}

function TabButton({ label, count, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && { color: colors.navy }]}>{label}</Text>
      {count > 0 ? (
        <View style={[styles.tabBadge, active && { backgroundColor: colors.blue }]}>
          <Text style={styles.tabBadgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ChatRow({ chat, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.slate100 }]}>
      <View>
        <Image source={{ uri: chat.player.avatar }} style={styles.avatar} contentFit="cover" />
        {chat.unread > 0 ? <View style={styles.onlineDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName}>{chat.player.name}</Text>
          <Text style={styles.rowTime}>{chat.time}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text numberOfLines={1} style={[styles.rowMsg, chat.unread > 0 && { color: colors.navy, fontFamily: fonts.bodyMedium }]}>
            {chat.lastMessage}
          </Text>
          {chat.unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function RequestRow({ request, onPress, onAccept, onDecline }) {
  return (
    <View style={styles.requestCard}>
      <Pressable onPress={onPress} style={styles.requestHead}>
        <Image source={{ uri: request.player.avatar }} style={styles.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{request.player.name}</Text>
          <View style={styles.requestMetaRow}>
            <RatingSummary player={request.player} size={12} color={colors.slate400} />
            <Text style={styles.requestMeta}>· {request.time} ago</Text>
          </View>
        </View>
      </Pressable>
      <Text style={styles.requestMsg}>{request.message}</Text>
      <View style={styles.requestActions}>
        <Pressable style={[styles.reqBtn, styles.declineBtn]} onPress={onDecline}>
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
        <Pressable style={[styles.reqBtn, styles.acceptBtn]} onPress={onAccept}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
          <Text style={styles.acceptText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.navy },
  toggleRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.slate100,
  },
  tabActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.slate500 },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.slate400, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.sm, borderRadius: radius.md },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.slate200 },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.navy },
  rowTime: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  rowMsg: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.slate500, marginRight: 8 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  requestMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.slate400 },
  requestMsg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.slate700, marginTop: spacing.md },
  requestActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  reqBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.md },
  declineBtn: { backgroundColor: colors.slate100 },
  declineText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.slate600 },
  acceptBtn: { backgroundColor: colors.blue },
  acceptText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
});
