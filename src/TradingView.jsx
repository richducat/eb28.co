import React, { useEffect, useRef } from 'react';

// Free TradingView embed widgets (official external-embedding scripts).
// Market data displayed is TradingView's; we never claim it as our own.

export const WATCHLIST = [
  { symbol: 'NASDAQ:AAPL', label: 'AAPL' },
  { symbol: 'NASDAQ:NVDA', label: 'NVDA' },
  { symbol: 'NASDAQ:TSLA', label: 'TSLA' },
  { symbol: 'NASDAQ:MSFT', label: 'MSFT' },
  { symbol: 'NASDAQ:GOOGL', label: 'GOOGL' },
  { symbol: 'NASDAQ:AMD', label: 'AMD' },
  { symbol: 'AMEX:SPY', label: 'SPY' },
  { symbol: 'NASDAQ:QQQ', label: 'QQQ' },
];

function useTradingViewWidget(ref, scriptFile, config, deps) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    container.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    container.appendChild(inner);
    const script = document.createElement('script');
    script.src = `https://s3.tradingview.com/external-embedding/${scriptFile}`;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
    return () => { container.innerHTML = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Scrolling live ticker strip — the desk's exact watchlist.
export function TickerTape({ dark = false }) {
  const ref = useRef(null);
  useTradingViewWidget(ref, 'embed-widget-ticker-tape.js', {
    symbols: WATCHLIST.map(({ symbol, label }) => ({ proName: symbol, title: label })),
    showSymbolLogo: true,
    isTransparent: true,
    displayMode: 'adaptive',
    colorTheme: dark ? 'dark' : 'light',
    locale: 'en',
  }, [dark]);
  return (
    <div className={dark ? 'border-b border-white/10 bg-[#020617]' : 'border-b border-slate-200 bg-white'}>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
}

// Full live chart for one watchlist symbol.
export function LiveChart({ symbol = 'NASDAQ:AAPL', dark = false }) {
  const ref = useRef(null);
  useTradingViewWidget(ref, 'embed-widget-advanced-chart.js', {
    symbol,
    interval: '15',
    timezone: 'America/New_York',
    theme: dark ? 'dark' : 'light',
    style: '1',
    locale: 'en',
    hide_top_toolbar: false,
    hide_legend: false,
    allow_symbol_change: false,
    save_image: false,
    width: '100%',
    height: 440,
  }, [symbol, dark]);
  return <div className="tradingview-widget-container" ref={ref} style={{ minHeight: 440 }} />;
}
