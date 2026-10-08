package com.thesfm.business

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Keeps the Business session encrypted with a key that remains on this device. */
class SecureSessionStore(context: Context) {
    data class Session(val accessToken: String, val refreshToken: String, val expiresAtMillis: Long)

    private val preferences = context.getSharedPreferences("sfm-business-session", Context.MODE_PRIVATE)

    fun load(): Session? {
        return try {
            val payload = preferences.getString(SESSION_KEY, null) ?: return null
            val parts = payload.split(':', limit = 2)
            if (parts.size != 2) return null
            val json = JSONObject(decrypt(parts[0], parts[1]))
            Session(json.getString("accessToken"), json.getString("refreshToken"), json.getLong("expiresAtMillis"))
        } catch (_: Exception) {
            clear()
            null
        }
    }

    fun save(session: Session): Boolean = try {
        val json = JSONObject()
            .put("accessToken", session.accessToken)
            .put("refreshToken", session.refreshToken)
            .put("expiresAtMillis", session.expiresAtMillis)
            .toString()
        preferences.edit().putString(SESSION_KEY, encrypt(json)).commit()
    } catch (_: Exception) {
        false
    }

    fun clear() { preferences.edit().remove(SESSION_KEY).apply() }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return "${Base64.encodeToString(cipher.iv, Base64.NO_WRAP or Base64.URL_SAFE)}:${Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP or Base64.URL_SAFE)}"
    }

    private fun decrypt(ivText: String, payloadText: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(ivText, Base64.NO_WRAP or Base64.URL_SAFE)))
        return cipher.doFinal(Base64.decode(payloadText, Base64.NO_WRAP or Base64.URL_SAFE)).toString(Charsets.UTF_8)
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE).apply {
            init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build())
        }.generateKey()
    }

    private companion object {
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val KEY_ALIAS = "sfm-business-session"
        const val SESSION_KEY = "encrypted-session"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
