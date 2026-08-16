import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, tabular } from '../theme';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
];

const LABELS = { del: 'Sil', ok: 'Tamam' };

export default function Keypad({ onPress, disabled, s }) {
  return (
    <View style={[styles.pad, { gap: s(8) }]}>
      {ROWS.map((row, r) => (
        <View key={r} style={[styles.row, { gap: s(8) }]}>
          {row.map((key) => {
            const isOk = key === 'ok';
            const isDel = key === 'del';
            const isWord = isOk || isDel;

            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => onPress(key)}
                style={({ pressed }) => [
                  styles.key,
                  { borderRadius: s(12) },
                  isOk && styles.keyOk,
                  pressed && (isOk ? styles.keyOkPressed : styles.keyPressed),
                  disabled && styles.keyDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={LABELS[key] || key}
              >
                <Text
                  style={[
                    styles.label,
                    tabular,
                    { fontSize: isWord ? s(17) : s(28) },
                    isOk && styles.labelOk,
                    isDel && styles.labelDel,
                  ]}
                >
                  {LABELS[key] || key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, minHeight: 0 },
  row: { flex: 1, flexDirection: 'row' },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  keyPressed: { backgroundColor: colors.line, transform: [{ scale: 0.95 }] },
  keyOk: { backgroundColor: colors.green, borderColor: colors.green },
  keyOkPressed: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
    transform: [{ scale: 0.95 }],
  },
  keyDisabled: { opacity: 0.4 },
  label: { fontWeight: '700', color: colors.ink },
  labelOk: { color: '#FFFFFF' },
  labelDel: { color: colors.red },
});
