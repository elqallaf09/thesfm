package com.thesfm.mobile

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.io.ByteArrayOutputStream
import java.util.Calendar
import java.util.concurrent.Executors

abstract class MobileActivity : ComponentActivity() {
    abstract val productId: String
    abstract val apiBaseUrl: String
    abstract val supabaseUrl: String
    abstract val supabasePublicKey: String
    private lateinit var auth: MobileSession
    private val executor = Executors.newSingleThreadExecutor()
    private val locked = mutableStateOf(false)
    private val signedIn = mutableStateOf(false)
    private val busy = mutableStateOf(false)
    private val error = mutableStateOf(false)
    private val errorCode = mutableStateOf<String?>(null)
    private val pendingMfa = mutableStateOf<PendingNativeMfa?>(null)
    private val resources = mutableStateOf<List<JSONObject>>(emptyList())
    private val records = mutableStateOf<List<JSONObject>>(emptyList())
    private val selected = mutableStateOf<JSONObject?>(null)
    private val marketMode = mutableStateOf(false)
    private val cursor = mutableStateOf<String?>(null)
    private val pendingLink = mutableStateOf<String?>(null)
    private var uiEpoch = 0L
    private var marketPage = 1
    private var marketQuery = ""
    private var marketCategory = "all"
    private var account = mutableStateOf<JSONObject?>(null)
    private val summary = mutableStateOf<JSONObject?>(null)
    private val reportMode = mutableStateOf(false)
    private val report = mutableStateOf<JSONObject?>(null)
    private val reportPeriod = mutableStateOf(nativeReportPeriod())
    private var pendingReportPdf: ByteArray? = null
    private var pendingAttachment: Pair<String, String>? = null
    private val credentialLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        locked.value = it.resultCode != Activity.RESULT_OK
        if (!locked.value) loadCatalog()
    }
    private val reportExportLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
        val pdf = pendingReportPdf
        pendingReportPdf = null
        if (uri == null || pdf == null) return@registerForActivityResult
        executor.execute {
            val result = runCatching { contentResolver.openOutputStream(uri)?.use { it.write(pdf) } ?: error("OUTPUT_UNAVAILABLE") }
            runOnUiThread {
                if (isDestroyed) return@runOnUiThread
                result.onFailure { error.value = true; errorCode.value = "EXPORT_UNAVAILABLE" }
            }
        }
    }
    private val attachmentLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val attachment = pendingAttachment
        pendingAttachment = null
        if (uri != null && attachment != null) uploadAttachment(attachment.first, attachment.second, uri)
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        auth = MobileSession(this, productId, apiBaseUrl, supabaseUrl, supabasePublicKey)
        signedIn.value = auth.session != null
        locked.value = signedIn.value
        pendingLink.value = intent?.dataString
        setContent { Workspace() }
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); pendingLink.value = intent.dataString; if (signedIn.value && !locked.value) loadCatalog() }
    override fun onStop() { super.onStop(); if (::auth.isInitialized && auth.session != null) locked.value = true }
    override fun onDestroy() { executor.shutdown(); super.onDestroy() }
    private fun work(action: () -> JSONObject, done: (JSONObject) -> Unit) {
        if (busy.value) return
        val epoch = uiEpoch; busy.value = true; error.value = false; errorCode.value = null
        executor.execute {
            val result = runCatching(action)
            runOnUiThread {
                if (epoch != uiEpoch || isDestroyed) return@runOnUiThread
                signedIn.value = auth.session != null
                busy.value = false
                result.onSuccess(done).onFailure { failure ->
                    if (failure is PendingNativeMfa) {
                        pendingMfa.value = failure
                        error.value = false
                    } else {
                        error.value = true
                        errorCode.value = (failure as? MobileApiError)?.code
                    }
                }
                if (!signedIn.value) { resources.value = emptyList(); records.value = emptyList(); account.value = null }
            }
        }
    }
    private fun loadCatalog() = work({ auth.request("/api/mobile/$productId/manifest") }) { json ->
        resources.value = json.getJSONArray("resources").objects()
        pendingLink.value?.let { input ->
            val uri = android.net.Uri.parse(input)
            val path = if (uri.scheme == "the-sfm-$productId") "/${uri.host.orEmpty()}${uri.path.orEmpty()}" else uri.path.orEmpty()
            resources.value.find { resource -> resource.getJSONArray("paths").strings().contains(path.trimEnd('/')) }?.let { resource -> selected.value = resource; loadRecords() }
            pendingLink.value = null
        }
        if (selected.value == null && productId != "investor") work({ auth.request("/api/mobile/$productId/summary") }) { summary.value = it.optJSONObject("summary") }
    }
    private fun loadRecords(after: String? = null) {
        val resource = selected.value ?: return
        work({ auth.request("/api/mobile/$productId/records/${resource.getString("id")}?limit=50" + (after?.let { "&cursor=${URLEncoder.encode(it, "UTF-8")}" } ?: "")) }) { json ->
            val next = json.getJSONArray("records").objects()
            records.value = if (after == null) next else (records.value + next).distinctBy { it.getString("id") }
            cursor.value = json.optString("nextCursor").takeUnless { it.isBlank() || it == "null" }
        }
    }
    private fun loadReport() = work({ nativeMonthlyReport(auth, productId, reportPeriod.value) }) { report.value = it }
    private fun changeReportPeriod(offset: Int) {
        shiftNativeReportPeriod(reportPeriod.value, offset)?.let { reportPeriod.value = it; report.value = null; loadReport() }
    }
    private fun exportReport(language: String) {
        val current = report.value ?: return
        val bytes = runCatching { nativeReportPdf(current, productId, reportPeriod.value, language) }.getOrElse { error.value = true; errorCode.value = "EXPORT_UNAVAILABLE"; return }
        pendingReportPdf = bytes
        reportExportLauncher.launch("the-sfm-$productId-${reportPeriod.value}-report.pdf")
    }
    private fun incomeAttachmentName(uri: Uri): String {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))?.let { return it }
        }
        return "attachment"
    }
    private fun incomeAttachmentBytes(uri: Uri): ByteArray {
        return contentResolver.openInputStream(uri)?.use { input ->
            val output = ByteArrayOutputStream(); val buffer = ByteArray(8192); var total = 0
            while (true) {
                val count = input.read(buffer)
                if (count <= 0) break
                total += count
                if (total > 10 * 1024 * 1024) throw MobileApiError(413, "FILE_TOO_LARGE")
                output.write(buffer, 0, count)
            }
            if (total == 0) throw MobileApiError(400, "INVALID_UPLOAD")
            output.toByteArray()
        } ?: throw MobileApiError(400, "INVALID_UPLOAD")
    }
    private fun uploadAttachment(resourceId: String, recordId: String, uri: Uri) {
        if (locked.value || !signedIn.value) return
        work({
            val name = incomeAttachmentName(uri)
            val mime = contentResolver.getType(uri)?.lowercase() ?: when (name.substringAfterLast('.', "").lowercase()) {
                "pdf" -> "application/pdf"; "png" -> "image/png"; "jpg", "jpeg" -> "image/jpeg"; "webp" -> "image/webp"; else -> "application/octet-stream"
            }
            auth.uploadFinancialAttachment(resourceId, recordId, name, mime, incomeAttachmentBytes(uri))
        }) { loadRecords() }
    }
    private fun openAttachment(resourceId: String, recordId: String) {
        if (locked.value || !signedIn.value) return
        work({ auth.request("/api/mobile/finance/records/$resourceId/attachment?recordId=${URLEncoder.encode(recordId, "UTF-8")}") }) { result ->
            val url = result.optJSONObject("attachment")?.optString("url").orEmpty()
            if (runCatching { val value = Uri.parse(url); value.scheme == "https" && value.host != null }.getOrDefault(false)) {
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.onFailure { error.value = true; errorCode.value = "ATTACHMENT_UNAVAILABLE" }
            } else { error.value = true; errorCode.value = "ATTACHMENT_UNAVAILABLE" }
        }
    }
    private fun detachAttachment(resourceId: String, recordId: String) {
        if (locked.value || !signedIn.value) return
        work({ auth.request("/api/mobile/finance/records/$resourceId/attachment?recordId=${URLEncoder.encode(recordId, "UTF-8")}", "DELETE") }) { loadRecords() }
    }
    private fun loadMarkets(nextPage: Int = 1) = work({ auth.publicRequest("/api/markets?quality=all&limit=50&page=$nextPage&category=$marketCategory&q=${URLEncoder.encode(marketQuery, "UTF-8")}") }) { json ->
        marketPage = nextPage; val next = json.getJSONArray("markets").objects()
        records.value = if (nextPage == 1) next else records.value + next
        cursor.value = if (json.optJSONObject("pagination")?.optBoolean("hasMore") == true) "more" else null
    }
    private fun signOut() {
        ++uiEpoch; auth.clear(); signedIn.value = false; locked.value = false; selected.value = null
        pendingMfa.value = null; error.value = false; errorCode.value = null; reportMode.value = false; report.value = null; pendingReportPdf = null; pendingAttachment = null
        resources.value = emptyList(); records.value = emptyList(); account.value = null; summary.value = null; cursor.value = null; busy.value = false; marketMode.value = false
    }
    @OptIn(ExperimentalMaterial3Api::class)
    @Composable private fun Workspace() {
        val preferences = remember { getSharedPreferences("sfm-$productId-preferences", MODE_PRIVATE) }
        var language by remember { mutableStateOf(preferences.getString("language", "ar") ?: "ar") }
        var theme by remember { mutableStateOf(preferences.getString("theme", "system") ?: "system") }
        fun tr(ar: String, en: String, fr: String) = if (language == "ar") ar else if (language == "fr") fr else en
        fun label(json: JSONObject) = json.getJSONArray("label").optString(if (language == "ar") 0 else if (language == "en") 1 else 2)
        val dark = theme == "dark" || theme == "system" && isSystemInDarkTheme()
        var email by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
        var mfaCode by remember(pendingMfa.value) { mutableStateOf("") }
        var emailCodeSent by remember(pendingMfa.value) { mutableStateOf(pendingMfa.value?.emailChallenge != null) }
        var editing by remember { mutableStateOf<JSONObject?>(null) }; var deleting by remember { mutableStateOf<JSONObject?>(null) }
        CompositionLocalProvider(LocalLayoutDirection provides if (language == "ar") LayoutDirection.Rtl else LayoutDirection.Ltr) {
            MaterialTheme(colorScheme = if (dark) darkColorScheme() else lightColorScheme()) {
                BackHandler(pendingMfa.value != null || selected.value != null || marketMode.value || reportMode.value) {
                    val pending = pendingMfa.value
                    if (pending != null) {
                        work({ auth.cancelMfa(pending); JSONObject() }) {
                            pendingMfa.value = null; password = ""; mfaCode = ""; emailCodeSent = false
                        }
                    } else { selected.value = null; marketMode.value = false; reportMode.value = false; report.value = null; records.value = emptyList(); cursor.value = null }
                }
                Scaffold(topBar = { TopAppBar(title = { Text("THE SFM ${productId.replaceFirstChar { it.uppercase() }}") }) }) { padding ->
                    LazyColumn(Modifier.fillMaxSize().padding(padding).widthIn(max = 1100.dp).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(listOf("ar", "en", "fr")) { value -> FilterChip(selected = language == value, onClick = { language = value; preferences.edit().putString("language", value).apply() }, label = { Text(if (value == "ar") "العربية" else if (value == "fr") "Français" else "English") }) }
                            item { FilterChip(selected = dark, onClick = { theme = if (dark) "light" else "dark"; preferences.edit().putString("theme", theme).apply() }, label = { Text(tr("المظهر", "Theme", "Thème")) }) }
                        } }
                        if (error.value) item { Text(tr("تعذر الطلب. تحقق من الاتصال والصلاحيات وأعد المحاولة.", "Request failed. Check connection and permissions, then retry.", "Échec de la requête. Vérifiez la connexion et les droits, puis réessayez."), color = MaterialTheme.colorScheme.error) }
                        if (errorCode.value == "INVALID_CODE") item { Text(tr("رمز التحقق غير صحيح. حاول مجدداً.", "The verification code is incorrect. Try again.", "Le code de vérification est incorrect. Réessayez."), color = MaterialTheme.colorScheme.error) }
                        if (errorCode.value == "CHALLENGE_EXPIRED") item { Text(tr("انتهت مهلة التحقق. ألغِ العملية وسجّل الدخول مجدداً.", "Verification expired. Cancel and sign in again.", "La vérification a expiré. Annulez puis reconnectez-vous."), color = MaterialTheme.colorScheme.error) }
                        if (errorCode.value == "CHALLENGE_REQUIRED") item { Text(tr("أرسل رمز البريد الإلكتروني أولاً.", "Send an email code first.", "Envoyez d’abord un code par e-mail."), color = MaterialTheme.colorScheme.error) }
                        if (busy.value) item { CircularProgressIndicator() }
                        if (pendingMfa.value != null) {
                            val pending = pendingMfa.value!!
                            item { Text(tr("تحقق إضافي", "Additional verification", "Vérification supplémentaire"), style = MaterialTheme.typography.headlineMedium) }
                            item {
                                Text(
                                    if (pending.type == NativeMfaType.TOTP) tr("أدخل الرمز من تطبيق المصادقة لإكمال تسجيل الدخول.", "Enter the code from your authenticator app to finish signing in.", "Saisissez le code de votre application d’authentification pour terminer la connexion.")
                                    else if (emailCodeSent) tr("أدخل الرمز المرسل إلى بريد حسابك.", "Enter the code sent to your account email.", "Saisissez le code envoyé à l’adresse e-mail de votre compte.")
                                    else tr("أرسل رمزاً إلى بريد حسابك لإكمال تسجيل الدخول.", "Send a code to your account email to finish signing in.", "Envoyez un code à l’adresse e-mail de votre compte.")
                                )
                            }
                            if (pending.type == NativeMfaType.EMAIL) item {
                                Button(enabled = !busy.value, onClick = {
                                    work({ auth.sendMfaEmail(pending); JSONObject() }) { emailCodeSent = true }
                                }) { Text(tr(if (emailCodeSent) "إعادة إرسال الرمز" else "إرسال الرمز", if (emailCodeSent) "Send another code" else "Send code", if (emailCodeSent) "Renvoyer le code" else "Envoyer le code")) }
                            }
                            item {
                                OutlinedTextField(
                                    mfaCode,
                                    { mfaCode = it.filter(Char::isDigit).take(6) },
                                    label = { Text(tr("رمز التحقق", "Verification code", "Code de vérification")) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                            item {
                                Button(
                                    enabled = !busy.value && mfaCode.length == 6 && (pending.type == NativeMfaType.TOTP || emailCodeSent),
                                    onClick = {
                                        work({ auth.verifyMfa(pending, mfaCode); JSONObject() }) {
                                            pendingMfa.value = null; password = ""; mfaCode = ""; emailCodeSent = false; locked.value = false; loadCatalog()
                                        }
                                    },
                                ) { Text(tr("تحقق", "Verify", "Vérifier")) }
                            }
                            item {
                                TextButton(enabled = !busy.value, onClick = {
                                    work({ auth.cancelMfa(pending); JSONObject() }) {
                                        pendingMfa.value = null; password = ""; mfaCode = ""; emailCodeSent = false
                                    }
                                }) { Text(tr("إلغاء والعودة لتسجيل الدخول", "Cancel and return to sign in", "Annuler et revenir à la connexion")) }
                            }
                        } else if (locked.value && signedIn.value) {
                            item { Button(onClick = {
                                val keyguard = getSystemService(KeyguardManager::class.java)
                                val unlock = keyguard?.createConfirmDeviceCredentialIntent("THE SFM", tr("تأكيد هويتك", "Confirm your identity", "Confirmez votre identité"))
                                if (unlock != null) credentialLauncher.launch(unlock) else error.value = true
                            }) { Text(tr("فتح بقفل الجهاز", "Unlock with device security", "Déverrouiller avec l’appareil")) } }
                        } else if (!signedIn.value && !marketMode.value) {
                            item { OutlinedTextField(email, { email = it }, label = { Text(tr("البريد الإلكتروني", "Email", "E-mail")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth()) }
                            item { OutlinedTextField(password, { password = it }, label = { Text(tr("كلمة المرور", "Password", "Mot de passe")) }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()) }
                            item { Button(enabled = !busy.value && email.isNotBlank() && password.isNotBlank(), onClick = { work({ auth.signIn(email, password); JSONObject() }) { password = ""; locked.value = false; loadCatalog() } }) { Text(tr("تسجيل الدخول بحساب الموقع", "Sign in with website account", "Se connecter au compte du site")) } }
                            if (productId == "investor") item { TextButton(onClick = { marketMode.value = true; loadMarkets() }) { Text(tr("تصفح الأسواق", "Browse markets", "Explorer les marchés")) } }
                        } else if (marketMode.value) {
                            item { OutlinedTextField(marketQuery, { marketQuery = it }, label = { Text(tr("ابحث بالاسم أو الرمز", "Search name or symbol", "Rechercher un nom ou symbole")) }, modifier = Modifier.fillMaxWidth()) }
                            item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(listOf("all", "stock", "forex", "commodity", "fund")) { type -> FilterChip(selected = marketCategory == type, onClick = { marketCategory = type; loadMarkets() }, label = { Text(type) }) } } }
                            item { Button(onClick = { loadMarkets() }, enabled = !busy.value) { Text(tr("بحث وتحديث", "Search and refresh", "Rechercher et actualiser")) } }
                            items(records.value) { row -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(row.optString("displayName", row.optString("name"))); Text(row.optString("displaySymbol", row.optString("symbol"))); Text(row.optString("currency", "—")) } } }
                            if (cursor.value != null) item { Button(enabled = !busy.value, onClick = { loadMarkets(marketPage + 1) }) { Text(tr("تحميل المزيد", "Load more", "Charger la suite")) } }
                        } else if (reportMode.value) {
                            val currentReport = report.value
                            fun reportLabel(key: String) = when (key) {
                                "income" -> tr("??????", "Income", "Revenus")
                                "expenses" -> tr("?????????", "Expenses", "Dépenses")
                                "savings" -> tr("????????", "Savings", "Épargne")
                                "debts" -> tr("??????", "Debts", "Dettes")
                                "goals" -> tr("???????", "Goals", "Objectifs")
                                "projects" -> tr("????????", "Projects", "Projets")
                                "customers" -> tr("???????", "Customers", "Clients")
                                "suppliers" -> tr("????????", "Suppliers", "Fournisseurs")
                                "employees" -> tr("???????? ????????", "Active employees", "Employés actifs")
                                else -> tr("???????? ????????", "Open invoices", "Factures ouvertes")
                            }
                            fun amount(value: Double) = if (value % 1.0 == 0.0) value.toLong().toString() else String.format(java.util.Locale.US, "%.3f", value).trimEnd('0').trimEnd('.')
                            item { Text(tr(if (productId == "finance") "???? ????????" else "???? ??????? ???????", if (productId == "finance") "Reports Center" else "Business operations", if (productId == "finance") "Centre des rapports" else "Opérations d’affaires"), style = MaterialTheme.typography.headlineMedium) }
                            item { Text(tr("?????? ??? ????? ??????? ?? ??????? ???????? ??? ?? ????? ????? ????? ????????.", "This report uses only protected account records and never combines currencies.", "Ce rapport utilise uniquement les enregistrements protégés du compte et ne combine jamais les devises.")) }
                            item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(enabled = !busy.value, onClick = { changeReportPeriod(-1) }) { Text(tr("?????? ???????", "Previous month", "Mois précédent")) }
                                Text(reportPeriod.value, modifier = Modifier.padding(12.dp))
                                Button(enabled = !busy.value, onClick = { changeReportPeriod(1) }) { Text(tr("?????? ???????", "Next month", "Mois suivant")) }
                            } }
                            item { Button(enabled = !busy.value, onClick = { loadReport() }) { Text(tr("????? ?? ??????", "Refresh from my account", "Actualiser depuis mon compte")) } }
                            if (currentReport != null) {
                                val counts = currentReport.getJSONArray("counts").objects()
                                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                    Text(tr("?????? ????????", "Account data used", "Données du compte utilisées"), style = MaterialTheme.typography.titleMedium)
                                    counts.forEach { row -> Text("${reportLabel(row.getString("key"))}: ${row.getInt("count")}") }
                                    if (currentReport.optInt("undated") > 0) Text(tr("????? ??? ?????? ???????: ${currentReport.optInt("undated")}", "Records without a reporting date: ${currentReport.optInt("undated")}", "Enregistrements sans date de rapport : ${currentReport.optInt("undated")}"))
                                } } }
                                if (currentReport.optBoolean("partial")) item { Text(tr("??? ????? ??????? ????????: ?? ?????? ??? 800 ??? ?? ?? ???. ????? ??????? ???????? ??? ???????? ???????.", "This report may be partial: only the first 800 records in each section were loaded. Review detailed records before using it as a complete statement.", "Ce rapport peut être partiel : seuls les 800 premiers enregistrements de chaque section ont été chargés. Consultez le détail avant de l’utiliser comme relevé complet."), color = MaterialTheme.colorScheme.error) }
                                val currencies = currentReport.getJSONArray("currencies").objects()
                                if (currencies.isEmpty()) item { Text(tr("?? ???? ?????? ?????? ???? ???? ????????.", "No dated monetary records are available for this month.", "Aucun enregistrement monétaire daté n’est disponible pour ce mois.")) }
                                items(currencies, key = { it.getString("currency") }) { row -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                    val currency = row.getString("currency"); Text(currency, style = MaterialTheme.typography.titleMedium)
                                    val lines = if (productId == "finance") listOf(
                                        tr("????? ???????", "Received income", "Revenus reçus") to row.optDouble("receivedIncome"), tr("????? ????????", "Expected income", "Revenus prévus") to row.optDouble("expectedIncome"), tr("?????????", "Expenses", "Dépenses") to row.optDouble("expenses"), tr("?????? ????? ???????", "Cash after expenses", "Trésorerie après dépenses") to row.optDouble("receivedIncome") - row.optDouble("expenses"), tr("????????", "Savings added", "Épargne ajoutée") to row.optDouble("savings"), tr("??? ??????", "Debt remaining", "Dette restante") to row.optDouble("debtOutstanding")) else listOf(
                                        tr("???????? ????????", "Completed sales", "Ventes finalisées") to row.optDouble("completedSales"), tr("????????? ???????", "Pending sales", "Ventes en attente") to row.optDouble("pendingSales"), tr("????????? ?????????", "Operating expenses", "Charges d’exploitation") to row.optDouble("operatingExpenses"), tr("???? ???????", "Operating net", "Solde d’exploitation") to row.optDouble("completedSales") - row.optDouble("operatingExpenses"), tr("???????? ??????????", "Paid invoices", "Factures payées") to row.optDouble("paidInvoices"), tr("???????? ????????", "Outstanding invoices", "Factures impayées") to row.optDouble("outstandingInvoices"), tr("???????? ????????", "Overdue invoices", "Factures en retard") to row.optDouble("overdueInvoices"))
                                    lines.forEach { (label, value) -> Text("$label: ${amount(value)} $currency") }
                                } } }
                                item { Button(enabled = !busy.value, onClick = { exportReport(language) }) { Text(tr("????? PDF ????? ????????", "Prepare PDF to save or share", "Préparer le PDF à enregistrer ou partager")) } }
                            }
                        } else if (selected.value == null) {
                            summary.value?.let { data ->
                                val metrics = listOf(
                                    "monthlyIncome" to tr("الدخل الشهري", "Monthly income", "Revenus mensuels"),
                                    "monthlyExpenses" to tr("المصروفات الشهرية", "Monthly expenses", "Dépenses mensuelles"),
                                    "monthlyNet" to tr("صافي الشهر", "Monthly net", "Solde mensuel"),
                                    "trackedPosition" to tr("المركز المالي", "Financial position", "Position financière"),
                                    "projectCount" to tr("المشاريع", "Projects", "Projets"),
                                    "customerCount" to tr("العملاء", "Customers", "Clients"),
                                    "monthlySales" to tr("المبيعات الشهرية", "Monthly sales", "Ventes mensuelles"),
                                    "monthlyOperatingExpenses" to tr("مصروفات التشغيل", "Operating expenses", "Charges d’exploitation")
                                ).filter { data.has(it.first) }
                                items(metrics) { (key, label) -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(label); Text(if (data.isNull(key)) "—" else data.optString(key) + if (key.endsWith("Count")) "" else " ${data.optString("currency", "")}") } } }
                            }
                            if (productId == "finance" || productId == "business") item { Button(onClick = { reportMode.value = true; report.value = null; loadReport() }, enabled = !busy.value) { Text(tr(if (productId == "finance") "مركز التقارير" else "عمليات الأعمال", if (productId == "finance") "Reports Center" else "Business operations", if (productId == "finance") "Centre des rapports" else "Opérations d’affaires")) } }
                            item { Button(onClick = { loadCatalog() }, enabled = !busy.value) { Text(tr("تحديث الأقسام", "Refresh sections", "Actualiser les rubriques")) } }
                            items(resources.value, key = { it.getString("id") }) { resource -> Button(onClick = { selected.value = resource; records.value = emptyList(); loadRecords() }, modifier = Modifier.fillMaxWidth()) { Text(label(resource)) } }
                            if (productId == "investor") item { Button(onClick = { marketMode.value = true; records.value = emptyList(); loadMarkets() }) { Text(tr("الأسواق", "Markets", "Marchés")) } }
                            item { Button(onClick = { work({ auth.request("/api/mobile/account") }) { account.value = it } }) { Text(tr("حسابي والاشتراك", "Account and subscription", "Compte et abonnement")) } }
                            account.value?.let { data -> item { Text(data.optJSONObject("user")?.optString("email") ?: "—"); Text(data.optJSONArray("subscriptions")?.objects()?.joinToString("\n") { "${it.optString("plan")} · ${it.optString("status")}" } ?: "—") } }
                        } else {
                            val resource = selected.value!!
                            item { Text(label(resource), style = MaterialTheme.typography.headlineMedium) }
                            item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                TextButton(onClick = { selected.value = null; records.value = emptyList(); cursor.value = null }) { Text(tr("رجوع", "Back", "Retour")) }
                                Button(enabled = !busy.value, onClick = { loadRecords() }) { Text(tr("تحديث", "Refresh", "Actualiser")) }
                                if (!resource.optBoolean("readOnly")) Button(enabled = !busy.value, onClick = { editing = JSONObject() }) { Text(tr("إضافة", "Add", "Ajouter")) }
                            } }
                            if (records.value.isEmpty() && !busy.value) item { Text(tr("لا توجد سجلات.", "No records.", "Aucun enregistrement.")) }
                            items(records.value, key = { it.getString("id") }) { row -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                resource.getJSONArray("fields").objects().forEach { field -> val value = row.opt(field.getString("key")); if (value != null && value != JSONObject.NULL) Text("${label(field)}: $value") }
                                val resourceId = resource.getString("id")
                                if (productId == "finance" && resourceId in setOf("income", "expenses")) {
                                    val recordId = row.getString("id")
                                    val attachmentUrl = row.optString(if (resourceId == "income") "attachment_url" else "receipt_image_url")
                                    val attachmentName = row.optString(if (resourceId == "income") "attachment_name" else "receipt_file_name")
                                    if (attachmentUrl.isNotBlank()) {
                                        Text("${tr(if (resourceId == "expenses") "إيصال" else "مرفق", if (resourceId == "expenses") "Receipt" else "Attachment", if (resourceId == "expenses") "Reçu" else "Pièce jointe")}: ${attachmentName.ifBlank { tr("ملف مرفق", "Attached file", "Fichier joint") }}")
                                        Row {
                                            TextButton(onClick = { openAttachment(resourceId, recordId) }) { Text(tr("عرض المرفق", "View attachment", "Voir la pièce jointe")) }
                                            TextButton(onClick = { detachAttachment(resourceId, recordId) }) { Text(tr("إزالة المرفق", "Remove attachment", "Supprimer la pièce jointe")) }
                                        }
                                    }
                                    TextButton(onClick = { pendingAttachment = resourceId to recordId; attachmentLauncher.launch(arrayOf("application/pdf", "image/png", "image/jpeg", "image/webp")) }) { Text(tr("إرفاق ملف", "Attach file", "Joindre un fichier")) }
                                }
                                if (!resource.optBoolean("readOnly")) Row { TextButton(onClick = { editing = row }) { Text(tr("تعديل", "Edit", "Modifier")) }; TextButton(onClick = { deleting = row }) { Text(tr("حذف", "Delete", "Supprimer")) } }
                            } } }
                            if (cursor.value != null) item { Button(enabled = !busy.value, onClick = { loadRecords(cursor.value) }) { Text(tr("تحميل المزيد", "Load more", "Charger la suite")) } }
                        }
                        if (signedIn.value) item { TextButton(onClick = { editing = null; deleting = null; signOut() }) { Text(tr("تسجيل الخروج", "Sign out", "Déconnexion")) } }
                    }
                    editing?.let { row -> selected.value?.let { resource -> RecordEditor(resource, row, language, onClose = { editing = null }, onSave = { body ->
                        val method = if (row.has("id")) "PATCH" else "POST"
                        if (row.has("id")) body.put("id", row.getString("id"))
                        work({ auth.request("/api/mobile/$productId/records/${resource.getString("id")}", method, body) }) { editing = null; loadRecords() }
                    }) } }
                    deleting?.let { row -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text(tr("حذف السجل من حسابك؟", "Delete from your account?", "Supprimer de votre compte ?")) }, confirmButton = { TextButton(onClick = { selected.value?.let { resource -> work({ auth.request("/api/mobile/$productId/records/${resource.getString("id")}", "DELETE", JSONObject().put("id", row.getString("id"))) }) { deleting = null; loadRecords() } } }) { Text(tr("حذف", "Delete", "Supprimer")) } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text(tr("إلغاء", "Cancel", "Annuler")) } }) }
                }
            }
        }
    }
}
private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
private fun JSONArray.strings() = (0 until length()).map { getString(it) }

