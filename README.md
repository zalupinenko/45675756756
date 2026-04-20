# Crossflag (tg-crypto-exchanger)

P2P-криптообменник с интеграцией Telegram-бота.

- **Backend:** один файл `worker.js` (~7560 строк) на Cloudflare Workers
- **Frontend:** статические HTML/CSS/JS (70+ страниц), хостится на GitHub Pages / Cloudflare Pages
- **Хранилища:** Cloudflare KV (`DB`), Cloudflare D1 (`us_bal_wal`), Durable Object `ReservationsDO`
- **Интеграции:** Telegram Bot API, Rapira (курсы/JWT RSA), TronGrid (TRON TRC20), Moon Wallet (QR-оплата); упоминаются Bybit и HTX

В репозитории нет `package.json`, Docker, тестов и SQL-миграций — всё рассчитано на Cloudflare serverless.

---

## Что нужно сделать, чтобы проект полностью заработал

### 1. Инфраструктура Cloudflare

1. Зарегистрироваться в Cloudflare и установить Wrangler:
   ```bash
   npm i -g wrangler
   wrangler login
   ```
2. Создать **свои** KV namespace и D1 базу (ID в `wrangler.toml` — чужие):
   ```bash
   wrangler kv:namespace create DB
   wrangler d1 create us_bal_wal
   ```
3. Подставить полученные ID в `wrangler.toml` (строки 7 и 11).
4. Добавить миграцию Durable Object (без неё `wrangler deploy` упадёт):
   ```toml
   [[migrations]]
   tag = "v1"
   new_classes = ["ReservationsDO"]
   ```
5. При желании переименовать worker (`name = "rapira-rates-proxy"` → ваше).

### 2. Схема БД D1

Таблиц в репо нет — надо восстановить по SQL-запросам внутри `worker.js` (`CREATE TABLE`, `INSERT INTO`, `SELECT ... FROM`). Минимум нужны:

- `user_balances (user_id PK, usdt_trc20_balance INTEGER, updated_at)`
- `wallet_deposits (user_id, address, network, asset, amount_dec6, tx_hash PK, ts)`
- `deposits (user_id, network, token, to_address, txid PK, amount_dec6, status, seen_at, confirmed_at, credited_at)`
- `user_deposit_addresses (user_id, network, asset, address)`

Сохранить SQL в `migrations/0001_init.sql` и применить:
```bash
wrangler d1 execute us_bal_wal --file=./migrations/0001_init.sql
```

### 3. Секреты (через `wrangler secret put <NAME>`)

Обязательные:

| Переменная | Описание |
|---|---|
| `TG_BOT_TOKEN` | Токен Telegram-бота от @BotFather |
| `TG_CHAT_ID` | ID админского чата для уведомлений |
| `ADMIN_TOKEN` | Секрет для доступа к `/api/admin/*` |
| `SCANNER_TOKEN` | Секрет для сканера депозитов `/api/scanner/*` |
| `RAPIRA_PRIVATE_KEY` | RSA private key (PEM) для JWT Rapira |
| `RAPIRA_KID` | Key ID из кабинета Rapira |
| `TRONGRID_API_KEY` | Ключ https://www.trongrid.io/ |
| `REF_SALT` | Произвольная соль для реф-кодов |
| `BOT_TOKEN` | Используется в Durable Object (можно = `TG_BOT_TOKEN`) |

Необязательные (есть дефолты):

| Переменная | Дефолт |
|---|---|
| `TG_NOTIFY_ENABLED` | `1` |
| `TG_USER_NOTIFY_ENABLED` | `1` |
| `USER_TOKEN_TTL_SEC` | `2592000` (30 дней) |
| `DEPOSIT_MIN_CONFIRMATIONS` | `1` |

### 4. Telegram-бот

1. Создать бота у @BotFather, взять токен.
2. После деплоя Worker'а привязать webhook:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<worker>.workers.dev/tg/webhook
   ```
3. Добавить бота в админский чат, получить `TG_CHAT_ID` (например, через @userinfobot).

### 5. Внешние интеграции

- **Rapira** — регистрация, RSA-ключ + KID. Без них не работают курсы и пополнения.
- **TronGrid** — API-ключ. Без него не будут видны TRC20-депозиты.
- **Moon Wallet** — в `worker.js` захардкожен чужой URL `https://client-qr-pay.kireeshka73.workers.dev` (строки **1696, 3296, 3305, 3467, 6779**). Нужно либо развернуть свой сервис, либо заменить/удалить вызовы. **Без этого QR-оплата не работает.**
- **Bybit / HTX** — упоминаются, но интеграция не дописана. Решить, нужна ли.

