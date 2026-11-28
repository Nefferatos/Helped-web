import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { query } from "../db";
import { createRateLimit } from "../middleware/rateLimit";

const router = Router();
const MAX_RECIPIENTS = 25;
const credentials = () => ({ apiId: Number(process.env.TELEGRAM_API_ID), apiHash: process.env.TELEGRAM_API_HASH?.trim() || "" });

const internalAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.TELEGRAM_DIRECT_SERVICE_SECRET?.trim();
  const provided = req.header("x-telegram-direct-secret") || "";
  const secretBuffer = Buffer.from(secret || "");
  const providedBuffer = Buffer.from(provided);
  if (!secret || secretBuffer.length !== providedBuffer.length || !timingSafeEqual(secretBuffer, providedBuffer)) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const encryptionKey = () => {
  const secret = process.env.TELEGRAM_DIRECT_SESSION_KEY?.trim();
  if (!secret) throw new Error("Telegram direct-message session encryption is not configured.");
  return createHash("sha256").update(secret).digest();
};

const seal = (value: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
};

const unseal = (value: string) => {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Stored Telegram account session is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
};

const requireAgencyId = (value: unknown) => {
  const agencyId = Number(value);
  if (!Number.isSafeInteger(agencyId) || agencyId < 1) throw new Error("A valid agency ID is required.");
  return agencyId;
};

const getAccount = async (agencyId: number) => {
  const result = await query("SELECT * FROM telegram_direct_accounts WHERE agency_id = $1 LIMIT 1", [agencyId]);
  return result.rows[0] as { encrypted_session?: string | null; pending_auth?: string | null; account_phone?: string | null } | undefined;
};

const createClient = (session: string) => {
  const { apiId, apiHash } = credentials();
  if (!Number.isSafeInteger(apiId) || apiId < 1 || !apiHash) throw new Error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH on the backend.");
  return new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3, autoReconnect: false });
};

const errorText = (error: unknown) => error instanceof Error ? error.message : "Telegram request failed.";

router.get("/status", internalAuth, async (req, res) => {
  try {
    const agencyId = requireAgencyId(req.query.agencyId);
    const account = await getAccount(agencyId);
    const configured = Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_DIRECT_SESSION_KEY);
    const recent = await query("SELECT id, message, total_recipients, matched_count, successful_count, failed_count, status, created_at, completed_at FROM telegram_direct_broadcasts WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 25", [agencyId]);
    return res.json({ configured, connected: Boolean(account?.encrypted_session), accountPhone: account?.account_phone || null, maxRecipients: MAX_RECIPIENTS, broadcasts: recent.rows });
  } catch (error) { return res.status(503).json({ error: errorText(error) }); }
});

