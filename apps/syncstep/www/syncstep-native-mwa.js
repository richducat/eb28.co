/*
 * SyncStep native Mobile Wallet Adapter bridge (Android / Capacitor).
 *
 * When the game runs inside the Capacitor shell, wallet sessions are handled by the
 * MobileWalletAdapter Capacitor plugin (Solana Mobile's official Kotlin client) instead
 * of the in-page MWA protocol implementation. This file exposes
 * window.__syncstepNativeTransact(callback) with the same shape as
 * @solana-mobile/mobile-wallet-adapter-protocol-web3js `transact`, so the game code
 * is unchanged: callback receives a wallet object with authorize / reauthorize /
 * signMessages / signAndSendTransactions / deauthorize / getCapabilities.
 */
(function () {
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;
  var plugin = null;
  try {
    plugin = typeof C.registerPlugin === 'function' ? C.registerPlugin('MobileWalletAdapter') : (C.Plugins && C.Plugins.MobileWalletAdapter);
  } catch (e) { plugin = C.Plugins && C.Plugins.MobileWalletAdapter; }
  if (!plugin) return;

  var cache = { token: null, accounts: null, walletUriBase: null };

  function toB64(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var s = '';
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }
  function fromB64(str) {
    var bin = atob(str || '');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function identityArgs(identity) {
    identity = identity || {};
    var uri = identity.uri || 'https://eb28.co';
    var icon = identity.icon || 'syncstep/sync-icon.png';
    if (icon.charAt(0) === '/') icon = icon.slice(1);
    return { identityUri: uri, iconUri: icon, identityName: identity.name || 'SyncStep' };
  }
  function remember(res) {
    cache.token = res.auth_token || null;
    cache.accounts = (res.accounts || []).map(function (a) { return { address: a.address, label: a.label }; });
    cache.walletUriBase = res.wallet_uri_base || null;
    return { accounts: cache.accounts.slice(), auth_token: cache.token, wallet_uri_base: cache.walletUriBase };
  }
  function serializeTx(tx) {
    if (tx instanceof Uint8Array) return tx;
    if (tx && typeof tx.serialize === 'function') {
      // VersionedTransaction has `message` + `version`; legacy Transaction needs the relaxed options.
      if (tx.message && tx.version !== undefined) return tx.serialize();
      return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    }
    throw new Error('Unsupported transaction object');
  }
  function wrapError(e) {
    var err = new Error((e && (e.message || e.errorMessage)) || 'Wallet request failed');
    err.code = (e && e.code) || 'failure';
    err.name = 'SolanaMobileWalletAdapterError';
    return err;
  }
  async function call(method, args) {
    try { return await plugin[method](args); } catch (e) { throw wrapError(e); }
  }

  var wallet = {
    async authorize(params) {
      params = params || {};
      var token = params.auth_token || null;
      if (token && cache.token === token && cache.accounts && cache.accounts.length) {
        return { accounts: cache.accounts.slice(), auth_token: cache.token, wallet_uri_base: cache.walletUriBase };
      }
      var args = identityArgs(params.identity);
      args.authToken = token || cache.token || null;
      return remember(await call('authorize', args));
    },
    async reauthorize(params) {
      return wallet.authorize(Object.assign({}, params, { auth_token: (params && params.auth_token) || cache.token }));
    },
    async signMessages(params) {
      params = params || {};
      var args = identityArgs(params.identity);
      args.authToken = cache.token;
      args.payloads = (params.payloads || []).map(toB64);
      args.addresses = (params.addresses || []).slice();
      var res = await call('signMessages', args);
      remember(res);
      return (res.signed_payloads || res.signatures || []).map(fromB64);
    },
    async signAndSendTransactions(params) {
      params = params || {};
      var args = identityArgs(params.identity);
      args.authToken = cache.token;
      args.transactions = (params.transactions || []).map(function (t) { return toB64(serializeTx(t)); });
      if (params.min_context_slot !== undefined) args.minContextSlot = params.min_context_slot;
      var res = await call('signAndSendTransactions', args);
      remember(res);
      return res.signatures || [];
    },
    async deauthorize(params) {
      var token = (params && params.auth_token) || cache.token;
      cache = { token: null, accounts: null, walletUriBase: null };
      try { await plugin.deauthorize({ authToken: token }); } catch (e) { /* best effort */ }
      return {};
    },
    async getCapabilities() {
      return {
        supports_clone_authorization: false,
        supports_sign_and_send_transactions: true,
        max_transactions_per_request: 1,
        max_messages_per_request: 1,
        supported_transaction_versions: ['legacy', 0]
      };
    }
  };

  window.__syncstepNativeMWA = true;
  window.__syncstepNativeTransact = async function (callback) {
    return callback(wallet);
  };
})();
