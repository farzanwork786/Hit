// Chat detail — message thread with a composer. Uses Supabase realtime when
// configured; otherwise works against local mock messages.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../lib/api';
import { notifyMessage } from '../lib/notifications';
import { KeyboardDoneBar, DONE_BAR_ID } from '../components/ui';
import { RatingSummary } from '../components/SportIcon';
import { colors, fonts, spacing, radius } from '../theme';

export default function ChatDetailScreen({ route, navigation }) {
  const { player, chatId: initialChatId, isRequest } = route.params;
  const [chatId, setChatId] = useState(initialChatId || null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialChatId));
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const myUidRef = useRef(null);

  // Resolve the signed-in user's id once so realtime inserts can be attributed
  // to the correct side (mine = right, theirs = left).
  useEffect(() => {
    let active = true;
    api.getCurrentUserId().then((uid) => {
      if (active) myUidRef.current = uid;
    });
    return () => {
      active = false;
    };
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportStep, setReportStep] = useState(0); // 0=main, 1=reasons, 2=done

  const [reportReason, setReportReason] = useState(null);

  function openMenu() { setReportStep(0); setReportReason(null); setMenuOpen(true); }
  function closeMenu() { setMenuOpen(false); setReportStep(0); setReportReason(null); }

  function handleBlock() {
    setMenuOpen(false);
    const firstName = player.name.split(' ')[0];
    Alert.alert(
      `Block ${firstName}?`,
      "They won't be able to see your profile and won't appear in Browse or Requests.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => { await api.blockUser(player.id); navigation.goBack(); },
        },
      ]
    );
  }

  function handleShare() {
    closeMenu();
    Share.share({
      message: `Check out ${player.name}'s profile on Hit`,
      title: `${player.name} on Hit`,
    });
  }

  function submitReport() {
    if (!reportReason) return;
    setReportStep(2);
    setTimeout(closeMenu, 2000);
  }

  // Load history + subscribe to realtime inserts for this conversation.
  useEffect(() => {
    let active = true;
    if (!chatId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const data = await api.getMessages(chatId);
      if (active) {
        setMessages(data);
        setLoading(false);
      }
      api.markConversationRead(chatId);
    })();

    const unsub = api.subscribeMessages(chatId, (m) => {
      setMessages((prev) => {
        // Already have this exact server row → ignore.
        if (prev.some((x) => x.id === m.id)) return prev;

        const mine = myUidRef.current != null && m.sender_id === myUidRef.current;

        // Our own message echoes back over realtime. Reconcile it with the
        // optimistic bubble (replace the pending local-id row in place) instead
        // of appending a duplicate on the wrong side.
        if (mine) {
          const idx = prev.findIndex((x) => x.pending && x.text === m.body);
          if (idx !== -1) {
            const copy = prev.slice();
            copy[idx] = { id: m.id, text: m.body, fromMe: true, time: formatTime(m.created_at) };
            return copy;
          }
        }

        return [...prev, { id: m.id, text: m.body, fromMe: mine, time: formatTime(m.created_at) }];
      });
      api.markConversationRead(chatId);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [chatId]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    const optimistic = {
      id: `local-${Date.now()}`,
      text: body,
      fromMe: true,
      pending: true, // marks it for reconciliation with the realtime echo
      time: formatTime(new Date().toISOString()),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');

    // Notify recipient (demo: local notification; backend: routed via trigger).
    notifyMessage(player, body);

    // Lazily create the conversation when replying to a brand-new request.
    let cid = chatId;
    if (!cid) {
      const conv = await api.getOrCreateConversation(player.id);
      if (conv?.id) {
        cid = conv.id;
        setChatId(cid);
      }
    }
    if (cid) await api.sendMessage(cid, body);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.navy} />
          </Pressable>
          <Pressable
            style={styles.headerCenter}
            onPress={() => navigation.navigate('PlayerProfile', { player })}
          >
            <Image source={{ uri: player.avatar }} style={styles.headerAvatar} contentFit="cover" />
            <View>
              <Text style={styles.headerName}>{player.name}</Text>
              <RatingSummary player={player} size={11} />
            </View>
          </Pressable>
          <Pressable hitSlop={8} onPress={openMenu}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.navy} />
          </Pressable>
        </View>

        {isRequest ? (
          <View style={styles.requestBanner}>
            <Ionicons name="tennisball" size={16} color={colors.blue} />
            <Text style={styles.requestBannerText}>
              Send {player.name} a message to start your match request.
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyChat}>
                <ActivityIndicator color={colors.blue} />
              </View>
            ) : (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Say hi! 👋</Text>
              </View>
            )
          }
        />

        {/* Composer */}
        <View style={styles.composer}>
          <Pressable style={styles.attachBtn}>
            <Ionicons name="add" size={24} color={colors.slate500} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={colors.slate400}
            style={styles.input}
            multiline
            inputAccessoryViewID={Platform.OS === 'ios' ? DONE_BAR_ID : undefined}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            hitSlop={6}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.blue : colors.slate300 }]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />

      {/* ⋯ Options sheet */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={sheet.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
          <View style={sheet.card}>
            <View style={sheet.handle} />

            {reportStep === 0 ? (
              <>
                <Text style={sheet.subjectName} numberOfLines={1}>{player.name}</Text>
                <ChatSheetRow icon="person-outline" label="View profile" onPress={() => { closeMenu(); navigation.navigate('PlayerProfile', { player }); }} />
                <ChatSheetRow icon="flag-outline" label="Report player" onPress={() => setReportStep(1)} />
                <ChatSheetRow icon="ban-outline" label="Block player" onPress={handleBlock} destructive />
                <ChatSheetRow icon="share-social-outline" label="Share profile" onPress={handleShare} />
                <View style={sheet.sep} />
                <ChatSheetRow icon="close-outline" label="Cancel" onPress={closeMenu} />
              </>
            ) : reportStep === 1 ? (
              <>
                <Pressable onPress={() => setReportStep(0)} style={sheet.back}>
                  <Ionicons name="chevron-back" size={18} color={colors.navy} />
                  <Text style={sheet.backLabel}>Report player</Text>
                </Pressable>
                <Text style={sheet.reasonPrompt}>What's the issue?</Text>
                {CHAT_REPORT_REASONS.map((r) => (
                  <Pressable key={r} onPress={() => setReportReason(r)} style={sheet.reasonRow}>
                    <Text style={[sheet.reasonText, reportReason === r && sheet.reasonActive]}>{r}</Text>
                    {reportReason === r ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.blue} />
                    ) : (
                      <View style={sheet.circle} />
                    )}
                  </Pressable>
                ))}
                <Pressable
                  onPress={submitReport}
                  disabled={!reportReason}
                  style={[sheet.submitBtn, !reportReason && sheet.submitDisabled]}
                >
                  <Text style={sheet.submitText}>Submit report</Text>
                </Pressable>
              </>
            ) : (
              <View style={sheet.doneWrap}>
                <Ionicons name="checkmark-circle" size={52} color={colors.green} />
                <Text style={sheet.doneTitle}>Report submitted</Text>
                <Text style={sheet.doneSub}>Thanks — we'll review and take action if needed.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CHAT_REPORT_REASONS = [
  'Inappropriate content',
  'Spam or self-promotion',
  'Harassment or threats',
  'Fake or impersonation',
  'Other',
];

function ChatSheetRow({ icon, label, onPress, destructive }) {
  return (
    <Pressable onPress={onPress} style={sheet.row}>
      <View style={sheet.rowIconWrap}>
        <Ionicons name={icon} size={20} color={destructive ? colors.red : colors.navy} />
      </View>
      <Text style={[sheet.rowLabel, destructive && sheet.rowDestructive]}>{label}</Text>
    </Pressable>
  );
}

function Bubble({ msg }) {
  const me = msg.fromMe;
  return (
    <View style={[styles.bubbleRow, { justifyContent: me ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.bubble, me ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, me && { color: colors.white }]}>{msg.text}</Text>
        <Text style={[styles.bubbleTime, me && { color: 'rgba(255,255,255,0.7)' }]}>{msg.time}</Text>
      </View>
    </View>
  );
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.md },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.slate200 },
  headerName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.navy },
  headerSub: { fontFamily: fonts.body, fontSize: 11, color: colors.slate400 },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.blueTint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  requestBannerText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate600 },
  messages: { padding: spacing.lg, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatText: { fontFamily: fonts.body, fontSize: 14, color: colors.slate400 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: colors.blue, borderBottomRightRadius: 6 },
  bubbleThem: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.slate800 },
  bubbleTime: { fontFamily: fonts.body, fontSize: 10, color: colors.slate400, marginTop: 4, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate100 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.slate100,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.navy,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  subjectName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: spacing.md },
  rowIconWrap: { width: 24, alignItems: 'center' },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.navy, flex: 1 },
  rowDestructive: { color: colors.red },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, marginBottom: spacing.xs },
  backLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.navy },
  reasonPrompt: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.slate500, marginBottom: spacing.xs },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  reasonText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.navy },
  reasonActive: { color: colors.blue },
  circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.slate300 },
  submitBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
  doneWrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  doneTitle: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.navy },
  doneSub: { fontFamily: fonts.body, fontSize: 14, color: colors.slate500, textAlign: 'center', lineHeight: 20 },
});
