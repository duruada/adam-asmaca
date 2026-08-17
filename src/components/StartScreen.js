import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MAX_MISTAKES, MAX_FACTOR, TOTAL_QUESTIONS } from '../gameLogic';
import { colors } from '../theme';
import BigButton from './BigButton';

export default function StartScreen({ onStart, loading, s }) {
  const rules = [
    [String(TOTAL_QUESTIONS), `soru sorulur, hepsi ${MAX_FACTOR}×${MAX_FACTOR}'a kadar çarpma.`],
    ['✓', 'Doğru cevap: adam güvende kalır.'],
    ['✗', 'Yanlış cevap: doğrusu gösterilir, adamdan bir parça çizilir.'],
    [String(MAX_MISTAKES), 'hata hakkın var. Adam tamamlanırsa oyun biter.'],
    ['🏆', `${TOTAL_QUESTIONS} soru bitip adam asılmadıysa kazandın!`],
  ];

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: s(22), padding: s(24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: s(6) }}>
          <Text style={[styles.title, { fontSize: s(34), lineHeight: s(41) }]}>
            Ada'nın{'\n'}Adam Asmaca Oyunu
          </Text>
          <Text style={[styles.subtitle, { fontSize: s(18) }]}>Çarpım Tablosu</Text>
        </View>

        <View style={{ gap: s(10), maxWidth: s(420) }}>
          {rules.map(([marker, text]) => (
            <View key={text} style={styles.rule}>
              <Text style={[styles.marker, { fontSize: s(16), lineHeight: s(23), width: s(30) }]}>
                {marker}
              </Text>
              <Text style={[styles.ruleText, { fontSize: s(16), lineHeight: s(23) }]}>{text}</Text>
            </View>
          ))}
        </View>

        <BigButton
          label={loading ? 'Hazırlanıyor…' : 'Başla'}
          onPress={onStart}
          disabled={loading}
          s={s}
        />
      </ScrollView>
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
  subtitle: { fontWeight: '700', color: colors.blue, textAlign: 'center' },
  rule: { flexDirection: 'row', alignItems: 'flex-start' },
  marker: { fontWeight: '800', color: colors.ink },
  ruleText: { flex: 1, color: colors.inkSoft },
});
