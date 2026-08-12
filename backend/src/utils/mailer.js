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

// ── Shared layout wrapper ────────────────────────────────────────────────────
function emailWrapper(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edutopia</title>
</head>
<body style="margin:0;padding:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f3ea;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(125,16,34,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7d1022,#4a0a15);padding:28px 32px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Edu<span style="color:#c9a84c;">topia</span>
              </span>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
                Premium e-Education Platform
              </p>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#c9a84c,#e8c96d,#c9a84c);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;color:#1f2937;line-height:1.65;font-size:15px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f3ea;padding:20px 32px;text-align:center;border-top:1px solid #e5ddd0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Edutopia Academy &nbsp;·&nbsp;
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Password reset email ─────────────────────────────────────────────────────
async function sendPasswordResetEmail({ to, firstName, code, expiresInMinutes }) {
  if (!hasSmtpConfiguration()) {
    console.log(`[mailer] Password reset code for ${to}: ${code}`);
    return { delivery: 'console' };
  }

  const bodyHtml = `
    <h2 style="margin:0 0 8px;color:#7d1022;font-size:22px;">Réinitialisation du mot de passe</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Password reset request</p>

    <p>Bonjour <strong>${firstName || 'là'}</strong>,</p>
    <p>
      Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte Edutopia.
      Utilisez le code ci-dessous pour continuer :
    </p>

    <div style="margin:28px 0;text-align:center;">
      <div style="display:inline-block;padding:16px 28px;border-radius:14px;background:#fdf6e3;border:2px solid #c9a84c;">
        <span style="font-size:32px;font-weight:800;letter-spacing:0.35em;color:#7d1022;font-family:'Courier New',monospace;">
          ${code}
        </span>
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
        Ce code expire dans <strong>${expiresInMinutes} minutes</strong>.
      </p>
    </div>

    <p>
      Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.
      Votre mot de passe actuel reste inchangé.
    </p>

    <div style="margin-top:24px;padding:14px 18px;border-radius:10px;background:#fff7ed;border-left:4px solid #f59e0b;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>🔒 Sécurité :</strong> Edutopia ne vous demandera jamais votre mot de passe par e-mail ou par téléphone.
        Ne partagez jamais ce code.
      </p>
    </div>
  `;

  const text = [
    `Bonjour ${firstName || 'là'},`,
    '',
    'Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Edutopia.',
    `Votre code : ${code}`,
    `Ce code expire dans ${expiresInMinutes} minutes.`,
    '',
    "Si vous n'avez pas fait cette demande, ignorez cet e-mail.",
    '',
    'Edutopia Academy',
  ].join('\n');

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `${code} — Code de réinitialisation Edutopia`,
    text,
    html: emailWrapper(bodyHtml),
  });

  return { delivery: 'email' };
}

// ── Welcome email on registration ────────────────────────────────────────────
async function sendWelcomeEmail({ to, firstName, userCode, role }) {
  if (!hasSmtpConfiguration()) {
    console.log(`[mailer] Welcome email for ${to} (${firstName}) — code: ${userCode}`);
    return { delivery: 'console' };
  }

  // Code block: shown for students (to share with parents) and parents (own reference)
  const codeBlock = userCode ? `
    <div style="margin:24px 0;padding:20px 24px;border-radius:14px;background:#fdf6e3;border:2px solid #c9a84c;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
        ${role === 'student' ? 'Votre identifiant élève' : role === 'parent' ? 'Votre identifiant parent' : 'Votre identifiant'}
      </p>
      <span style="font-size:28px;font-weight:800;letter-spacing:0.25em;color:#7d1022;font-family:'Courier New',monospace;">
        ${userCode}
      </span>
      ${role === 'student' ? `
      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">
        Partagez ce code avec un parent pour qu'il puisse vous lier à son compte.
      </p>` : ''}
    </div>` : '';

  const bodyHtml = `
    <h2 style="margin:0 0 16px;color:#7d1022;font-size:22px;">
      Bienvenue sur Edutopia, <strong>${firstName}</strong> ! 🎓
    </h2>

    <p>
      Votre compte a été créé avec succès. Nous sommes ravis de vous accueillir sur la plateforme
      d'apprentissage premium Edutopia.
    </p>

    ${codeBlock}

    <p>Avec votre compte vous pouvez :</p>
    <ul style="padding-left:20px;line-height:2;">
      <li>Accéder à des cours vidéo et PDF de qualité</li>
      <li>Suivre votre progression et passer des évaluations</li>
      <li>Parcourir la boutique et commander des ressources pédagogiques</li>
      <li>Contacter notre équipe en cas de besoin</li>
    </ul>

    <div style="margin:28px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?tab=signin"
         style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#7d1022,#4a0a15);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
        Accéder à mon espace
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280;">
      Si vous avez des questions, notre équipe support est disponible depuis la page
      <em>Réclamations</em> de la plateforme.
    </p>
  `;

  const text = [
    `Bienvenue sur Edutopia, ${firstName} !`,
    '',
    'Votre compte a été créé avec succès.',
    userCode ? `Votre identifiant : ${userCode}` : '',
    '',
    'Connectez-vous sur : ' + (process.env.FRONTEND_URL || 'http://localhost:5173'),
    '',
    'Edutopia Academy',
  ].filter(Boolean).join('\n');

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Bienvenue sur Edutopia ! 🎓',
    text,
    html: emailWrapper(bodyHtml),
  });

  return { delivery: 'email' };
}

