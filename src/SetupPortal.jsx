import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  KeyRound,
  Landmark,
  Wallet,
  Zap,
} from 'lucide-react';

// Post-purchase setup portal. Everything here is client-side by design:
// wallets connect browser-to-wallet, balances come from public RPCs, and the
// Robinhood authorization happens in the buyer's local cockpit so brokerage
// tokens never touch our servers. We are software, not a custodian.
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const USDCE = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const SOL_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const LS_KEY = 'eb28-setup-portal';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(patch) {
  const next = { ...loadState(), ...patch };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return next;
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result;
}

async function polygonUsdce(address) {
  const data = '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0');
  const raw = await rpc(POLYGON_RPC, 'eth_call', [{ to: USDCE, data }, 'latest']);
  return parseInt(raw, 16) / 1e6;
}

async function solanaBalances(address) {
  const [sol, tok] = await Promise.all([
    rpc(SOLANA_RPC, 'getBalance', [address]),
    rpc(SOLANA_RPC, 'getTokenAccountsByOwner', [address, { mint: SOL_USDC_MINT }, { encoding: 'jsonParsed' }]),
  ]);
  const usdc = (tok?.value || []).reduce(
    (sum, a) => sum + (a.account.data.parsed.info.tokenAmount.uiAmount || 0),
    0,
  );
  return { sol: (sol?.value || 0) / 1e9, usdc };
}

function StepBadge({ done }) {
  return done ? (
    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
  ) : (
    <Circle className="h-6 w-6 shrink-0 text-slate-300" aria-hidden="true" />
  );
}

