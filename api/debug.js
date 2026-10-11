// api/debug.js — tạm thời
import { sql, json } from './_db.js';

export default async function handler(req, res) {
  const rows = await sql`
    SELECT memo, username, package, status FROM orders
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const exact = await sql`
    SELECT memo, status FROM orders WHERE memo = 'LK3CWC1V' LIMIT 1
  `;
  return json(res, 200, {
    all_orders: rows,
    exact_match: exact,
    memo_tested: 'LK3CWC1V',
  });
}