// ── Subscription activation code ────────────────────────────────────────────
async function sendActivationCodeEmail({ to, firstName, code, expiresInMinutes = 30 }) {
  if (!hasSmtpConfiguration()) {
    console.log(`[mailer] Activation code for ${to}: ${code}`);
    return { delivery: 'console' };
  }

  const bodyHtml = `
    <h2 style="margin:0 0 8px;color:#7d1022;font-size:22px;">Votre code d'activation</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Subscription activation code</p>

    <p>Bonjour <strong>${firstName || 'là'}</strong>,</p>
    <p>
      Votre virement bancaire a été validé par notre équipe. Utilisez le code ci-dessous
      pour activer votre abonnement Edutopia :
    </p>

    <div style="margin:28px 0;text-align:center;">
      <div style="display:inline-block;padding:16px 28px;border-radius:14px;background:#fdf6e3;border:2px solid #c9a84c;">
        <span style="font-size:32px;font-weight:800;letter-spacing:0.35em;color:#7d1022;font-family:'Courier New',monospace;">
          ${code}
        </span>
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
        Ce code expire dans <strong>${expiresInMinutes} minutes</strong>.
      </p>
    </div>

    <p>
      Rendez-vous sur votre espace <strong>Abonnements</strong> et saisissez ce code pour activer votre accès.
    </p>

    <div style="margin:28px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions"
         style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#7d1022,#4a0a15);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
        Activer mon abonnement
      </a>
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `${code} — Code d'activation Edutopia`,
    text: `Bonjour ${firstName},\n\nVotre code d'activation : ${code}\nExpire dans ${expiresInMinutes} minutes.\n\nEdutopia Academy`,
    html: emailWrapper(bodyHtml),
  });

  return { delivery: 'email' };
}

// ── Order status change ──────────────────────────────────────────────────────
const ORDER_STATUS_LABELS = {
  paid:      { label: 'Confirmée et payée',  color: '#059669', icon: '✅' },
  cancelled: { label: 'Annulée',             color: '#dc2626', icon: '❌' },
  refunded:  { label: 'Remboursée',          color: '#7c3aed', icon: '↩️' },
  pending:   { label: 'En attente',          color: '#d97706', icon: '⏳' },
};

async function sendOrderStatusEmail({ to, firstName, orderId, newStatus, total }) {
  if (!hasSmtpConfiguration()) {
    console.log(`[mailer] Order #${orderId} status → ${newStatus} for ${to}`);
    return { delivery: 'console' };
  }

  const info = ORDER_STATUS_LABELS[newStatus] || { label: newStatus, color: '#6b7280', icon: '📦' };

  const bodyHtml = `
    <h2 style="margin:0 0 8px;color:#7d1022;font-size:22px;">Mise à jour de votre commande</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Order #${orderId} status update</p>

    <p>Bonjour <strong>${firstName || 'là'}</strong>,</p>
    <p>Le statut de votre commande <strong>#${orderId}</strong> a été mis à jour :</p>

    <div style="margin:24px 0;padding:18px 24px;border-radius:12px;background:#f9fafb;border-left:4px solid ${info.color};">
      <span style="font-size:20px;">${info.icon}</span>
      <span style="margin-left:10px;font-size:17px;font-weight:700;color:${info.color};">${info.label}</span>
      ${total ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Total : <strong>${Number(total).toFixed(2)} DT</strong></p>` : ''}
    </div>

    ${newStatus === 'paid' ? `
    <p>
      Nous préparons votre commande. Vous serez contacté(e) dès qu'elle est prête pour la livraison.
    </p>` : ''}
    ${newStatus === 'cancelled' ? `
    <p>
      Si vous avez des questions concernant l'annulation, n'hésitez pas à nous contacter via la page Réclamations.
    </p>` : ''}

    <div style="margin:24px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/market"
         style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#7d1022,#4a0a15);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
        Voir mes commandes
      </a>
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Commande #${orderId} — ${info.label} | Edutopia`,
    text: `Bonjour ${firstName},\n\nVotre commande #${orderId} est maintenant : ${info.label}.\n\nEdutopia Academy`,
    html: emailWrapper(bodyHtml),
  });

  return { delivery: 'email' };
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, sendActivationCodeEmail, sendOrderStatusEmail };
