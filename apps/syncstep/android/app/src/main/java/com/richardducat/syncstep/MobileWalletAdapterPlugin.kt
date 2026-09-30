package com.richardducat.syncstep

import android.net.Uri
import android.util.Base64
import android.util.Log
import androidx.activity.ComponentActivity
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.AdapterOperations
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.DefaultTransactionParams
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.Solana
import com.solana.mobilewalletadapter.clientlib.TransactionParams
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import com.solana.mobilewalletadapter.clientlib.protocol.MobileWalletAdapterClient.AuthorizationResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.concurrent.CancellationException

/**
 * Native Mobile Wallet Adapter bridge for the SyncStep WebView.
 *
 * The 1.7 to 2.5 builds ran the MWA protocol inside the WebView (association intent
 * fired from JavaScript, then a WebSocket to ws://localhost from the page). Reviewers
 * on Seeker could not complete that handshake four submissions in a row. This plugin
 * moves the whole session to Solana Mobile's official Kotlin client library, which
 * launches the wallet with a proper activity result contract and talks to it from the
 * app process, so WebView networking rules, Local Network Access prompts and
 * background-tab throttling no longer apply.
 */
@CapacitorPlugin(name = "MobileWalletAdapter")
class MobileWalletAdapterPlugin : Plugin() {

    companion object {
        const val TAG = "SyncStepMWA"
    }

    private var sender: ActivityResultSender? = null
    private var adapter: MobileWalletAdapter? = null
    private var identityKey: String? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    @Volatile private var busy = false

    override fun load() {
        // ActivityResultSender registers an ActivityResultLauncher, which must happen
        // before the host activity is STARTED. Capacitor loads plugins inside
        // BridgeActivity.onCreate, so this is the right place.
        val act = activity as? ComponentActivity
        if (act == null) {
            Log.e(TAG, "Host activity is not a ComponentActivity; wallet flows unavailable")
            return
        }
        sender = ActivityResultSender(act)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val out = JSObject()
        out.put("available", sender != null)
        call.resolve(out)
    }

    @PluginMethod
    fun authorize(call: PluginCall) {
        val adapter = adapterFor(call)
        adapter.authToken = call.getString("authToken")
        runTransact(call, adapter, { auth -> auth }) { _, auth -> authJson(auth) }
    }

    @PluginMethod
    fun signMessages(call: PluginCall) {
        val adapter = adapterFor(call)
        adapter.authToken = call.getString("authToken")
        val payloads = decodeArray(call.getArray("payloads"), preferBase58 = false)
        val addresses = decodeArray(call.getArray("addresses"), preferBase58 = true)
        if (payloads.isEmpty()) {
            call.reject("payloads required", "bad_request")
            return
        }
        runTransact(call, adapter, { auth ->
            val addrs = if (addresses.isEmpty()) arrayOf(auth.accounts[0].publicKey) else addresses
            signMessagesDetached(payloads, addrs)
        }) { res, auth ->
            val signatures = JSArray()
            val signedPayloads = JSArray()
            for (m in res.messages) {
                val sig = m.signatures.firstOrNull() ?: ByteArray(0)
                signatures.put(Base64.encodeToString(sig, Base64.NO_WRAP))
                signedPayloads.put(Base64.encodeToString(sig, Base64.NO_WRAP))
            }
            val out = authJson(auth)
            out.put("signatures", signatures)
            out.put("signed_payloads", signedPayloads)
            out
        }
    }

    @PluginMethod
    fun signAndSendTransactions(call: PluginCall) {
        val adapter = adapterFor(call)
        adapter.authToken = call.getString("authToken")
        val txs = decodeArray(call.getArray("transactions"), preferBase58 = false)
        if (txs.isEmpty()) {
            call.reject("transactions required", "bad_request")
            return
        }
        val minContextSlot = call.getInt("minContextSlot")
        val params: TransactionParams =
            if (minContextSlot != null) TransactionParams(minContextSlot, null, null, null, null) else DefaultTransactionParams
        runTransact(call, adapter, { _ -> signAndSendTransactions(txs, params) }) { res, auth ->
            val signatures = JSArray()
            for (s in res.signatures) signatures.put(Base58.encode(s))
            val out = authJson(auth)
            out.put("signatures", signatures)
            out
        }
    }

