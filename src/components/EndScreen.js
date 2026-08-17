import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TOTAL_QUESTIONS } from '../gameLogic';
import { colors, tabular } from '../theme';
import BigButton from './BigButton';

/** Grafikte en fazla kaç tur gösterilsin. */
const CHART_ROUNDS = 12;

export default function EndScreen({ result, onRestart, s }) {
  const { won, correct, mistakes, missed, history, best, isRecord, working } = result;
  const answered = correct + mistakes;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;

  const message = won
    ? mistakes === 0
      ? `${TOTAL_QUESTIONS} sorunun hepsi doğru. Kusursuz!`
      : `${TOTAL_QUESTIONS} soru bitti, adam hâlâ ayakta. Harika iş!`
    : `${answered}. soruda hata hakkın bitti. Bir daha dene!`;

  const bars = (history ?? []).slice(-CHART_ROUNDS);

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: s(18), padding: s(24) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: s(34) }]}>
          {won ? 'Kazandın! 🏆' : 'Adam asıldı…'}
        </Text>

        {isRecord && (
          <Text
            style={[
              styles.record,
              { fontSize: s(15), paddingVertical: s(6), paddingHorizontal: s(14), borderRadius: s(20) },
            ]}
          >
            Yeni rekor!
          </Text>
        )}

        <Text style={[styles.message, { fontSize: s(16), lineHeight: s(23), maxWidth: s(380) }]}>
          {message}
        </Text>

        <View style={[styles.scores, { gap: s(26) }]}>
          <Score value={correct} label="doğru" color={colors.green} s={s} />
          <Score value={mistakes} label="yanlış" color={colors.red} s={s} />
          <Score value={`${pct}%`} label="başarı" color={colors.ink} s={s} />
          <Score value={best} label="en iyin" color={colors.blue} s={s} />
        </View>

        {bars.length > 1 && (
          <View style={{ alignItems: 'center', gap: s(6) }}>
            <Text style={[styles.sectionTitle, { fontSize: s(13) }]}>
              son {bars.length} tur
            </Text>
            <View style={[styles.chart, { height: s(56), gap: s(4) }]}>
              {bars.map((h, i) => {
                const last = i === bars.length - 1;
                return (
                  <View
                    key={`${h.round}-${i}`}
                    style={[
                      styles.barTrack,
                      { width: s(15), borderRadius: s(3) },
                    ]}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${(h.correct / TOTAL_QUESTIONS) * 100}%`,
                          borderRadius: s(3),
                          backgroundColor: last ? colors.blue : colors.line,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {missed.length > 0 && (
          <View style={{ alignItems: 'center', gap: s(7), maxWidth: s(460) }}>
            <Text style={[styles.sectionTitle, { fontSize: s(13) }]}>bu turda kaçırdıkların</Text>
            <View style={[styles.chips, { gap: s(7) }]}>
              {missed.map((m) => (
                <Chip key={m} text={m} tone="red" s={s} />
              ))}
            </View>
          </View>
        )}

        {working?.length > 1 && (
          <View style={{ alignItems: 'center', gap: s(7), maxWidth: s(460) }}>
            <Text style={[styles.sectionTitle, { fontSize: s(13) }]}>
              şunlar üzerinde çalışıyoruz
            </Text>
            <View style={[styles.chips, { gap: s(7) }]}>
              {working.map((f) => (
                <Chip key={`${f.a}x${f.b}`} text={`${f.a}×${f.b}`} tone="blue" s={s} />
              ))}
            </View>
          </View>
        )}

        <BigButton label="Yeniden Oyna" onPress={onRestart} s={s} />
      </ScrollView>
    </View>
  );
}

function Chip({ text, tone, s }) {
  return (
    <Text
      style={[
        styles.chip,
        tabular,
        tone === 'red' ? styles.chipRed : styles.chipBlue,
        {
          fontSize: s(15),
          paddingVertical: s(5),
          paddingHorizontal: s(10),
          borderRadius: s(8),
        },
      ]}
    >
      {text}
    </Text>
  );
}

function Score({ value, label, color, s }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.scoreValue, tabular, { fontSize: s(30), color }]}>{value}</Text>
      <Text style={[styles.scoreLabel, { fontSize: s(12) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.paper,
  },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', color: colors.ink, textAlign: 'center' },
  record: {
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: colors.green,
    overflow: 'hidden',
  },
  message: { color: colors.inkSoft, textAlign: 'center' },
  scores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  scoreValue: { fontWeight: '800' },
  scoreLabel: { color: colors.inkSoft },
  sectionTitle: { color: colors.inkSoft, fontWeight: '700' },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  barTrack: { height: '100%', justifyContent: 'flex-end', backgroundColor: colors.card },
  bar: { width: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: { fontWeight: '700', overflow: 'hidden' },
  chipRed: { backgroundColor: colors.redSoft, color: colors.red },
  chipBlue: { backgroundColor: '#DCE8F1', color: colors.blue },
});
