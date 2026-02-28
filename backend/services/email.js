import nodemailer from 'nodemailer';

/**
 * Email Service — Google SMTP (Gmail App Password)
 *
 * Required env vars:
 *   SMTP_HOST     — SMTP server (default: smtp.gmail.com)
 *   SMTP_PORT     — port (587 for STARTTLS, 465 for SSL)
 *   SMTP_USER     — your Gmail address
 *   SMTP_PASS     — 16-char App Password (NOT your Google password)
 *   SMTP_FROM     — display name + address, e.g. "Gravit <mayankbansal0915@gmail.com>"
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️  SMTP_USER / SMTP_PASS not set — emails will be logged to console only');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,   // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  // Verify connection on first use
  transporter.verify()
    .then(() => console.log('✅ SMTP transporter verified'))
    .catch((err) => console.error('❌ SMTP verification failed:', err.message));

  return transporter;
}

/**
 * Send a single email.
 * Falls back to console.log if SMTP is not configured.
 */
export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'gravit@iitj.ac.in';

  if (!t) {
    // Dev fallback — just log it
    console.log('📧 [EMAIL-DRY-RUN]');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${text?.substring(0, 200) || '(html only)'}...`);
    return { messageId: 'dry-run', accepted: [to] };
  }

  try {
    const info = await t.sendMail({ from, to, subject, text, html });
    console.log(`📧 Email sent to ${to} — msgId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Build and send an escalation notification email.
 */
export async function sendEscalationEmail({
  to,
  roleTitle,
  postTitle,
  postContent,
  channelName,
  category,
  upvoteCount,
  urgencyScore,
  escalationLevel,
  postUrl,
  responseWindowHours,
}) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fullPostUrl = postUrl.startsWith('http') ? postUrl : `${frontendUrl}${postUrl}`;
  const institution = process.env.INSTITUTION_NAME || 'IIT Jodhpur';
  const hasDeadline = responseWindowHours && responseWindowHours > 0;

  const subject = `Escalation: ${postTitle} — Gravit`;

  const text = `
${roleTitle},

A grievance requires your attention.

Title: ${postTitle}
Channel: ${channelName} · ${category}
Upvotes: ${upvoteCount} | Urgency: ${urgencyScore} | Level: ${escalationLevel}

${(postContent || '').substring(0, 400)}${(postContent || '').length > 400 ? '…' : ''}

${hasDeadline ? `Response expected within ${responseWindowHours} hours.` : 'This is the final escalation tier — no further auto-escalation.'}

View: ${fullPostUrl}

Gravit · ${institution}
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#18181b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

  <!-- Top accent bar -->
  <tr><td style="height:4px;background:#6366f1;"></td></tr>

  <!-- Logo / Brand -->
  <tr><td style="padding:28px 36px 0;">
    <span style="font-size:18px;font-weight:700;letter-spacing:-0.3px;color:#18181b;">Gravit</span>
    <span style="font-size:12px;color:#a1a1aa;margin-left:8px;">${institution}</span>
  </td></tr>

  <!-- Main -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6366f1;">Escalation · Level ${escalationLevel}</p>
    <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;line-height:1.3;color:#18181b;">${postTitle}</h1>

    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">
      ${(postContent || '').substring(0, 300)}${(postContent || '').length > 300 ? '…' : ''}
    </p>

    <!-- Meta row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;margin:0 0 24px;">
      <tr>
        <td style="padding:14px 0;width:33%;text-align:center;border-right:1px solid #e4e4e7;">
          <div style="font-size:20px;font-weight:700;color:#18181b;">${upvoteCount}</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">Upvotes</div>
        </td>
        <td style="padding:14px 0;width:34%;text-align:center;border-right:1px solid #e4e4e7;">
          <div style="font-size:20px;font-weight:700;color:#18181b;">${urgencyScore}</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">Urgency</div>
        </td>
        <td style="padding:14px 0;width:33%;text-align:center;">
          <div style="font-size:13px;font-weight:600;color:#18181b;">${channelName}</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">${category}</div>
        </td>
      </tr>
    </table>

    ${hasDeadline ? `
    <!-- Deadline -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:12px 16px;">
        <p style="margin:0;font-size:13px;color:#854d0e;">
          <strong>Response expected within ${responseWindowHours} hours.</strong>
          Unresolved grievances auto-escalate to the next authority.
        </p>
      </td></tr>
    </table>` : `
    <!-- Final tier -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:12px 16px;">
        <p style="margin:0;font-size:13px;color:#166534;">
          <strong>Final escalation tier.</strong> No further auto-escalation will occur.
        </p>
      </td></tr>
    </table>`}

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td align="center">
        <a href="${fullPostUrl}" style="display:inline-block;padding:10px 28px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">View Grievance</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 36px;border-top:1px solid #f4f4f5;">
    <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
      This is an automated notification from Gravit. Do not reply to this email.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
  `.trim();

  return sendEmail({ to, subject, text, html });
}
