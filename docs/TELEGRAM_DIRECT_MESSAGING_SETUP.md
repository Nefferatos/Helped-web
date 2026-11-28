# Telegram direct messaging setup

The Telegram page keeps the existing Bot API broadcast. The additional **Phone numbers** mode signs in a normal Telegram user account using MTProto, imports each supplied number as a contact, then sends one-to-one text messages to contacts Telegram returns. Imported recipients remain in that Telegram account's contacts. Telegram privacy settings can prevent number lookup, so a submitted number is not proof that a Telegram account can be reached.

## Deploy the Node API on Render Free

The Cloudflare `findmaid` Worker hosts the website and proxies the new direct-message endpoints. The Telegram MTProto code is in the existing Express backend under `backend/`; it needs a Node host. The repository now includes a Render Blueprint (`render.yaml`) configured for a free web service. It starts a small server that exposes only the Telegram direct API and health check, rather than the legacy backend's other routes.

1. Push this repository, including `render.yaml`, to the Git provider you use for deployment.
2. In Render, create a **Blueprint** and connect this repository. Render reads `render.yaml`; select the **Free** instance if prompted.
3. Set the requested environment values on the new `telegram-direct-api` service:
   - `DATABASE_URL`: the PostgreSQL connection string for the same Supabase project where the Telegram migration was applied. Use Supabase's server-side connection string, not the browser anon key.
   - `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`: from [my.telegram.org](https://my.telegram.org).
   - `TELEGRAM_DIRECT_SESSION_KEY`: a long, random, private value used to encrypt Telegram login sessions.
   - `TELEGRAM_DIRECT_SERVICE_SECRET`: a different long, random, private value. You will copy this same value into the Cloudflare Worker secret in step 6.
4. Deploy the service. Render assigns it an HTTPS address, usually similar to `https://telegram-direct-api.onrender.com`. Check that `https://<assigned-host>/api/health` returns JSON before continuing.
5. In Cloudflare, open **Workers & Pages → findmaid → Settings → Variables and Secrets → Production**. Add:
   - `TELEGRAM_DIRECT_API_URL` as a text variable, using the assigned host plus `/api/telegram-direct`, for example `https://telegram-direct-api.onrender.com/api/telegram-direct`.
   - `TELEGRAM_DIRECT_SERVICE_SECRET` as a secret, using the exact same value configured on Render.
6. Save and deploy the Worker if Cloudflare prompts you. Reload Telegram Broadcast; the direct account connection card should become available.

Render's free web services sleep after 15 minutes without traffic and may take about a minute to wake. The first status refresh after sleeping can time out; wait for Render to wake and press **Refresh** again. Free instances may restart, so this is suitable for trying the feature, not a production uptime guarantee. See [Render's free service limits](https://render.com/docs/free).

## Get Telegram API credentials

These are the Telegram **user API** credentials, not the bot token:

1. Sign in at [my.telegram.org](https://my.telegram.org) with the phone number for the Telegram account the agency controls. Telegram sends the login code inside the official Telegram app.
2. Open **API development tools** and create an app. Suggested values: app title `At The Agency`, short name `attheagency`, URL `https://rinzinagency.com`, platform **Other**.
3. Save the displayed `api_id` and `api_hash` in a private password manager or directly in the Render service environment. Do not put the hash in website code or send it in chat.
4. In Render, enter them as `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`. The web app then uses these credentials when you sign in to the agency Telegram account.

Telegram's official guide says to get the credentials from API development tools on my.telegram.org and use an up-to-date account phone number. Telegram monitors third-party API clients and prohibits using its API to spam or flood users; send only to people who consented. See [Telegram's API setup guide](https://core.telegram.org/api/obtaining_api_id) and [API Terms of Service](https://core.telegram.org/api/terms).

## Database migration

The backend runs `backend/schema.sql` at startup. The Telegram tables must also exist in the PostgreSQL database named by `DATABASE_URL`:

- For the project's Supabase PostgreSQL database, run `supabase/20261128_telegram_direct_messaging.sql` in Supabase SQL Editor. It enables RLS and removes browser-role access.
- For a separate PostgreSQL database, use `backend/sql/20261128_telegram_direct_messaging.sql` instead.

Running the migration in Supabase is not enough if `DATABASE_URL` points to a different database. Make sure both refer to the same database.

## Sign in and send

1. Open Telegram Broadcast and select **Phone numbers**.
2. Connect an agency Telegram account. Enter its number, the login code Telegram sends, and its two-step password if requested.
3. Enter up to 25 recipient numbers in international format, write the message, and confirm each recipient agreed to receive Telegram messages.
4. Review the sent, unmatched, and failed counts returned after sending.

The direct path currently sends text only. Requests have idempotency keys and are recorded in `telegram_direct_broadcasts`; do not resend a request that returned an uncertain network error until its outcome has been checked. Keep sends small and consent-based: Telegram controls discovery and can limit accounts that send unsolicited messages.

## Secret handling

Keep the Telegram API hash, database connection string, session encryption key, and service secret in Render's environment settings. Keep the service secret in Cloudflare as a Worker secret. Never put these values in frontend code, `wrangler.toml`, or a `VITE_` variable. The service secret must match on both services; the session encryption key only belongs on the Node API.
