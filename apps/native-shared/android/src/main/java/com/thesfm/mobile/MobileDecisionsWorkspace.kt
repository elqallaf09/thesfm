package com.thesfm.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.json.JSONObject

private data class DecisionKind(val key: String, val ar: String, val en: String, val fr: String)
private val decisionKinds = listOf(DecisionKind("purchase", "شراء", "Purchase", "Achat"), DecisionKind("investment", "استثمار", "Investment", "Investissement"), DecisionKind("project", "مشروع", "Project", "Projet"), DecisionKind("debt_saving", "قرض / دين", "Loan / debt", "Prêt / dette"), DecisionKind("charity_zakat", "زكاة / صدقة", "Zakat / charité"), DecisionKind("budget", "ميزانية", "Budget", "Budget"))

/** Compose client for the server-side, MFA/RLS-protected Business decision analysis. */
@Composable fun DecisionWorkspace(decisions: List<JSONObject>, analysis: JSONObject?, canWrite: Boolean, canDelete: Boolean, busy: Boolean, language: String, currency: String, refresh: () -> Unit, select: (JSONObject?) -> Unit, save: (JSONObject) -> Unit, remove: (String) -> Unit) {
    var title by remember { mutableStateOf("") }; var kind by remember { mutableStateOf("purchase") }; var cost by remember { mutableStateOf("") }; var monthly by remember { mutableStateOf("") }; var benefit by remember { mutableStateOf("") }; var risk by remember { mutableStateOf("medium") }; var targetDate by remember { mutableStateOf("") }; var notes by remember { mutableStateOf("") }; var deleting by remember { mutableStateOf<JSONObject?>(null) }
    fun tr(ar: String, en: String, fr: String) = if (language == "ar") ar else if (language == "fr") fr else en
    fun number(text: String) = text.replace(',', '.').toDoubleOrNull()
    fun analysisNumber(key: String): Double? = if (analysis?.has(key) == true && !analysis.isNull(key)) analysis.optDouble(key) else null
    val score = analysisNumber("score")?.let { (100 - it).coerceIn(0.0, 100.0).toInt().toString() + "%" } ?: "-"
    val status = when (analysis?.optString("status")) { "initially_suitable" -> tr("مناسب مبدئيًا", "Initially suitable", "Adaptée initialement"); "high_risk" -> tr("مخاطر مرتفعة", "High risk", "Risque élevé"); "needs_review" -> tr("تحتاج مراجعة", "Needs review", "À examiner"); else -> tr("بيانات غير كافية", "Insufficient data", "Données insuffisantes") }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(tr("مركز القرارات", "Decision center", "Centre de décisions"), style = MaterialTheme.typography.headlineMedium)
        Text(tr("يدخل القرار فقط من هاتفك؛ بيانات الحساب الحية تُحلل في الخادم المحمي ولا تحفظ في الجهاز.", "Only the decision leaves your phone; live account data is analyzed on the protected server.", "Seule la décision quitte le téléphone ; les données du compte sont analysées sur le serveur protégé."))
        if (canWrite) {
            Text(tr("حلل قرارًا", "Analyze a decision", "Analyser une décision"), style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(title, { title = it }, label = { Text(tr("عنوان القرار", "Decision title", "Titre de la décision")) }, modifier = Modifier.fillMaxWidth())
            LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) { items(decisionKinds, key = { it.key }) { option -> FilterChip(selected = kind == option.key, onClick = { kind = option.key }, label = { Text(if (language == "ar") option.ar else if (language == "fr") option.fr else option.en) }) } }
            OutlinedTextField(cost, { cost = it }, label = { Text(tr("التكلفة المقدرة", "Estimated cost", "Coût estimé")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(monthly, { monthly = it }, label = { Text(tr("الأثر الشهري", "Monthly impact", "Impact mensuel")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(benefit, { benefit = it }, label = { Text(tr("الفائدة المتوقعة %", "Expected benefit %", "Bénéfice attendu %")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) { listOf("low", "medium", "high").forEach { option -> FilterChip(selected = risk == option, onClick = { risk = option }, label = { Text(if (option == "low") tr("منخفض", "Low", "Faible") else if (option == "high") tr("مرتفع", "High", "Élevé") else tr("متوسط", "Medium", "Moyen")) }) } }
            OutlinedTextField(targetDate, { targetDate = it }, label = { Text(tr("التاريخ المستهدف YYYY-MM-DD", "Target date YYYY-MM-DD", "Date cible AAAA-MM-JJ")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(notes, { notes = it }, label = { Text(tr("ملاحظات", "Notes", "Notes")) }, modifier = Modifier.fillMaxWidth())
            Text("${tr("عملة الحساب", "Account currency", "Devise du compte")}: $currency", style = MaterialTheme.typography.bodySmall)
            Button(enabled = !busy && title.isNotBlank() && (number(cost) ?: 0.0) > 0, onClick = { save(JSONObject().put("title", title.trim()).put("decisionType", kind).put("estimatedCost", number(cost) ?: 0.0).put("monthlyImpact", number(monthly) ?: 0.0).put("expectedBenefit", benefit.trim()).put("riskLevel", risk).put("targetDate", if (targetDate.isBlank()) JSONObject.NULL else targetDate).put("notes", notes.trim()).put("currency", currency).put("locale", language)) }) { Text(tr("حلل واحفظ", "Analyze and save", "Analyser et enregistrer")) }
        } else { Text(tr("لا تملك صلاحية تحرير قرارات الأعمال.", "You do not have permission to edit business decisions.", "Vous n’avez pas le droit de modifier les décisions professionnelles.")) }
        Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(tr("نتيجة التحليل", "Analysis result", "Résultat de l'analyse"), style = MaterialTheme.typography.titleMedium)
            if (analysis == null) Text(tr("أدخل قرارًا لتحليل أثره من بيانات حسابك.", "Enter a decision to analyze its impact using your account data.", "Saisissez une décision pour analyser son impact avec les données de votre compte.")) else {
                Text("${tr("المخاطر", "Risk", "Risque")}: $score"); Text("${tr("الحالة", "Status", "Statut")}: $status")
                Text("${tr("الصافي بعد القرار", "Net after decision", "Solde après décision")}: ${analysisNumber("netAfterDecision")?.let { "$it $currency" } ?: "-"}")
                Text("${tr("المدخرات بعد القرار", "Savings after decision", "Épargne après décision")}: ${analysisNumber("savingsAfterDecision")?.let { "$it $currency" } ?: "-"}")
                analysis.optJSONArray("missingData")?.let { values -> if (values.length() > 0) Text("${tr("بيانات ناقصة", "Missing data", "Données manquantes")}: ${values.join(", ")}", style = MaterialTheme.typography.bodySmall) }
                analysis.optJSONArray("riskFlags")?.let { values -> if (values.length() > 0) Text("${tr("تنبيهات", "Warnings", "Alertes")}: ${values.join(", ")}", style = MaterialTheme.typography.bodySmall) }
            }
        } }
        Text(tr("القرارات السابقة", "Previous decisions", "Décisions précédentes"), style = MaterialTheme.typography.titleMedium)
        if (decisions.isEmpty()) Text(tr("لا توجد قرارات محفوظة بعد.", "No saved decisions yet.", "Aucune décision enregistrée."))
        decisions.forEach { decision -> Card(Modifier.fillMaxWidth().clickable { select(decision.optJSONObject("analysis")) }) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(decision.optString("decision_title", "-")); Text("${decision.optDouble("estimated_cost")} ${decision.optString("currency", currency)}", style = MaterialTheme.typography.bodySmall); Text(decision.optString("status", "-"), style = MaterialTheme.typography.bodySmall)
            if (canDelete) TextButton(enabled = !busy, onClick = { deleting = decision }) { Text(tr("حذف", "Delete", "Supprimer")) }
        } } }
        Button(enabled = !busy, onClick = refresh) { Text(tr("تحديث", "Refresh", "Actualiser")) }
    }
    deleting?.let { decision -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text(tr("حذف القرار؟", "Delete decision?", "Supprimer la décision ?")) }, text = { Text(tr("سيحذف من حسابك ولا يمكن التراجع عن ذلك.", "It will be removed from your account and cannot be undone.", "Elle sera supprimée de votre compte et ne pourra pas être restaurée.")) }, confirmButton = { TextButton(onClick = { remove(decision.getString("id")); deleting = null }) { Text(tr("حذف نهائي", "Delete permanently", "Supprimer définitivement")) } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text(tr("إلغاء", "Cancel", "Annuler")) } }) }
}