router.post("/login/start", internalAuth, createRateLimit({ keyPrefix: "telegram-direct-login", maxRequests: 5, windowMs: 15 * 60_000 }), async (req, res) => {
  const agencyId = requireAgencyId(req.body?.agencyId);
  const phoneNumber = String(req.body?.phoneNumber || "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) return res.status(400).json({ error: "Enter the Telegram account phone number in international format, such as +639171234567." });
  let client: TelegramClient | null = null;
  try {
    client = createClient("");
    await client.connect();
    const sent = await client.sendCode(credentials(), phoneNumber);
    const pendingAuth = seal(JSON.stringify({ session: client.session.save(), phoneNumber, phoneCodeHash: sent.phoneCodeHash, expiresAt: Date.now() + 10 * 60_000 }));
    await query("INSERT INTO telegram_direct_accounts (agency_id, pending_auth, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (agency_id) DO UPDATE SET pending_auth = EXCLUDED.pending_auth, updated_at = NOW()", [agencyId, pendingAuth]);
    return res.json({ codeSent: true, sentVia: sent.isCodeViaApp ? "Telegram app" : "SMS" });
  } catch (error) { return res.status(502).json({ error: errorText(error) }); }
  finally { await client?.disconnect().catch(() => undefined); }
});

router.post("/login/complete", internalAuth, createRateLimit({ keyPrefix: "telegram-direct-login-verify", maxRequests: 10, windowMs: 15 * 60_000 }), async (req, res) => {
  const agencyId = requireAgencyId(req.body?.agencyId);
  const code = String(req.body?.code || "").trim();
  const password = String(req.body?.password || "");
  if (!/^\d{4,8}$/.test(code)) return res.status(400).json({ error: "Enter the Telegram verification code." });
  let client: TelegramClient | null = null;
  try {
    const account = await getAccount(agencyId);
    if (!account?.pending_auth) return res.status(409).json({ error: "Start Telegram account sign-in again to request a fresh code." });
    const pending = JSON.parse(unseal(account.pending_auth)) as { session: string; phoneNumber: string; phoneCodeHash: string; expiresAt: number; passwordRequired?: boolean };
    if (pending.expiresAt < Date.now()) return res.status(410).json({ error: "The Telegram login code expired. Request a new one." });
    client = createClient(pending.session);
    await client.connect();
    try {
      if (pending.passwordRequired) {
        if (!password) return res.status(428).json({ passwordRequired: true, error: "Enter the Telegram two-step verification password to finish sign-in." });
        await client.signInWithPassword(credentials(), { password: async () => password, onError: async () => true });
      } else {
        await client.invoke(new Api.auth.SignIn({ phoneNumber: pending.phoneNumber, phoneCodeHash: pending.phoneCodeHash, phoneCode: code }));
      }
    } catch (error) {
      if (!errorText(error).includes("SESSION_PASSWORD_NEEDED")) throw error;
      pending.passwordRequired = true;
      await query("UPDATE telegram_direct_accounts SET pending_auth = $1, updated_at = NOW() WHERE agency_id = $2", [seal(JSON.stringify(pending)), agencyId]);
      if (!password) return res.status(428).json({ passwordRequired: true, error: "Enter the Telegram two-step verification password to finish sign-in." });
      await client.signInWithPassword(credentials(), { password: async () => password, onError: async () => true });
    }
    const self = await client.getMe();
    if (!self || self.className !== "User") return res.status(502).json({ error: "Telegram did not confirm the account session." });
    const savedSession = client.session.save();
    if (!savedSession) return res.status(502).json({ error: "Telegram did not return a persistent account session. Please sign in again." });
    await query("INSERT INTO telegram_direct_accounts (agency_id, encrypted_session, pending_auth, account_phone, updated_at) VALUES ($1, $2, NULL, $3, NOW()) ON CONFLICT (agency_id) DO UPDATE SET encrypted_session = EXCLUDED.encrypted_session, pending_auth = NULL, account_phone = EXCLUDED.account_phone, updated_at = NOW()", [agencyId, seal(savedSession), pending.phoneNumber]);
    return res.json({ connected: true, accountPhone: pending.phoneNumber });
  } catch (error) {
    const message = errorText(error);
    const status = /PHONE_CODE_INVALID|PHONE_CODE_EXPIRED|PASSWORD_HASH_INVALID|SESSION_PASSWORD_NEEDED/.test(message) ? 400 : 502;
    return res.status(status).json({ error: message.includes("PASSWORD") ? "The Telegram two-step verification password was not accepted." : "Telegram sign-in could not be completed. Check the code and try again." });
  } finally { await client?.disconnect().catch(() => undefined); }
});

router.post("/logout", internalAuth, async (req, res) => {
  let client: TelegramClient | null = null;
  try {
    const agencyId = requireAgencyId(req.body?.agencyId);
    const account = await getAccount(agencyId);
    if (!account?.encrypted_session) return res.json({ connected: false });
    client = createClient(unseal(account.encrypted_session));
    await client.connect();
    if (await client.checkAuthorization()) await client.logOut();
    await query("DELETE FROM telegram_direct_accounts WHERE agency_id = $1", [agencyId]);
    return res.json({ connected: false });
  } catch (error) { return res.status(502).json({ error: `Could not disconnect the Telegram account: ${errorText(error)}` }); }
  finally { await client?.disconnect().catch(() => undefined); }
});

router.post("/broadcasts", internalAuth, async (req, res) => {
  const agencyId = requireAgencyId(req.body?.agencyId);
  const message = String(req.body?.message || "").trim();
  const consentAcknowledged = req.body?.consentAcknowledged === true;
  const idempotencyKey = String(req.body?.idempotencyKey || "").trim().slice(0, 120);
  const rawNumbers = Array.isArray(req.body?.phoneNumbers) ? req.body.phoneNumbers : [];
  const phoneNumbers: string[] = [...new Set<string>(rawNumbers.map((value: unknown) => String(value).trim()))];
  if (!message || message.length > 4096) return res.status(400).json({ error: "Enter a message between 1 and 4,096 characters." });
  if (!consentAcknowledged) return res.status(400).json({ error: "Confirm that every recipient has agreed to receive messages on Telegram." });
  if (!idempotencyKey) return res.status(400).json({ error: "A unique request key is required." });
  if (!phoneNumbers.length || phoneNumbers.length > MAX_RECIPIENTS || phoneNumbers.some((phone) => !/^\+[1-9]\d{7,14}$/.test(phone))) return res.status(400).json({ error: `Enter 1 to ${MAX_RECIPIENTS} unique phone numbers in international format.` });

  let client: TelegramClient | null = null;
  let auditId: string | null = null;
  let sendsStarted = false;
  let sentCount = 0;
  try {
    const account = await getAccount(agencyId);
    if (!account?.encrypted_session) return res.status(409).json({ error: "Connect a Telegram user account before sending direct messages." });
    const started = await query("INSERT INTO telegram_direct_broadcasts (agency_id, idempotency_key, message, total_recipients, consent_acknowledged, status, created_at) VALUES ($1, $2, $3, $4, TRUE, 'sending', NOW()) ON CONFLICT (agency_id, idempotency_key) DO NOTHING RETURNING id", [agencyId, idempotencyKey, message, phoneNumbers.length]);
    if (!started.rows[0]) return res.status(409).json({ error: "This direct-message request was already submitted. Check its result before trying again." });
    auditId = String(started.rows[0].id);
    client = createClient(unseal(account.encrypted_session));
    await client.connect();
    if (!await client.checkAuthorization()) {
      await query("UPDATE telegram_direct_broadcasts SET status = 'failed', failed_count = total_recipients, completed_at = NOW() WHERE id = $1", [auditId]);
      return res.status(409).json({ error: "The Telegram account session expired. Connect the account again." });
    }

    const imported = await client.importContacts(phoneNumbers.map((phone, index) => ({ phone, firstName: `Recipient ${index + 1}`, clientId: index + 1 })));
    const contactUsers = [...(imported.users || []), ...(await client.getContacts())];
    const byId = new Map(contactUsers.map((user) => [String(user.id), user]));
    const byPhone = new Map(contactUsers.filter((user): user is Api.User => user.className === "User" && Boolean(user.phone)).map((user) => [String(user.phone).replace(/\D/g, ""), user]));
    const recipients = phoneNumbers.map((phone, index) => {
      const importedContact = (imported.imported || []).find((item) => Number(item.clientId) === index + 1);
      return (importedContact && byId.get(String(importedContact.userId))) || byPhone.get(phone.replace(/\D/g, "")) || null;
    });
    const matchedCount = recipients.filter(Boolean).length;
    sendsStarted = true;
    const failures: string[] = [];
    let deliveryUncertain = false;
    for (let index = 0; index < phoneNumbers.length; index += 1) {
      const phone = phoneNumbers[index];
      const recipient = recipients[index];
      if (!recipient) { failures.push(phone); continue; }
      try {
        await client.sendMessage(recipient, { message });
        sentCount += 1;
      } catch { deliveryUncertain = true; failures.push(phone); }
      if (index < phoneNumbers.length - 1) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const failedCount = phoneNumbers.length - sentCount;
    const status = deliveryUncertain ? "uncertain" : failedCount === 0 ? "completed" : sentCount === 0 ? "failed" : "partial";
    await query("UPDATE telegram_direct_broadcasts SET matched_count = $1, successful_count = $2, failed_count = $3, status = $4, completed_at = NOW() WHERE id = $5", [matchedCount, sentCount, failedCount, status, auditId]);
    return res.status(202).json({ broadcastId: auditId, totalRecipients: phoneNumbers.length, matchedCount, sentCount, failedCount, status, failedPhoneNumbers: failures });
  } catch (error) {
    if (auditId) await query("UPDATE telegram_direct_broadcasts SET status = $1, successful_count = $2, failed_count = GREATEST(total_recipients - $2, 0), completed_at = NOW() WHERE id = $3", [sendsStarted ? "uncertain" : "failed", sentCount, auditId]).catch(() => undefined);
    return res.status(502).json({ error: `Telegram direct messages could not be sent: ${errorText(error)}` });
  } finally { await client?.disconnect().catch(() => undefined); }
});

export default router;
