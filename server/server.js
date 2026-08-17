/**
 * Ada'nın Adam Asmaca Oyunu — liderlik tablosu sunucusu.
 *
 * Tasarım kararları:
 *
 * - HESAP YOK. Sınıf bir oda kodu paylaşır, her çocuk bir takma ad seçer.
 *   Sunucuda yalnızca takma ad ve skor durur; e-posta, şifre, gerçek isim,
 *   cihaz kimliği hiç toplanmaz. Çocuk verisi olduğu için en az veri ilkesi.
 * - SAKLAMA SÜRESİ SINIRLI. RETENTION_DAYS geçince kayıtlar siliniyor.
 * - BAĞIMLILIK YOK. Node'un gömülü http ve node:sqlite modülleri yeterli;
 *   kurulacak paket, denetlenecek bağımlılık zinciri olmuyor.
 *
 * Kimlik doğrulaması yok, o yüzden doğrulama ve hız sınırı ciddiye alınıyor:
 * uçnoktalar herkese açık ve curl ile de çağrılabilir.
 */

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 8080);
const DB_DIR = process.env.DB_DIR || '/data';
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 180);

/** Oyunun kuralları: doğrulama bunlara dayanıyor. */
const MAX_QUESTIONS = 20;
const MAX_MISTAKES = 6;
/** İnsan eliyle verilebilecek en kısa/uzun makul cevap süresi (ms). */
const MIN_MS = 250;
const MAX_MS = 120000;

const NICK_MAX = 16;
const TOP_LIMIT = 50;

/* ------------------------------------------------------------------ veritabanı */

fs.mkdirSync(DB_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DB_DIR, 'liderlik.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS rooms (
    code       TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    room       TEXT NOT NULL,
    nickname   TEXT NOT NULL,
    correct    INTEGER NOT NULL,
    mistakes   INTEGER NOT NULL,
    lightning  INTEGER NOT NULL,
    avg_ms     INTEGER,
    fastest_ms INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_scores_room ON scores(room, created_at);
`);

const q = {
  roomExists: db.prepare('SELECT code, created_at FROM rooms WHERE code = ?'),
  createRoom: db.prepare('INSERT INTO rooms (code, created_at) VALUES (?, ?)'),
  countRooms: db.prepare('SELECT COUNT(*) AS n FROM rooms'),
  addScore: db.prepare(`
    INSERT INTO scores (room, nickname, correct, mistakes, lightning, avg_ms, fastest_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  /** Oyuncu başına en iyi tur. Sıralama: şimşek, sonra doğru, sonra süre. */
  leaderboard: db.prepare(`
    SELECT nickname, correct, mistakes, lightning, avg_ms AS avgMs,
           fastest_ms AS fastestMs, created_at AS createdAt
    FROM (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY nickname
        ORDER BY lightning DESC, correct DESC,
                 CASE WHEN avg_ms IS NULL THEN 1 ELSE 0 END, avg_ms ASC
      ) AS rn
      FROM scores WHERE room = ?
    )
    WHERE rn = 1
    ORDER BY lightning DESC, correct DESC,
             CASE WHEN avgMs IS NULL THEN 1 ELSE 0 END, avgMs ASC
    LIMIT ${TOP_LIMIT}
  `),
  playerCount: db.prepare('SELECT COUNT(DISTINCT nickname) AS n FROM scores WHERE room = ?'),
  purgeScores: db.prepare('DELETE FROM scores WHERE created_at < ?'),
  purgeRooms: db.prepare(`
    DELETE FROM rooms
    WHERE created_at < ? AND code NOT IN (SELECT DISTINCT room FROM scores)
  `),
};

/** Saklama süresi geçen kayıtları siler. Açılışta ve günde bir çalışıyor. */
function purge() {
  const cutoff = Date.now() - RETENTION_DAYS * 86400_000;
  const s = q.purgeScores.run(cutoff);
  const r = q.purgeRooms.run(cutoff);
  if (s.changes || r.changes) {
    log(`temizlik: ${s.changes} skor, ${r.changes} oda silindi`);
  }
}

/* ------------------------------------------------------------------- yardımcı */

const log = (...a) => console.log(new Date().toISOString(), ...a);

/**
 * Oda kodu. Karıştırılabilecek harfler (O/0, I/1, L) alfabede yok —
 * kod sesli olarak paylaşılacağı için önemli.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newRoomCode() {
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function normalizeCode(raw) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 6 && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

/**
 * Takma adı temizler. Harf (Türkçe dahil), rakam, boşluk, tire ve alt
 * çizgi dışındaki her şey atılıyor — kontrol karakterleri ve emoji dahil.
 */
function cleanNickname(raw) {
  const n = String(raw ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX);
  return n.length >= 1 ? n : null;
}

function intOrNull(v, min, max) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined; // geçersiz
  const i = Math.round(n);
  return i >= min && i <= max ? i : undefined;
}

/* ---------------------------------------------------------------- hız sınırı */

/**
 * IP başına jeton kovası. Kimlik doğrulaması olmadığı için tek koruma bu.
 * Bellekte tutuluyor; tek örnek çalıştığı için yeterli.
 */
const buckets = new Map();
const LIMITS = { read: { cap: 60, per: 60_000 }, write: { cap: 20, per: 60_000 } };

function allow(ip, kind) {
  const { cap, per } = LIMITS[kind];
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const b = buckets.get(key) ?? { tokens: cap, at: now };
  b.tokens = Math.min(cap, b.tokens + ((now - b.at) / per) * cap);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

// Kovaları arada bir temizle, sonsuz büyümesin.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, v] of buckets) if (v.at < cutoff) buckets.delete(k);
}, 5 * 60_000).unref();

