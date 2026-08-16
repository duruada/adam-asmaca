import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_MISTAKES, TOTAL_QUESTIONS } from '../gameLogic';
import { colors, tabular } from '../theme';

export default function TopBar({ questionNo, correct, mistakes, onRestart, s }) {
  const lives = MAX_MISTAKES - mistakes;

  return (
    <View style={{ gap: s(8) }}>
      <View style={[styles.row, { gap: s(12) }]}>
        <Text style={[styles.stat, tabular, { fontSize: s(14) }]}>
          Soru <Text style={[styles.statValue, { fontSize: s(19) }]}>{questionNo}</Text>
          {' / '}
          {TOTAL_QUESTIONS}
        </Text>

        <Text style={[styles.stat, tabular, { fontSize: s(14) }]}>
          <Text style={{ color: colors.green }}>✓ </Text>
          <Text style={[styles.statValue, { color: colors.green, fontSize: s(19) }]}>
            {correct}
          </Text>
        </Text>

        <View style={styles.spacer} />

        {/* Kalan hata hakkı: dolu daire = hâlâ hakkın var */}
        <View style={[styles.lives, { gap: s(6) }]} accessibilityLabel={`Kalan hata hakkı ${lives}`}>
          {Array.from({ length: MAX_MISTAKES }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: s(13), height: s(13), borderRadius: s(7) },
                i >= lives && styles.dotUsed,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={onRestart}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconBtn,
            { width: s(38), height: s(38), borderRadius: s(19) },
            pressed && styles.iconBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Baştan başla"
        >
          <Text style={{ fontSize: s(18), color: colors.inkSoft }}>↺</Text>
        </Pressable>
      </View>

      <View style={[styles.track, { height: s(7), borderRadius: s(4) }]}>
        <View
          style={[
            styles.fill,
            { width: `${((questionNo - 1) / TOTAL_QUESTIONS) * 100}%`, borderRadius: s(4) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
  stat: { color: colors.inkSoft },
  statValue: { color: colors.ink, fontWeight: '800' },
  lives: { flexDirection: 'row', alignItems: 'center' },
  dot: { backgroundColor: colors.green },
  dotUsed: { backgroundColor: colors.line },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  iconBtnPressed: { backgroundColor: colors.line },
  track: { backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.blue },
});
