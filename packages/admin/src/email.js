import nodemailer from 'nodemailer';
import { openPod } from '@a83/orbiter-core';

/**
 * Send a notification email if SMTP is configured.
 * @param {string} podPath
 * @param {string} event   — 'publish' | 'comment'
 * @param {object} ctx     — { collection, slug, username, body? }
 */
export async function sendNotification(podPath, event, ctx = {}) {
  let db;
  try {
    db = openPod(podPath);
    const shouldSend = event === 'publish'
      ? db.getMeta('email.notify_publish') === '1'
      : db.getMeta('email.notify_comment') === '1';
    if (!shouldSend) { db.close(); return; }

    const host = db.getMeta('email.smtp_host') ?? '';
    const port = parseInt(db.getMeta('email.smtp_port') ?? '587', 10);
    const user = db.getMeta('email.smtp_user') ?? '';
    const pass = db.getMeta('email.smtp_pass') ?? '';
    const from = db.getMeta('email.smtp_from') || user;
    const to   = db.getMeta('email.notify_to') ?? '';
    const site = db.getMeta('site.name') ?? 'Orbiter';
    db.close();

    if (!host || !to) return;

    const transport = nodemailer.createTransport({
      host, port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    let subject, text;
    if (event === 'publish') {
      subject = `[${site}] Entry published: ${ctx.collection}/${ctx.slug}`;
      text    = `${ctx.username ?? 'Someone'} just published "${ctx.slug}" in the "${ctx.collection}" collection.`;
    } else {
      subject = `[${site}] New comment on ${ctx.collection}/${ctx.slug}`;
      text    = `${ctx.username ?? 'Someone'} commented on "${ctx.slug}":\n\n${ctx.body ?? ''}`;
    }

    await transport.sendMail({ from, to, subject, text });
  } catch (e) {
    console.warn('[email]', e.message);
    db?.close();
  }
}
