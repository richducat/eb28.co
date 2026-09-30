/*
 * SyncStep native Mobile Wallet Adapter bridge (Android / Capacitor).
 *
 * Inside the Capacitor shell, wallet sessions are run by the MobileWalletAdapter Capacitor
 * plugin (Solana Mobile's official Kotlin client) instead of the in-page MWA protocol
 * implementation. The game calls transact(cb) and gets a wallet object with authorize /
 * reauthorize / signMessages / signAndSendTransactions / deauthorize / getCapabilities,
 * the same shape as @solana-mobile/mobile-wallet-adapter-protocol-web3js.
 *
 * Timing note: this classic script runs BEFORE the game's module bundle, and Capacitor core
 * (registerPlugin, Capacitor.Plugins) only exists after that bundle starts. The native
 * bridge script, however, is already there and provides nativePromise and isNativePlatform.
 * So the plugin is called through Capacitor.nativePromise and everything is resolved
 * lazily at call time, never at load time.
 */
(function () {
  'use strict';
  var PLUGIN = 'MobileWalletAdapter';
  var EMPTY = { token: null, accounts: null, walletUriBase: null };
  var cache = { token: null, accounts: null, walletUriBase: null };

  function isNative() {
    var c = window.Capacitor;
    try {
      return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() && typeof c.nativePromise === 'function');
    } catch (e) { return false; }
  }
  function raw(method, args) { return window.Capacitor.nativePromise(PLUGIN, method, args); }

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
    var icon = identity.icon || 'syncstep/sync-icon.png';
    if (icon.charAt(0) === '/') icon = icon.slice(1); // MWA requires the icon URI to be RELATIVE to the identity URI
    return { identityUri: identity.uri || 'https://eb28.co', iconUri: icon, identityName: identity.name || 'SyncStep' };
  }
  function reset() { cache = { token: EMPTY.token, accounts: EMPTY.accounts, walletUriBase: EMPTY.walletUriBase }; }
  function remember(res) {
    cache.token = res.auth_token || null;
    cache.accounts = (res.accounts || []).map(function (a) { return { address: a.address, label: a.label }; });
    cache.walletUriBase = res.wallet_uri_base || null;
    return { accounts: cache.accounts.slice(), auth_token: cache.token, wallet_uri_base: cache.walletUriBase };
  }
  function serializeTx(tx) {
    if (tx instanceof Uint8Array) return tx;
    if (tx && typeof tx.serialize === 'function') {
      // VersionedTransaction has `message` + `version`; a legacy Transaction needs the relaxed options (unsigned).
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
  // One place for every native call: keeps the cached token honest.
  async function call(method, args) {
    try {
      return await raw(method, args);
    } catch (e) {
      var err = wrapError(e);
      var sentToken = !!(args && args.authToken);
      if (sentToken && err.code === 'ERROR_AUTH_TOKEN_INVALID') {
        // The wallet no longer knows our token: forget it and ask again from scratch, once.
        reset();
        var retryArgs = {};
        for (var k in args) retryArgs[k] = args[k];
        retryArgs.authToken = null;
        try { return await raw(method, retryArgs); } catch (e2) { throw wrapError(e2); }
      }
      if (sentToken && err.code !== 'ERROR_ASSOCIATION_CANCELLED') reset(); // do not keep a token that may be stale
      throw err;
    }
  }

  var wallet = {
    async authorize(params) {
      params = params || {};
      var token = params.auth_token || null;
      if (token && cache.token === token && cache.accounts && cache.accounts.length) {
        // Same token the wallet handed us: no second wallet round trip needed.
        return { accounts: cache.accounts.slice(), auth_token: cache.token, wallet_uri_base: cache.walletUriBase };
      }
      var args = identityArgs(params.identity);
      args.authToken = token || cache.token || null;
      return remember(await call('authorize', args));
    },
    async reauthorize(params) {
      return wallet.authorize({ identity: params && params.identity, auth_token: (params && params.auth_token) || cache.token });
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
      reset();
      try { await raw('deauthorize', { authToken: token }); } catch (e) { /* best effort */ }
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

  // Evaluated at call time by the game bundle (see patches in tools/patch-bundle.py).
  window.__syncstepNativeAvailable = isNative;
  window.__syncstepNativeTransact = async function (callback) { return callback(wallet); };
  // Disconnect button: forget the cached token locally. No wallet app launch; the wallet-side grant is harmless and expires with the wallet.
  window.__syncstepNativeForget = reset;
})();
