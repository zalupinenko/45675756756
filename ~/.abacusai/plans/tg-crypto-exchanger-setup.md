# Full Setup Plan: tg-crypto-exchanger (Crossflag)

## Context
The user has registered a Cloudflare account and wants a complete setup plan to make the tg-crypto-exchanger project (a P2P crypto exchange with Telegram bot) fully operational. The project currently contains hardcoded test credentials, domain names, and external service URLs. A full setup involves:
1. Cloudflare infrastructure (KV namespace, D1 database, Durable Objects)
2. Database schema migration
3. Environment secrets configuration
4. Critical security fixes (removing test credentials, updating hardcoded URLs)
5. Telegram bot registration and webhook setup
6. External API integrations (Rapira, TronGrid, Moon Wallet)
7. Frontend domain configuration
8. Deployment

---

## Implementation Steps

### **Phase 1: Cloudflare Infrastructure Setup**

#### Step 1.1: Create KV Namespace
```bash
wrangler kv:namespace create DB
```
Expected output: `id: "xxxxxxxxxxxxxxxxxxxxxxxx"`
- **Action**: Copy the ID and update line 7 of `wrangler.toml` (replace current id)

#### Step 1.2: Create D1 Database
```bash
wrangler d1 create us_bal_wal
```
Expected output: Database ID and summary
- **Action**: Copy the database ID and update line 12 of `wrangler.toml` (replace current id)

#### Step 1.3: Update wrangler.toml
**File**: `wrangler.toml`
- Update line 1: Change `name = "rapira-rates-proxy"` to your project name (e.g., `"my-crypto-exchanger"`)
- Update line 7: KV namespace ID from Step 1.1
- Update line 12: D1 database ID from Step 1.2
- Add migrations section (after line 16):
```toml
[[migrations]]
tag = "v1"
new_classes = ["ReservationsDO"]
```

**Critical**: Without the migrations section, Durable Objects will fail on deploy.

#### Step 1.4: Initialize D1 with Schema
**File**: Create `migrations/0001_init.sql` with content:
```sql
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY UNIQUE NOT NULL,
  usdt_trc20_balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

CREATE TABLE IF NOT EXISTS wallet_deposits (
  user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount_dec6 INTEGER NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  ts INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_deposits_tx_hash ON wallet_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_user_id ON wallet_deposits(user_id);

CREATE TABLE IF NOT EXISTS deposits (
  user_id TEXT NOT NULL,
  network TEXT NOT NULL,
  token TEXT NOT NULL,
  to_address TEXT NOT NULL,
  txid TEXT UNIQUE NOT NULL,
  amount_dec6 INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  seen_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  credited_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_txid ON deposits(txid);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);

CREATE TABLE IF NOT EXISTS user_deposit_addresses (
  user_id TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  address TEXT NOT NULL,
  UNIQUE(user_id, network, asset)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_network_asset ON user_deposit_addresses(network, asset);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_id ON user_deposit_addresses(user_id);
```

Apply migration:
```bash
wrangler d1 execute us_bal_wal --file=./migrations/0001_init.sql
```

---

### **Phase 2: Gather Required Secrets**

Before configuring secrets, you need to obtain values from external services:

#### Step 2.1: Telegram Bot
1. Open Telegram and message @BotFather
2. Send `/newbot` and follow prompts to create a bot
3. **Copy**: Bot token (e.g., `6829475834:AAGk7x-...`)
4. Add bot to your admin Telegram group
5. Open the group in browser and note the chat ID (or use @userinfobot)
6. **Copy**: Admin chat ID (e.g., `-1001234567890`)
7. Get your support group chat ID (if different from admin chat)

#### Step 2.2: Rapira API
1. Register at https://rapira.net/
2. Go to Developer Settings / API Keys
3. Generate or copy existing RSA private key (PEM format)
4. **Copy**: RSA private key (full PEM block)
5. **Copy**: Key ID (KID)

#### Step 2.3: TronGrid API
1. Go to https://www.trongrid.io/
2. Register and login
3. Create an API key
4. **Copy**: API key

#### Step 2.4: Generate Your Own Secrets
- Generate `ADMIN_TOKEN`: Random strong string (e.g., `openssl rand -base64 32`)
- Generate `SCANNER_TOKEN`: Random strong string (e.g., `openssl rand -base64 32`)
- Choose `REF_SALT`: Random string (e.g., `openssl rand -base64 16`)
- Choose `WEBSITE_URL`: Your domain (e.g., `https://myexchanger.com`)
- Choose `SUPPORT_TG_URL`: Your support group URL (e.g., `https://t.me/mygroup`)
- Generate `MW_SECRET`: Random string if using Moon Wallet (e.g., `openssl rand -base64 20`)

#### Step 2.5: External Service URLs (optional, can keep defaults for testing)
- `RAPIRA_API_BASE`: `https://api.rapira.net` (default, unlikely to change)
- `MW_WEBHOOK_BASE`: Your Moon Wallet webhook URL or a new Cloudflare Worker URL
- `START_IMAGE_URL`: URL to image for Telegram bot start message
- `ALLOWED_ORIGINS`: Your frontend domains (JSON array)

