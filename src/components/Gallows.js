import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { colors } from '../theme';

const ROPE_X = 130;
const ROPE_Y = 22;

/** Bir parçanın çizilme süresi (ms). */
const DRAW_MS = 700;

/** Sallanma: tam salınım süresi (ms) ve açı genliği (derece). */
const SWAY_MS = 1600;
const SWAY_DEG = 4;

/**
 * Her yanlış cevapta bir parça çizilir. Sıra: kafa, gövde, iki kol, iki bacak.
 * Buradaki eleman sayısı MAX_MISTAKES ile aynı olmalı (gameLogic.js).
 */
const BODY = [
  { kind: 'circle', cx: ROPE_X, cy: 63, r: 17 },
  { kind: 'line', x1: ROPE_X, y1: 80, x2: ROPE_X, y2: 134 },
  { kind: 'line', x1: ROPE_X, y1: 95, x2: 105, y2: 118 },
  { kind: 'line', x1: ROPE_X, y1: 95, x2: 155, y2: 118 },
  { kind: 'line', x1: ROPE_X, y1: 134, x2: 108, y2: 170 },
  { kind: 'line', x1: ROPE_X, y1: 134, x2: 152, y2: 170 },
];

/** Kendini çizme efekti için her parçanın uzunluğu gerekiyor. */
const LENGTHS = BODY.map((p) =>
  p.kind === 'circle' ? 2 * Math.PI * p.r : Math.hypot(p.x2 - p.x1, p.y2 - p.y1)
);

const easeOutCubic = (k) => 1 - (1 - k) ** 3;

/**
 * Animasyonlar Animated yerine requestAnimationFrame + state ile sürülüyor.
 * Sebep: Animated, SVG'ye sadece animasyonlu propu setNativeProps ile geçiriyor;
 * <G> için bu, originX/originY'nin düşmesi ve adamın yanlış noktadan dönmesi
 * demek. Düz sayı verince her prop normal render yolundan geçiyor. Çizilen
 * eleman sayısı çok az olduğu için kare başına render maliyeti önemsiz.
 */
export default function Gallows({ mistakes, dead, swaying }) {
  const [progress, setProgress] = useState(() => BODY.map(() => 0));
  const [angle, setAngle] = useState(0);
  const [faceOn, setFaceOn] = useState(false);

  // Yeni açılan parçayı çiz; önceki parçalar tam çizili kalsın.
  useEffect(() => {
    if (mistakes === 0) {
      setProgress(BODY.map(() => 0));
      return undefined;
    }

    const target = Math.min(mistakes, BODY.length) - 1;
    let raf;
    let start = null;

    const step = (now) => {
      if (start === null) start = now;
      const k = Math.min((now - start) / DRAW_MS, 1);
      setProgress((prev) => {
        const next = prev.slice();
        for (let j = 0; j < target; j += 1) next[j] = 1;
        next[target] = easeOutCubic(k);
        return next;
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mistakes]);

  // Adam tamamlanınca yüz belirsin.
  useEffect(() => {
    if (!dead) {
      setFaceOn(false);
      return undefined;
    }
    const id = setTimeout(() => setFaceOn(true), DRAW_MS);
    return () => clearTimeout(id);
  }, [dead]);

  // İpte sallanma.
  useEffect(() => {
    if (!swaying) {
      setAngle(0);
      return undefined;
    }
    let raf;
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      setAngle(SWAY_DEG * Math.sin(((now - start) / SWAY_MS) * Math.PI));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [swaying]);

  return (
    <View style={styles.wrap}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 220"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Darağacı baştan görünür durur; sadece adam yavaş yavaş belirir. */}
        <G stroke={colors.wood} strokeWidth={5} strokeLinecap="round" fill="none">
          <Line x1={18} y1={206} x2={122} y2={206} />
          <Line x1={42} y1={206} x2={42} y2={ROPE_Y} />
          <Line x1={42} y1={ROPE_Y} x2={ROPE_X} y2={ROPE_Y} />
          <Line x1={42} y1={50} x2={70} y2={ROPE_Y} />
          <Line x1={ROPE_X} y1={ROPE_Y} x2={ROPE_X} y2={46} />
        </G>

        <G rotation={angle} originX={ROPE_X} originY={ROPE_Y}>
          {BODY.map((part, i) => {
            const len = LENGTHS[i];
            const shown = progress[i];
            if (shown <= 0) return null;

            const common = {
              stroke: colors.ink,
              strokeWidth: 5,
              strokeLinecap: 'round',
              fill: 'none',
              strokeDasharray: [len, len],
              strokeDashoffset: len * (1 - shown),
            };

            return part.kind === 'circle' ? (
              <Circle key={i} {...common} cx={part.cx} cy={part.cy} r={part.r} />
            ) : (
              <Line
                key={i}
                {...common}
                x1={part.x1}
                y1={part.y1}
                x2={part.x2}
                y2={part.y2}
              />
            );
          })}

          {/* Yüz sadece oyun kaybedilince belirir. */}
          {faceOn && (
            <G stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" fill="none">
              <Line x1={120} y1={56} x2={127} y2={63} />
              <Line x1={127} y1={56} x2={120} y2={63} />
              <Line x1={133} y1={56} x2={140} y2={63} />
              <Line x1={140} y1={56} x2={133} y2={63} />
              <Path d="M122 74 Q130 68 138 74" />
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignSelf: 'stretch' },
});
