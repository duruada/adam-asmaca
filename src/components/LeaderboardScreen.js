import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  NICK_MAX,
  checkRoom,
  cleanNickname,
  clearSettings,
  createRoom,
  fetchLeaderboard,
  normalizeCode,
  saveSettings,
} from '../leaderboard';
import { colors, tabular } from '../theme';
import BigButton from './BigButton';

const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)}`);

export default function LeaderboardScreen({ settings, onSettingsChange, onClose, s }) {
  const [step, setStep] = useState(settings ? 'table' : 'room');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [pendingRoom, setPendingRoom] = useState(null);
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!settings?.room) return;
    setBusy(true);
    setError(null);
    try {
      setEntries(await fetchLeaderboard(settings.room));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [settings?.room]);

  useEffect(() => {
    if (step === 'table') load();
  }, [step, load]);

  /* ------------------------------------------------------------- kurulum */

  const joinRoom = async () => {
    const c = normalizeCode(code);
    if (c.length !== 6) return setError('Oda kodu 6 karakter olmalı.');
    setBusy(true);
    setError(null);
    try {
      await checkRoom(c);
      setPendingRoom(c);
      setStep('nick');
    } catch (e) {
      setError(e.status === 404 ? 'Böyle bir oda yok. Kodu kontrol et.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const makeRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await createRoom();
      setPendingRoom(c);
      setStep('nick');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const n = cleanNickname(nick).trim();
    if (!n) return setError('Bir takma ad yaz.');
    const next = { room: pendingRoom, nickname: n };
    await saveSettings(next);
    onSettingsChange(next);
    setStep('table');
  };

  const leave = () => {
    Alert.alert('Odadan çık', 'Skorların odada kalır, bu cihaz odayla bağını keser. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çık',
        style: 'destructive',
        onPress: async () => {
          await clearSettings();
          onSettingsChange(null);
          setCode('');
          setNick('');
          setEntries([]);
          setStep('room');
        },
      },
    ]);
  };

  /* -------------------------------------------------------------- görünüm */

  const header = (
    <View style={[styles.header, { marginBottom: s(14) }]}>
      <Text style={[styles.title, { fontSize: s(24) }]}>Liderlik Tablosu</Text>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        style={({ pressed }) => [
          styles.close,
          { width: s(38), height: s(38), borderRadius: s(19) },
          pressed && { backgroundColor: colors.line },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
      >
        <Text style={{ fontSize: s(17), color: colors.inkSoft }}>✕</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: s(22), gap: s(14) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {header}

        {error && (
          <Text style={[styles.error, { fontSize: s(14), padding: s(10), borderRadius: s(8) }]}>
            {error}
          </Text>
        )}

        {step === 'room' && (
          <View style={{ gap: s(14), alignItems: 'center', maxWidth: s(420) }}>
            <Text style={[styles.lead, { fontSize: s(15), lineHeight: s(22) }]}>
              Arkadaşlarınla aynı odaya girin, skorlarınız aynı tabloda görünsün.
              Hesap açmak gerekmiyor.
            </Text>

            <TextInput
              value={code}
              onChangeText={(t) => setCode(normalizeCode(t))}
              placeholder="ODA KODU"
              placeholderTextColor={colors.line}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={[
                styles.input,
                tabular,
                { fontSize: s(26), height: s(58), borderRadius: s(12), letterSpacing: s(4) },
              ]}
            />
            <BigButton label="Odaya Katıl" onPress={joinRoom} disabled={busy} s={s} />

            <Text style={[styles.or, { fontSize: s(13) }]}>ya da</Text>
            <Pressable onPress={makeRoom} disabled={busy} hitSlop={8}>
              <Text style={[styles.link, { fontSize: s(16) }]}>Yeni oda aç</Text>
            </Pressable>
          </View>
        )}

        {step === 'nick' && (
          <View style={{ gap: s(14), alignItems: 'center', maxWidth: s(420) }}>
            <Text style={[styles.lead, { fontSize: s(15), lineHeight: s(22) }]}>
              Oda kodun:
            </Text>
            <Text style={[styles.roomCode, tabular, { fontSize: s(34), letterSpacing: s(5) }]}>
              {pendingRoom}
            </Text>
            <Text style={[styles.hint, { fontSize: s(13), lineHeight: s(19) }]}>
              Arkadaşlarına bu kodu ver. Tabloda görünecek bir takma ad seç —
              gerçek adını yazmana gerek yok.
            </Text>
            <TextInput
              value={nick}
              onChangeText={(t) => setNick(cleanNickname(t))}
              placeholder="takma adın"
              placeholderTextColor={colors.line}
              autoCorrect={false}
              maxLength={NICK_MAX}
              style={[styles.input, { fontSize: s(20), height: s(54), borderRadius: s(12) }]}
            />
            <BigButton label="Tamam" onPress={finish} disabled={busy} s={s} />
          </View>
        )}

        {step === 'table' && settings && (
          <View style={{ gap: s(12), alignItems: 'center', width: '100%', maxWidth: s(520) }}>
            <View style={{ alignItems: 'center', gap: s(3) }}>
              <Text style={[styles.hint, { fontSize: s(12) }]}>oda kodu</Text>
              <Text style={[styles.roomCode, tabular, { fontSize: s(28), letterSpacing: s(5) }]}>
                {settings.room}
              </Text>
            </View>

            {busy && <ActivityIndicator color={colors.blue} />}

            {!busy && entries.length === 0 && !error && (
              <Text style={[styles.hint, { fontSize: s(14), lineHeight: s(20) }]}>
                Henüz kimse skor göndermemiş. Bir tur oyna, ilk sen ol.
              </Text>
            )}

            {entries.length > 0 && (
              <View style={{ width: '100%', gap: s(5) }}>
                <View style={[styles.row, { paddingHorizontal: s(10) }]}>
                  <Text style={[styles.th, { fontSize: s(11), width: s(26) }]}>#</Text>
                  <Text style={[styles.th, { fontSize: s(11), flex: 1 }]}>oyuncu</Text>
                  <Text style={[styles.th, styles.num, { fontSize: s(11), width: s(52) }]}>şimşek</Text>
                  <Text style={[styles.th, styles.num, { fontSize: s(11), width: s(46) }]}>doğru</Text>
                  <Text style={[styles.th, styles.num, { fontSize: s(11), width: s(44) }]}>ort.</Text>
                </View>

                {entries.map((e, i) => {
                  const me = e.nickname === settings.nickname;
                  return (
                    <View
                      key={`${e.nickname}-${i}`}
                      style={[
                        styles.row,
                        styles.entry,
                        { padding: s(10), borderRadius: s(9) },
                        me && styles.entryMe,
                      ]}
                    >
                      <Text style={[styles.rank, tabular, { fontSize: s(14), width: s(26) }]}>
                        {i + 1}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.name, { fontSize: s(15), flex: 1 }, me && styles.nameMe]}
                      >
                        {e.nickname}
                      </Text>
                      <Text style={[styles.cell, styles.num, tabular, { fontSize: s(15), width: s(52), color: colors.amberInk }]}>
                        {e.lightning}
                      </Text>
                      <Text style={[styles.cell, styles.num, tabular, { fontSize: s(15), width: s(46) }]}>
                        {e.correct}
                      </Text>
                      <Text style={[styles.cell, styles.num, tabular, { fontSize: s(15), width: s(44) }]}>
                        {secs(e.avgMs)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={[styles.hint, { fontSize: s(11), lineHeight: s(16), maxWidth: s(400) }]}>
              Sıralama önce şimşeğe göre: 3 saniyenin altında verilen doğru cevap
              sayısı. Çok doğru yapmak yetmiyor, hatırlamak gerekiyor.
            </Text>

            <View style={[styles.actions, { gap: s(10) }]}>
              <Pressable onPress={load} disabled={busy} hitSlop={8}>
                <Text style={[styles.link, { fontSize: s(15) }]}>Yenile</Text>
              </Pressable>
              <Text style={{ color: colors.line }}>·</Text>
              <Pressable onPress={leave} hitSlop={8}>
                <Text style={[styles.link, styles.leave, { fontSize: s(15) }]}>Odadan çık</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 520 },
  title: { flex: 1, fontWeight: '800', color: colors.ink },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  lead: { color: colors.inkSoft, textAlign: 'center', fontWeight: '600' },
  hint: { color: colors.inkSoft, textAlign: 'center' },
  error: {
    color: colors.red,
    backgroundColor: colors.redSoft,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    minWidth: 220,
    textAlign: 'center',
    fontWeight: '800',
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
  },
  or: { color: colors.inkSoft },
  link: { color: colors.blue, fontWeight: '800' },
  leave: { color: colors.red },
  roomCode: { fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center' },
  th: { color: colors.inkSoft, fontWeight: '700' },
  num: { textAlign: 'right' },
  entry: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line },
  entryMe: { borderColor: colors.blue, backgroundColor: '#DCE8F1' },
  rank: { color: colors.inkSoft, fontWeight: '800' },
  name: { color: colors.ink, fontWeight: '700' },
  nameMe: { color: colors.blue },
  cell: { color: colors.ink, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
