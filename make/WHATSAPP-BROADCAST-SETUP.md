# WhatsApp broadcast and AI replies

This setup uses the WAHA session configured in the imported Make blueprint. The dashboard talks only to the authenticated Cloudflare Worker. Make is the only component that calls WAHA. Apply the SQL migration before opening the page:

```text
supabase/20261123_whatsapp_broadcast.sql
```

It creates agency-scoped contacts, campaigns, recipients, message logs, webhook deduplication, and AI reply settings. Tables have RLS enabled and deny browser roles; only the Worker's server-side Supabase service role can access them.

If the broadcast database was already set up with scheduled campaigns, also apply `supabase/20261124_whatsapp_campaigns_remove_scheduling.sql`. It converts existing scheduled campaigns to drafts and removes the schedule field.

## Import the Make scenarios

Import each blueprint through **Make → Scenarios → Create a new scenario → Import blueprint**:

1. `helped-whatsapp-broadcast.blueprint.json` sends approved campaigns and test messages.
2. `helped-whatsapp-ai-autoreply.blueprint.json` receives WAHA messages, handles opt-outs in the Worker, and sends an AI draft only when the workspace setting is enabled.

After import, create the custom webhook in the first scenario and copy its URL. Configure the Worker secrets (do not put secrets into frontend variables):

```powershell
npx wrangler secret put MAKE_WHATSAPP_BROADCAST_WEBHOOK_URL
npx wrangler secret put WHATSAPP_AUTOMATION_SECRET
```

Paste the Make webhook URL for the first command. For the second, use a long random value and enter the same value in the `x-whatsapp-automation-secret` header fields in the Make blueprints. Deploy the Worker after setting both secrets.

## Connect the existing WAHA

In the imported blueprint, replace `REPLACE_WITH_WAHA_API_KEY` in each `X-Api-Key` header with your WAHA API key. Confirm the configured WAHA host and session match the connected WhatsApp account. The personal chat ID is international digits plus `@c.us`. Make cannot reach a Windows `localhost`; use an authenticated HTTPS tunnel or a restricted cloud host. Do not expose port 3000 publicly without TLS and API-key access.

Configure the existing WAHA `default` session webhook with the AI autoreply scenario's Make custom webhook URL and the `message` and `message.ack` events. You can update the session through WAHA's Dashboard or its sessions API. Sample webhook body:

```json
{
  "event": "message",
  "session": "default",
  "payload": {
    "id": "false_639171234567@c.us_ABC123",
    "from": "639171234567@c.us",
    "fromMe": false,
    "body": "Can you tell me about your services?"
  }
}
```

WAHA API details: [send text](https://github.com/devlikeapro/waha-docs/blob/main/content/docs/how-to/send-messages/index.md), [receive messages and event payloads](https://github.com/devlikeapro/waha-docs/blob/main/content/docs/how-to/receive-messages/index.md), [API-key protection](https://github.com/devlikeapro/waha-docs/blob/main/content/docs/how-to/security/index.md).

### Video sending requirement

For campaigns with an image or video, Make sends the message text first and the media as a separate message beneath it. The media has no caption. Delivery is marked successful only after WAHA accepts the media and the Make callback reaches `/automation/delivery-result`. WAHA's standard Chromium image cannot send WEBJS videos. Use the `devlikeapro/waha:chrome` image and keep the existing `/app/.sessions` mount when recreating the container so the linked WhatsApp session persists. The video request sends `file.mimetype`, `file.filename`, `file.url`, and the active session/chat ID. See WAHA's [Docker image matrix](https://github.com/devlikeapro/waha-docs/blob/main/content/docs/how-to/engines/index.md#docker-images) and [send-video request format](https://github.com/devlikeapro/waha-docs/blob/main/content/docs/how-to/send-messages/index.md#send-video).

## Run a safe first send

1. Open `/dashboard/whatsapp-broadcast` and import a CSV with `name,phone,email,company,tags,consent,consent_source` columns.
2. Mark a test contact `subscribed` only when you have permission documentation. The Worker requires a consent source and rechecks consent when sending.
3. Set Make's broadcast scenario to sequential processing and add a 1–2 second Sleep step between sends. Start with one contact.
4. Use the builder's **Send test**, then create a one-recipient campaign and confirm that the message log and campaign status update.
5. Keep the WAHA session webhook pointed at the Make auto-reply scenario, with both `message` and `message.ack` events enabled. That scenario must forward each event to the Worker `/automation/incoming` endpoint. Text-only broadcasts update from the outgoing `message` event; image/video broadcasts update after the explicit delivery-result callback.
6. In Settings, save the AI reply instructions and enable **AI auto-reply** only after Make's webhook is connected. Send a normal inbound test, then `STOP`, and verify that STOP produces no AI reply and opts the contact out.

The AI is restricted to a known contact, replies only after an inbound message, and cannot initiate marketing. Broadcast sends are marked sent from WAHA's outgoing `message` event; delivery and read statuses update from matching `message.ack` events. WAHA is an unofficial WhatsApp Web integration with account restriction risk; consider the official WhatsApp Business Platform for production.

## API routes

- Admin-authenticated Worker APIs: `/api/whatsapp-broadcast/status`, `/contacts`, `/campaigns`, `/messages`, `/settings`, and the corresponding campaign/contact detail routes.
- Make uses `x-whatsapp-automation-secret` for `/automation/claim/:recipientId`, `/automation/incoming`, `/automation/auto-reply-result`, `/automation/authorize-test`, `/automation/recipient-status/:id`, and `/automation/delivery-result` (after image/video sends).
- Do not share the Supabase service-role credential or WAHA API key with the browser. Make only receives a minimal campaign recipient payload and uses its protected secret connection fields.
