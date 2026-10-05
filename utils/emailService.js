const nodemailer = require("nodemailer");
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = require("../config/env");

const isProductionSmtp = SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporter = null;

async function ensureTransporter() {
  if (transporter) return transporter;

  if (isProductionSmtp) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  return transporter;
}

async function sendOtpEmail(to, otp) {
  const subject = "Your password reset OTP";
  const text = `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`;
  const html = `
    <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b0f19;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#10b981;margin-top:0;">Password Reset</h2>
      <p>You requested a password reset for your INVENTORY360 account.</p>
      <p style="font-size:18px;font-weight:700;letter-spacing:4px;background:#111827;display:inline-block;padding:12px 20px;border-radius:8px;color:#10b981;margin:12px 0;">${otp}</p>
      <p style="color:#94a3b8;font-size:14px;">This OTP is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  const t = await ensureTransporter();
  const info = await t.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  if (!isProductionSmtp) {
    console.log(`[LOCAL EMAIL] OTP for ${to}: ${otp}`);
    return { ...info, mode: "local", previewOtp: otp };
  }

  console.log(`[EMAIL] OTP sent to ${to}. MessageId: ${info.messageId}`);
  return { ...info, mode: "production" };
}

module.exports = { sendOtpEmail };

