# Namecheap support ticket — disable Imunify360 anti-bot on an API subdomain

**Status:** sent to support@namecheap.com from richducat@gmail.com on 2026-09-30 (a re-test that day: 2 of 16 sign-in requests blocked). Waiting on Namecheap.

**Subject:** Imunify360 bot-protection is blocking legitimate JSON API traffic on sync.chatbotbuilder.store

Hello,

`sync.chatbotbuilder.store` (cPanel account `richardd`) is a Node.js/Express JSON API used
only by our Android app SyncStep. It serves no HTML pages. Imunify360's anti-bot / WebShield
layer is intercepting the app's requests:

- `POST /auth/nonce` intermittently returns `403 {"message":"Access denied by Imunify360
  bot-protection. IPs used for automation should be whitelisted"}`.
- CORS preflight `OPTIONS /auth/nonce`, `POST /auth/verify` and `POST /api/checkin`
  intermittently return the HTML "One moment, please…" challenge page (HTTP 200) instead of
  reaching the application.

A mobile app cannot solve a JavaScript splash challenge, so sign-in fails for our users and
the app was rejected by the Solana dApp Store review team because of it.

Please disable the Imunify360 anti-bot challenge (WebShield splash screen) for the subdomain
`sync.chatbotbuilder.store`, or whitelist these paths on it: `/auth/*`, `/api/*`, `/rpc`,
`/buy-packs`, `/health`. Rate limiting and the rest of the WAF can stay on.

Reproduction (from any machine):

```
curl -i -X OPTIONS https://sync.chatbotbuilder.store/auth/nonce \
  -H 'Origin: https://localhost' -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Expected `204` with CORS headers every time; roughly one in three attempts returns the
challenge page.

Thank you,
Richard Ducat
