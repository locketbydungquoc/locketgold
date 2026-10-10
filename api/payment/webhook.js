// api/payment/webhook.js — SePay POST khi có biến động số dư
import { sql, json, readBody } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });

  // ── Verify secret ──
  // SePay gửi header: Authorization: Apikey <SECRET>
  const auth = req.headers['authorization'] || '';
  const expected = `Apikey ${process.env.SEPAY_WEBHOOK_SECRET || ''}`;
  if (!process.env.SEPAY_WEBHOOK_SECRET || auth !== expected) {
    return json(res, 401, { error: 'unauthorized' });
  }

  const body = await readBody(req);

  // SePay payload chuẩn: { id, gateway, transactionDate, accountNumber,
  //   content, transferType, transferAmount, referenceCode, ... }
  const content = String(body.content || body.description || '').trim();
  const amount  = parseInt(body.transferAmount || body.amount || 0, 10);
  const refCode = String(body.referenceCode || body.id || '');
  const type    = String(body.transferType || 'in');

  // Chỉ xử lý tiền vào
  if (type !== 'in') return json(res, 200, { ok: true, ignored: 'not inbound' });

  if (!amount || !content) {
    return json(res, 200, { ok: true, ignored: 'missing amount or content' });
  }

  // Tìm memo trong nội dung CK — format LK3XXXXXX / LK15XXXXXX
  const match = content.match(/LK(?:3|15)[A-Z0-9]{6}/i);
  if (!match) return json(res, 200, { ok: true, ignored: 'no memo found' });

  const memo = match[0].toUpperCase();

  const rows = await sql`
    SELECT id, amount, status FROM orders WHERE memo = ${memo} LIMIT 1
  `;
  if (rows.length === 0) {
    return json(res, 200, { ok: true, ignored: 'order not found', memo });
  }

  const order = rows[0];

  if (amount < order.amount) {
    return json(res, 200, {
      ok: true,
      ignored: 'amount too low',
      memo,
      expected: order.amount,
      received: amount,
    });
  }

  if (order.status === 'paid' || order.status === 'activated') {
    return json(res, 200, { ok: true, ignored: 'already paid', memo, status: order.status });
  }

  await sql`
    UPDATE orders
    SET status = 'paid',
        bank_ref = ${refCode},
        raw_webhook = ${JSON.stringify(body)}::jsonb,
        paid_at = NOW()
    WHERE id = ${order.id}
  `;

  return json(res, 200, { ok: true, memo, status: 'paid' });
}
