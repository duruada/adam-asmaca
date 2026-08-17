import AsyncStorage from '@react-native-async-storage/async-storage';

/** Liderlik sunucusu. Değişirse tek yer burası. */
export const BASE_URL = 'https://ada.152.53.224.34.sslip.io';

const SETTINGS_KEY = 'adam-asmaca/liderlik/v1';
const TIMEOUT_MS = 10000;

export const NICK_MAX = 16;

/**
 * Sunucuya istek. Ağ yoksa veya sunucu yanıt vermezse oyun asla
 * beklemesin diye her istek zaman aşımına bağlı.
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(data.error || `sunucu hatası (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('sunucuya ulaşılamadı');
    if (e instanceof TypeError) throw new Error('internet bağlantısı yok');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------ yerel ayarlar */

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.room && s?.nickname ? { room: s.room, nickname: s.nickname } : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export async function clearSettings() {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* yoksay */
  }
}

/* -------------------------------------------------------------------- API */

export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/** Sunucudaki kurallarla aynı: harf, rakam, boşluk, tire, alt çizgi. */
export function cleanNickname(raw) {
  return String(raw ?? '')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, NICK_MAX);
}

export async function createRoom() {
  const data = await request('/api/rooms', { method: 'POST' });
  return data.code;
}

export async function checkRoom(code) {
  return request(`/api/rooms/${encodeURIComponent(code)}`);
}

export async function fetchLeaderboard(code) {
  const data = await request(`/api/rooms/${encodeURIComponent(code)}/leaderboard`);
  return data.entries ?? [];
}

export async function submitScore(room, nickname, score) {
  return request(`/api/rooms/${encodeURIComponent(room)}/scores`, {
    method: 'POST',
    body: JSON.stringify({
      nickname,
      correct: score.correct,
      mistakes: score.mistakes,
      lightning: score.lightning,
      avgMs: score.avgMs,
      fastestMs: score.fastestMs,
    }),
  });
}