### 6. Frontend

1. В `worker.js` CORS разрешён только для `crossflag.org`, `www.crossflag.org`, `api.crossflag.org` — добавить свой домен.
2. В `auth.js` и HTML-страницах заменить все ссылки на `api.crossflag.org` / `crossflag.org` → на свой домен Worker'а.
3. Заменить `https://postimg.cc/G4pFyTGM` (стартовая картинка бота, ~строка 6063) на свою.
4. Файл `CNAME` содержит `crossflag.org` — удалить/заменить, если хост под своим доменом.
5. Залить статику на GitHub Pages / Cloudflare Pages / любой статик-хостинг.

### 7. Критические чистки в коде (безопасность)

- **Строка 6938:** захардкожен тестовый юзер `const TEST_USERNAME = "xasxca96"` и тестовый broadcast-эндпоинт (строки 6913–6954). **Удалить или закрыть админской проверкой** — иначе любой может делать рассылки.
- Множество `.catch(() => {})` — минимум логировать, иначе отладка невозможна.
- CORS имеет fallback `*` (строка 399) — ограничить.
- Нет rate-limit на публичных эндпоинтах (`/api/public/auth/*`, `/reserve_offer` и т.п.) — добавить через Cloudflare Rules или в коде.
- Токены сессии живут в `localStorage` → XSS может их украсть. Минимум — настроить CSP на HTML-страницах.
- `resume-helper.js` дергает `/api/public/resume_notify`, которого нет в `worker.js` — реализовать или убрать.

### 8. Рекомендуется (не блокер)

- Разбить `worker.js` на модули, настроить сборку (esbuild / встроенный бандлер Wrangler).
- Добавить `package.json` со скриптами `deploy`, `dev`, `tail`.
- Добавить `.env.example` и `wrangler.toml.example` с плейсхолдерами.
- Smoke-тесты эндпоинтов (Vitest + `@cloudflare/vitest-pool-workers`).
- Логирование через `wrangler tail` / Logpush.
- Бэкапы KV и D1 (cron-экспорт).

---

## Минимальный чек-лист «запустить у себя»

1. Создать Telegram-бота → получить токен и chat id.
2. `wrangler login`, создать KV + D1, прописать ID в `wrangler.toml`.
3. Добавить секцию `[[migrations]]` для `ReservationsDO` в `wrangler.toml`.
4. Написать и применить SQL-миграцию для таблиц D1.
5. Положить все секреты через `wrangler secret put` (см. таблицу выше).
6. В `worker.js` заменить/удалить захардкоженный Moon Wallet URL и тестовый `xasxca96`.
7. В CORS и во фронтенде (HTML/JS) поменять домены на свои.
8. `wrangler deploy`.
9. `setWebhook` на `/tg/webhook` вашего Worker'а.
10. Залить HTML/JS/PNG/MP4 на статик-хостинг, проверить, что фронт стучится в правильный API.

Без пунктов 1–6 и 9 проект не работает вообще; пункт 7 нужен для интеграции с вашим фронтом; остальное — для безопасности и поддерживаемости.

---

## Структура репозитория

```
worker.js              # весь backend (Cloudflare Worker, ~7560 строк)
wrangler.toml          # конфиг Cloudflare
*.html                 # 70+ страниц фронта (qr, buy, sell, auth, admin, wallet, ...)
auth.js                # клиентская авторизация
active-deals.js        # UI активных сделок
resume-helper.js       # восстановление сессии
*.mp4 / *.png          # ассеты
CNAME, robots.txt, sitemap.xml, site.webmanifest
```

## Основные модули backend

- Авторизация: `/api/public/auth/{request_code,verify_code,me}`
- Покупка: `/api/public/buy_offers`, `qr_buy_create`, `reserve_offer`, `mark_paid`, `submit_proof`, `order_status`
- Продажа: `/api/public/sell_offers`, `sell_submit`, `sell_submit_hash`, `sell_payout_add`, `sell_status`
- Кошелёк: `/api/public/wallet/{deposit_address,balance,deposit_request,withdraw_request,...}`
- Рефералы: `/api/public/ref/{me,set,apply,withdraw}`
- История: `/api/public/history/{deals,bonuses,wallet}`
- Админка: `/api/admin/*` (users, offers, broadcast, stats, config, …)
- Сканер депозитов: `/api/scanner/{addresses,report}`
- Telegram webhook: `/tg/webhook` (команды `/start`, `/bal`, `/buyamount_on/off`, callback'и)