    @PluginMethod
    fun deauthorize(call: PluginCall) {
        val adapter = adapterFor(call)
        val token = call.getString("authToken") ?: adapter.authToken
        val ok = JSObject()
        ok.put("ok", true)
        if (token.isNullOrEmpty()) {
            adapter.authToken = null
            call.resolve(ok)
            return
        }
        val s = sender
        if (s == null) {
            adapter.authToken = null
            call.resolve(ok)
            return
        }
        adapter.authToken = token
        scope.launch {
            try {
                val r = adapter.disconnect(s)
                if (r is TransactionResult.Failure) Log.w(TAG, "deauthorize: ${r.message}", r.e)
            } catch (t: Throwable) {
                Log.w(TAG, "deauthorize threw", t)
            } finally {
                adapter.authToken = null
                call.resolve(ok)
            }
        }
    }

    // ---- internals -------------------------------------------------------------------

    private fun adapterFor(call: PluginCall): MobileWalletAdapter {
        val uri = call.getString("identityUri") ?: "https://eb28.co"
        val icon = call.getString("iconUri") ?: "syncstep/sync-icon.png"
        val name = call.getString("identityName") ?: "SyncStep"
        val key = "$uri|$icon|$name"
        val current = adapter
        if (current != null && identityKey == key) return current
        val created = MobileWalletAdapter(ConnectionIdentity(Uri.parse(uri), Uri.parse(icon), name))
        created.blockchain = Solana.Mainnet
        adapter = created
        identityKey = key
        return created
    }

    private fun <T> runTransact(
        call: PluginCall,
        adapter: MobileWalletAdapter,
        block: suspend AdapterOperations.(AuthorizationResult) -> T,
        onSuccess: (T, AuthorizationResult) -> JSObject
    ) {
        val s = sender
        if (s == null) {
            call.reject("Wallet bridge is not ready", "not_ready")
            return
        }
        if (busy) {
            call.reject("Another wallet request is already in progress", "busy")
            return
        }
        busy = true
        scope.launch {
            try {
                val result = adapter.transact(s, null) { auth -> block(auth) }
                when (result) {
                    is TransactionResult.Success -> {
                        adapter.authToken = result.authResult.authToken
                        call.resolve(onSuccess(result.payload, result.authResult))
                    }
                    is TransactionResult.NoWalletFound -> {
                        Log.w(TAG, "no wallet: ${result.message}")
                        call.reject(
                            "No Solana wallet app was found on this device. Install Seed Vault Wallet, Phantom or Solflare and try again.",
                            "ERROR_WALLET_NOT_FOUND"
                        )
                    }
                    is TransactionResult.Failure -> {
                        Log.w(TAG, "transact failed: ${result.message}", result.e)
                        call.reject(result.message ?: "Wallet request failed", classify(result.e, result.message))
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "transact threw", t)
                call.reject(t.message ?: "Wallet request failed", classify(t, t.message))
            } finally {
                busy = false
            }
        }
    }

    private fun classify(e: Throwable?, message: String?): String {
        val text = ((e?.message ?: "") + " " + (message ?: "")).lowercase()
        return when {
            e is CancellationException || text.contains("cancel") -> "ERROR_ASSOCIATION_CANCELLED"
            text.contains("declin") || text.contains("denied") || text.contains("not authorized") -> "ERROR_AUTHORIZATION_FAILED"
            text.contains("timeout") || text.contains("timed out") -> "ERROR_SESSION_TIMEOUT"
            else -> "failure"
        }
    }

    private fun authJson(auth: AuthorizationResult): JSObject {
        val accounts = JSArray()
        for (acc in auth.accounts) {
            val o = JSObject()
            o.put("address", Base58.encode(acc.publicKey))
            o.put("address_base64", Base64.encodeToString(acc.publicKey, Base64.NO_WRAP))
            if (acc.accountLabel != null) o.put("label", acc.accountLabel)
            accounts.put(o)
        }
        val out = JSObject()
        out.put("accounts", accounts)
        out.put("auth_token", auth.authToken)
        if (auth.walletUriBase != null) out.put("wallet_uri_base", auth.walletUriBase.toString())
        return out
    }

    private fun decodeArray(arr: JSArray?, preferBase58: Boolean): Array<ByteArray> {
        if (arr == null) return emptyArray()
        val out = ArrayList<ByteArray>()
        for (i in 0 until arr.length()) {
            val s = arr.getString(i) ?: continue
            out.add(decodeFlexible(s, preferBase58))
        }
        return out.toTypedArray()
    }

    private fun decodeFlexible(s: String, preferBase58: Boolean): ByteArray {
        if (preferBase58 && Base58.looksLikeBase58(s)) {
            try {
                val b = Base58.decode(s)
                if (b.size == 32) return b
            } catch (_: Exception) {
            }
        }
        return Base64.decode(s, Base64.DEFAULT)
    }
}
