// api/payment/check.js — GET ?memo=LK... → { paid, exists, status }
// Frontend gọi mỗi 3s để kiểm tra khách đã chuyển khoản chưa.
import { sql, json } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'method not allowed' });
  }

  const memo = String(req.query.memo || '').trim().toUpperCase();
  if (!memo) {
    return json(res, 400, { error: 'missing memo' });
  }

  const rows = await sql`
    SELECT status FROM orders WHERE memo = ${memo} LIMIT 1
  `;

  if (rows.length === 0) {
    return json(res, 200, { paid: false, exists: false });
  }

  const status = rows[0].status;
  const paid = status === 'paid' || status === 'activated';

  return json(res, 200, { paid, exists: true, status });
}
