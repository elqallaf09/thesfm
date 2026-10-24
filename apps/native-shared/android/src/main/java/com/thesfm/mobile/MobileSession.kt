package com.thesfm.mobile

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class NativeSession(val accessToken: String, val refreshToken: String, val expiresAtMillis: Long)
class MobileApiError(val status: Int, val code: String) : Exception(code)
class MobileSession(context: Context, private val product: String, private val apiBase: String, private val authBase: String, private val publicKey: String) {
    // Compatible with the existing Finance / Business Keystore aliases and encrypted-session format.
    private val alias = "sfm-$product-session"
    private val preferences = context.getSharedPreferences(alias, Context.MODE_PRIVATE)
    @Volatile private var generation = 0L
    private val refreshLock = Any()
    @Volatile var session: NativeSession? = restore()
        private set
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun restore(): NativeSession? = runCatching {
        val value = preferences.getString("encrypted-session", null) ?: return null
        val parts = value.split(':', limit = 2)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP or Base64.URL_SAFE)))
        val json = JSONObject(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP or Base64.URL_SAFE)).toString(Charsets.UTF_8))
        NativeSession(json.getString("accessToken"), json.getString("refreshToken"), json.getLong("expiresAtMillis"))
    }.getOrNull()
    @Synchronized private fun save(value: NativeSession, epoch: Long) {
        if (generation != epoch) throw MobileApiError(409, "STALE_SESSION")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val data = JSONObject().put("accessToken", value.accessToken).put("refreshToken", value.refreshToken).put("expiresAtMillis", value.expiresAtMillis).toString()
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP or Base64.URL_SAFE)
        val encrypted = Base64.encodeToString(cipher.doFinal(data.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP or Base64.URL_SAFE)
        check(preferences.edit().putString("encrypted-session", "$iv:$encrypted").commit()) { "SECURE_STORAGE_UNAVAILABLE" }
        session = value
    }
    @Synchronized fun clear() { generation++; session = null; preferences.edit().remove("encrypted-session").commit() }
    fun signIn(email: String, password: String) {
        clear()
        val epoch = generation
        val candidate = token("password", JSONObject().put("email", email.trim()).put("password", password))
        assertSessionSecurity(candidate, epoch)
        save(candidate, epoch)
    }
    private fun token(grant: String, body: JSONObject): NativeSession {
        if (authBase.isBlank() || publicKey.isBlank()) throw MobileApiError(503, "AUTH_NOT_CONFIGURED")
        val json = send("${authBase.trimEnd('/')}/auth/v1/token?grant_type=$grant", "POST", body, null, true)
        return NativeSession(json.getString("access_token"), json.getString("refresh_token"), System.currentTimeMillis() + json.getLong("expires_in") * 1000)
    }
    private fun active(force: Boolean = false): NativeSession = synchronized(refreshLock) {
        val current = session ?: throw MobileApiError(401, "UNAUTHORIZED")
        if (!force && current.expiresAtMillis > System.currentTimeMillis() + 60000) return@synchronized current
        val epoch = generation
        try { token("refresh_token", JSONObject().put("refresh_token", current.refreshToken)).also { assertSessionSecurity(it, epoch); save(it, epoch) } }
        catch (error: MobileApiError) { if (error.status in listOf(400, 401, 403)) clear(); throw error }
    }
    fun request(path: String, method: String = "GET", body: JSONObject? = null): JSONObject {
        require(path.startsWith("/api/") && !path.contains("://"))
        val epoch = generation
        var current = active()
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        assertSessionSecurity(current, epoch)
        val result = try { send("${apiBase.trimEnd('/')}$path", method, body, current.accessToken) }
        catch (error: MobileApiError) {
            if (error.status != 401) throw error
            current = active(true)
            if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
            assertSessionSecurity(current, epoch)
            send("${apiBase.trimEnd('/')}$path", method, body, current.accessToken)
        }
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        return result
    }
    fun publicRequest(path: String): JSONObject = send("${apiBase.trimEnd('/')}$path", "GET", null, null)
    /** The server is the authority for MFA; do not persist or use a first-factor-only session. */
    private fun assertSessionSecurity(candidate: NativeSession, epoch: Long) {
        val result = send("${apiBase.trimEnd('/')}/api/mobile/session", "GET", null, candidate.accessToken)
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        if (!result.optBoolean("ok", false)) throw MobileApiError(503, "AUTH_UNAVAILABLE")
    }
    private fun send(url: String, method: String, body: JSONObject?, accessToken: String?, auth: Boolean = false): JSONObject {
        require(URL(url).protocol == "https") { "HTTPS_REQUIRED" }
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method; connection.connectTimeout = 15000; connection.readTimeout = 15000
            connection.useCaches = false; connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "application/json")
            if (auth) connection.setRequestProperty("apikey", publicKey)
            if (accessToken != null) connection.setRequestProperty("Authorization", "Bearer $accessToken")
            if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }
            val json = raw?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
            if (status !in 200..299) throw MobileApiError(status, json.optString("code", if (auth && status == 400) "INVALID_CREDENTIALS" else "REQUEST_FAILED"))
            return json
        } finally { connection.disconnect() }
    }
}
