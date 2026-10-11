// lib/telegram.js — gửi thông báo + bridge kích hoạt Gold qua Telegram
const TG = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_ADMIN_CHAT_ID;

async function tgSend(text) {
  if (!TG || !ADMIN) {
    return { ok: false, reason: 'telegram not configured' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return r.ok ? { ok: true } : { ok: false, reason: await r.text() };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/**
 * Kích hoạt Gold cho một username.
 *
 * Cách hoạt động:
 *   - Nếu BOT_ACTIVATION_WEBHOOK được cấu hình → POST { username, package, memo }
 *     sang endpoint đó (bot tự kích Gold), chờ bot trả JSON { ok: true/false }.
 *   - Nếu chưa cấu hình → chỉ gửi thông báo cho admin qua Telegram, admin tự
 *     chạy lệnh kích hoạt thủ công.
 */
export async function activateGold({ username, package: pkg, memo }) {
  const hook = process.env.BOT_ACTIVATION_WEBHOOK;
  const secret = process.env.BOT_ACTIVATION_SECRET || '';

  // ── Có webhook bot → gọi tự động ──
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': secret,
        },
        body: JSON.stringify({ username, package: pkg, memo }),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok || data.ok === false) {
        await tgSend(
          `⚠️ <b>Kích hoạt thất bại</b>\n` +
          `User: <code>${username}</code>\n` +
          `Memo: <code>${memo}</code>\n` +
          `Gói: <b>${pkg}</b>\n` +
          `Lỗi: <code>${data.msg || r.status}</code>`
        );
        return { ok: false, msg: data.msg || 'activation failed' };
      }

      await tgSend(
        `✅ <b>Kích hoạt thành công</b>\n` +
        `User: <code>${username}</code>\n` +
        `Memo: <code>${memo}</code>\n` +
        `Gói: <b>${pkg}</b>`
      );
      return { ok: true };
    } catch (e) {
      await tgSend(
        `❌ <b>Lỗi gọi activation webhook</b>\n` +
        `User: <code>${username}</code>\n` +
        `Memo: <code>${memo}</code>\n` +
        `Err: <code>${String(e)}</code>`
      );
      return { ok: false, msg: 'activation request failed' };
    }
  }

  // ── Chưa có webhook → notify admin ──
  await tgSend(
    `🟡 <b>Đơn mới chờ kích hoạt</b>\n` +
    `User: <code>${username}</code>\n` +
    `Memo: <code>${memo}</code>\n` +
    `Gói: <b>${pkg}</b>\n` +
    `→ Chạy lệnh kích hoạt thủ công.`
  );
  return { ok: true, manual: true };
}
