package com.thesfm.business

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                MaterialTheme(colorScheme = businessColors()) { BusinessHome() }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@androidx.compose.runtime.Composable
private fun BusinessHome() {
    Scaffold(topBar = { TopAppBar(title = { Text("THE SFM Business") }) }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { Text("مساحة العمل", style = MaterialTheme.typography.headlineMedium) }
            item { Text("إدارة المشاريع والعملاء والفواتير من تطبيق أعمال مستقل.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            item { BusinessConnectionStatus() }
            item { BusinessCard("المشاريع", "ابدأ وتنظّم سير العمل والمواعيد.", Icons.Default.BusinessCenter) }
            item { BusinessCard("العملاء", "اجمع علاقات العملاء وبيانات التواصل في مكان واحد.", Icons.Default.Groups) }
            item { BusinessCard("الفواتير", "أنشئ، أرسل، وتابع حالة التحصيل بأمان.", Icons.Default.ReceiptLong) }
            item {
                Text(
                    "لا يعرض التطبيق أرقامًا أو سجلات قبل ربط واجهة أعمال محمية لكل مستخدم.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun BusinessConnectionStatus() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
            Text("الربط الآمن قيد التجهيز", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
            Text("الهيكل جاهز، وستظهر مشاريع وعملاء وفواتير حسابك فقط بعد اكتمال واجهة البيانات المحمية.", color = MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
}

@androidx.compose.runtime.Composable
private fun BusinessCard(title: String, body: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.End) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun businessColors() = androidx.compose.material3.darkColorScheme(
    primary = Color(0xFFC4B5FD),
    secondary = Color(0xFFFCD34D),
    surface = Color(0xFF171127),
    surfaceVariant = Color(0xFF2A2040),
    onSurface = Color(0xFFF6F0FF),
    onSurfaceVariant = Color(0xFFD8CCE9),
)
