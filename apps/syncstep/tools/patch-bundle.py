#!/usr/bin/env python3
"""Builds www/assets/index-DXPA_3cK.js from the pristine SyncStep 2.5 bundle in tools/original/.
The original TypeScript source is not in any repository, so these are surgical edits of the minified 2.5 bundle.
Every patch must match exactly once. Run from apps/syncstep:  python3 tools/patch-bundle.py"""
import sys
SRC = 'tools/original/index-DXPA_3cK.js'
DST = 'www/assets/index-DXPA_3cK.js'
s = open(SRC, encoding='utf-8').read()
NATIVE = '(window.__syncstepNativeAvailable&&window.__syncstepNativeAvailable())'
PATCHES = [
 # 1. route transact() to the native Mobile Wallet Adapter when running inside the Android shell
 ('async function ht(){return(await Ve(()=>import(`./index.browser-DJdNlifm.js`),[])).transact}',
  'async function ht(){if(' + NATIVE + ')return window.__syncstepNativeTransact;return(await Ve(()=>import(`./index.browser-DJdNlifm.js`),[])).transact}'),
 # 2. bot-shield (Imunify360) responses become a clear, retryable "waf" error instead of a generic outage
 ('async function Rt(e){let t=await e.text(),n=null;if(t)try{n=JSON.parse(t)}catch{}if(!e.ok){',
  'async function Rt(e){let t=await e.text(),n=null;if(t)try{n=JSON.parse(t)}catch{}if(n===null&&t&&/One moment, please|Imunify360|<!doctype html|<html/i.test(t))throw new Dt(`waf`,`The game server\'s security check blocked this request`,e.status);if(e.status===403&&n&&typeof n.message==`string`&&/Imunify360/i.test(n.message))throw new Dt(`waf`,`The game server\'s security check blocked this request`,403);if(!e.ok){'),
 ('no_server:`Sign-in is unavailable right now`',
  'waf:`Server security check blocked the sign-in<small>Wait a few seconds and tap Connect again</small>`,no_server:`Sign-in is unavailable right now`'),
 ("{network:`Couldn't reach the server`,rejected:`Sign-in cancelled`,timeout:`Wallet timed out`}",
  "{network:`Couldn't reach the server`,waf:`Server security check blocked the sign-in<small>Wait a few seconds and tap Connect again</small>`,rejected:`Sign-in cancelled`,timeout:`Wallet timed out`}"),
 ("n===`network`||n===`no_server`?`Couldn't reach the server`:t",
  "n===`waf`?`Server security check blocked the request<small>Wait a moment and try again</small>`:n===`network`||n===`no_server`?`Couldn't reach the server`:t"),
 # 3. native mode: the plugin already reports cancel/timeout, so do not arm the 15 s "abandoned" race on every window focus
 ('window.addEventListener(`focus`,n)', NATIVE + '||window.addEventListener(`focus`,n)'),
 # 3b. native mode: a two-step wallet approval can legitimately take longer than 6 s; do not tell the user to close the wallet
 ("(`Waiting for your wallet…<small>If it's already open, close it and tap Connect again</small>`),6e3)",
  "(`Waiting for your wallet…<small>If it's already open, close it and tap Connect again</small>`),(" + NATIVE + "?9e4:6e3))"),
 # 4. purchases: reuse the wallet token like sign-in does, so paying is ONE wallet session instead of two
 ('async function bt(e){if(!mt())return{ok:!1,why:`no_wallet`};try{return{ok:!0,signature:await(await ht())(async t=>{let n=await t.authorize({chain:`solana:mainnet`,identity:ft});',
  'async function bt(e){if(!mt())return{ok:!1,why:`no_wallet`};try{return{ok:!0,signature:await(await ht())(async t=>{let n=await t.authorize({chain:`solana:mainnet`,identity:ft,...pt?.authToken?{auth_token:pt.authToken}:{}});'),
 # 5. surface "no wallet installed" and timeouts from the native plugin instead of "Connection cancelled"
 ('catch(e){return{ok:!1,why:e?.message===`timeout`?`timeout`:`rejected`}}',
  'catch(e){return{ok:!1,why:e?.code===`ERROR_WALLET_NOT_FOUND`?`no_wallet`:e?.code===`ERROR_SESSION_TIMEOUT`||e?.message===`timeout`?`timeout`:`rejected`}}'),

 # 6. server requests ride out the host's intermittent bot-shield challenge: 3 attempts with backoff (network errors, 5xx gateways and "waf")
 ('for(let e=0;e<2;e++){let t=new AbortController,n=setTimeout(()=>t.abort(),Tt),r;try{r=await fetch(i,{...o,signal:t.signal})}catch(e){s=new Dt(`network`,e?.name===`AbortError`?`Request timed out`:`Network unreachable`);continue}finally{clearTimeout(n)}if(e===0&&(r.status===502||r.status===503||r.status===504)){s=new Dt(`upstream`,`Gateway ${r.status}`,r.status);continue}return Rt(r)}throw s}',
  'for(let e=0;e<3;e++){let t=new AbortController,n=setTimeout(()=>t.abort(),Tt),r;try{r=await fetch(i,{...o,signal:t.signal})}catch(x){s=new Dt(`network`,x?.name===`AbortError`?`Request timed out`:`Network unreachable`);e<2&&await new Promise(z=>setTimeout(z,1200*(e+1)));continue}finally{clearTimeout(n)}if(e<2&&(r.status===502||r.status===503||r.status===504)){s=new Dt(`upstream`,`Gateway ${r.status}`,r.status);await new Promise(z=>setTimeout(z,1200*(e+1)));continue}try{return await Rt(r)}catch(x){if(x&&x.code===`waf`&&e<2){s=x;await new Promise(z=>setTimeout(z,1500*(e+1)));continue}throw x}}throw s}'),
 # 7. clear account state: "Connected · ABCD…WXYZ" plus a Disconnect button that clears the session (no wallet app launch needed)
 ('$(`walletAddr`).textContent=e.wallet?`${e.wallet.slice(0,4)}',
  '$(`walletAddr`).textContent=e.wallet?`Connected · ${e.wallet.slice(0,4)}'),
 ('$(`connectBtn`).hidden=!!e.wallet,',
  '$(`connectBtn`).hidden=!!e.wallet,$(`disconnectBtn`).hidden=!e.wallet,'),
 ('$(`connectBtn`).addEventListener(`click`,async()=>{',
  '$(`disconnectBtn`).addEventListener(`click`,()=>{window.__syncstepNativeForget&&window.__syncstepNativeForget(),pt=null,I.disconnectWallet(),Pt(),Jm(),zm(`Wallet disconnected<small>Tap Connect Solana Wallet to sign in again</small>`,4e3)});$(`connectBtn`).addEventListener(`click`,async()=>{'),
 # 8. connect progress on the button, readable failure toasts (5 s), and the UI matches reality if the sign-in worked but the airdrop request failed
 ('$(`connectBtn`).disabled=!0',
  '$(`connectBtn`).disabled=!0,$(`connectBtn`).textContent=`Connecting…`'),
 ('$(`connectBtn`).disabled=!1,zm({no_wallet:',
  '$(`connectBtn`).disabled=!1,$(`connectBtn`).textContent=`Connect Solana Wallet`,zm({no_wallet:'),
 ("||`Couldn't connect`);return}",
  "||`Couldn't connect`,5e3);return}"),
 ('if($(`connectBtn`).disabled=!1,!o.ok){zm(',
  'if($(`connectBtn`).disabled=!1,$(`connectBtn`).textContent=`Connect Solana Wallet`,!o.ok){I.s.wallet&&Jm();zm('),
 ('||`Sign-in failed`);return}',
  '||`Sign-in failed`,5e3);return}'),
 # 9. buy sheet: a guest is sent to Connect first (not to a dead-end payment sheet); the pack list is re-fetched if the launch-time request failed
 ('function mm(){lm(),Lm(`buySheet`)}',
  'function mm(){if(en()&&!I.s.wallet){Rm();Fm(`wallet`);zm(`Connect your wallet first<small>Tap Connect Solana Wallet to claim your 20 ⬢ airdrop</small>`,4e3);return}im||cm().then(lm).catch(()=>{});lm(),Lm(`buySheet`)}'),
 ('Jm(),o.airdrop?zm(',
  'Jm(),im||cm().catch(()=>{}),o.airdrop?zm('),
]
for old, new in PATCHES:
    if s.count(old) != 1:
        sys.exit('patch target not found exactly once: ' + old[:70])
    s = s.replace(old, new)
open(DST, 'w', encoding='utf-8').write(s)
print(f'{DST}: {len(PATCHES)} patches applied to the pristine 2.5 bundle')