private fun nativeReportPeriod(): String {
    val calendar = Calendar.getInstance()
    return "%04d-%02d".format(java.util.Locale.US, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1)
}

private fun shiftNativeReportPeriod(period: String, offset: Int): String? {
    val match = Regex("^(\\d{4})-(0[1-9]|1[0-2])$").matchEntire(period) ?: return null
    val calendar = Calendar.getInstance().apply { clear(); set(match.groupValues[1].toInt(), match.groupValues[2].toInt() - 1, 1); add(Calendar.MONTH, offset) }
    return "%04d-%02d".format(java.util.Locale.US, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1)
}

private fun nativeMonthlyReport(auth: MobileSession, product: String, period: String): JSONObject {
    val resourceIds = if (product == "finance") listOf("income", "expenses", "savings", "debts", "goals") else listOf("projects", "customers", "suppliers", "sales", "invoices", "employees", "operating-expenses")
    val data = mutableMapOf<String, List<JSONObject>>(); var partial = false
    resourceIds.forEach { resource ->
        val rows = mutableListOf<JSONObject>(); var cursor: String? = null; var pages = 0
        do {
            val page = auth.request("/api/mobile/$product/records/$resource?limit=100" + (cursor?.let { "&cursor=${URLEncoder.encode(it, "UTF-8")}" } ?: ""))
            rows += page.getJSONArray("records").objects(); cursor = page.optString("nextCursor").takeUnless { it.isBlank() || it == "null" }; pages += 1
        } while (cursor != null && pages < 8)
        partial = partial || cursor != null; data[resource] = rows
    }
    val totals = mutableMapOf<String, MutableMap<String, Double>>(); var undated = 0
    fun value(row: JSONObject, key: String) = row.opt(key).let { input -> (input as? Number)?.toDouble()?.takeIf { it.isFinite() && it >= 0 } }
    fun text(row: JSONObject, key: String) = row.opt(key) as? String
    fun currency(row: JSONObject): String? { val input = text(row, "currency")?.trim()?.uppercase() ?: return null; return input.takeIf { Regex("^[A-Z]{3}$").matches(it) } }
    fun periodRow(row: JSONObject, key: String) = text(row, key)?.startsWith("$period-") == true
    fun total(code: String) = totals.getOrPut(code) { mutableMapOf("receivedIncome" to 0.0, "expectedIncome" to 0.0, "expenses" to 0.0, "savings" to 0.0, "debtOutstanding" to 0.0, "completedSales" to 0.0, "pendingSales" to 0.0, "paidInvoices" to 0.0, "outstandingInvoices" to 0.0, "overdueInvoices" to 0.0, "operatingExpenses" to 0.0) }
    fun add(row: JSONObject, key: String) { val code = currency(row) ?: return; val amount = value(row, "amount") ?: return; val bucket = total(code); bucket[key] = (bucket[key] ?: 0.0) + amount }
    if (product == "finance") {
        data["income"].orEmpty().forEach { row -> if (!periodRow(row, "received_date")) { if (text(row, "received_date") == null) undated += 1 } else add(row, if (text(row, "status") == "expected") "expectedIncome" else "receivedIncome") }
        data["expenses"].orEmpty().forEach { row -> if (!periodRow(row, "date")) { if (text(row, "date") == null) undated += 1 } else add(row, "expenses") }
        data["savings"].orEmpty().forEach { row -> if (!periodRow(row, "saved_at")) { if (text(row, "saved_at") == null) undated += 1 } else add(row, "savings") }
        data["debts"].orEmpty().forEach { row -> val code = currency(row) ?: return@forEach; val amount = value(row, "remaining_amount") ?: return@forEach; val bucket = total(code); bucket["debtOutstanding"] = (bucket["debtOutstanding"] ?: 0.0) + amount }
    } else {
        data["sales"].orEmpty().forEach { row -> if (!periodRow(row, "sale_date")) { if (text(row, "sale_date") == null) undated += 1 } else if (text(row, "status") == "completed") add(row, "completedSales") else if (text(row, "status") == "pending") add(row, "pendingSales") }
        data["invoices"].orEmpty().forEach { row -> if (!periodRow(row, "invoice_date")) { if (text(row, "invoice_date") == null) undated += 1 } else when (text(row, "status")) { "paid" -> add(row, "paidInvoices"); "sent", "overdue" -> { add(row, "outstandingInvoices"); if (text(row, "status") == "overdue") add(row, "overdueInvoices") } } }
        data["operating-expenses"].orEmpty().forEach { row -> if (!periodRow(row, "expense_date")) { if (text(row, "expense_date") == null) undated += 1 } else add(row, "operatingExpenses") }
    }
    val counts = JSONArray(); fun count(key: String, number: Int) { counts.put(JSONObject().put("key", key).put("count", number)) }
    if (product == "finance") { count("income", data["income"].orEmpty().size); count("expenses", data["expenses"].orEmpty().size); count("savings", data["savings"].orEmpty().size); count("debts", data["debts"].orEmpty().size); count("goals", data["goals"].orEmpty().size) }
    else { count("projects", data["projects"].orEmpty().size); count("customers", data["customers"].orEmpty().size); count("suppliers", data["suppliers"].orEmpty().size); count("employees", data["employees"].orEmpty().count { text(it, "status") == "active" }); count("invoices", data["invoices"].orEmpty().count { text(it, "status") == "sent" || text(it, "status") == "overdue" }) }
    val currencies = JSONArray(); totals.toSortedMap().forEach { (code, values) -> currencies.put(JSONObject().put("currency", code).apply { values.forEach { (key, amount) -> put(key, amount) } }) }
    return JSONObject().put("period", period).put("counts", counts).put("currencies", currencies).put("undated", undated).put("partial", partial)
}