function clientIp(req) {
  // Caddy önde: X-Forwarded-For'un ilk değeri gerçek istemci.
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket.remoteAddress || 'bilinmiyor';
}

/* -------------------------------------------------------------------- yanıtlar */

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(data);
}

const bad = (res, msg) => send(res, 400, { error: msg });

function readJson(req, limitBytes = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('govde cok buyuk'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('gecersiz JSON'));
      }
    });
    req.on('error', reject);
  });
}

/* ------------------------------------------------------------------ uçnoktalar */

async function route(req, res, url) {
  const ip = clientIp(req);
  const method = req.method;

  if (url.pathname === '/health') {
    return send(res, 200, { ok: true, time: Date.now() });
  }

  // POST /api/rooms -> yeni oda
  if (url.pathname === '/api/rooms' && method === 'POST') {
    if (!allow(ip, 'write')) return send(res, 429, { error: 'cok fazla istek' });
    if (q.countRooms.get().n >= 10000) {
      return send(res, 507, { error: 'oda siniri doldu' });
    }
    for (let i = 0; i < 8; i += 1) {
      const code = newRoomCode();
      if (!q.roomExists.get(code)) {
        q.createRoom.run(code, Date.now());
        log(`oda olusturuldu: ${code}`);
        return send(res, 201, { code });
      }
    }
    return send(res, 500, { error: 'kod uretilemedi' });
  }

  const m = url.pathname.match(/^\/api\/rooms\/([^/]+)(\/scores|\/leaderboard)?$/);
  if (!m) return send(res, 404, { error: 'bulunamadi' });

  const code = normalizeCode(decodeURIComponent(m[1]));
  if (!code) return bad(res, 'gecersiz oda kodu');
  const sub = m[2];

  // GET /api/rooms/:code -> oda var mı
  if (!sub && method === 'GET') {
    if (!allow(ip, 'read')) return send(res, 429, { error: 'cok fazla istek' });
    const room = q.roomExists.get(code);
    if (!room) return send(res, 404, { error: 'oda yok' });
    return send(res, 200, {
      code,
      createdAt: room.created_at,
      playerCount: q.playerCount.get(code).n,
    });
  }

  // GET /api/rooms/:code/leaderboard
  if (sub === '/leaderboard' && method === 'GET') {
    if (!allow(ip, 'read')) return send(res, 429, { error: 'cok fazla istek' });
    if (!q.roomExists.get(code)) return send(res, 404, { error: 'oda yok' });
    return send(res, 200, { code, entries: q.leaderboard.all(code) });
  }

  // POST /api/rooms/:code/scores
  if (sub === '/scores' && method === 'POST') {
    if (!allow(ip, 'write')) return send(res, 429, { error: 'cok fazla istek' });
    if (!q.roomExists.get(code)) return send(res, 404, { error: 'oda yok' });

    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return bad(res, e.message);
    }

    const nickname = cleanNickname(body.nickname);
    if (!nickname) return bad(res, 'takma ad gecersiz');

    const correct = intOrNull(body.correct, 0, MAX_QUESTIONS);
    const mistakes = intOrNull(body.mistakes, 0, MAX_MISTAKES);
    const lightning = intOrNull(body.lightning, 0, MAX_QUESTIONS);
    const avgMs = intOrNull(body.avgMs, MIN_MS, MAX_MS);
    const fastestMs = intOrNull(body.fastestMs, MIN_MS, MAX_MS);

    if (correct === undefined || correct === null) return bad(res, 'correct gecersiz');
    if (mistakes === undefined || mistakes === null) return bad(res, 'mistakes gecersiz');
    if (lightning === undefined || lightning === null) return bad(res, 'lightning gecersiz');
    if (avgMs === undefined || fastestMs === undefined) return bad(res, 'sure gecersiz');

    // Oyunun kurallarıyla tutarlılık: uydurma skorlar burada eleniyor.
    if (correct + mistakes > MAX_QUESTIONS) return bad(res, 'soru sayisi tutmuyor');
    if (lightning > correct) return bad(res, 'simsek sayisi dogrudan fazla olamaz');
    if (fastestMs !== null && avgMs !== null && fastestMs > avgMs) {
      return bad(res, 'en hizli cevap ortalamadan buyuk olamaz');
    }

    q.addScore.run(code, nickname, correct, mistakes, lightning, avgMs, fastestMs, Date.now());

    const entries = q.leaderboard.all(code);
    const rank = entries.findIndex((e) => e.nickname === nickname) + 1;
    return send(res, 201, { ok: true, rank: rank || null, entries });
  }

  return send(res, 405, { error: 'yontem desteklenmiyor' });
}

/* ---------------------------------------------------------------------- sunucu */

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    return bad(res, 'gecersiz istek');
  }
  route(req, res, url).catch((e) => {
    log('HATA', e?.message ?? e);
    if (!res.headersSent) send(res, 500, { error: 'sunucu hatasi' });
  });
});

server.headersTimeout = 10_000;
server.requestTimeout = 15_000;

purge();
setInterval(purge, 24 * 3600_000).unref();

server.listen(PORT, () => log(`liderlik sunucusu ${PORT} portunda, saklama ${RETENTION_DAYS} gun`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    log(`${sig} alindi, kapaniyor`);
    server.close(() => {
      try {
        db.close();
      } catch {
        /* yoksay */
      }
      process.exit(0);
    });
  });
}
