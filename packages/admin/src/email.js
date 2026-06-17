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

/**
 * Send notification email on new form submission.
 * @param {string} podPath
 * @param {string} formId
 * @param {object} data — submitted fields
 */
export async function sendFormNotification(podPath, formId, data = {}) {
  let db;
  try {
    db = openPod(podPath);
    if (db.getMeta('email.notify_form') !== '1') { db.close(); return; }

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

    const fields = Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    await transport.sendMail({
      from, to,
      subject: `[${site}] New form submission: ${formId}`,
      text: `New submission from the "${formId}" form:\n\n${fields}`,
    });
  } catch (e) {
    console.warn('[email]', e.message);
    db?.close();
  }
}

/**
 * Send a reply email from the admin directly to a submitter.
 * Throws on SMTP error so the caller can return a 502.
 */
export async function sendFormReply(podPath, to, subject, text) {
  const db   = openPod(podPath);
  const host = db.getMeta('email.smtp_host') ?? '';
  const port = parseInt(db.getMeta('email.smtp_port') ?? '587', 10);
  const user = db.getMeta('email.smtp_user') ?? '';
  const pass = db.getMeta('email.smtp_pass') ?? '';
  const from = db.getMeta('email.smtp_from') || user;
  db.close();

  if (!host || !from) throw new Error('SMTP not configured — add credentials in Settings → Email');

  const transport = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  await transport.sendMail({ from, to, subject, text });
}