---

### **Phase 3: Configure Cloudflare Secrets**

**Command pattern**:
```bash
wrangler secret put SECRET_NAME
# Then paste the value and press Enter twice
```

**Required secrets** (in order):
```bash
wrangler secret put TG_BOT_TOKEN          # From Step 2.1
wrangler secret put TG_CHAT_ID            # From Step 2.1
wrangler secret put ADMIN_TOKEN           # From Step 2.4
wrangler secret put SCANNER_TOKEN         # From Step 2.4
wrangler secret put RAPIRA_PRIVATE_KEY    # From Step 2.2 (full PEM)
wrangler secret put RAPIRA_KID            # From Step 2.2
wrangler secret put TRONGRID_API_KEY      # From Step 2.3
wrangler secret put REF_SALT              # From Step 2.4
wrangler secret put BOT_TOKEN             # Same as TG_BOT_TOKEN
```

**Optional secrets** (can skip for first deployment):
```bash
wrangler secret put MW_WEBHOOK_BASE       # From Step 2.5 (Moon Wallet base URL)
wrangler secret put MW_SECRET             # From Step 2.4
wrangler secret put WEBSITE_URL           # From Step 2.4
wrangler secret put SUPPORT_TG_URL        # From Step 2.4
wrangler secret put START_IMAGE_URL       # From Step 2.5
wrangler secret put ALLOWED_ORIGINS       # From Step 2.5 (JSON array)
```

---

### **Phase 4: Fix Critical Security Issues**

#### Step 4.1: Remove Test Code from worker.js
**File**: `worker.js`

1. **Remove hardcoded test username** (Line 6938):
   - Find: `const TEST_USERNAME = "xasxca96";`
   - Delete this entire line
   
2. **Remove or gate test broadcast endpoint** (Lines 6913–6954):
   - OPTION A (Remove): Delete entire block from `if (method === "POST" && path === "/api/admin/broadcast") {` down to closing `}`
   - OPTION B (Gate): Add ADMIN_TOKEN check at the beginning of block:
     ```javascript
     const adminToken = req.headers.get("X-Admin-Token");
     if (adminToken !== env.ADMIN_TOKEN) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
     }
     ```
   - **Recommendation**: Delete test code entirely (OPTION A)

#### Step 4.2: Update Hardcoded URLs in worker.js
**File**: `worker.js`

1. **Moon Wallet webhook URLs** (Lines 1696, 3296, 3305, 3467, 6779):
   - Current: `"https://client-qr-pay.kireeshka73.workers.dev"`
   - Replace with: `env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev"`
   - Or if not using Moon Wallet yet, delete these webhook calls entirely

2. **CORS allowed origins** (Lines 394-398):
   - Current hardcoded domains
   - Replace with:
     ```javascript
     const allowedOrigins = env.ALLOWED_ORIGINS 
       ? JSON.parse(env.ALLOWED_ORIGINS) 
       : ["https://crossflag.org", "https://www.crossflag.org", "https://api.crossflag.org"];
     ```

3. **Start image URL** (Line 6063):
   - Current: `"https://postimg.cc/G4pFyTGM"`
   - Replace with: `env.START_IMAGE_URL || "https://postimg.cc/G4pFyTGM"`

4. **Website URL buttons** (Lines 6067, 6069):
   - Current: `"https://crossflag.org"`
   - Replace with: `env.WEBSITE_URL || "https://crossflag.org"`

5. **Support Telegram URL** (Line 6070):
   - Current: `"https://t.me/crossflag2"`
   - Replace with: `env.SUPPORT_TG_URL || "https://t.me/crossflag2"`

#### Step 4.3: Fix CORS Fallback
**File**: `worker.js` (Line 399)
- Current: Has fallback `*` for unknown origins
- Change to reject unknown origins:
  ```javascript
  const allowOrigin = allowedOrigins.includes(origin) ? origin : null;
  if (!allowOrigin && req.method !== "OPTIONS") {
    return new Response(JSON.stringify({ error: "CORS not allowed" }), { status: 403 });
  }
  ```

---

### **Phase 5: Update Frontend Domains**

The user will need to update domain references in HTML and JS files. These are located in:
- `auth.js` (Line 5)
- `resume-helper.js` (Line 3)
- `auth.html`, `admin.html`, `admin-stats.html`, `admin-deals.html`, `admin-users.html`, `admin-withdrawals.html`, `admin-buy-requests.html`, `bonuses.html`, `buy-request-wait.html`, `buy-order.html`, `account.html`, `buy-request.html`, `admin-attempts.html`, `buy-paid.html`

**Generic approach**: Most files support `WORKER_BASE` from `localStorage.getItem("worker_base")` with fallback to hardcoded domain. User can set custom domain by:
1. Opening browser console: `localStorage.setItem("worker_base", "https://your-api-domain.com")`
2. Or manually updating hardcoded fallback in each file

