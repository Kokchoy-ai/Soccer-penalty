# Soccer Penalty

React (Vite) + Express + SQLite. Kompyuterga qarshi penaltilar seriyasi.

## Talab
Node.js 22+ (Node 24 LTS tavsiya etiladi).

## Ishga tushirish
```
npm run install:all
npm run dev
```
- Sayt: http://localhost:5173
- API: http://localhost:3001
- Baza fayli: `server/data/soccer_penalty.db` (birinchi ishga tushganda o'zi yaratiladi)

## Vercelga deploy
Vercelda fayl tizimi saqlanmaydi, shuning uchun baza sifatida [Turso](https://turso.tech) (bulutdagi SQLite) ishlatiladi.
`TURSO_DATABASE_URL` berilmasa, server lokal `server/data/soccer_penalty.db` faylidan foydalanadi.

1. Turso'da baza yarating (sayt orqali yoki CLI bilan):
   ```
   turso db create soccer-penalty
   turso db show soccer-penalty --url      # libsql://...
   turso db tokens create soccer-penalty   # token
   ```
2. Loyihani GitHub'ga yuklang va Vercelda **Add New → Project** orqali import qiling
   (Root Directory: loyiha ildizi; qolgan sozlamalar `vercel.json` da).
3. **Settings → Environment Variables** bo'limiga qo'shing:
   - `TURSO_DATABASE_URL` = `libsql://...`
   - `TURSO_AUTH_TOKEN` = token
4. Deploy qiling. Jadvallar birinchi so'rovda avtomatik yaratiladi.

Tuzilma: `client/dist` statik sayt sifatida, `api/index.js` esa `server/app.js` dagi Express ilovasini serverless funksiya sifatida ishga tushiradi.

## Telegram bot (Mini App)
Bot `/start` ga "⚽ O'ynash" tugmasi bilan javob beradi, menyu tugmasi ham o'yinni Telegram ichida ochadi.
Webhook: `POST /api/telegram` (`server/app.js`).

- Vercel o'zgaruvchilari: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `WEBAPP_URL`
- Botni sozlash (webhook, menyu, buyruqlar): `.env.local` ga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_WEBHOOK_SECRET` yozib, `npm run telegram:setup`

## Sahifalar
- `/register`, `/login` — ro'yxatdan o'tish va kirish
- `/` — bosh menyu: qiyinlik darajasi (Oson / O'rta / Qiyin) va qisqa statistika
- `/play?level=medium` — o'yin
- `/profile` — avatar, sevimli klub, statistika, so'nggi 10 o'yin, parolni o'zgartirish

## O'yin qoidalari
- Har tomon 5 tadan zarba, o'yinchi birinchi uradi; natija oldindan aniq bo'lsa seriya erta tugaydi.
- Durang bo'lsa — qo'shimcha seriya (bittadan zarba, kim farq qilsa).
- Zarba: darvozaga bosib mo'ljal olinadi, keyin kuch shkalasi to'xtatiladi (sichqoncha yoki Probel).
  Chiziqli zonadan (55–85) uzoqlashgan sari to'p tarqaladi; 90+ kuch to'pni to'singa ko'taradi.
- Darvozabon: vaqt tugaguncha 6 zonadan birini tanlash (sichqoncha yoki Q W E / A S D).
- Mantiq: `client/src/game/engine.js`; darajalar sozlamalari `LEVELS` obyektida.

## Baza
- `users` — id, username, email, password_hash (scrypt), avatar, favorite_team, created_at
- `sessions` — token, user_id, created_at
- `games` — user_id, difficulty, player_goals, cpu_goals, result, player_kicks/cpu_kicks (JSON), created_at

Server o'yin natijasini qabul qilishdan oldin zarbalar ketma-ketligini qoidalar bo'yicha tekshiradi (`server/match.js`).
