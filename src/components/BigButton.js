import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';

export default function BigButton({ label, onPress, disabled, s }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          paddingVertical: s(16),
          paddingHorizontal: s(46),
          borderRadius: s(40),
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[styles.label, { fontSize: s(22) }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.green, alignItems: 'center' },
  pressed: { backgroundColor: colors.greenDark, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.45 },
  label: { color: '#FFFFFF', fontWeight: '800' },
});
