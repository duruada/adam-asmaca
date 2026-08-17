/**
 * Çarpım istatistiklerinin saf mantığı. Burada hiç I/O yok — depolama
 * ayrı dosyada (storage.js). Böylece bu dosya native modül gerektirmiyor
 * ve doğrudan Node ile test edilebiliyor.
 */

/** Turlardan kaç tanesinin geçmişi tutulsun (ilerleme grafiği için). */
export const HISTORY_LIMIT = 24;

export function emptyProgress() {
  return { version: 1, round: 0, facts: {}, history: [] };
}

/** Çarpım için anahtar. Sıra önemsiz: 3x7 ile 7x3 aynı bilgi. */
export function factKey(a, b) {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

export function emptyFact() {
  return { seen: 0, wrong: 0, strikes: 0, streak: 0, lastRound: -1 };
}

/**
 * Bir cevabın sonucunu ilerlemeye işler. Nesneyi yerinde değiştirir;
 * çağıran tarafta tek bir kopya dolaştığı için bu kasıtlı.
 */
export function recordAnswer(progress, a, b, isRight) {
  const key = factKey(a, b);
  const f = { ...emptyFact(), ...(progress.facts[key] ?? {}) };

  f.seen += 1;
  f.lastRound = progress.round;

  if (isRight) {
    f.streak += 1;
    // Doğru cevap hatayı hemen silmiyor, bir kademe azaltıyor.
    f.strikes = Math.max(0, f.strikes - 1);
  } else {
    f.wrong += 1;
    f.streak = 0;
    // Hata iki kademe ekliyor: yanlış bilgi daha güçlü sinyal.
    f.strikes = Math.min(3, f.strikes + 2);
  }

  progress.facts[key] = f;
  return progress;
}

/** Tur sonucunu geçmişe ekler ve listeyi sınırda tutar. */
export function recordRound(progress, { correct, mistakes, won }) {
  progress.history = [
    ...progress.history,
    { round: progress.round, correct, mistakes, won },
  ].slice(-HISTORY_LIMIT);
  return progress;
}

export function personalBest(progress) {
  return progress.history.reduce((best, h) => Math.max(best, h.correct), 0);
}

/** Kayıtlı veriyi doğrular; bozuksa sıfırdan başlar. */
export function sanitizeProgress(data) {
  if (data?.version !== 1 || typeof data.facts !== 'object' || data.facts === null) {
    return emptyProgress();
  }
  return {
    version: 1,
    round: Number(data.round) || 0,
    facts: data.facts,
    history: Array.isArray(data.history) ? data.history : [],
  };
}
