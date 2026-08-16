/** Bir turdaki soru sayısı. */
export const TOTAL_QUESTIONS = 20;

/** En büyük çarpan: 10x10'a kadar, yani sonuçlar 1-100 arası. */
export const MAX_FACTOR = 10;

/** Hata hakkı. Adamın parça sayısıyla aynı olmalı (Gallows.js -> BODY). */
export const MAX_MISTAKES = 6;

/**
 * Tur için soru listesi üretir.
 * Tüm çarpan çiftleri bir havuza konur, karıştırılır, ilk 20'si alınır.
 * Böylece aynı turda hiçbir soru tekrar etmez (3x7 çıktıysa 7x3 de çıkmaz).
 * Ekrana yazılırken çarpanların sırası rastgele çevrilir.
 */
export function buildQuestions() {
  const pool = [];
  for (let a = 1; a <= MAX_FACTOR; a += 1) {
    for (let b = a; b <= MAX_FACTOR; b += 1) pool.push([a, b]);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return pool.slice(0, TOTAL_QUESTIONS).map(([x, y]) =>
    Math.random() < 0.5 ? { a: x, b: y } : { a: y, b: x }
  );
}
