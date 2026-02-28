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

  const subject = `[Gravit] ⚠️ Grievance Escalated — ${postTitle}`;

  const text = `
Dear ${roleTitle},

A student grievance on Gravit has been escalated to you and requires your attention.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRIEVANCE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:      ${postTitle}
Channel:    ${channelName} (${category})
Upvotes:    ${upvoteCount}
Urgency:    ${urgencyScore}
Level:      ${escalationLevel}

Content:
${postContent?.substring(0, 500) || '(no content)'}
${postContent?.length > 500 ? '...(truncated)' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have ${responseWindowHours} hours to respond. If not addressed within this window, the grievance will automatically escalate to the next authority level.

View & Respond: ${fullPostUrl}

— Gravit, Student Grievance Platform
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #5865f2, #7c3aed); padding: 24px 32px; color: #fff;">
      <h1 style="margin: 0; font-size: 22px;">⚠️ Grievance Escalated</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">A student issue requires your attention</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #333;">Dear <strong>${roleTitle}</strong>,</p>
      <p style="color: #555; line-height: 1.6;">
        A grievance posted on Gravit has reached your escalation level and needs your response.
      </p>

      <!-- Details card -->
      <div style="background: #f8f9fa; border-left: 4px solid #5865f2; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 8px; color: #1a1b1e; font-size: 16px;">${postTitle}</h3>
        <p style="margin: 0 0 12px; color: #666; font-size: 14px; line-height: 1.5;">
          ${(postContent || '').substring(0, 300)}${(postContent || '').length > 300 ? '...' : ''}
        </p>
        <table style="font-size: 13px; color: #555;">
          <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Channel</td><td>${channelName}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Category</td><td>${category}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Upvotes</td><td>${upvoteCount}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Urgency Score</td><td>${urgencyScore}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Escalation Level</td><td>${escalationLevel}</td></tr>
        </table>
      </div>

      <!-- Timer warning -->
      <div style="background: #fff3cd; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          ⏰ <strong>Response window: ${responseWindowHours} hours.</strong>
          If not addressed, this will auto-escalate to the next authority level.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${fullPostUrl}" style="
          display: inline-block; padding: 12px 32px;
          background: #5865f2; color: #fff; text-decoration: none;
          border-radius: 6px; font-weight: 600; font-size: 15px;
        ">View & Respond</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background: #f8f9fa; border-top: 1px solid #eee; text-align: center;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        Gravit — Student Grievance Platform | ${process.env.INSTITUTION_NAME || 'IIT Jodhpur'}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to, subject, text, html });
}
