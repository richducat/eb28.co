# SyncStep 2.6 (versionCode 19) — dApp Store submission text

## What's new (shown to users)

Wallet connection now uses Solana Mobile's native Mobile Wallet Adapter, so connecting
Seed Vault, Phantom or Solflare on Seeker and Saga completes in one tap. Clearer messages
when the game server is busy, and the same GPS hex map, Syncs, Steppers, streaks and Dig
minigame as before.

## Testing notes (for App Review)

- No account or password is needed. Open the app and allow location; the hex map loads
  around you and Syncs spawn nearby. You can greet Syncs, play Dig and check in before
  connecting a wallet.
- Wallet: Wallet tab → **Connect Solana Wallet**. The device wallet (Seed Vault Wallet on
  Seeker, or Phantom/Solflare) opens; approve, then approve the sign-in message. You return
  to SyncStep with the address shown in the Wallet tab and a 20 SYNC welcome airdrop.
- Disconnect: Wallet tab → **Disconnect**. The address clears and the session is revoked.
- SYNC packs cost real SOL (from 0.005 SOL). Purchases are optional; nothing in the game
  requires one. SYNC is an in-game currency and cannot be cashed out, withdrawn or
  transferred.
- Backend: https://sync.chatbotbuilder.store (health: /health). Site, privacy and terms:
  https://eb28.co/syncstep/
- Support: richducat@gmail.com
