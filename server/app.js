import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import db from './db.js';
import { goalsOf, validateMatch } from './match.js';

const app = express();
app.use(cors());
app.use(express.json());

const AVATARS = ['⚽', '🧤', '🦁', '🐺', '🦅', '🔥', '⭐', '👑', '🐉', '🚀', '🐯', '⚡'];
const LEVELS = ['easy', 'medium', 'hard'];

// --- Parol xeshlash (scrypt, qo'shimcha kutubxonasiz) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', token, userId);
  return token;
}

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  avatar: u.avatar,
  favoriteTeam: u.favorite_team,
  createdAt: u.created_at,
});

// --- Ro'yxatdan o'tish ---
app.post('/api/register', async (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: "Login 3–20 belgi bo'lishi kerak (harf, raqam, _)" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email noto'g'ri" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 belgi bo'lishi kerak" });
  }

  const exists = await db.get('SELECT username, email FROM users WHERE username = ? OR email = ?', username, email);
  if (exists) {
    const field = exists.username.toLowerCase() === username.toLowerCase() ? 'Bu login' : 'Bu email';
    return res.status(409).json({ error: `${field} allaqachon band` });
  }

  const result = await db.run(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    username,
    email,
    hashPassword(password)
  );
  const user = await db.get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);

  res.status(201).json({ token: await createSession(user.id), user: publicUser(user) });
});

// --- Kirish (login yoki email bilan) ---
app.post('/api/login', async (req, res) => {
  const login = String(req.body?.login ?? '').trim();
  const password = String(req.body?.password ?? '');

  const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', login, login.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  res.json({ token: await createSession(user.id), user: publicUser(user) });
});

// --- Joriy foydalanuvchi ---
async function auth(req, res, next) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const user = await db.get(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
    token
  );
  if (!user) return res.status(401).json({ error: 'Avtorizatsiya kerak' });
  req.user = user;
  req.token = token;
  next();
}

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/logout', auth, async (req, res) => {
  await db.run('DELETE FROM sessions WHERE token = ?', req.token);
  res.json({ ok: true });
});

// --- Profil ---
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function buildStats(games) {
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, { games: 0, wins: 0 }]));
  let wins = 0, goalsFor = 0, goalsAgainst = 0, shots = 0, cpuShots = 0, saves = 0, run = 0, best = 0;

  for (const g of games) {
    const cpu = JSON.parse(g.cpu_kicks);
    goalsFor += g.player_goals;
    goalsAgainst += g.cpu_goals;
    shots += JSON.parse(g.player_kicks).length;
    cpuShots += cpu.length;
    saves += cpu.filter((o) => o === 'saved').length;
    byLevel[g.difficulty].games++;
    if (g.result === 'win') {
      wins++;
      byLevel[g.difficulty].wins++;
      best = Math.max(best, ++run);
    } else {
      run = 0;
    }
  }

  return {
    games: games.length,
    wins,
    losses: games.length - wins,
    winRate: pct(wins, games.length),
    goalsFor,
    goalsAgainst,
    shots,
    accuracy: pct(goalsFor, shots),
    saves,
    saveRate: pct(saves, cpuShots),
    bestStreak: best,
    currentStreak: run,
    byLevel,
  };
}

app.get('/api/profile', auth, async (req, res) => {
  const games = await db.all('SELECT * FROM games WHERE user_id = ? ORDER BY id', req.user.id);
  const recent = games
    .slice(-10)
    .reverse()
    .map((g) => ({
      id: g.id,
      difficulty: g.difficulty,
      playerGoals: g.player_goals,
      cpuGoals: g.cpu_goals,
      result: g.result,
      player: JSON.parse(g.player_kicks),
      cpu: JSON.parse(g.cpu_kicks),
      createdAt: g.created_at,
    }));
  res.json({ user: publicUser(req.user), stats: buildStats(games), recent });
});

app.put('/api/profile', auth, async (req, res) => {
  const avatar = String(req.body?.avatar ?? req.user.avatar);
  const favoriteTeam = String(req.body?.favoriteTeam ?? '').trim();
  if (!AVATARS.includes(avatar)) return res.status(400).json({ error: "Bunday avatar yo'q" });
  if (favoriteTeam.length > 40) return res.status(400).json({ error: 'Klub nomi 40 belgidan oshmasin' });

  await db.run('UPDATE users SET avatar = ?, favorite_team = ? WHERE id = ?', avatar, favoriteTeam, req.user.id);
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  res.json({ user: publicUser(user) });
});

