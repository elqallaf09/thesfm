package com.thesfm.finance

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class FinanceSummary(
    val currency: String?,
    val monthlyIncome: Double?,
    val monthlyExpenses: Double?,
    val monthlyNet: Double?,
    val trackedPosition: Double?,
    val activeDebtCount: Int,
)

object FinanceSummaryClient {
    fun fetch(accessToken: String): Result<FinanceSummary> = runCatching {
        require(BuildConfig.SFM_API_BASE_URL.isNotBlank()) { "لم تُضبط خدمة البيانات لهذا الإصدار بعد." }

        val endpoint = BuildConfig.SFM_API_BASE_URL.trimEnd('/') + "/api/mobile/finance/summary"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection)
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $accessToken")

            require(connection.responseCode in 200..299) { "تعذر تحميل ملخصك المالي. حاول مرة أخرى." }

            val body = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
            require(body.optBoolean("ok", false)) { "تعذر تحميل ملخصك المالي. حاول مرة أخرى." }
            val summary = body.getJSONObject("summary")
            FinanceSummary(
                currency = summary.optString("currency").takeIf { it.isNotBlank() && it != "null" },
                monthlyIncome = summary.nullableDouble("monthlyIncome"),
                monthlyExpenses = summary.nullableDouble("monthlyExpenses"),
                monthlyNet = summary.nullableDouble("monthlyNet"),
                trackedPosition = summary.nullableDouble("trackedPosition"),
                activeDebtCount = summary.optInt("activeDebtCount", 0),
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun JSONObject.nullableDouble(key: String): Double? {
        val value = opt(key)
        return if (value == null || value == JSONObject.NULL) null else (value as? Number)?.toDouble()
    }
}
