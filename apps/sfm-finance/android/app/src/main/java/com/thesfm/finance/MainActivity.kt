package com.thesfm.finance

import android.app.Activity
import android.app.KeyguardManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.util.concurrent.Executors
import java.text.NumberFormat
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val authenticationExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sessionStore = SecureSessionStore(this)

        setContent {
            var session by remember { mutableStateOf(sessionStore.load()) }
            var errorMessage by remember { mutableStateOf<String?>(null) }
            var isAuthenticating by remember { mutableStateOf(false) }
            var summary by remember { mutableStateOf<FinanceSummary?>(null) }
            var summaryError by remember { mutableStateOf<String?>(null) }
            var isSummaryLoading by remember { mutableStateOf(false) }
            var refreshCount by remember { mutableStateOf(0) }
            var isDeviceLocked by remember { mutableStateOf(session != null) }
            var unlockError by remember { mutableStateOf<String?>(null) }
            val context = LocalContext.current
            val lifecycleOwner = LocalLifecycleOwner.current
            val credentialLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
                if (result.resultCode == Activity.RESULT_OK) {
                    isDeviceLocked = false
                    unlockError = null
                } else {
                    unlockError = "تعذر تأكيد قفل الجهاز. حاول مرة أخرى."
                }
            }

            LaunchedEffect(Unit) {
                val savedSession = session ?: return@LaunchedEffect
                if (!sessionNeedsRefresh(savedSession)) return@LaunchedEffect

                authenticationExecutor.execute {
                    val result = SupabaseAuthClient.refresh(savedSession.refreshToken)
                    runOnUiThread {
                        result.onSuccess { refreshedSession ->
                            if (sessionStore.save(refreshedSession)) {
                                session = refreshedSession
                            } else {
                                sessionStore.clear()
                                session = null
                                isDeviceLocked = false
                                errorMessage = "تعذر حفظ جلسة تسجيل الدخول بأمان."
                            }
                        }.onFailure { error ->
                            sessionStore.clear()
                            session = null
                            isDeviceLocked = false
                            errorMessage = error.message ?: "انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى."
                        }
                    }
                }
            }

            DisposableEffect(lifecycleOwner, session) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_STOP && session != null) {
                        isDeviceLocked = true
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }

            LaunchedEffect(session?.accessToken, refreshCount, isDeviceLocked) {
                val activeSession = session ?: return@LaunchedEffect
                if (isDeviceLocked) {
                    isSummaryLoading = false
                    return@LaunchedEffect
                }
                isSummaryLoading = true
                summaryError = null
                if (sessionNeedsRefresh(activeSession)) {
                    authenticationExecutor.execute {
                        val result = SupabaseAuthClient.refresh(activeSession.refreshToken)
                        runOnUiThread {
                            result.onSuccess { refreshedSession ->
                                if (sessionStore.save(refreshedSession)) {
                                    session = refreshedSession
                                } else {
                                    sessionStore.clear()
                                    session = null
                                    errorMessage = "تعذر حفظ جلسة تسجيل الدخول بأمان."
                                }
                            }.onFailure { error ->
                                sessionStore.clear()
                                session = null
                                errorMessage = error.message ?: "انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى."
                            }
                            isSummaryLoading = false
                        }
                    }
                    return@LaunchedEffect
                }
                authenticationExecutor.execute {
                    val result = FinanceSummaryClient.fetch(activeSession.accessToken)
                    runOnUiThread {
                        result.onSuccess { receivedSummary ->
                            summary = receivedSummary
                        }.onFailure { error ->
                            summary = null
                            summaryError = error.message ?: "تعذر تحميل ملخصك المالي. حاول مرة أخرى."
                        }
                        isSummaryLoading = false
                    }
                }
            }

            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                MaterialTheme(colorScheme = financeColors()) {
                    if (session == null) {
                        LoginScreen(
                            isAuthenticating = isAuthenticating,
                            errorMessage = errorMessage,
                            onSignIn = { email, password ->
                                isAuthenticating = true
                                errorMessage = null
                                authenticationExecutor.execute {
                                    val result = SupabaseAuthClient.signIn(email, password)
                                    runOnUiThread {
                                        result.onSuccess { authenticatedSession ->
                                            if (sessionStore.save(authenticatedSession)) {
                                                session = authenticatedSession
                                                isDeviceLocked = false
                                            } else {
                                                errorMessage = "تعذر حفظ جلسة تسجيل الدخول بأمان."
                                            }
                                        }.onFailure { error ->
                                            errorMessage = error.message ?: "تعذر تسجيل الدخول. حاول مرة أخرى."
                                        }
                                        isAuthenticating = false
                                    }
                                }
                            },
                        )
                    } else if (isDeviceLocked) {
                        DeviceUnlockScreen(
                            errorMessage = unlockError,
                            onUnlock = {
                                val keyguard = context.getSystemService(KeyguardManager::class.java)
                                if (keyguard == null || !keyguard.isDeviceSecure) {
                                    unlockError = "فعّل رمز مرور الجهاز لاستخدام القفل الآمن."
                                } else {
                                    val intent = keyguard.createConfirmDeviceCredentialIntent(
                                        "THE SFM Finance",
                                        "تأكيد هويتك لعرض ملخصك المالي.",
                                    )
                                    if (intent == null) unlockError = "تعذر فتح قفل الجهاز."
                                    else credentialLauncher.launch(intent)
                                }
                            },
                            onSignOut = {
                                sessionStore.clear()
                                summary = null
                                session = null
                                isDeviceLocked = false
                            },
                        )
                    } else {
                        FinanceDashboard(
                            summary = summary,
                            isLoading = isSummaryLoading,
                            errorMessage = summaryError,
                            onRefresh = { refreshCount += 1 },
                            onSignOut = {
                                sessionStore.clear()
                                summary = null
                                session = null
                                isDeviceLocked = false
                            },
                        )
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        authenticationExecutor.shutdown()
        super.onDestroy()
    }
}

