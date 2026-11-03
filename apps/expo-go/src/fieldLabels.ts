import {localized,type MobileLanguage,type LocalizedLabel} from '../../../src/lib/mobile/resourceContract';
const labels:Record<string,LocalizedLabel>={
 "currency": [
  "العملة",
  "Currency",
  "Devise"
 ],
 "forecastPeriod": [
  "مدة التوقع",
  "Forecast period",
  "Période de prévision"
 ],
 "openingCash": [
  "النقد الافتتاحي",
  "Opening cash",
  "Trésorerie initiale"
 ],
 "initialCapital": [
  "رأس المال الابتدائي",
  "Initial capital",
  "Capital initial"
 ],
 "revenueGrowth": [
  "نمو الإيرادات الشهري %",
  "Monthly revenue growth %",
  "Croissance mensuelle des revenus %"
 ],
 "expenseGrowth": [
  "نمو المصروفات الشهري %",
  "Monthly expense growth %",
  "Croissance mensuelle des dépenses %"
 ],
 "discountRate": [
  "معدل الخصم السنوي %",
  "Annual discount rate %",
  "Taux annuel d’actualisation %"
 ],
 "startingRevenue": [
  "الإيراد الشهري الأول",
  "Starting monthly revenue",
  "Revenu mensuel initial"
 ],
 "growthRate": [
  "النمو الشهري %",
  "Monthly growth %",
  "Croissance mensuelle %"
 ],
 "grossMargin": [
  "الهامش الإجمالي %",
  "Gross margin %",
  "Marge brute %"
 ],
 "monthlyCost": [
  "التكلفة الشهرية",
  "Monthly cost",
  "Coût mensuel"
 ],
 "capital": [
  "رأس المال",
  "Capital",
  "Capital"
 ],
 "horizonMonths": [
  "مدة التخطيط بالشهور",
  "Planning months",
  "Durée en mois"
 ],
 "monthlyContribution": [
  "المساهمة الشهرية",
  "Monthly contribution",
  "Versement mensuel"
 ],
 "annualReturn": [
  "العائد السنوي المفترض %",
  "Assumed annual return %",
  "Rendement annuel supposé %"
 ],
 "inflation": [
  "التضخم المفترض %",
  "Assumed inflation %",
  "Inflation supposée %"
 ],
 "annualFees": [
  "الرسوم السنوية %",
  "Annual fees %",
  "Frais annuels %"
 ],
 "retirementYears": [
  "سنوات التقاعد",
  "Retirement years",
  "Années de retraite"
 ],
 "retirementSpending": [
  "الإنفاق الشهري في التقاعد",
  "Monthly retirement spending",
  "Dépense mensuelle à la retraite"
 ],
 "reserveMonths": [
  "أشهر احتياطي الطوارئ",
  "Emergency reserve months",
  "Mois de réserve"
 ],
 "extraDebtPayment": [
  "سداد إضافي للديون",
  "Extra debt payment",
  "Remboursement supplémentaire"
 ],
 "countryCode": [
  "رمز الدولة مثل KW",
  "Country code e.g. KW",
  "Code pays, ex. KW"
 ],
 "city": [
  "المدينة",
  "City",
  "Ville"
 ],
 "municipality": [
  "البلدية",
  "Municipality",
  "Municipalité"
 ],
 "district": [
  "الحي",
  "District",
  "Quartier"
 ],
 "address": [
  "العنوان",
  "Address",
  "Adresse"
 ],
 "propertyType": [
  "نوع العقار",
  "Property type",
  "Type de bien"
 ],
 "landArea": [
  "مساحة الأرض",
  "Land area",
  "Surface du terrain"
 ],
 "builtArea": [
  "مساحة البناء",
  "Built area",
  "Surface bâtie"
 ],
 "landAreaUnit": [
  "وحدة مساحة الأرض",
  "Land area unit",
  "Unité du terrain"
 ],
 "builtAreaUnit": [
  "وحدة مساحة البناء",
  "Built area unit",
  "Unité bâtie"
 ],
 "purchasePrice": [
  "سعر الشراء",
  "Purchase price",
  "Prix d’achat"
 ],
 "purchaseCurrency": [
  "عملة الشراء",
  "Purchase currency",
  "Devise d’achat"
 ],
 "referencePrice": [
  "سعر النفط المرجعي المفترض",
  "Assumed oil reference price",
  "Prix pétrolier de référence supposé"
 ],
 "hormuzDisruptionPct": [
  "تعطل هرمز %",
  "Hormuz disruption %",
  "Perturbation d’Ormuz %"
 ],
 "babElMandebDisruptionPct": [
  "تعطل باب المندب %",
  "Bab el-Mandeb disruption %",
  "Perturbation de Bab el-Mandeb %"
 ],
 "offlineProductionMbd": [
  "إنتاج متوقف مليون برميل يوميًا",
  "Offline production, million b/d",
  "Production arrêtée, millions b/j"
 ],
 "spareCapacityResponseMbd": [
  "استجابة الطاقة الفائضة مليون برميل يوميًا",
  "Spare capacity response, million b/d",
  "Capacité disponible, millions b/j"
 ],
 "stockReleaseMbd": [
  "السحب من المخزون مليون برميل يوميًا",
  "Stock release, million b/d",
  "Déstockage, millions b/j"
 ],
 "tankerDisruptionPct": [
  "تعطل الناقلات %",
  "Tanker disruption %",
  "Perturbation des pétroliers %"
 ],
 "freightInsurancePremiumPct": [
  "زيادة الشحن والتأمين %",
  "Freight and insurance premium %",
  "Surcoût fret et assurance %"
 ],
 "demandChangePct": [
  "تغير الطلب %",
  "Demand change %",
  "Variation de demande %"
 ],
 "policyRateChangeBps": [
  "تغير الفائدة بنقاط الأساس",
  "Policy rate change, bps",
  "Variation du taux, pb"
 ],
 "durationDays": [
  "مدة التعطل بالأيام",
  "Disruption duration, days",
  "Durée de perturbation, jours"
 ],
 "entryPrice": [
  "سعر الدخول",
  "Entry price",
  "Prix d’entrée"
 ],
 "targetPrice": [
  "السعر المستهدف",
  "Target price",
  "Prix cible"
 ],
 "stopLoss": [
  "وقف الخسارة",
  "Stop loss",
  "Seuil de perte"
 ],
 "notes": [
  "ملاحظات",
  "Notes",
  "Notes"
 ],
 "name": [
  "الاسم",
  "Name",
  "Nom"
 ],
 "coach": [
  "التوجيه المالي",
  "Financial coaching",
  "Accompagnement financier"
 ],
 "planner": [
  "التخطيط",
  "Planning",
  "Planification"
 ],
 "portfolio": [
  "المحفظة",
  "Portfolio",
  "Portefeuille"
 ],
 "spending": [
  "الإنفاق",
  "Spending",
  "Dépenses"
 ],
 "retirement": [
  "التقاعد",
  "Retirement",
  "Retraite"
 ],
 "debt": [
  "الديون",
  "Debt",
  "Dettes"
 ],
 "goals": [
  "الأهداف",
  "Goals",
  "Objectifs"
 ],
 "investment": [
  "الاستثمار",
  "Investment",
  "Investissement"
 ],
 "risk": [
  "المخاطر",
  "Risk",
  "Risque"
 ],
 "wealth": [
  "الثروة",
  "Wealth",
  "Patrimoine"
 ],
 "summary": [
  "الملخص",
  "Summary",
  "Résumé"
 ],
 "risks": [
  "المخاطر",
  "Risks",
  "Risques"
 ],
 "actions": [
  "الإجراءات",
  "Actions",
  "Actions"
 ],
 "plan90": [
  "خطة 90 يومًا",
  "90-day plan",
  "Plan de 90 jours"
 ],
 "report": [
  "التقرير",
  "Report",
  "Rapport"
 ],
 "chat": [
  "المحادثة",
  "Chat",
  "Conversation"
 ],
 "generate": [
  "إنشاء العرض",
  "Generate presentation",
  "Générer la présentation"
 ],
 "report_missing_data": [
  "البيانات الناقصة",
  "Missing data",
  "Données manquantes"
 ],
 "gold": [
  "الذهب",
  "Gold",
  "Or"
 ],
 "silver": [
  "الفضة",
  "Silver",
  "Argent"
 ],
 "oil": [
  "النفط",
  "Oil",
  "Pétrole"
 ],
 "usd": [
  "الدولار",
  "US dollar",
  "Dollar américain"
 ],
 "equities": [
  "الأسهم",
  "Equities",
  "Actions"
 ],
 "bonds": [
  "السندات",
  "Bonds",
  "Obligations"
 ],
 "gcc": [
  "الخليج",
  "GCC",
  "CCG"
 ],
 "crypto": [
  "الأصول المشفرة",
  "Cryptoassets",
  "Cryptoactifs"
 ],
 "cash": [
  "النقد",
  "Cash",
  "Trésorerie"
 ],
 "magnitude": [
  "قيمة الصدمة",
  "Shock magnitude",
  "Amplitude du choc"
 ],
 "expected": [
  "القيمة المتوقعة مسبقًا",
  "Previously expected value",
  "Valeur anticipée"
 ],
 "pricedIn": [
  "النسبة المسعرة مسبقًا %",
  "Already priced in %",
  "Déjà intégré au prix %"
 ],
 "rates": [
  "الفائدة",
  "Rates",
  "Taux"
 ],
 "oilSupply": [
  "عرض النفط",
  "Oil supply",
  "Offre pétrolière"
 ],
 "growth": [
  "النمو",
  "Growth",
  "Croissance"
 ],
 "balanced": [
  "متوازن",
  "Balanced",
  "Équilibré"
 ],
 "inflationary": [
  "تضخمي",
  "Inflationary",
  "Inflationniste"
 ],
 "recessionary": [
  "ركودي",
  "Recessionary",
  "Récession"
 ],
 "count": [
  "عدد السجلات",
  "Record count",
  "Nombre de lignes"
 ],
 "currencyTotals": [
  "المجاميع حسب العملة",
  "Totals by currency",
  "Totaux par devise"
 ],
 "amount": [
  "المبلغ",
  "Amount",
  "Montant"
 ],
 "missingAmount": [
  "سجلات بدون مبلغ",
  "Records without amount",
  "Lignes sans montant"
 ],
 "price": [
  "السعر",
  "Price",
  "Prix"
 ],
 "lastUpdated": [
  "آخر تحديث من المصدر",
  "Last source update",
  "Dernière mise à jour source"
 ],
 "retrievedAt": [
  "وقت جلب البيانات",
  "Retrieval time",
  "Heure de récupération"
 ],
 "provider": [
  "المصدر",
  "Provider",
  "Source"
 ],
 "ratio": [
  "نسبة الذهب إلى الفضة",
  "Gold/silver ratio",
  "Ratio or/argent"
 ],
 "forecast": [
  "التوقعات",
  "Forecast",
  "Prévisions"
 ],
 "actuals": [
  "الفعلي حسب العملة",
  "Actuals by currency",
  "Réel par devise"
 ],
 "planned": [
  "المخطط",
  "Planned",
  "Prévu"
 ],
 "milestones": [
  "المعالم",
  "Milestones",
  "Jalons"
 ],
 "taskProgress": [
  "إنجاز المهام %",
  "Task progress %",
  "Avancement des tâches %"
 ],
 "timelineProgress": [
  "الزمن المنقضي %",
  "Elapsed schedule %",
  "Calendrier écoulé %"
 ],
 "milestoneProgress": [
  "إنجاز المعالم %",
  "Milestone progress %",
  "Avancement des jalons %"
 ],
 "lateTasks": [
  "المهام المتأخرة",
  "Overdue tasks",
  "Tâches en retard"
 ],
 "topRiskCode": [
  "الخطر الأبرز",
  "Primary risk",
  "Risque principal"
 ],
 "score": [
  "الدرجة",
  "Score",
  "Score"
 ],
 "profit": [
  "الربح",
  "Profit",
  "Bénéfice"
 ],
 "payback": [
  "فترة الاسترداد",
  "Payback period",
  "Délai de récupération"
 ]
};
export function fieldLabel(key:string,language:MobileLanguage){return labels[key]?localized(labels[key],language):key.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');}
