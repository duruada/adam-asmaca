import { FLUENT_MS, emptyFact, factKey } from './facts';

/** Bir turdaki soru sayısı. */
export const TOTAL_QUESTIONS = 20;

/** En büyük çarpan: 10x10'a kadar, yani sonuçlar 1-100 arası. */
export const MAX_FACTOR = 10;

/** Hata hakkı. Adamın parça sayısıyla aynı olmalı (Gallows.js -> BODY). */
export const MAX_MISTAKES = 6;

/** Sırası önemsiz bütün çarpan çiftleri: 55 tane. */
export const ALL_PAIRS = (() => {
  const pairs = [];
  for (let a = 1; a <= MAX_FACTOR; a += 1) {
    for (let b = a; b <= MAX_FACTOR; b += 1) pairs.push([a, b]);
  }
  return pairs;
})();

/**
 * Çarpımın kendiliğinden zorluğu.
 * 1'li çarpımlar bedava, 10'lular neredeyse bedava; 3-4-6-7-8-9'un birbiriyle
 * çarpımı zor bölge. Hiç veri yokken bile turun işe yaraması için gerekli.
 */
export function difficultyBonus(a, b) {
  if (a === 1 || b === 1) return -0.7;
  if (a === 10 || b === 10) return -0.4;
  if (a === 2 || b === 2 || a === 5 || b === 5) return -0.15;
  return 0.4;
}

/**
 * Bir çarpımın seçilme ağırlığı. Yüksek puan = daha çok çıkma şansı.
 *
 * Tasarım kararları:
 * - Son hatalar en güçlü sinyal (strikes), çünkü aralıklı tekrarın işi bu.
 * - Doğru ama yavaş cevap da sinyal: çocuk hesaplamış, hatırlamamış. Çarpım
 *   tablosunda hedef otomatiklik olduğu için bu çarpım daha çalışılmalı.
 * - Hiç görülmemiş çarpımlar öne alınıyor, yoksa bazıları hiç sorulmuyor.
 * - Üst üste hızlı ve doğru bilinenler geri çekiliyor ama yok olmuyor:
 *   taban 0.15, yani ezberlenen çarpım da arada bir kontrol için geliyor.
 * - Geçen turda sorulan hafif geri çekiliyor, aynı soru üst üste gelmesin.
 */
export function factScore(a, b, fact, round) {
  const f = fact ?? emptyFact();
  let score = 1;

  score += 2.5 * f.strikes;
  if (f.seen === 0) score += 2;
  if (typeof f.lastMs === 'number' && f.lastMs >= FLUENT_MS) score += 1.2;
  score += difficultyBonus(a, b);
  score -= 0.2 * Math.min(f.streak, 4);
  if (f.lastRound === round - 1) score -= 0.6;

  return Math.max(0.15, score);
}

/**
 * Tur için soru listesi. Ağırlıklı seçim, yerine koymadan: aynı turda
 * hiçbir çarpım tekrar etmez (3x7 çıktıysa 7x3 de çıkmaz).
 */
export function pickQuestions(progress) {
  const round = progress?.round ?? 0;
  const facts = progress?.facts ?? {};

  const pool = ALL_PAIRS.map(([a, b]) => ({
    a,
    b,
    weight: factScore(a, b, facts[factKey(a, b)], round),
  }));

  const chosen = [];
  const count = Math.min(TOTAL_QUESTIONS, pool.length);

  for (let n = 0; n < count; n += 1) {
    let total = 0;
    for (const p of pool) total += p.weight;

    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      r -= pool[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }

    const [picked] = pool.splice(idx, 1);
    chosen.push(picked);
  }

  // Ekranda çarpanların sırası rastgele çevrilir.
  return chosen.map(({ a, b }) =>
    Math.random() < 0.5 ? { a, b } : { a: b, b: a }
  );
}

/**
 * Üzerinde çalışılan çarpımlar: kaçırılanlar ve doğru bilinip de yavaş
 * cevaplananlar. İkisi de henüz otomatikleşmemiş demek.
 */
export function weakestFacts(progress, limit = 6) {
  const facts = progress?.facts ?? {};
  return Object.entries(facts)
    .filter(([, f]) => f.wrong > 0 || f.slow > 0)
    .map(([key, f]) => {
      const [a, b] = key.split('x').map(Number);
      return { a, b, product: a * b, ...f };
    })
    .sort(
      (x, y) =>
        y.strikes - x.strikes ||
        y.wrong - x.wrong ||
        (y.slow ?? 0) - (x.slow ?? 0)
    )
    .slice(0, limit);
}
