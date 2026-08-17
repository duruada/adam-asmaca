/**
 * Çarpım istatistiklerinin saf mantığı. Burada hiç I/O yok — depolama
 * ayrı dosyada (storage.js). Böylece bu dosya native modül gerektirmiyor
 * ve doğrudan Node ile test edilebiliyor.
 */

/**
 * Bir çarpımı "hatırlıyor" saymak için üst süre sınırı (ms).
 *
 * Çarpım tablosunda hedef otomatiklik: cevabı hesaplamadan hatırlamak.
 * 3 saniyenin altındaki cevap hatırlama, üstündeki hesaplama sayılıyor —
 * bu, akıcılık ölçümünde yaygın kabul edilen eşik.
 */
export const FLUENT_MS = 3000;

export const STORAGE_VERSION = 2;

/** Turlardan kaç tanesinin geçmişi tutulsun (ilerleme grafiği için). */
export const HISTORY_LIMIT = 24;

export function emptyProgress() {
  return { version: STORAGE_VERSION, round: 0, facts: {}, history: [] };
}

/** Çarpım için anahtar. Sıra önemsiz: 3x7 ile 7x3 aynı bilgi. */
export function factKey(a, b) {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

export function emptyFact() {
  return {
    seen: 0,
    wrong: 0,
    strikes: 0,
    streak: 0,
    lastRound: -1,
    /** Doğru ama yavaş cevap sayısı: hesaplamış, hatırlamamış. */
    slow: 0,
    /** En hızlı doğru cevap (ms). */
    bestMs: null,
    /** Son cevabın süresi (ms). */
    lastMs: null,
  };
}

/**
 * Bir cevabın sonucunu ilerlemeye işler. Nesneyi yerinde değiştirir;
 * çağıran tarafta tek bir kopya dolaştığı için bu kasıtlı.
 *
 * `ms` verilmezse (eski kayıtlar, ölçüm yapılamayan durum) süre yok sayılır
 * ve cevap doğruysa öğrenilmiş kabul edilir.
 */
export function recordAnswer(progress, a, b, isRight, ms = null) {
  const key = factKey(a, b);
  const f = { ...emptyFact(), ...(progress.facts[key] ?? {}) };

  f.seen += 1;
  f.lastRound = progress.round;
  f.lastMs = ms;

  if (isRight) {
    const fluent = ms == null || ms < FLUENT_MS;
    if (fluent) {
      f.streak += 1;
      // Doğru cevap hatayı hemen silmiyor, bir kademe azaltıyor.
      f.strikes = Math.max(0, f.strikes - 1);
    } else {
      /*
       * Doğru ama yavaş. Çocuk hesaplamış, hatırlamamış — bu çarpım
       * öğrenilmiş sayılmıyor. Seriyi ilerletmiyoruz ve hatayı da
       * silmiyoruz, böylece çarpım tekrar listesinde kalıyor.
       */
      f.slow += 1;
    }
    if (ms != null && (f.bestMs == null || ms < f.bestMs)) f.bestMs = ms;
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
export function recordRound(progress, stats) {
  const { correct, mistakes, won, avgMs = null, fastestMs = null, lightning = 0 } = stats;
  progress.history = [
    ...progress.history,
    { round: progress.round, correct, mistakes, won, avgMs, fastestMs, lightning },
  ].slice(-HISTORY_LIMIT);
  return progress;
}

export function personalBest(progress) {
  return progress.history.reduce((best, h) => Math.max(best, h.correct), 0);
}

/** En çok şimşek (3 saniye altı doğru cevap) toplanan tur. */
export function bestLightning(progress) {
  return progress.history.reduce((best, h) => Math.max(best, h.lightning ?? 0), 0);
}

/** En iyi ortalama cevap süresi (ms). Ölçümü olmayan turlar sayılmıyor. */
export function bestAvgMs(progress) {
  const times = progress.history
    .map((h) => h.avgMs)
    .filter((t) => typeof t === 'number' && t > 0);
  return times.length ? Math.min(...times) : null;
}

/** Bütün çarpımlar arasında en hızlı doğru cevap (ms). */
export function fastestEver(progress) {
  const times = Object.values(progress.facts ?? {})
    .map((f) => f.bestMs)
    .filter((t) => typeof t === 'number' && t > 0);
  return times.length ? Math.min(...times) : null;
}

/**
 * Kaç çarpımı gerçekten hatırlıyor: en az bir kez 3 saniyenin altında
 * doğru bildiği ve son cevabı da hızlı olan çarpımlar.
 */
export function fluentCount(progress) {
  return Object.values(progress.facts ?? {}).filter(
    (f) => f.streak > 0 && typeof f.bestMs === 'number' && f.bestMs < FLUENT_MS
  ).length;
}

/**
 * Kayıtlı veriyi doğrular. v1 kayıtları korunuyor: çarpım istatistikleri
 * hâlâ geçerli, sadece süre alanları boş kalıyor ve ilk hızlı cevapta
 * dolmaya başlıyor.
 */
export function sanitizeProgress(data) {
  if (typeof data?.facts !== 'object' || data.facts === null) return emptyProgress();
  if (data.version !== 1 && data.version !== STORAGE_VERSION) return emptyProgress();

  const facts = {};
  for (const [key, f] of Object.entries(data.facts)) {
    if (f && typeof f === 'object') facts[key] = { ...emptyFact(), ...f };
  }

  return {
    version: STORAGE_VERSION,
    round: Number(data.round) || 0,
    facts,
    history: Array.isArray(data.history) ? data.history : [],
  };
}
