package com.thesfm.business

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class BusinessSummary(
    val currency: String?,
    val projectCount: Int,
    val customerCount: Int,
    val supplierCount: Int,
    val activeEmployeeCount: Int,
    val invoiceCount: Int,
    val openInvoiceCount: Int,
    val overdueInvoiceCount: Int,
    val outstandingInvoiceAmount: Double?,
    val monthlySales: Double?,
    val monthlyOperatingExpenses: Double?,
    val monthlyOperatingNet: Double?,
)

object BusinessSummaryClient {
    fun fetch(accessToken: String): Result<BusinessSummary> = runCatching {
        require(BuildConfig.SFM_API_BASE_URL.isNotBlank()) { "لم تُضبط خدمة البيانات لهذا الإصدار بعد." }
        val connection = URL("${BuildConfig.SFM_API_BASE_URL.trimEnd('/')}/api/mobile/business/summary").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            require(connection.responseCode in 200..299) { "تعذر تحميل ملخص أعمالك. حاول مرة أخرى." }
            val body = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
            require(body.optBoolean("ok", false)) { "تعذر تحميل ملخص أعمالك. حاول مرة أخرى." }
            val summary = body.getJSONObject("summary")
            BusinessSummary(
                currency = summary.optString("currency").takeIf { it.isNotBlank() && it != "null" },
                projectCount = summary.optInt("projectCount"),
                customerCount = summary.optInt("customerCount"),
                supplierCount = summary.optInt("supplierCount"),
                activeEmployeeCount = summary.optInt("activeEmployeeCount"),
                invoiceCount = summary.optInt("invoiceCount"),
                openInvoiceCount = summary.optInt("openInvoiceCount"),
                overdueInvoiceCount = summary.optInt("overdueInvoiceCount"),
                outstandingInvoiceAmount = summary.nullableDouble("outstandingInvoiceAmount"),
                monthlySales = summary.nullableDouble("monthlySales"),
                monthlyOperatingExpenses = summary.nullableDouble("monthlyOperatingExpenses"),
                monthlyOperatingNet = summary.nullableDouble("monthlyOperatingNet"),
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
