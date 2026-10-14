#!/usr/bin/env node
/**
 * Send a marketing "new arrivals" advertisement email through the Helped
 * platform's configured SMTP transport (backend/.env) — the known-good email
 * path used by the Express backend ("Tell your friend").
 *
 * Background: the AI Marketing page's Worker path dispatches via Resend, but
 * the deployed Resend sender/domain is rejected, so the send falls back to
 * Make.com (returns "Accepted" but does not deliver). SMTP is used here so the
 * advertisement is actually delivered.
 *
 * Usage:
 *   node --env-file=backend/.env scripts/send-marketing-advertisement.mjs [recipient]
 *
 * nodemailer lives in backend/node_modules, so it is resolved explicitly.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromBackend = createRequire(
  path.resolve(here, "..", "backend", "package.json"),
);
const nodemailer = requireFromBackend("nodemailer");

const RECIPIENT = (process.argv[2] || "nefferoneff@gmail.com").trim();

const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error(`❌ Missing SMTP config: ${missing.join(", ")}`);
  console.error(
    "   Run with the backend env file: node --env-file=backend/.env scripts/send-marketing-advertisement.mjs",
  );
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT || 587);
const secure =
  String(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST.trim(),
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER.trim(),
    pass: process.env.SMTP_PASS.trim(),
  },
});

const subject = "✨ New Domestic Helpers Just Arrived — Helped";

const text = `Hi there,

New helpers have just arrived and are ready for placement.

Handpicked this week:
  • Maria — experienced with infants, excellent cook
  • Siti — strong housekeeping, elderly-friendly
  • Rose — patient with children, good English

Every profile is interviewed, medically screened and reference-checked before
we introduce her to your family.

Interested in meeting a shortlist this week?
Reply to this email or WhatsApp us and we'll arrange the introductions.

Talk soon,
The Helped Team
`;

const html = `<!doctype html>
<html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(145deg,#F9A8D4,#DB2777);border-radius:14px 14px 0 0;padding:28px 24px;color:#fff">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">Helped</p>
      <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25">✨ New Domestic Helpers Just Arrived</h1>
      <p style="margin:10px 0 0;font-size:15px;opacity:.95">Interviewed, screened and ready for placement.</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:24px">
      <p style="margin:0 0 14px">Hi there,</p>
      <p style="margin:0 0 18px">New helpers have just arrived and are ready for placement. Here are a few standouts this week:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="padding:12px;border:1px solid #f3f4f6;border-radius:8px 0 0 8px;width:52px;text-align:center;font-size:20px">👶</td>
          <td style="padding:12px;border:1px solid #f3f4f6"><strong>Maria</strong><br/><span style="color:#6b7280">Infant care · excellent cook</span></td>
        </tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px;border:1px solid #f3f4f6;text-align:center;font-size:20px">🏠</td>
          <td style="padding:12px;border:1px solid #f3f4f6"><strong>Siti</strong><br/><span style="color:#6b7280">Strong housekeeping · elderly-friendly</span></td>
        </tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px;border:1px solid #f3f4f6;text-align:center;font-size:20px">🧒</td>
          <td style="padding:12px;border:1px solid #f3f4f6"><strong>Rose</strong><br/><span style="color:#6b7280">Patient with children · good English</span></td>
        </tr>
      </table>
      <p style="margin:18px 0">Every profile is interviewed, medically screened and reference-checked before we introduce her to your family.</p>
      <p style="margin:0"><strong>Interested in meeting a shortlist this week?</strong> Reply to this email or WhatsApp us and we'll arrange the introductions.</p>
      <p style="margin:22px 0 0;color:#374151">Talk soon,<br/>The Helped Team</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0">You are receiving this as a test of the AI Marketing email dispatch.</p>
  </div>
</body></html>`;

console.log(`📧 Sending advertisement → ${RECIPIENT} via ${process.env.SMTP_HOST}:${port}`);

try {
  await transporter.verify();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER.trim(),
    to: RECIPIENT,
    subject,
    text,
    html,
  });
  console.log("✅ Email sent");
  console.log(`   messageId: ${info.messageId}`);
  console.log(`   accepted : ${JSON.stringify(info.accepted)}`);
  console.log(`   rejected : ${JSON.stringify(info.rejected)}`);
  process.exit(0);
} catch (err) {
  console.error(`❌ Send failed — ${err.message}`);
  process.exit(1);
}
