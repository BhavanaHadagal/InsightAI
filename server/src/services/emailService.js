const nodemailer = require('nodemailer');
const env = require('../config/env');

const isSmtpConfigured = () => {
  return (
    env.SMTP_HOST &&
    env.SMTP_HOST.trim() !== '' &&
    env.SMTP_USER &&
    env.SMTP_USER.trim() !== '' &&
    !env.SMTP_USER.includes('your_smtp_username')
  );
};

const createTransporter = () => {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  if (!isSmtpConfigured()) {
    console.warn(`[DEV NOTE] SMTP is not configured. Password reset link for ${email}: ${resetUrl}`);
    return {
      sent: false,
      devMode: true,
      resetUrl,
      message:
        'SMTP credentials are not configured in server/.env. In development, you can use the generated reset token directly.',
    };
  }

  const transporter = createTransporter();
  const mailOptions = {
    from: `"InsightAI Support" <${env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request - InsightAI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">InsightAI Password Reset</h2>
        <p>You recently requested to reset your password for your InsightAI account.</p>
        <p>Click the button below to reset it. This link is valid for 1 hour:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Link: <a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { sent: true };
};

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
};