app.put('/api/password', auth, async (req, res) => {
  const current = String(req.body?.current ?? '');
  const next = String(req.body?.next ?? '');
  if (!verifyPassword(current, req.user.password_hash)) {
    return res.status(400).json({ error: "Joriy parol noto'g'ri" });
  }
  if (next.length < 6) return res.status(400).json({ error: "Yangi parol kamida 6 belgi bo'lishi kerak" });

  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), req.user.id);
  // boshqa qurilmalardagi sessiyalarni yopamiz
  await db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', req.user.id, req.token);
  res.json({ ok: true });
});

// --- O'yin natijasini saqlash ---
app.post('/api/games', auth, async (req, res) => {
  const difficulty = String(req.body?.difficulty ?? '');
  const { player, cpu } = req.body ?? {};
  if (!LEVELS.includes(difficulty)) return res.status(400).json({ error: "Noma'lum daraja" });

  const result = validateMatch(player, cpu);
  if (!result) return res.status(400).json({ error: "O'yin ma'lumotlari noto'g'ri" });

  const info = await db.run(
    `INSERT INTO games (user_id, difficulty, player_goals, cpu_goals, result, player_kicks, cpu_kicks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    req.user.id,
    difficulty,
    goalsOf(player),
    goalsOf(cpu),
    result,
    JSON.stringify(player),
    JSON.stringify(cpu)
  );
  res.status(201).json({ id: info.lastInsertRowid, result });
});

// --- Telegram bot webhook: /start ga o'yinni ochadigan tugma bilan javob ---
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const WEBAPP_URL = process.env.WEBAPP_URL?.trim();

app.post('/api/telegram', async (req, res) => {
  if (!TG_TOKEN || req.get('x-telegram-bot-api-secret-token') !== TG_SECRET) {
    return res.status(401).json({ error: "Ruxsat yo'q" });
  }

  const message = req.body?.message;
  if (message?.text?.startsWith('/start')) {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: "⚽ Soccer Penalty — kompyuterga qarshi penaltilar seriyasi!\n\nO'ynash uchun pastdagi tugmani bosing.",
        reply_markup: { inline_keyboard: [[{ text: "⚽ O'ynash", web_app: { url: WEBAPP_URL } }]] },
      }),
    });
  }
  // Telegram qayta yubormasligi uchun har doim 200 qaytaramiz
  res.json({ ok: true });
});

// --- Telegram Mini App orqali avtomatik kirish ---
// initData imzosi: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const TG_AUTH_MAX_AGE = 24 * 60 * 60; // soniya

function verifyTelegramInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash') ?? '';
  params.delete('hash');
  const dataCheck = [...params].map(([k, v]) => `${k}=${v}`).sort().join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(TG_TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
  if (hash.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
    return null;
  }

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > TG_AUTH_MAX_AGE) return null;
  try {
    return JSON.parse(params.get('user'));
  } catch {
    return null;
  }
}

// Telegram username'idan bo'sh login tanlaymiz, bo'lmasa tg<id>
async function pickUsername(tgUser) {
  const candidates = [];
  if (/^[a-zA-Z0-9_]{3,20}$/.test(tgUser.username ?? '')) candidates.push(tgUser.username);
  candidates.push(`tg${tgUser.id}`);
  for (const name of candidates) {
    if (!(await db.get('SELECT 1 FROM users WHERE username = ?', name))) return name;
  }
  return `tg${tgUser.id}_${crypto.randomInt(1000, 10000)}`;
}

app.post('/api/telegram-auth', async (req, res) => {
  const tgUser = TG_TOKEN ? verifyTelegramInitData(String(req.body?.initData ?? '')) : null;
  if (!tgUser?.id) return res.status(401).json({ error: "Telegram ma'lumotlari tasdiqlanmadi" });

  let user = await db.get('SELECT * FROM users WHERE telegram_id = ?', tgUser.id);
  if (!user) {
    // Parol bilan kirish uchun ishlatilmaydigan tasodifiy parol
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, telegram_id) VALUES (?, ?, ?, ?)',
      await pickUsername(tgUser),
      `tg${tgUser.id}@telegram.local`,
      hashPassword(crypto.randomBytes(32).toString('hex')),
      tgUser.id
    );
    user = await db.get('SELECT * FROM users WHERE id = ?', result.lastInsertRowid);
  }

  res.json({ token: await createSession(user.id), user: publicUser(user) });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

export default app;
