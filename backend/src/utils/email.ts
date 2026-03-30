import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM_EMAIL = process.env.EMAIL_FROM || 'Klabu <noreply@klabu.site>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your Klabu password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Klabu account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
}