**For permanent change**:
- Find all instances of `https://api.crossflag.org` and replace with your Worker domain
- Find all instances of `https://crossflag.org` (in bonuses.html, buy-paid.html) and replace with your web app domain
- Update email in `buy-paid.html` (Line 884)

---

### **Phase 6: Set Telegram Webhook**

After deploying the Worker (Phase 7), run:
```bash
curl "https://api.telegram.org/bot<TG_BOT_TOKEN>/setWebhook?url=https://<your-worker-domain>.workers.dev/tg/webhook"
```

Expected response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

### **Phase 7: Deploy Worker**

```bash
wrangler deploy
```

**Expected output**:
```
✓ Uploaded worker.js
✓ Uploaded migrations
✓ Successfully published your Worker
```

**Get your Worker domain**:
```bash
wrangler deployments list
```

---

### **Phase 8: Test Deployment**

1. **Test API connectivity**:
   ```bash
   curl "https://<your-worker-domain>.workers.dev/api/public/quotes"
   ```
   Should return JSON with cryptocurrency quotes.

2. **Test Telegram webhook**:
   - Send `/start` to your bot
   - Should receive start message with image
   - Check that QR code and other buttons work

3. **Test authentication**:
   - Go to your frontend app
   - Try logging in with Telegram
   - Should be able to request and verify auth code

4. **Test wallet functionality**:
   - Check deposit address generation
   - Try initiating a deposit

---

### **Phase 9: Set Up Frontend Hosting**

1. **GitHub Pages** (if using):
   - Push HTML/JS/CSS/PNG/MP4 files to GitHub repo
   - Enable GitHub Pages in repo settings
   - Update CNAME file (if custom domain)

2. **Cloudflare Pages** (recommended):
   - Connect your repo to Cloudflare Pages
   - Set root directory to repository root
   - Deploy
   - Add custom domain if needed

3. **Other static hosts**:
   - Upload files to any static CDN
   - Make sure `CORS_MAX_AGE` and CORS headers allow cross-origin requests

---

### **Phase 10: External Integrations (Optional)**

1. **Moon Wallet** (QR payment integration):
   - If using: Deploy Moon Wallet Worker or proxy service
   - Set `MW_WEBHOOK_BASE` secret to its URL
   - Or: Remove Moon Wallet webhook calls from worker.js (Lines 1696, 3296, 3305, 3467, 6779) if not using

2. **Bybit / HTX** (Mentioned but not fully implemented):
   - Currently incomplete integration
   - Can be implemented later or removed if not needed

---

## Critical Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `wrangler.toml` | Update IDs, name, add migrations | **CRITICAL** |
| `migrations/0001_init.sql` | Create (new file) | **CRITICAL** |
| `worker.js` | Remove test code, fix hardcoded URLs, update CORS | **HIGH** |
| `auth.js` | Update API_BASE (Line 5) | **HIGH** |
| `resume-helper.js` | Update API_BASE (Line 3) | **HIGH** |
| `*.html` files | Update API_BASE fallbacks (14 files) | **HIGH** |
| `bonuses.html` | Update referral links (Lines 648, 722) | **MEDIUM** |
| `buy-paid.html` | Update email, website URL | **MEDIUM** |

---

## Verification Checklist

After completing all steps:

- [ ] KV namespace created and ID in wrangler.toml
- [ ] D1 database created and ID in wrangler.toml
- [ ] Database migration executed successfully
- [ ] All required secrets set via `wrangler secret put`
- [ ] Test code removed from worker.js
- [ ] Hardcoded URLs replaced with env variables
- [ ] Worker deployed: `wrangler deploy`
- [ ] Telegram webhook set
- [ ] Test API endpoints respond correctly
- [ ] Telegram bot receives and responds to messages
- [ ] Frontend loads and connects to API
- [ ] Auth flow works (request code → verify code → get token)
- [ ] Wallet operations work (check balance, deposit address)
- [ ] No console errors in browser or Worker logs

---

## Post-Deployment Steps

1. **Enable logging**: Run `wrangler tail` to monitor Worker logs
2. **Test user registration**: Create test account, verify ref system works
3. **Test buy/sell flows**: Check offer creation, reservation, proof submission
4. **Check Telegram notifications**: Verify bot sends notifications on events
5. **Monitor D1 queries**: Check that database operations are working
6. **Test error handling**: Try invalid requests, check error responses

---

## Important Notes

- **Moon Wallet**: The current code has hardcoded URLs to `https://client-qr-pay.kireeshka73.workers.dev` (someone else's service). Either:
  1. Deploy your own Moon Wallet service, or
  2. Remove Moon Wallet integration from code, or
  3. Replace with your own payment processing solution
  
- **Durable Objects**: Migration is required in wrangler.toml, otherwise deploy will fail with "class not found" error

- **Security**: Never commit secrets to git. Use `wrangler secret` to manage them

- **Testing**: Use `wrangler dev` for local testing before deploying to production

- **Backups**: Implement regular backups of D1 database and KV storage