export default function SetupPortal() {
  const [state, setState] = useState(loadState);
  const [evm, setEvm] = useState(null); // { address, usdce }
  const [phantom, setPhantom] = useState(null); // { address, sol, usdc }
  const [deskWallet, setDeskWallet] = useState(state.deskWallet || '');
  const [deskSol, setDeskSol] = useState(state.deskSol || '');
  const [deskBalances, setDeskBalances] = useState(null);
  const [sendAmt, setSendAmt] = useState('');
  const [msg, setMsg] = useState('');

  const patch = (p) => setState(saveState(p));

  // Refresh the buyer's DESK wallet balances whenever addresses are saved
  useEffect(() => {
    (async () => {
      const out = {};
      try {
        if (deskWallet && /^0x[0-9a-fA-F]{40}$/.test(deskWallet)) out.usdce = await polygonUsdce(deskWallet);
        if (deskSol && deskSol.length >= 32) out.solana = await solanaBalances(deskSol);
        if (Object.keys(out).length) setDeskBalances(out);
      } catch {
        /* balances are best-effort */
      }
    })();
  }, [deskWallet, deskSol]);

  async function connectMetaMask() {
    if (!window.ethereum) {
      setMsg('No EVM wallet found — install MetaMask or Rabby, or do this step from a browser that has one.');
      return;
    }
    try {
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x89', chainName: 'Polygon',
              nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
              rpcUrls: [POLYGON_RPC], blockExplorerUrls: ['https://polygonscan.com'],
            }],
          });
        }
      }
      const usdce = await polygonUsdce(address).catch(() => null);
      setEvm({ address, usdce });
      patch({ evmConnected: true });
      setMsg('');
    } catch {
      setMsg('Wallet connection was cancelled.');
    }
  }

  async function connectPhantom() {
    const provider = window.solana;
    if (!provider?.isPhantom) {
      setMsg('No Phantom wallet found — install Phantom, or do this step from a browser that has it.');
      return;
    }
    try {
      const resp = await provider.connect();
      const address = resp.publicKey.toString();
      const bal = await solanaBalances(address).catch(() => null);
      setPhantom({ address, ...(bal || {}) });
      patch({ phantomConnected: true });
      setMsg('');
    } catch {
      setMsg('Wallet connection was cancelled.');
    }
  }

  async function fundDesk() {
    if (!evm) { setMsg('Connect your wallet first (the orange button above).'); return; }
    if (!/^0x[0-9a-fA-F]{40}$/.test(deskWallet)) { setMsg('Paste your desk wallet address first — it starts with 0x.'); return; }
    const amt = parseFloat(sendAmt);
    if (!amt || amt <= 0) { setMsg('Enter a USDC.e amount to send.'); return; }
    const units = BigInt(Math.round(amt * 1e6)).toString(16).padStart(64, '0');
    const data = '0xa9059cbb' + deskWallet.slice(2).toLowerCase().padStart(64, '0') + units;
    try {
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: evm.address, to: USDCE, data }],
      });
      setMsg('Sent — your wallet shows the transaction. Balances update in about a minute.');
      patch({ funded: true });
    } catch {
      setMsg('Transaction was cancelled in your wallet. Nothing was sent.');
    }
  }

  const steps = [
    { id: 'license', label: 'License received', done: !!state.license },
    { id: 'wallets', label: 'Wallet connected', done: !!(state.evmConnected || state.phantomConnected) },
    { id: 'fund', label: 'Desk funded (optional for paper mode)', done: !!state.funded },
    { id: 'robinhood', label: 'Robinhood linked (Bluechip only)', done: !!state.robinhoodDone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/setup/" className="flex items-center gap-2.5" aria-label="Setup portal home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">$</span>
            <span className="text-lg font-semibold tracking-tight">Desk Setup <span className="font-normal text-slate-500">· EB28</span></span>
          </a>
          <a href="/fundmanager/" className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
            Watch the live tape
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 sm:px-6">
        <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
          Owner setup · takes about 10 minutes
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Let’s stand up your desk.</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
          Four steps, one decision each. Your progress saves in this browser, so if you close the tab
          and come back tomorrow, you pick up exactly where you stopped.
        </p>

        {/* Progress checklist */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <StepBadge done={s.done} />
                <span className={`text-sm ${s.done ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">{msg}</div>
        )}

        {/* Step 1 — license */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
            <KeyRound className="h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Step 1</p>
          <h2 className="mt-1 text-lg font-semibold">Paste your license key</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            It arrived in your onboarding email (within 24 hours of purchase). Haven’t gotten it yet?
            That’s normal on day one — email <span className="font-semibold">social@eb28.co</span> if it’s been longer.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              defaultValue={state.license || ''}
              onBlur={(e) => patch({ license: e.target.value.trim() })}
              placeholder="EB28-XXXX-XXXX"
              className="w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Step 2 — connect wallets */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
            <Wallet className="h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Step 2</p>
          <h2 className="mt-1 text-lg font-semibold">Connect your wallet — one click</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your wallet pops up, you approve, done. This page never holds keys and can’t move a cent
            without your wallet asking you first. Polymarket/Kalshi desks use these; Bluechip buyers can skip to Step 4.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={connectMetaMask} className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
              {evm ? `Connected ${evm.address.slice(0, 6)}…${evm.address.slice(-4)}` : 'Connect MetaMask / Rabby'}
            </button>
            <button onClick={connectPhantom} className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400">
              {phantom ? `Phantom ${phantom.address.slice(0, 4)}…${phantom.address.slice(-4)}` : 'Connect Phantom (Solana)'}
            </button>
          </div>
          {(evm?.usdce != null || phantom) && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {evm?.usdce != null && <div>Your USDC.e on Polygon: <b className="text-slate-900">${evm.usdce.toFixed(2)}</b></div>}
              {phantom && <div>Your Solana: <b className="text-slate-900">{(phantom.sol ?? 0).toFixed(4)} SOL · ${(phantom.usdc ?? 0).toFixed(2)} USDC</b></div>}
            </div>
          )}
        </div>

        {/* Step 3 — fund the desk */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
            <Zap className="h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Step 3 · optional until you go live</p>
          <h2 className="mt-1 text-lg font-semibold">Fund your desk wallet</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Paper mode needs $0 — skip this until you’ve watched your desk work. When you’re ready,
            paste your desk wallet addresses (from your Simmer dashboard) and send from your own wallet.
          </p>
          <div className="mt-4 space-y-3">
            <input
              defaultValue={deskWallet}
              onBlur={(e) => { const v = e.target.value.trim(); setDeskWallet(v); patch({ deskWallet: v }); }}
              placeholder="Desk wallet on Polygon (0x…) — for Polymarket desks"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />
            <input
              defaultValue={deskSol}
              onBlur={(e) => { const v = e.target.value.trim(); setDeskSol(v); patch({ deskSol: v }); }}
              placeholder="Desk wallet on Solana — for Kalshi desks"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />
            {deskBalances && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                {deskBalances.usdce != null && <div>Desk USDC.e balance: <b className="text-slate-900">${deskBalances.usdce.toFixed(2)}</b></div>}
                {deskBalances.solana && <div>Desk Solana balance: <b className="text-slate-900">{deskBalances.solana.sol.toFixed(4)} SOL · ${deskBalances.solana.usdc.toFixed(2)} USDC</b></div>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={sendAmt}
                onChange={(e) => setSendAmt(e.target.value)}
                type="number" min="1" step="1" placeholder="USDC.e amount"
                className="w-40 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
              />
              <button onClick={fundDesk} className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
                Send from my wallet →
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Your wallet pops up to approve — this page never holds keys or moves funds itself. For
              Solana, send USDC from Phantom to your desk address; keep a little SOL for fees.
            </p>
          </div>
        </div>

        {/* Step 4 — Robinhood */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
            <Landmark className="h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Step 4 · Bluechip owners</p>
          <h2 className="mt-1 text-lg font-semibold">Connect Robinhood — on your machine, on purpose</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Robinhood’s Agentic Trading hands your desk a key to a brokerage account. That key belongs
            on <em>your</em> computer, never on our servers — if a website ever offers to hold your
            Robinhood login for a trading bot, close the tab. Here’s how the real connection works:
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
            <li className="flex gap-3"><span className="font-bold text-orange-700">1.</span><span>In the Robinhood app, create your <b>Agentic sub-account</b> (Settings → Investing → Agentic). That walled garden is all your desk will ever see.</span></li>
            <li className="flex gap-3"><span className="font-bold text-orange-700">2.</span><span>In your Desk OS cockpit (installed with your license), click <b>Connect Robinhood</b>. Your browser opens Robinhood’s official authorization page.</span></li>
            <li className="flex gap-3"><span className="font-bold text-orange-700">3.</span><span>Log in <b>on Robinhood’s site</b> and approve. The token lands on your machine, your desk starts in paper mode, and every order still passes Robinhood’s own review step.</span></li>
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => patch({ robinhoodDone: true })} className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400">
              Mark this step done
            </button>
            <a href="mailto:social@eb28.co?subject=Bluechip%20setup%20help" className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">
              Stuck? We’ll do it together on a call
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-blue-950 p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">You’re set</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Watch your desk on paper before a dollar moves.</h2>
          <p className="mt-3 leading-relaxed text-blue-100">
            Every desk starts in paper mode and stays there until you deliberately flip it live in
            your own cockpit. Ours has been on the public tape all along — losses included.
          </p>
          <a href="/fundmanager/" className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-blue-950 transition-colors hover:bg-amber-300">
            Open the live dashboard
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-400">
          EB28 Desk OS is licensed software you install and operate. It is not investment advice, not
          a fund, and not a financial service. We never hold your money, your keys, or your brokerage
          credentials. Trading involves risk of loss. Robinhood does not endorse or sponsor EB28.
        </p>
      </section>
    </div>
  );
}
