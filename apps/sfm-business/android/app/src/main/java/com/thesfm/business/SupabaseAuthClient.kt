package com.thesfm.business

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object SupabaseAuthClient {
    fun signIn(email: String, password: String): Result<SecureSessionStore.Session> = requestToken(
        "password",
        JSONObject().put("email", email).put("password", password),
        "البريد الإلكتروني أو كلمة المرور غير صحيحين.",
    )

    fun refresh(refreshToken: String): Result<SecureSessionStore.Session> = requestToken(
        "refresh_token",
        JSONObject().put("refresh_token", refreshToken),
        "انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى.",
    )

    private fun requestToken(grantType: String, payload: JSONObject, invalidCredentialsMessage: String): Result<SecureSessionStore.Session> = runCatching {
        require(BuildConfig.SFM_SUPABASE_URL.isNotBlank() && BuildConfig.SFM_SUPABASE_ANON_KEY.isNotBlank()) {
            "لم تُضبط خدمة تسجيل الدخول لهذا الإصدار بعد."
        }
        val connection = URL("${BuildConfig.SFM_SUPABASE_URL.trimEnd('/')}/auth/v1/token?grant_type=$grantType").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.doOutput = true
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", BuildConfig.SFM_SUPABASE_ANON_KEY)
            connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            require(connection.responseCode in 200..299) {
                if (connection.responseCode in 400..499) invalidCredentialsMessage else "تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى."
            }
            val json = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
            SecureSessionStore.Session(
                accessToken = json.getString("access_token"),
                refreshToken = json.getString("refresh_token"),
                expiresAtMillis = System.currentTimeMillis() + json.getLong("expires_in") * 1_000,
            )
        } finally {
            connection.disconnect()
        }
    }
}