private fun nativeReportPdf(report: JSONObject, product: String, period: String, language: String): ByteArray {
    fun tr(ar: String, en: String, fr: String) = if (language == "ar") ar else if (language == "fr") fr else en
    fun label(key: String) = when (key) { "income" -> tr("الدخل", "Income", "Revenus"); "expenses" -> tr("المصروفات", "Expenses", "Dépenses"); "savings" -> tr("المدخرات", "Savings", "Épargne"); "debts" -> tr("الديون", "Debts", "Dettes"); "goals" -> tr("الأهداف", "Goals", "Objectifs"); "projects" -> tr("المشاريع", "Projects", "Projets"); "customers" -> tr("العملاء", "Customers", "Clients"); "suppliers" -> tr("الموردون", "Suppliers", "Fournisseurs"); "employees" -> tr("الموظفون النشطون", "Active employees", "Employés actifs"); else -> tr("الفواتير المفتوحة", "Open invoices", "Factures ouvertes") }
    val document = PdfDocument(); val info = PdfDocument.PageInfo.Builder(612, 792, 1).create(); var page = document.startPage(info); var canvas = page.canvas; var y = 44f
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.BLACK; textSize = 11f }
    fun line(text: String, heading: Boolean = false) {
        if (y > 740f) { document.finishPage(page); page = document.startPage(info); canvas = page.canvas; y = 44f }
        paint.textSize = if (heading) 16f else 11f; canvas.drawText(text.take(105), 38f, y, paint); y += if (heading) 27f else 18f
    }
    line("THE SFM ${product.replaceFirstChar { it.uppercase() }} — $period", true)
    line(tr("ملخص من سجلات الحساب المحمّلة فقط. العملات منفصلة.", "Summary derived only from loaded account records. Currencies remain separate.", "Synthèse tirée uniquement des enregistrements chargés. Les devises restent séparées."))
    if (report.optBoolean("partial")) line(tr("تنبيه: قد يكون التقرير جزئياً؛ حُمّل أول 800 سجل فقط لكل قسم.", "Notice: this report may be partial; only the first 800 records in each section were loaded.", "Attention : le rapport peut être partiel ; seuls les 800 premiers enregistrements par section ont été chargés."))
    report.getJSONArray("counts").objects().forEach { row -> line("${label(row.getString("key"))}: ${row.getInt("count")}") }
    if (report.optInt("undated") > 0) line("${tr("سجلات بلا تاريخ تقرير", "Records without a reporting date", "Enregistrements sans date de rapport")}: ${report.optInt("undated")}")
    report.getJSONArray("currencies").objects().forEach { row ->
        val currency = row.getString("currency"); line(currency, true)
        val values = if (product == "finance") listOf("receivedIncome" to tr("الدخل المستلم", "Received income", "Revenus reçus"), "expectedIncome" to tr("الدخل المتوقع", "Expected income", "Revenus prévus"), "expenses" to tr("المصروفات", "Expenses", "Dépenses"), "savings" to tr("المدخرات المضافة", "Savings added", "Épargne ajoutée"), "debtOutstanding" to tr("الدين المتبقي", "Debt remaining", "Dette restante")) else listOf("completedSales" to tr("المبيعات المكتملة", "Completed sales", "Ventes finalisées"), "pendingSales" to tr("المبيعات المعلقة", "Pending sales", "Ventes en attente"), "operatingExpenses" to tr("مصروفات التشغيل", "Operating expenses", "Charges d’exploitation"), "paidInvoices" to tr("الفواتير المدفوعة", "Paid invoices", "Factures payées"), "outstandingInvoices" to tr("الفواتير المستحقة", "Outstanding invoices", "Factures impayées"), "overdueInvoices" to tr("الفواتير المتأخرة", "Overdue invoices", "Factures en retard"))
        values.forEach { (key, name) -> line("$name: ${row.optDouble(key)} $currency") }
    }
    document.finishPage(page); return ByteArrayOutputStream().use { output -> document.writeTo(output); document.close(); output.toByteArray() }
}

