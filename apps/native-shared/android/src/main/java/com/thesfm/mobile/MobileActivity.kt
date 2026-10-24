package com.thesfm.mobile

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.os.Bundle
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
    private val credentialLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        locked.value = it.resultCode != Activity.RESULT_OK
        if (!locked.value) loadCatalog()
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
        val epoch = uiEpoch; busy.value = true; error.value = false
        executor.execute {
            val result = runCatching(action)
            runOnUiThread {
                if (epoch != uiEpoch || isDestroyed) return@runOnUiThread
                signedIn.value = auth.session != null
                busy.value = false
                result.onSuccess(done).onFailure { error.value = true }
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
    private fun loadMarkets(nextPage: Int = 1) = work({ auth.publicRequest("/api/markets?quality=all&limit=50&page=$nextPage&category=$marketCategory&q=${URLEncoder.encode(marketQuery, "UTF-8")}") }) { json ->
        marketPage = nextPage; val next = json.getJSONArray("markets").objects()
        records.value = if (nextPage == 1) next else records.value + next
        cursor.value = if (json.optJSONObject("pagination")?.optBoolean("hasMore") == true) "more" else null
    }
    private fun signOut() {
        ++uiEpoch; auth.clear(); signedIn.value = false; locked.value = false; selected.value = null
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
        var editing by remember { mutableStateOf<JSONObject?>(null) }; var deleting by remember { mutableStateOf<JSONObject?>(null) }
        CompositionLocalProvider(LocalLayoutDirection provides if (language == "ar") LayoutDirection.Rtl else LayoutDirection.Ltr) {
            MaterialTheme(colorScheme = if (dark) darkColorScheme() else lightColorScheme()) {
                BackHandler(selected.value != null || marketMode.value) { selected.value = null; marketMode.value = false; records.value = emptyList(); cursor.value = null }
                Scaffold(topBar = { TopAppBar(title = { Text("THE SFM ${productId.replaceFirstChar { it.uppercase() }}") }) }) { padding ->
                    LazyColumn(Modifier.fillMaxSize().padding(padding).widthIn(max = 1100.dp).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(listOf("ar", "en", "fr")) { value -> FilterChip(selected = language == value, onClick = { language = value; preferences.edit().putString("language", value).apply() }, label = { Text(if (value == "ar") "العربية" else if (value == "fr") "Français" else "English") }) }
                            item { FilterChip(selected = dark, onClick = { theme = if (dark) "light" else "dark"; preferences.edit().putString("theme", theme).apply() }, label = { Text(tr("المظهر", "Theme", "Thème")) }) }
                        } }
                        if (error.value) item { Text(tr("تعذر الطلب. تحقق من الاتصال والصلاحيات وأعد المحاولة.", "Request failed. Check connection and permissions, then retry.", "Échec de la requête. Vérifiez la connexion et les droits, puis réessayez."), color = MaterialTheme.colorScheme.error) }
                        if (busy.value) item { CircularProgressIndicator() }
                        if (locked.value && signedIn.value) {
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
