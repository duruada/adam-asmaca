import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TOTAL_QUESTIONS } from '../gameLogic';
import { colors, tabular } from '../theme';
import BigButton from './BigButton';

export default function EndScreen({ result, onRestart, s }) {
  const { won, correct, mistakes, missed } = result;
  const answered = correct + mistakes;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;

  const message = won
    ? mistakes === 0
      ? `${TOTAL_QUESTIONS} sorunun hepsi doğru. Kusursuz!`
      : `${TOTAL_QUESTIONS} soru bitti, adam hâlâ ayakta. Harika iş!`
    : `${answered}. soruda hata hakkın bitti. Bir daha dene!`;

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: s(20), padding: s(24) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: s(34) }]}>
          {won ? 'Kazandın! 🏆' : 'Adam asıldı…'}
        </Text>
        <Text style={[styles.message, { fontSize: s(16), lineHeight: s(23), maxWidth: s(380) }]}>
          {message}
        </Text>

        <View style={[styles.scores, { gap: s(30) }]}>
          <Score value={correct} label="doğru" color={colors.green} s={s} />
          <Score value={mistakes} label="yanlış" color={colors.red} s={s} />
          <Score value={`${pct}%`} label="başarı" color={colors.ink} s={s} />
        </View>

        {missed.length > 0 && (
          <View style={{ alignItems: 'center', gap: s(8), maxWidth: s(460) }}>
            <Text style={[styles.missedTitle, { fontSize: s(14) }]}>Tekrar bak</Text>
            <View style={[styles.chips, { gap: s(7) }]}>
              {missed.map((m) => (
                <Text
                  key={m}
                  style={[
                    styles.chip,
                    tabular,
                    {
                      fontSize: s(15),
                      paddingVertical: s(5),
                      paddingHorizontal: s(10),
                      borderRadius: s(8),
                    },
                  ]}
                >
                  {m}
                </Text>
              ))}
            </View>
          </View>
        )}

        <BigButton label="Yeniden Oyna" onPress={onRestart} s={s} />
      </ScrollView>
    </View>
  );
}

function Score({ value, label, color, s }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.scoreValue, tabular, { fontSize: s(32), color }]}>{value}</Text>
      <Text style={[styles.scoreLabel, { fontSize: s(13) }]}>{label}</Text>
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
  message: { color: colors.inkSoft, textAlign: 'center' },
  scores: { flexDirection: 'row' },
  scoreValue: { fontWeight: '800' },
  scoreLabel: { color: colors.inkSoft },
  missedTitle: { color: colors.inkSoft, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    backgroundColor: colors.redSoft,
    color: colors.red,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
