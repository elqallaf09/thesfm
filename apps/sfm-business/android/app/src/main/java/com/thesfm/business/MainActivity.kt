package com.thesfm.business

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private val connectionExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sessionStore = SecureSessionStore(this)

        setContent {
            var session by remember { mutableStateOf(sessionStore.load()) }
            var summary by remember { mutableStateOf<BusinessSummary?>(null) }
            var loginError by remember { mutableStateOf<String?>(null) }
            var summaryError by remember { mutableStateOf<String?>(null) }
            var isAuthenticating by remember { mutableStateOf(false) }
            var isLoadingSummary by remember { mutableStateOf(false) }
            var refreshCount by remember { mutableStateOf(0) }

            LaunchedEffect(session?.accessToken, refreshCount) {
                val activeSession = session ?: return@LaunchedEffect
                isLoadingSummary = true
                summaryError = null
                connectionExecutor.execute {
                    if (sessionNeedsRefresh(activeSession)) {
                        val refreshed = SupabaseAuthClient.refresh(activeSession.refreshToken)
                        runOnUiThread {
                            refreshed.onSuccess { refreshedSession ->
                                if (sessionStore.save(refreshedSession)) {
                                    session = refreshedSession
                                } else {
                                    sessionStore.clear()
                                    session = null
                                    loginError = "تعذر حفظ جلسة تسجيل الدخول بأمان."
                                }
                            }.onFailure { error ->
                                sessionStore.clear()
                                session = null
                                loginError = error.message ?: "انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى."
                            }
                            isLoadingSummary = false
                        }
                    } else {
                        val result = BusinessSummaryClient.fetch(activeSession.accessToken)
                        runOnUiThread {
                            result.onSuccess { receivedSummary ->
                                summary = receivedSummary
                            }.onFailure { error ->
                                summary = null
                                summaryError = error.message ?: "تعذر تحميل ملخص أعمالك. حاول مرة أخرى."
                            }
                            isLoadingSummary = false
                        }
                    }
                }
            }

            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                MaterialTheme(colorScheme = businessColors()) {
                    if (session == null) {
                        BusinessLoginScreen(
                            isAuthenticating = isAuthenticating,
                            errorMessage = loginError,
                            onSignIn = { email, password ->
                                isAuthenticating = true
                                loginError = null
                                connectionExecutor.execute {
                                    val result = SupabaseAuthClient.signIn(email, password)
                                    runOnUiThread {
                                        result.onSuccess { authenticatedSession ->
                                            if (sessionStore.save(authenticatedSession)) {
                                                session = authenticatedSession
                                            } else {
                                                loginError = "تعذر حفظ جلسة تسجيل الدخول بأمان."
                                            }
                                        }.onFailure { error ->
                                            loginError = error.message ?: "تعذر تسجيل الدخول. حاول مرة أخرى."
                                        }
                                        isAuthenticating = false
                                    }
                                }
                            },
                        )
                    } else {
                        BusinessDashboard(
                            summary = summary,
                            isLoading = isLoadingSummary,
                            errorMessage = summaryError,
                            onRefresh = { refreshCount += 1 },
                            onSignOut = {
                                sessionStore.clear()
                                summary = null
                                session = null
                                loginError = null
                            },
                        )
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        connectionExecutor.shutdown()
        super.onDestroy()
    }
}

private fun sessionNeedsRefresh(session: SecureSessionStore.Session): Boolean =
    session.expiresAtMillis <= System.currentTimeMillis() + 60_000

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun BusinessLoginScreen(
    isAuthenticating: Boolean,
    errorMessage: String?,
    onSignIn: (String, String) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Business") }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text("مساحة أعمالك", style = MaterialTheme.typography.headlineMedium)
            Text("شاهد ملخص مشاريعك وعملائك وفواتيرك من حسابك في THE SFM.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("البريد الإلكتروني") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("كلمة المرور") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = { onSignIn(email.trim(), password) },
                enabled = !isAuthenticating && email.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (isAuthenticating) "جارٍ تسجيل الدخول…" else "تسجيل الدخول") }
            errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Text(
                "تُحفظ جلسة الدخول فقط ومشفّرة في Android Keystore؛ لا نحفظ كلمة المرور.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun BusinessDashboard(
    summary: BusinessSummary?,
    isLoading: Boolean,
    errorMessage: String?,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
) {
    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Business") }) }) { padding ->
        androidx.compose.foundation.lazy.LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { Text("ملخص أعمالك", style = MaterialTheme.typography.headlineMedium) }
            item { Text("بيانات هذا الملخص تخص حسابك فقط.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            item { BusinessMetricCard("المشاريع", summary?.projectCount?.toString() ?: "—") }
            item { BusinessMetricCard("العملاء", summary?.customerCount?.toString() ?: "—") }
            item { BusinessMetricCard("الموردون", summary?.supplierCount?.toString() ?: "—") }
            item { BusinessMetricCard("الموظفون النشطون", summary?.activeEmployeeCount?.toString() ?: "—") }
            item { BusinessMetricCard("مبيعات الشهر", money(summary?.monthlySales, summary?.currency)) }
            item { BusinessMetricCard("مصروفات التشغيل", money(summary?.monthlyOperatingExpenses, summary?.currency)) }
            item { BusinessMetricCard("صافي الشهر", money(summary?.monthlyOperatingNet, summary?.currency)) }
            item { BusinessMetricCard("الفواتير المفتوحة", summary?.openInvoiceCount?.toString() ?: "—") }
            item { BusinessMetricCard("الفواتير المتأخرة", summary?.overdueInvoiceCount?.toString() ?: "—") }
            item { BusinessMetricCard("المستحق للتحصيل", money(summary?.outstandingInvoiceAmount, summary?.currency)) }
            item {
                when {
                    isLoading -> Text("جارٍ تحديث ملخص أعمالك…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    errorMessage != null -> Text(errorMessage, color = MaterialTheme.colorScheme.error)
                    else -> Text("لا تُخزَّن هذه الأرقام على الجهاز، ويمكن تحديثها في أي وقت.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item { Button(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("تحديث البيانات") } }
            item { TextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج") } }
        }
    }
}

@androidx.compose.runtime.Composable
private fun BusinessMetricCard(title: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(18.dp), horizontalAlignment = Alignment.End) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(value, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.primary)
        }
    }
}

private fun money(amount: Double?, currencyCode: String?): String {
    if (amount == null || currencyCode == null) return "—"
    return runCatching {
        NumberFormat.getCurrencyInstance(Locale("ar", "KW")).apply {
            currency = java.util.Currency.getInstance(currencyCode)
        }.format(amount)
    }.getOrDefault("—")
}

private fun businessColors() = androidx.compose.material3.darkColorScheme(
    primary = Color(0xFFC4B5FD),
    secondary = Color(0xFFFCD34D),
    surface = Color(0xFF171127),
    surfaceVariant = Color(0xFF2A2040),
    onSurface = Color(0xFFF6F0FF),
    onSurfaceVariant = Color(0xFFD8CCE9),
)
