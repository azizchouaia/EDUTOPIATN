const nodemailer = require('nodemailer');

function hasSmtpConfiguration() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.MAIL_FROM
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, firstName, code, expiresInMinutes }) {
  if (!hasSmtpConfiguration()) {
    console.log(`[auth] Password reset code for ${to}: ${code}`);
    return { delivery: 'console' };
  }

  const transporter = createTransporter();
  const subject = 'Edutopia password reset code';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.6;">
      <h2 style="margin:0 0 16px;color:#7d1022;">Password reset request</h2>
      <p>Hello ${firstName || 'there'},</p>
      <p>We received a request to reset your Edutopia password.</p>
      <p style="margin:24px 0;">
        <span style="display:inline-block;padding:14px 18px;border-radius:12px;background:#f7e5a4;color:#7d1022;font-size:24px;font-weight:700;letter-spacing:0.3em;">
          ${code}
        </span>
      </p>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this reset, you can ignore this email.</p>
      <p style="margin-top:24px;color:#6b7280;font-size:12px;">Edutopia Academy</p>
    </div>
  `;
  const text = [
    `Hello ${firstName || 'there'},`,
    '',
    'We received a request to reset your Edutopia password.',
    `Your reset code is: ${code}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request this reset, you can ignore this email.',
    '',
    'Edutopia Academy',
  ].join('\n');

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return { delivery: 'email' };
}

module.exports = {
  sendPasswordResetEmail,
};