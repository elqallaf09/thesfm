package com.thesfm.mobile

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class NativeSession(val accessToken: String, val refreshToken: String, val expiresAtMillis: Long)
enum class NativeMfaType { TOTP, EMAIL }

/**
 * A password-only session that is deliberately kept out of encrypted storage
 * until the server accepts its MFA proof.  Do not add this to saved state.
 */
class PendingNativeMfa(
    val type: NativeMfaType,
    val session: NativeSession,
    val epoch: Long,
    val expiresAtMillis: Long = System.currentTimeMillis() + 10 * 60_000,
) : Exception("MFA_REQUIRED") {
    @Volatile var emailChallenge: String? = null
    @Volatile var finished = false
}

class MobileApiError(val status: Int, val code: String, val mfaType: String? = null) : Exception(code)
data class MobileMultipartFile(val name: String, val mimeType: String, val bytes: ByteArray)
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
        try {
            assertSessionSecurity(candidate, epoch)
        } catch (error: MobileApiError) {
            if (error.status == 403 && error.code == "MFA_REQUIRED") throw pendingMfa(error, candidate, epoch)
            throw error
        }
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
        try {
            token("refresh_token", JSONObject().put("refresh_token", current.refreshToken)).also {
                try { assertSessionSecurity(it, epoch) }
                catch (error: MobileApiError) {
                    if (error.status == 403 && error.code == "MFA_REQUIRED") throw pendingMfa(error, it, epoch)
                    throw error
                }
                save(it, epoch)
            }
        }
        catch (error: MobileApiError) { if (error.status in listOf(400, 401, 403)) clear(); throw error }
    }
    fun request(path: String, method: String = "GET", body: JSONObject? = null): JSONObject {
        require(path.startsWith("/api/") && !path.contains("://"))
        val epoch = generation
        var current = active()
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        assertOrPending(current, epoch)
        val result = try { send("${apiBase.trimEnd('/')}$path", method, body, current.accessToken) }
        catch (error: MobileApiError) {
            if (error.status != 401) throw error
            current = active(true)
            if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
            assertOrPending(current, epoch)
            send("${apiBase.trimEnd('/')}$path", method, body, current.accessToken)
        }
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        return result
    }
    /** Sends a small user-selected finance file through the protected mobile API. */
    fun uploadFinancialAttachment(resource: String, recordId: String, name: String, mimeType: String, bytes: ByteArray): JSONObject {
        require(product == "finance" && resource in setOf("income", "expenses")) { "FINANCE_ONLY" }
        require(bytes.isNotEmpty() && bytes.size <= 10 * 1024 * 1024) { "INVALID_UPLOAD_SIZE" }
        return multipartRequest("/api/mobile/$product/records/$resource/attachment", mapOf("recordId" to recordId), MobileMultipartFile(name, mimeType, bytes))
    }
    /** Adds a new project document; the server verifies role and project ownership. */
    fun uploadBusinessDocument(projectId: String, title: String, category: String, notes: String, name: String, mimeType: String, bytes: ByteArray): JSONObject {
        require(product == "business") { "BUSINESS_ONLY" }
        require(bytes.isNotEmpty() && bytes.size <= 10 * 1024 * 1024) { "INVALID_UPLOAD_SIZE" }
        return multipartRequest("/api/mobile/$product/records/documents/attachment", mapOf("projectId" to projectId, "title" to title, "category" to category, "notes" to notes), MobileMultipartFile(name, mimeType, bytes))
    }
    private fun multipartRequest(path: String, fields: Map<String, String>, file: MobileMultipartFile): JSONObject {
        require(path.startsWith("/api/") && !path.contains("://"))
        val epoch = generation
        var current = active()
        if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
        assertOrPending(current, epoch)
        val result = try { sendMultipart("${apiBase.trimEnd('/')}$path", fields, file, current.accessToken) }
        catch (error: MobileApiError) {
            if (error.status != 401) throw error
            current = active(true)
            if (epoch != generation) throw MobileApiError(409, "STALE_SESSION")
            assertOrPending(current, epoch)
            sendMultipart("${apiBase.trimEnd('/')}$path", fields, file, current.accessToken)
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
    private fun assertOrPending(candidate: NativeSession, epoch: Long) {
        try { assertSessionSecurity(candidate, epoch) }
        catch (error: MobileApiError) {
            if (error.status == 403 && error.code == "MFA_REQUIRED") throw pendingMfa(error, candidate, epoch)
            throw error
        }
    }
    private fun pendingMfa(error: MobileApiError, candidate: NativeSession, epoch: Long): PendingNativeMfa = when (error.mfaType) {
        "totp" -> PendingNativeMfa(NativeMfaType.TOTP, candidate, epoch)
        "email" -> PendingNativeMfa(NativeMfaType.EMAIL, candidate, epoch)
        else -> throw MobileApiError(403, "MFA_REQUIRED")
    }
    private fun requirePending(pending: PendingNativeMfa) {
        if (pending.finished || pending.epoch != generation || pending.expiresAtMillis <= System.currentTimeMillis()) throw MobileApiError(401, "CHALLENGE_EXPIRED")
    }
    fun sendMfaEmail(pending: PendingNativeMfa) {
        requirePending(pending)
        if (pending.type != NativeMfaType.EMAIL) throw MobileApiError(400, "INVALID_CHALLENGE")
        val result = send("${apiBase.trimEnd('/')}/api/auth/mfa/mobile-email", "POST", JSONObject().put("action", "start"), pending.session.accessToken)
        requirePending(pending)
        val challenge = result.optString("challenge")
        if (challenge.isBlank()) throw MobileApiError(503, "AUTH_UNAVAILABLE")
        pending.emailChallenge = challenge
    }
    fun verifyMfa(pending: PendingNativeMfa, code: String) {
        requirePending(pending)
        if (!code.matches(Regex("^\\d{6}$"))) throw MobileApiError(400, "INVALID_CODE")
        val result = if (pending.type == NativeMfaType.TOTP) {
            val account = send("${authBase.trimEnd('/')}/auth/v1/user", "GET", null, pending.session.accessToken, true)
            val factors = account.optJSONArray("factors")
            val factorId = (0 until (factors?.length() ?: 0)).asSequence()
                .mapNotNull { factors?.optJSONObject(it) }
                .firstOrNull { it.optString("factor_type") == "totp" && it.optString("status") == "verified" }
                ?.optString("id").orEmpty()
            if (factorId.isBlank()) throw MobileApiError(503, "AUTH_UNAVAILABLE")
            requirePending(pending)
            val factorPath = "${authBase.trimEnd('/')}/auth/v1/factors/${URLEncoder.encode(factorId, "UTF-8")}" // Supabase factor ID is path-encoded.
            val challenge = send("$factorPath/challenge", "POST", JSONObject(), pending.session.accessToken, true)
            requirePending(pending)
            val challengeId = challenge.optString("id")
            if (challengeId.isBlank()) throw MobileApiError(503, "AUTH_UNAVAILABLE")
            send("$factorPath/verify", "POST", JSONObject().put("challenge_id", challengeId).put("code", code), pending.session.accessToken, true)
        } else {
            val challenge = pending.emailChallenge ?: throw MobileApiError(400, "CHALLENGE_REQUIRED")
            send("${apiBase.trimEnd('/')}/api/auth/mfa/mobile-email", "POST", JSONObject().put("action", "verify").put("challenge", challenge).put("code", code), pending.session.accessToken)
        }
        requirePending(pending)
        val verified = sessionFrom(result)
        try { assertSessionSecurity(verified, pending.epoch) }
        catch (error: MobileApiError) {
            if (error.code == "MFA_REQUIRED") throw MobileApiError(403, "MFA_NOT_VERIFIED")
            throw error
        }
        requirePending(pending)
        save(verified, pending.epoch)
        pending.finished = true
    }
    fun cancelMfa(pending: PendingNativeMfa) {
        if (pending.finished) return
        pending.finished = true
        if (pending.epoch == generation) clear()
        runCatching { send("${authBase.trimEnd('/')}/auth/v1/logout?scope=local", "POST", null, pending.session.accessToken, true) }
    }
    private fun sessionFrom(json: JSONObject): NativeSession {
        val accessToken = json.optString("access_token")
        val refreshToken = json.optString("refresh_token")
        val expiresIn = json.optLong("expires_in")
        if (accessToken.isBlank() || refreshToken.isBlank() || expiresIn <= 0) throw MobileApiError(503, "AUTH_UNAVAILABLE")
        return NativeSession(accessToken, refreshToken, System.currentTimeMillis() + expiresIn * 1000)
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
            if (status !in 200..299) throw MobileApiError(
                status,
                json.optString("code", if (auth && status == 400) "INVALID_CREDENTIALS" else "REQUEST_FAILED"),
                json.optString("mfaType").takeUnless { it.isBlank() },
            )
            return json
        } finally { connection.disconnect() }
    }
    private fun sendMultipart(url: String, fields: Map<String, String>, file: MobileMultipartFile, accessToken: String): JSONObject {
        require(URL(url).protocol == "https") { "HTTPS_REQUIRED" }
        val boundary = "THE-SFM-${System.nanoTime()}"
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"; connection.connectTimeout = 15000; connection.readTimeout = 30000
            connection.useCaches = false; connection.instanceFollowRedirects = false; connection.doOutput = true
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            connection.setChunkedStreamingMode(8192)
            connection.outputStream.buffered().use { output ->
                fun text(value: String) = output.write(value.toByteArray(Charsets.UTF_8))
                fields.forEach { (key, value) ->
                    text("--$boundary\\r\\nContent-Disposition: form-data; name=\"$key\"\\r\\n\\r\\n$value\\r\\n")
                }
                val safeName = file.name.replace(Regex("[\\r\\n\"]"), "-").take(160).ifBlank { "attachment" }
                text("--$boundary\\r\\nContent-Disposition: form-data; name=\"file\"; filename=\"$safeName\"\\r\\nContent-Type: ${file.mimeType}\\r\\n\\r\\n")
                output.write(file.bytes)
                text("\\r\\n--$boundary--\\r\\n")
            }
            val status = connection.responseCode
            val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }
            val json = raw?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
            if (status !in 200..299) throw MobileApiError(status, json.optString("code", "REQUEST_FAILED"), json.optString("mfaType").takeUnless { it.isBlank() })
            return json
        } finally { connection.disconnect() }
    }
}