private fun sessionNeedsRefresh(session: SecureSessionStore.Session): Boolean =
    session.expiresAtMillis <= System.currentTimeMillis() + 60_000

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun DeviceUnlockScreen(errorMessage: String?, onUnlock: () -> Unit, onSignOut: () -> Unit) {
    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Finance") }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text("تأكيد هويتك", style = MaterialTheme.typography.headlineMedium)
            Text("يحمي THE SFM Finance ملخصك المالي عند عودة التطبيق من الخلفية.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = onUnlock, modifier = Modifier.fillMaxWidth()) { Text("فتح التطبيق") }
            errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            TextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun LoginScreen(
    isAuthenticating: Boolean,
    errorMessage: String?,
    onSignIn: (String, String) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Finance") }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text("إدارة المال الشخصي", style = MaterialTheme.typography.headlineMedium)
            Text("تابع دخلك ومصروفاتك والتزاماتك من واجهة جوال أصلية.", color = MaterialTheme.colorScheme.onSurfaceVariant)
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
            Text("تُحفظ جلسة الدخول مشفّرة في مفتاح Android Keystore؛ لا تحفظ كلمة المرور.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun FinanceDashboard(
    summary: FinanceSummary?,
    isLoading: Boolean,
    errorMessage: String?,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
) {
    var currentTab by remember { mutableStateOf(0) }
    val labels = listOf("الرئيسية", "المصروفات", "الادخار", "المزيد")
    val icons = listOf(Icons.Default.Home, Icons.Default.CreditCard, Icons.Default.Savings, Icons.Default.MoreHoriz)

    Scaffold(
        topBar = { TopAppBar(title = { Text("THE SFM Finance") }) },
        bottomBar = {
            NavigationBar {
                labels.forEachIndexed { index, label ->
                    NavigationBarItem(
                        selected = currentTab == index,
                        onClick = { currentTab = index },
                        icon = { Icon(icons[index], contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text(labels[currentTab], style = MaterialTheme.typography.headlineMedium)
            if (currentTab == 0) {
                FinanceCard("المركز المالي", money(summary?.trackedPosition, summary?.currency))
                FinanceCard("الدخل الشهري", money(summary?.monthlyIncome, summary?.currency))
                FinanceCard("المصروفات الشهرية", money(summary?.monthlyExpenses, summary?.currency))
                FinanceCard("صافي الشهر", money(summary?.monthlyNet, summary?.currency))
                FinanceCard("الديون النشطة", summary?.activeDebtCount?.toString() ?: "—")
                when {
                    isLoading -> Text("جارٍ تحديث ملخصك المالي…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    errorMessage != null -> Text(errorMessage, color = MaterialTheme.colorScheme.error)
                    else -> Text("الأرقام محسوبة من نفس بيانات لوحة THE SFM ولا تحفظ على الجهاز.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                FinanceCard(labels[currentTab], "سيتم ربط هذا القسم ببيانات THE SFM في المرحلة التالية.")
            }
            Button(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("تحديث البيانات") }
            if (currentTab == 3) {
                TextButton(onClick = onSignOut) { Text("تسجيل الخروج") }
            }
        }
    }
}

private fun money(amount: Double?, currencyCode: String?): String {
    if (amount == null || currencyCode == null) return "—"
    return NumberFormat.getCurrencyInstance(Locale("ar", "KW")).apply {
        currency = java.util.Currency.getInstance(currencyCode)
    }.format(amount)
}

@androidx.compose.runtime.Composable
private fun FinanceCard(title: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(18.dp), horizontalAlignment = Alignment.End) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@androidx.compose.runtime.Composable
private fun financeColors() = androidx.compose.material3.lightColorScheme(
    primary = Color(0xFF4F46E5),
    onPrimary = Color.White,
    secondary = Color(0xFF0C9595),
    surface = Color(0xFFF7F8FE),
    surfaceVariant = Color(0xFFE8EAF7),
    onSurface = Color(0xFF14183A),
)
