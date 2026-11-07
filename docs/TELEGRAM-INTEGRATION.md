# Telegram broadcasting and applicant chatbot

The website sends only to rows in `telegram_subscribers` where both
`subscription_status` and `consent_status` are `active`. A phone number,
spreadsheet upload, referral record, or historic WhatsApp opt-in never creates
a Telegram recipient.

## One-time setup

1. Apply `supabase/20261113_ats_referral_leads.sql`,
   `supabase/20261118_telegram_communications.sql`, and
   `supabase/20261119_ats_referral_telegram_invites.sql` to the production
   Supabase project and local database.
   Create an R2 bucket named `helped-telegram-media` and add this binding to
   `wrangler.toml` in environments that accept broadcast attachments:

   ```toml
   [[r2_buckets]]
   binding = "TELEGRAM_MEDIA"
   bucket_name = "helped-telegram-media"
   ```
2. Create/use the agency Telegram bot in BotFather and configure these Worker
   secrets (the token must never be placed in a `VITE_*` variable):

   ```sh
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_BOT_USERNAME
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
   npx wrangler secret put TELEGRAM_AUTOMATION_SECRET
   npx wrangler secret put MAKE_TELEGRAM_BROADCAST_WEBHOOK_URL
   npx wrangler secret put MAKE_TELEGRAM_CHATBOT_WEBHOOK_URL
   ```

   Use a random webhook secret (1–256 characters, Telegram's allowed
   characters only) for `TELEGRAM_WEBHOOK_SECRET`; use a separate random
   secret for Make callbacks. The configured Make URLs must be HTTPS custom
   webhook URLs.
3. Point Telegram updates at the deployed site's `/api/telegram/webhook`.
   Telegram must send the same `TELEGRAM_WEBHOOK_SECRET` as its
   `secret_token` header. Example (substitute values locally; do not commit
   the command with credentials):

   ```sh
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://rinzinagency.com/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message"]}'
   ```

4. Import `make/helped-telegram-broadcast.blueprint.json` and
   `make/helped-telegram-chatbot.blueprint.json` as separate scenarios. Configure
   the broadcast scenario to accept `scenario`,
   `broadcastId`, `agencyId`, `message`, `mediaUrl`, and the server-selected
   `recipients` array. The broadcast starter iterates recipients and sends
   text, images, or documents through Telegram. Honor Telegram 429
   `retry_after`, apply bounded exponential retries, and call
   `POST /api/telegram/automation/delivery-result` after each recipient with
   `x-telegram-automation-secret`. Never send to recipients other than the
   provided rows. The website deduplicates each `(broadcast, chat)` log.
5. Configure the chatbot scenario to accept the update payload and call the
   existing Make AI Agent with Rinzin Agency's approved knowledge base. Keep
   passport/identity document collection on the secure applicant website.
   When an AI response is ready, POST `{conversationId, chatId, message}` to
   `/api/telegram/automation/chat-reply` with the callback secret header. Make
   should progressively extract only relevant non-sensitive applicant fields
   and POST them with `chatId` to `/api/telegram/automation/profile-draft`.
   These answers are stored as an unverified draft on the Telegram subscriber;
   they do not overwrite a verified ATS profile. Make can request human
   handover through `/api/telegram/automation/handover`; admins can also set a
   conversation to `human`, which suppresses automatic AI webhook dispatch
   until resumed.
6. Exercise `/start`, a normal inbound message, `/stop`, bot status, and one
   tightly scoped broadcast with a test subscriber. Verify callback records
   in broadcast logs and conversation messages before widening delivery.

## Current integration contract and known setup work

- `/start` records the Telegram identity and consent and sends a welcome
  message; `/stop` immediately revokes it. Referral Leads can create a
  single-use, expiring deep link that records which referral invitation was
  used when the recipient starts the bot. This records invite usage only; it
  does not verify the Telegram user's identity or phone number and does not
  populate the verified ATS `applicant_id`.
- Bot token status is checked through Telegram `getMe`. The link on the admin
  page and applicant status page is generated from the configured username.
- The broadcast composer supports text, images/documents (when R2 is bound),
  and a nationality filter.
  The database has filter fields for applicant status and experience, ready to
  expose once verified profile linking is configured. Broadcast pause/resume
  and retry UI still require a queue control flow in Make.
- Conversation retrieval, AI response logging, applicant answer drafts, and
  human handover are available. Staff outbound
  messages and assigned administrator identity need a dedicated admin reply
  workflow before use for two-way manual support.
- `TELEGRAM_BOT_TOKEN`, webhook secrets, Make scenario URLs, the applied SQL
  migration, Telegram's webhook registration, and Make scenario activation
  require account-owner configuration. No live Telegram or Make request is
  made by local builds.
