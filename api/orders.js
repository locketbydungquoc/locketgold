// api/orders.js — POST { username, package } → { memo, amount, qr, bank }
import { sql, json, readBody, genMemo, PACKAGES } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });

  const { username, package: pkg } = await readBody(req);

  const clean = String(username || '').trim().replace(/^@+/, '');
  if (!clean || clean.length < 3 || clean.length > 64) {
    return json(res, 400, { error: 'invalid username' });
  }
  if (!PACKAGES[pkg]) {
    return json(res, 400, { error: 'invalid package' });
  }

  const { amount } = PACKAGES[pkg];
  const memo = genMemo(pkg);

  await sql`
    INSERT INTO orders (memo, username, package, amount, status)
    VALUES (${memo}, ${clean}, ${pkg}, ${amount}, 'pending')
  `;

  const bankBin    = process.env.BANK_BIN    || '970422';
  const bankAcc    = process.env.BANK_ACC    || '';
  const bankHolder = process.env.BANK_HOLDER || '';

  const qr = `https://img.vietqr.io/image/${bankBin}-${bankAcc}-compact2.png`
           + `?amount=${amount}`
           + `&addInfo=${encodeURIComponent(memo)}`
           + `&accountName=${encodeURIComponent(bankHolder)}`;

  return json(res, 200, {
    ok: true,
    memo,
    amount,
    qr,
    bank: { bin: bankBin, acc: bankAcc, holder: bankHolder },
  });
}