@Composable private fun RecordEditor(resource: JSONObject, row: JSONObject, language: String, onClose: () -> Unit, onSave: (JSONObject) -> Unit) {
    val fields = resource.getJSONArray("fields").objects()
    var values by remember(row) { mutableStateOf(fields.associate { field -> val key = field.getString("key"); key to if (row.has(key) && !row.isNull(key)) row.optString(key) else if (field.getString("type") == "choice") field.optJSONArray("options")?.optString(0).orEmpty() else "" }) }
    var invalid by remember { mutableStateOf(false) }
    val index = if (language == "ar") 0 else if (language == "en") 1 else 2
    fun tr(ar: String, en: String, fr: String) = listOf(ar, en, fr)[index]
    AlertDialog(onDismissRequest = onClose, title = { Text(resource.getJSONArray("label").getString(index)) }, text = {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(fields) { field ->
                val key = field.getString("key"); val type = field.getString("type"); val label = field.getJSONArray("label").getString(index) + if (field.optBoolean("required")) " *" else ""
                if (type == "choice") { Text(label); LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) { items(field.getJSONArray("options").strings()) { option -> FilterChip(selected = values[key] == option, onClick = { values = values + (key to option) }, label = { Text(option) }) } } }
                else if (type == "boolean") { Text(label); Switch(checked = values[key] == "true", onCheckedChange = { values = values + (key to it.toString()) }) }
                else OutlinedTextField(values[key].orEmpty(), { values = values + (key to it) }, label = { Text(label + if (type == "date") " (YYYY-MM-DD)" else "") }, keyboardOptions = KeyboardOptions(keyboardType = if (type == "number") KeyboardType.Decimal else KeyboardType.Text), modifier = Modifier.fillMaxWidth())
            }
            if (invalid) item { Text(tr("تحقق من القيم المطلوبة.", "Check required values.", "Vérifiez les valeurs requises.")) }
        }
    }, confirmButton = { TextButton(onClick = {
        val body = JSONObject(); invalid = false
        fields.forEach { field ->
            val key = field.getString("key"); val value = values[key].orEmpty().trim(); val type = field.getString("type")
            if (value.isBlank() && field.optBoolean("required")) invalid = true
            if (value.isNotBlank()) { if (type == "number") { val number = value.map { if (it in '٠'..'٩') '0' + (it - '٠') else it }.joinToString("").replace('٫', '.').toDoubleOrNull(); if (number == null || !number.isFinite() || number < 0) invalid = true else body.put(key, number) } else body.put(key, if (type == "boolean") value == "true" else if (type == "currency") value.uppercase() else value) }
        }
        if (!invalid) onSave(body)
    }) { Text(tr("حفظ", "Save", "Enregistrer")) } }, dismissButton = { TextButton(onClick = onClose) { Text(tr("إلغاء", "Cancel", "Annuler")) } })
}
