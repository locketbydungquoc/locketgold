// api/_db.js — Neon helper + shared utilities
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(process.env.DATABASE_URL);

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

export function genMemo(pkg) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return 'LK' + (pkg === 'p3' ? '3' : '15') + rand;
}

export const PACKAGES = {
  p3:  { amount: 30000, label: 'Gói Quay 3s' },
  p15: { amount: 40000, label: 'Gói Quay 15s' },
};
