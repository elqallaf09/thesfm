package com.thesfm.investor

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class MarketInstrument(
    val symbol: String,
    val name: String,
    val marketName: String?,
    val currency: String?,
)

/** Public market-directory data only; portfolio and alerts remain behind protected mobile endpoints. */
object MarketDirectoryClient {
    fun fetch(): Result<List<MarketInstrument>> = runCatching {
        require(BuildConfig.SFM_API_BASE_URL.isNotBlank()) { "لم تُضبط خدمة الأسواق لهذا الإصدار بعد." }
        val endpoint = BuildConfig.SFM_API_BASE_URL.trimEnd('/') + "/api/markets?limit=12&quality=complete"
        val connection = URL(endpoint).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            require(connection.responseCode in 200..299) { "تعذر تحميل الأسواق الآن. حاول مرة أخرى." }

            val response = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
            val rows = response.optJSONArray("markets") ?: return@runCatching emptyList()
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    val symbol = row.optString("displaySymbol", row.optString("symbol")).trim()
                    if (symbol.isBlank()) continue
                    add(MarketInstrument(
                        symbol = symbol,
                        name = row.optString("displayName", row.optString("name", symbol)).trim().ifBlank { symbol },
                        marketName = row.optString("marketName").trim().ifBlank { null },
                        currency = row.optString("currency").trim().ifBlank { null },
                    ))
                }
            }
        } finally {
            connection.disconnect()
        }
    }
}
