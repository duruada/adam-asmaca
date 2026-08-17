import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_PAIRS, TOTAL_QUESTIONS } from '../gameLogic';
import { FLUENT_MS } from '../facts';
import { colors, tabular } from '../theme';
import BigButton from './BigButton';

/** Grafikte en fazla kaç tur gösterilsin. */
const CHART_ROUNDS = 12;

const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)}`);

export default function EndScreen({ result, onRestart, s }) {
  const {
    won, correct, mistakes, missed, history, best, isRecord, working,
    avgMs, fastestMs, lightning, bestLightning, isSpeedRecord, fluent,
  } = result;

  const answered = correct + mistakes;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;
  const bars = (history ?? []).slice(-CHART_ROUNDS);

  const message = won
    ? mistakes === 0
      ? `${TOTAL_QUESTIONS} sorunun hepsi doğru. Kusursuz!`
      : `${TOTAL_QUESTIONS} soru bitti, adam hâlâ ayakta. Harika iş!`
    : `${answered}. soruda hata hakkın bitti. Bir daha dene!`;

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: s(16), padding: s(22) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: s(32) }]}>
          {won ? 'Kazandın! 🏆' : 'Adam asıldı…'}
        </Text>

        {(isRecord || isSpeedRecord) && (
          <View style={[styles.badges, { gap: s(7) }]}>
            {isRecord && <Badge text="Yeni rekor!" s={s} />}
            {isSpeedRecord && <Badge text="En hızlı turun!" s={s} />}
          </View>
        )}

        <Text style={[styles.message, { fontSize: s(15), lineHeight: s(22), maxWidth: s(380) }]}>
          {message}
        </Text>

        <View style={[styles.scores, { gap: s(24) }]}>
          <Score value={correct} label="doğru" color={colors.green} s={s} />
          <Score value={mistakes} label="yanlış" color={colors.red} s={s} />
          <Score value={`${pct}%`} label="başarı" color={colors.ink} s={s} />
        </View>

        <View style={[styles.speedRow, { gap: s(24), paddingTop: s(12) }]}>
          <Score value={secs(avgMs)} label="ort. saniye" color={colors.blue} s={s} />
          <Score value={secs(fastestMs)} label="en hızlı" color={colors.blue} s={s} />
          <Score value={`${lightning}/${correct || 0}`} label="şimşek ⚡" color={colors.amberInk} s={s} />
        </View>

        <Text style={[styles.note, { fontSize: s(12), maxWidth: s(340), lineHeight: s(17) }]}>
          Şimşek: {(FLUENT_MS / 1000).toFixed(0)} saniyenin altında verilen doğru cevap.
          Hatırladığın çarpım, hesapladığın çarpımdan hızlı gelir.
        </Text>

        {/* Otomatikliğin asıl göstergesi: kaç çarpımı gerçekten hatırlıyor. */}
        {typeof fluent === 'number' && (
          <View style={[styles.fluentBox, { borderRadius: s(10), padding: s(11), maxWidth: s(400) }]}>
            <Text style={[styles.fluentText, tabular, { fontSize: s(15), lineHeight: s(21) }]}>
              {ALL_PAIRS.length} çarpımdan{' '}
              <Text style={styles.fluentNum}>{fluent}</Text> tanesini artık
              hatırlıyorsun.
            </Text>
          </View>
        )}

        <Text style={[styles.records, tabular, { fontSize: s(13) }]}>
          en iyin: {best} doğru · {bestLightning} şimşek
        </Text>

        {bars.length > 1 && (
          <View style={{ alignItems: 'center', gap: s(6) }}>
            <Text style={[styles.sectionTitle, { fontSize: s(12) }]}>son {bars.length} tur</Text>
            <View style={[styles.chart, { height: s(50), gap: s(4) }]}>
              {bars.map((h, i) => (
                <View key={`${h.round}-${i}`} style={[styles.barTrack, { width: s(14), borderRadius: s(3) }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(h.correct / TOTAL_QUESTIONS) * 100}%`,
                        borderRadius: s(3),
                        backgroundColor: i === bars.length - 1 ? colors.blue : colors.line,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {missed.length > 0 && (
          <Section title="bu turda kaçırdıkların" s={s}>
            {missed.map((m) => (
              <Chip key={m} text={m} tone="red" s={s} />
            ))}
          </Section>
        )}

        {working?.length > 1 && (
          <Section title="şunlar üzerinde çalışıyoruz" s={s}>
            {working.map((f) => (
              <Chip key={`${f.a}x${f.b}`} text={`${f.a}×${f.b}`} tone="blue" s={s} />
            ))}
          </Section>
        )}

        <BigButton label="Yeniden Oyna" onPress={onRestart} s={s} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children, s }) {
  return (
    <View style={{ alignItems: 'center', gap: s(7), maxWidth: s(460) }}>
      <Text style={[styles.sectionTitle, { fontSize: s(12) }]}>{title}</Text>
      <View style={[styles.chips, { gap: s(7) }]}>{children}</View>
    </View>
  );
}

function Badge({ text, s }) {
  return (
    <Text
      style={[
        styles.badge,
        { fontSize: s(14), paddingVertical: s(6), paddingHorizontal: s(13), borderRadius: s(20) },
      ]}
    >
      {text}
    </Text>
  );
}

function Chip({ text, tone, s }) {
  return (
    <Text
      style={[
        styles.chip,
        tabular,
        tone === 'red' ? styles.chipRed : styles.chipBlue,
        { fontSize: s(14), paddingVertical: s(5), paddingHorizontal: s(10), borderRadius: s(8) },
      ]}
    >
      {text}
    </Text>
  );
}

function Score({ value, label, color, s }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.scoreValue, tabular, { fontSize: s(27), color }]}>{value}</Text>
      <Text style={[styles.scoreLabel, { fontSize: s(11) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', color: colors.ink, textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: colors.green,
    overflow: 'hidden',
  },
  message: { color: colors.inkSoft, textAlign: 'center' },
  scores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.line,
  },
  scoreValue: { fontWeight: '800' },
  scoreLabel: { color: colors.inkSoft },
  note: { color: colors.inkSoft, textAlign: 'center' },
  fluentBox: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
  },
  fluentText: { textAlign: 'center', color: colors.inkSoft, fontWeight: '600' },
  fluentNum: { color: colors.green, fontWeight: '800' },
  records: { color: colors.inkSoft, fontWeight: '700' },
  sectionTitle: { color: colors.inkSoft, fontWeight: '700' },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  barTrack: { height: '100%', justifyContent: 'flex-end', backgroundColor: colors.card },
  bar: { width: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: { fontWeight: '700', overflow: 'hidden' },
  chipRed: { backgroundColor: colors.redSoft, color: colors.red },
  chipBlue: { backgroundColor: '#DCE8F1', color: colors.blue },
});
