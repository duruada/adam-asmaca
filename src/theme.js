export const colors = {
  paper: '#F4EFE4',
  card: '#FFFDF8',
  ink: '#2F2A24',
  inkSoft: '#7A7065',
  line: '#DED4C2',
  wood: '#B0A08A',
  green: '#2F7D55',
  greenDark: '#266745',
  greenSoft: '#E4F0E8',
  red: '#B3402F',
  redSoft: '#F7E3DF',
  blue: '#2C5F8A',
};

/**
 * Ekranın kısa kenarına göre bir ölçek üretir; böylece 8" Android tablette de
 * 13" iPad Pro'da da her şey orantılı görünür. Referans kısa kenar 400dp.
 */
export function createScale(width, height) {
  const short = Math.min(width, height);
  const factor = Math.max(0.85, Math.min(short / 400, 1.75));
  return (size) => Math.round(size * factor);
}

/** Rakamların hizada durması için (7 ile 1 aynı genişlikte). */
export const tabular = { fontVariant: ['tabular-nums'] };
