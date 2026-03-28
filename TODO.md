## Cloudflare Worker Migration TODO

✅ **1. Environment Setup**  
   - [✅] Install deps (`npm i`)  
   - [✅] Fix `wrangler.toml` (KV binding, compat)  
   - [✅] KV setup (`npx wrangler kv:namespace create APP_DATA`, migrate `app-data.json`)

✅ **2. Core Hono API**  
   - [✅] Auth middleware (`requireClientAuth`)  
   - [✅] KV data layer (`loadAppData`, `saveAppData`)  
   - [✅] `/company`, `/maids?visibility=public`, `/maids/:ref`, `/clients/*` (register/login/logout/:id)

✅ **3. Missing Client Dashboard Routes** *(COMPLETE)*  
   - [✅] `GET /client/me` → Return auth client profile  
   - [✅] `GET /client/my-maids` → Client's directSales assignments w/ maids  
   - [✅] `PATCH /direct-sales/:id/{interested|direct-hire|reject}` → Update status  
   - [✅] `GET /direct-sales` → Client's direct sales list  
   - [✅] `PUT /clients/:id` → Client profile update  

✅ **4. Chat System Routes** *(COMPLETE)*  
   - [✅] `GET /chats/conversations` → Client chat threads (support/agency)  
   - [✅] `POST /chats/:clientId` → Send message  
   - [✅] `PUT /chats/mark-read` → Update unread  

✅ **5. TypeScript Fixes**  
   - [✅] KVNamespace import + global APP_DATA  
   - [✅] Hono Variables for clientId/client typing  
   - [✅] All missing interfaces added  

⏳ **6. Testing & Deploy** *(NEXT)*  
   - [ ] `npm run pages:dev` → Test Dashboard: `/client/me`, `/client/my-maids`, PATCH direct-sales  
   - [ ] Test Chats: `/chats/conversations`, POST `/chats/:id`  
   - [ ] Migrate KV: `npx wrangler kv:key put "app-data.json" "$(cat backend/data/app-data.json)" --namespace-id=<ID>`  
   - [ ] `npm run deploy`  
   - [ ] Frontend: Login → Dashboard loads assignments + status updates work  

⏳ **7. Polish**  
   - [ ] Agency-admin endpoints  
   - [ ] Client history page  
   - [ ] Full Zod schemas  
   - [ ] Pagination/error pages

