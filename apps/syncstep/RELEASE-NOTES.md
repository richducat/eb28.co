# SyncStep 2.6 (versionCode 19) — dApp Store submission text

## What's new (shown to users)

Wallet connection now uses Solana Mobile's native Mobile Wallet Adapter, so connecting Seed
Vault, Phantom or Solflare on Seeker and Saga completes in one tap. The Wallet tab shows
your connected account and has a Disconnect button. The game retries automatically when the
server is busy, with clearer messages. Same GPS hex map, Syncs, Steppers, streaks and Dig.

## Testing notes (for App Review)

- No account or password. Open the app and allow location; the hex map loads around you.
- Without a wallet you can look around: the map, the Syncs shown on it, and what each one
  contains. Greeting a Syncs, playing Dig and the daily check-in need a connected wallet,
  because your SYNC balance is kept on our server. Tapping them before connecting sends you
  to the Wallet tab with "Connect your wallet first".
- Connect: Wallet tab, **Connect Solana Wallet**. Seed Vault Wallet (or Phantom/Solflare)
  opens. Approve the connection, then approve the sign-in message (free, cannot move funds).
  You return to SyncStep: the Wallet tab shows **Connected · ABCD…WXYZ**, a 20 SYNC welcome
  airdrop is credited, and a **Disconnect wallet** button appears.
- Disconnect: tap **Disconnect wallet**. The account clears, the button changes back to
  Connect Solana Wallet, and the saved session is removed.
- Syncs appear on the hex map around your GPS position; walk into a glowing hex to greet
  one. If the map shows "No signal", turn on Location for SyncStep in Android Settings.
  The Wallet tab, odds and onboarding work anywhere.
- SYNC packs cost real SOL (from 0.005 SOL) and are optional. SYNC is an in-game currency
  and cannot be cashed out, withdrawn or transferred.
- If you see "Server security check blocked the sign-in", wait a few seconds and tap Connect
  again (the app already retries up to three times by itself).
- Backend health: https://sync.chatbotbuilder.store/health. Site, privacy, terms:
  https://eb28.co/syncstep/. Support: richducat@gmail.com
