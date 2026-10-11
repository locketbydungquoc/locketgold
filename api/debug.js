// api/debug.js — tạm thời, xoá sau khi debug xong
import { sql, json } from './_db.js';

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL || '';
  const host = url.replace(/.*@/, '').replace(/\/.*/, '');
  const pw = url.match(/:\/\/[^:]+:([^@]+)@/)?.[1] || '';

  let db_check = 'not tested';
  try {
    const rows = await sql`SELECT COUNT(*)::int as cnt FROM orders`;
    db_check = `orders table exists, count=${rows[0].cnt}`;
  } catch (e) {
    db_check = `ERROR: ${e.message}`;
  }

  return json(res, 200, {
    host,
    pw_tail: pw.slice(-6),
    url_len: url.length,
    db_check,
  });
}
