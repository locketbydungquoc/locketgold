// api/activate.js — POST { username, package, memo } → kích hoạt Gold
// Verify order đã paid + chưa activated → gọi bot → đánh dấu activated.
import { sql, json, readBody } from './_db.js';
import { activateGold } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'method not allowed' });
  }

  const { username, package: pkg, memo } = await readBody(req);

  const clean = String(username || '').trim().replace(/^@+/, '');
  const code  = String(memo || '').trim().toUpperCase();

  if (!clean || !pkg || !code) {
    return json(res, 400, { error: 'missing fields' });
  }

  const rows = await sql`
    SELECT id, status, username, package FROM orders WHERE memo = ${code} LIMIT 1
  `;
  if (rows.length === 0) {
    return json(res, 404, { error: 'order not found' });
  }

  const order = rows[0];

  // Bảo vệ: username + package phải khớp order
  if (order.username !== clean) return json(res, 403, { error: 'username mismatch' });
  if (order.package  !== pkg)   return json(res, 403, { error: 'package mismatch' });

  // Chưa thanh toán → không kích hoạt
  if (order.status === 'pending') return json(res, 402, { error: 'not paid' });

  // Đã kích hoạt rồi → trả OK luôn (idempotent)
  if (order.status === 'activated') {
    return json(res, 200, { ok: true, already: true, memo: code });
  }

  // Gọi bot kích hoạt Gold
  const result = await activateGold({ username: clean, package: pkg, memo: code });

  if (result.ok) {
    await sql`
      UPDATE orders
      SET status = 'activated', activated_at = NOW()
      WHERE id = ${order.id}
    `;
    return json(res, 200, {
      ok: true,
      memo: code,
      manual: result.manual || false,
    });
  }

  return json(res, 500, {
    ok: false,
    msg: result.msg || 'activation failed',
  });
}
