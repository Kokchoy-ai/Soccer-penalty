import app from './app.js';
import { DB_PATH } from './db.js';

// Lokal ishga tushirish. Vercelda esa api/index.js ishlatiladi.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Baza: ${DB_PATH}`);
});
