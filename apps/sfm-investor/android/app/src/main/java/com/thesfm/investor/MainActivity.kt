package com.thesfm.investor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private val networkExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var instruments by remember { mutableStateOf<List<MarketInstrument>>(emptyList()) }
            var errorMessage by remember { mutableStateOf<String?>(null) }
            var isLoading by remember { mutableStateOf(true) }
            var refreshCount by remember { mutableStateOf(0) }

            LaunchedEffect(refreshCount) {
                isLoading = true
                errorMessage = null
                networkExecutor.execute {
                    val result = MarketDirectoryClient.fetch()
                    runOnUiThread {
                        result.onSuccess { instruments = it }.onFailure { error ->
                            instruments = emptyList()
                            errorMessage = error.message ?: "تعذر تحميل الأسواق الآن. حاول مرة أخرى."
                        }
                        isLoading = false
                    }
                }
            }

            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                MaterialTheme(colorScheme = investorColors()) {
                    InvestorHome(
                        instruments = instruments,
                        isLoading = isLoading,
                        errorMessage = errorMessage,
                        onRefresh = { refreshCount += 1 },
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        networkExecutor.shutdown()
        super.onDestroy()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun InvestorHome(
    instruments: List<MarketInstrument>,
    isLoading: Boolean,
    errorMessage: String?,
    onRefresh: () -> Unit,
) {
    var searchQuery by remember { mutableStateOf("") }
    val visibleInstruments = instruments.filter { instrument ->
        val query = searchQuery.trim()
        query.isBlank() || listOf(instrument.symbol, instrument.name, instrument.marketName.orEmpty())
            .any { value -> value.contains(query, ignoreCase = true) }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Investor") }) }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Column(modifier = Modifier.padding(top = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("الأسواق", style = MaterialTheme.typography.headlineMedium)
                    Text("قائمة سوق أصلية للمستثمر. الأسعار والتحليلات ليست توصية استثمارية.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = onRefresh, enabled = !isLoading, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Text(" تحديث القائمة")
                    }
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("ابحث بالاسم أو الرمز") },
                        singleLine = true,
                    )
                    if (instruments.isNotEmpty()) {
                        Text(
                            "${visibleInstruments.size} أداة متاحة",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (isLoading) item {
                Row(modifier = Modifier.fillMaxWidth().padding(28.dp), horizontalArrangement = Arrangement.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(32.dp))
                }
            }
            errorMessage?.let { message -> item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        horizontalAlignment = Alignment.End,
                    ) {
                        Text(message, color = MaterialTheme.colorScheme.onErrorContainer)
                        Button(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("إعادة المحاولة") }
                    }
                }
            } }
            if (!isLoading && errorMessage == null && visibleInstruments.isEmpty()) item {
                Text(
                    if (searchQuery.isBlank()) "لا تتوفر أدوات سوق حاليًا." else "لا توجد أداة تطابق بحثك.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            items(visibleInstruments, key = { it.symbol }) { instrument -> InstrumentCard(instrument) }
        }
    }
}

@androidx.compose.runtime.Composable
private fun InstrumentCard(instrument: MarketInstrument) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.ShowChart, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Column(modifier = Modifier.weight(1f)) {
                Text(instrument.name, style = MaterialTheme.typography.titleMedium)
                Text(instrument.marketName ?: "سوق عالمي", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(instrument.symbol, style = MaterialTheme.typography.titleMedium)
                instrument.currency?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}
