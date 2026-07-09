import React, { useEffect, useState } from 'react';
import SiteNav from './SiteNav.jsx';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Landmark,
  LineChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';

// Post-purchase setup wizard. One decision per screen, Bluechip-page design
// language, progress persisted locally. Everything stays client-side by
// design: wallets connect browser-to-wallet, balances come from public RPCs,
// and Robinhood authorization happens on the buyer's machine (their desk app
// opens it) so brokerage tokens never touch our servers.
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const USDCE = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const SOL_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const LS_KEY = 'eb28-setup-wizard';
const HELP = 'mailto:social@eb28.co?subject=Setup%20help%20—%20I%27m%20stuck';

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function persist(patch) {
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
    (sum, a) => sum + (a.account.data.parsed.info.tokenAmount.uiAmount || 0), 0,
  );
  return { sol: (sol?.value || 0) / 1e9, usdc };
}

// ─── Wizard chrome ──────────────────────────────────────────────────────────

function Screen({ eyebrow, title, children, note }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
      {note && <p className="mt-6 text-xs leading-relaxed text-slate-400">{note}</p>}
    </div>
  );
}

function PrimaryButton({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
    >
      {children}
    </button>
  );
}

// ─── The wizard ─────────────────────────────────────────────────────────────

export default function SetupPortal() {
  const saved = loadState();
  const [screen, setScreen] = useState(saved.screen || 'welcome');
  const [product, setProduct] = useState(saved.product || null); // 'bluechip' | 'fleet'
  const [license, setLicense] = useState(saved.license || '');
  const [evm, setEvm] = useState(null);
  const [phantom, setPhantom] = useState(null);
  const [deskWallet, setDeskWallet] = useState(saved.deskWallet || '');
  const [deskBal, setDeskBal] = useState(null);
  const [sendAmt, setSendAmt] = useState('');
  const [msg, setMsg] = useState('');

  const go = (next) => { setMsg(''); setScreen(next); persist({ screen: next }); window.scrollTo({ top: 0 }); };

  useEffect(() => {
    (async () => {
      if (deskWallet && /^0x[0-9a-fA-F]{40}$/.test(deskWallet)) {
        try { setDeskBal(await polygonUsdce(deskWallet)); } catch { /* best effort */ }
      }
    })();
  }, [deskWallet]);

  async function connectMetaMask() {
    if (!window.ethereum) {
      setMsg('No wallet extension found. Install MetaMask (metamask.io), then come back — this page will be waiting right here.');
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
            params: [{ chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 }, rpcUrls: [POLYGON_RPC], blockExplorerUrls: ['https://polygonscan.com'] }],
          });
        }
      }
      const usdce = await polygonUsdce(address).catch(() => null);
      setEvm({ address, usdce });
      persist({ evmConnected: true });
      setMsg('');
    } catch { setMsg('The wallet window was closed. No harm done — click Connect again whenever you like.'); }
  }

  async function connectPhantom() {
    const provider = window.solana;
    if (!provider?.isPhantom) {
      setMsg('No Phantom wallet found. Install Phantom (phantom.com), then come back — your progress is saved.');
      return;
    }
    try {
      const resp = await provider.connect();
      const address = resp.publicKey.toString();
      const bal = await solanaBalances(address).catch(() => null);
      setPhantom({ address, ...(bal || {}) });
      persist({ phantomConnected: true });
      setMsg('');
    } catch { setMsg('The wallet window was closed. No harm done — click Connect again whenever you like.'); }
  }

  async function fundDesk() {
    if (!evm) { setMsg('One thing first: connect your wallet with the button above.'); return; }
    if (!/^0x[0-9a-fA-F]{40}$/.test(deskWallet)) { setMsg('Paste your desk address first — it starts with 0x and is in your onboarding email.'); return; }
    const amt = parseFloat(sendAmt);
    if (!amt || amt <= 0) { setMsg('Type how much USDC.e to send.'); return; }
    const units = BigInt(Math.round(amt * 1e6)).toString(16).padStart(64, '0');
    const data = '0xa9059cbb' + deskWallet.slice(2).toLowerCase().padStart(64, '0') + units;
    try {
      await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: evm.address, to: USDCE, data }] });
      persist({ funded: true });
      setMsg('Sent. Your wallet shows the receipt; balances update in about a minute.');
    } catch { setMsg('Cancelled in your wallet — nothing was sent.'); }
  }

  // Screen order per product, for the progress bar
  const FLOWS = {
    bluechip: ['welcome', 'license', 'robinhood', 'done'],
    fleet: ['welcome', 'license', 'wallet', 'fund', 'done'],
  };
  const flow = FLOWS[product] || FLOWS.fleet;
  const stepIndex = Math.max(0, flow.indexOf(screen));
  const pct = Math.round((stepIndex / (flow.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <SiteNav active="/setup/" subtitle="Setup" cta={{ href: HELP, label: 'Get a human' }} />
      {/* Progress bar */}
      {screen !== 'welcome' && (
        <div className="sticky top-[61px] z-30 h-1 w-full bg-slate-100">
          <div className="h-1 bg-orange-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      <section className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        {msg && (
          <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">{msg}</div>
        )}

        {/* ── WELCOME ── */}
        {screen === 'welcome' && (
          <div className="text-center">
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
              Welcome, owner · about 10 minutes
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your desk. Set up in a few taps.</h1>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-slate-600">
              One question per screen. Nothing to figure out. Close the tab anytime — you’ll come
              back to exactly where you left off.
            </p>
            <div className="mx-auto mt-10 grid max-w-lg gap-4 sm:grid-cols-2">
              <button
                onClick={() => { setProduct('bluechip'); persist({ product: 'bluechip' }); go('license'); }}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left transition-all hover:border-orange-500 hover:shadow-lg"
              >
                <Landmark className="h-8 w-8 text-orange-600" aria-hidden="true" />
                <div className="mt-3 text-lg font-bold">Bluechip</div>
                <div className="mt-1 text-sm text-slate-600">The stocks desk, on Robinhood’s official agent rails.</div>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                  Set up Bluechip <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </button>
              <button
                onClick={() => { setProduct('fleet'); persist({ product: 'fleet' }); go('license'); }}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left transition-all hover:border-orange-500 hover:shadow-lg"
              >
                <LineChart className="h-8 w-8 text-orange-600" aria-hidden="true" />
                <div className="mt-3 text-lg font-bold">Desk OS fleet</div>
                <div className="mt-1 text-sm text-slate-600">The prediction-market agents — Polymarket and Kalshi.</div>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                  Set up the fleet <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </button>
            </div>
            <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-slate-400">
              Every desk starts in paper mode — it practices with zero real dollars until you
              deliberately flip it live. We never hold your money, keys, or logins.
            </p>
          </div>
        )}

        {/* ── LICENSE ── */}
        {screen === 'license' && (
          <Screen eyebrow={`Step 1 of ${flow.length - 1}`} title="Paste your license key.">
            <p className="text-sm leading-relaxed text-slate-600">
              It’s in your onboarding email — subject line “Your EB28 desk”. Bought in the last 24
              hours? It may still be on its way; a human sends every one personally.
            </p>
            <div className="mt-5">
              <input
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                onBlur={() => persist({ license: license.trim() })}
                placeholder="EB28-XXXX-XXXX"
                className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
              />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => { persist({ license: license.trim() }); go(product === 'bluechip' ? 'robinhood' : 'wallet'); }} disabled={!license.trim()}>
                Continue
              </PrimaryButton>
              <GhostButton onClick={() => go(product === 'bluechip' ? 'robinhood' : 'wallet')}>It hasn’t arrived yet — skip for now</GhostButton>
            </div>
            <div className="mt-6"><a href={HELP} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">I’m stuck — get a human</a></div>
          </Screen>
        )}

        {/* ── ROBINHOOD (bluechip) ── */}
        {screen === 'robinhood' && (
          <Screen
            eyebrow={`Step 2 of ${flow.length - 1}`}
            title="Connect Robinhood. Two taps."
            note="Why it works this way: the connection key controls a brokerage account, so it lives on your computer — never on our servers, never typed into a website. Robinhood does not endorse or sponsor EB28."
          >
            <ol className="space-y-4">
              <li className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">1</span>
                <div>
                  <div className="font-semibold">Open your Bluechip app</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    From your onboarding email. The first time it runs, it opens Robinhood’s official
                    approval page in your browser — automatically. You don’t hunt for anything.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">2</span>
                <div>
                  <div className="font-semibold">Tap “Allow” on Robinhood</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    You log in on Robinhood’s own page, like always. Your desk gets its own separate
                    compartment — it can’t see or touch the rest of your account. Done.
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => { persist({ robinhoodDone: true }); go('done'); }}>I tapped Allow — continue</PrimaryButton>
              <GhostButton onClick={() => window.location.href = 'mailto:social@eb28.co?subject=Bluechip%20setup%20call'}>Do it with me on a call — free</GhostButton>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => go('license')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
              <a href={HELP} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">I’m stuck — get a human</a>
            </div>
          </Screen>
        )}

        {/* ── WALLET (fleet) ── */}
        {screen === 'wallet' && (
          <Screen
            eyebrow={`Step 2 of ${flow.length - 1}`}
            title="Connect your wallet. One click."
            note="This page never holds keys and can’t move a cent — your wallet asks you before anything happens, every time."
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Your wallet pops up, you tap approve, and you’ll see your balance right here. That’s
              the whole step.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={connectMetaMask} className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
                <Wallet className="h-5 w-5" aria-hidden="true" />
                {evm ? `Connected ${evm.address.slice(0, 6)}…${evm.address.slice(-4)} ✓` : 'Connect MetaMask'}
              </button>
              <GhostButton onClick={connectPhantom}>
                {phantom ? `Phantom ${phantom.address.slice(0, 4)}…${phantom.address.slice(-4)} ✓` : 'Connect Phantom instead'}
              </GhostButton>
            </div>
            {(evm?.usdce != null || phantom) && (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mr-1.5 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
                Connected.
                {evm?.usdce != null && <> USDC.e on Polygon: <b>${evm.usdce.toFixed(2)}</b>.</>}
                {phantom && <> Solana: <b>{(phantom.sol ?? 0).toFixed(3)} SOL · ${(phantom.usdc ?? 0).toFixed(2)} USDC</b>.</>}
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => go('fund')} disabled={!evm && !phantom}>Continue</PrimaryButton>
              <GhostButton onClick={() => go('fund')}>Skip — I’ll do this later</GhostButton>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => go('license')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
              <a href={HELP} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">I’m stuck — get a human</a>
            </div>
          </Screen>
        )}

        {/* ── FUND (fleet) ── */}
        {screen === 'fund' && (
          <Screen
            eyebrow={`Step 3 of ${flow.length - 1} · optional`}
            title="Fund your desk — or skip it."
            note="Your wallet pops up to approve. This page never holds keys or moves funds itself."
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Paper mode costs $0, so most owners skip this until they’ve watched their desk work
              for a few days. When you’re ready: paste your desk address (it’s in your onboarding
              email) and send from your own wallet.
            </p>
            <div className="mt-5 space-y-3">
              <input
                defaultValue={deskWallet}
                onBlur={(e) => { const v = e.target.value.trim(); setDeskWallet(v); persist({ deskWallet: v }); }}
                placeholder="Your desk address (starts with 0x…)"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
              {deskBal != null && (
                <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Desk balance right now: <b className="text-slate-900">${deskBal.toFixed(2)} USDC.e</b></div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <input value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} type="number" min="1" step="1" placeholder="Amount (USDC.e)" className="w-44 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                <button onClick={fundDesk} className="rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">Send from my wallet</button>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => go('done')}>Continue</PrimaryButton>
              <GhostButton onClick={() => go('done')}>Skip for now</GhostButton>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => go('wallet')} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
              <a href={HELP} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">I’m stuck — get a human</a>
            </div>
          </Screen>
        )}

        {/* ── DONE ── */}
        {screen === 'done' && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Sparkles className="h-8 w-8 text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight">You’re set.</h1>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-slate-600">
              Your desk starts in paper mode — practicing with real market data and zero real
              dollars. Watch it work. Read its journal. Go live only when <em>you</em> decide.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="/fundmanager/" className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
                Watch the live tape <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <GhostButton onClick={() => go('welcome')}>Set up another desk</GhostButton>
            </div>
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-orange-600" aria-hidden="true" /> The promises that don’t change
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                <li>· We never hold your money, keys, or logins.</li>
                <li>· One switch stops everything, and you hold it.</li>
                <li>· 30-day get-it-running guarantee — full refund, keep the code.</li>
              </ul>
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs leading-relaxed text-slate-400">
          EB28 Desk OS is licensed software you install and operate — not investment advice, not a
          fund, not a financial service. Trading involves risk of loss.
        </p>
      </section>
    </div>
  );
}
