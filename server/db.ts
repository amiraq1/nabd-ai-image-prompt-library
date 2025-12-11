import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // الحد الأقصى للاتصالات
  idleTimeoutMillis: 30000, // وقت الانتظار قبل إغلاق الاتصال
  connectionTimeoutMillis: 5000, // وقت انتظار الاتصال
});

// معالجة أخطاء الاتصال
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// التحقق من الاتصال عند بدء التشغيل
pool.connect()
  .then(client => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
  });

export const db = drizzle(pool, { schema });
export { pool };
