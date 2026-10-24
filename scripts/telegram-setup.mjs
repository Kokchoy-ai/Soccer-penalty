// Botni sozlaydi: webhook, menyu tugmasi va buyruqlar.
// Ishga tushirish: npm run telegram:setup  (.env.local dan TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET o'qiladi)
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const appUrl = (process.env.WEBAPP_URL ?? 'https://soccer-penalty-nine.vercel.app').trim();

if (!token || !secret) {
  console.error('.env.local da TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET bo‘lishi kerak');
  process.exit(1);
}

async function call(method, params = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

const me = await call('getMe');
console.log(`Bot: @${me.username}`);

await call('setWebhook', {
  url: `${appUrl}/api/telegram`,
  secret_token: secret,
  allowed_updates: ['message'],
  drop_pending_updates: true,
});
await call('setChatMenuButton', {
  menu_button: { type: 'web_app', text: "O'ynash", web_app: { url: appUrl } },
});
await call('setMyCommands', { commands: [{ command: 'start', description: "O'yinni boshlash" }] });

const info = await call('getWebhookInfo');
console.log(`Webhook: ${info.url}`);
console.log(`Mini App: ${appUrl}`);
console.log(`Havola: https://t.me/${me.username}`);
