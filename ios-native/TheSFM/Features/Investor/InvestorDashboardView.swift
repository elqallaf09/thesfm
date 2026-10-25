import SwiftUI

struct InvestorDashboardView: View {
    @StateObject private var directory = InvestorMarketDirectoryStore()
    @StateObject private var feedStore = InvestorPublicFeedStore()
    @State private var searchText = ""
    @State private var assetType = "all"
    @State private var selectedFeed: InvestorPublicFeed = .markets
    @AppStorage("sfm-language") private var language = "ar"

    private func tr(_ ar: String, _ en: String, _ fr: String) -> String {
        language == "ar" ? ar : language == "fr" ? fr : en
    }

    private var assetTypes: [String] {
        Array(Set(directory.instruments.compactMap(\.assetType))).sorted()
    }

    private var filteredInstruments: [InvestorInstrument] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return directory.instruments.filter { instrument in
            let matchesType = assetType == "all" || instrument.assetType == assetType
            let matchesQuery = query.isEmpty || [instrument.title, instrument.code, instrument.marketName ?? "", instrument.sector ?? ""]
                .contains { $0.localizedCaseInsensitiveContains(query) }
            return matchesType && matchesQuery
        }
    }

    private var filteredFeedItems: [InvestorPublicFeedItem] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return feedStore.items }
        return feedStore.items.filter { item in
            [item.title, item.summary, item.symbol, item.country, item.currency, item.status, item.source]
                .compactMap { $0 }.contains { $0.localizedCaseInsensitiveContains(query) }
        }
    }

    @MainActor private func refresh() async {
        if selectedFeed == .markets { await directory.refresh() }
        else { await feedStore.refresh(selectedFeed, language: language) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .trailing, spacing: 10) {
                        Label("THE SFM Investor", systemImage: "chart.line.uptrend.xyaxis")
                            .font(.title2.weight(.bold))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                        Text("دليل أسواق أصلي للمستثمر. الأسعار والتحليلات ليست توصية استثمارية.")
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .padding(.vertical, 8)
                }

                Section {
                    Picker(tr("قسم المستثمر", "Investor section", "Espace investisseur"), selection: $selectedFeed) {
                        Text(tr("الأسواق", "Markets", "Marchés")).tag(InvestorPublicFeed.markets)
                        Text(tr("الأخبار", "News", "Actualités")).tag(InvestorPublicFeed.news)
                        Text(tr("التقويم", "Calendar", "Calendrier")).tag(InvestorPublicFeed.calendar)
                        Text(tr("الشريعة", "Shariah", "Charia")).tag(InvestorPublicFeed.screening)
                    }
                    .pickerStyle(.segmented)
                }

                if selectedFeed == .markets {
                if directory.isLoading {
                    HStack { Spacer(); ProgressView("جارٍ تحديث الأسواق…"); Spacer() }
                } else if let errorMessage = directory.errorMessage {
                    ContentUnavailableView("تعذر تحميل الأسواق", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
                } else if filteredInstruments.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "لا توجد أدوات متاحة" : "لا توجد أداة تطابق بحثك",
                        systemImage: "chart.bar.xaxis"
                    )
                } else {
                    Section("تصفية الدليل") {
                        Picker("فئة الأصل", selection: $assetType) {
                            Text("الكل").tag("all")
                            ForEach(assetTypes, id: \.self) { type in
                                Text(type).tag(type)
                            }
                        }
                    }
                    Section("أدوات الأسواق (\(filteredInstruments.count))") {
                        ForEach(filteredInstruments) { instrument in
                            NavigationLink {
                                InvestorMarketAnalysisView(instrument: instrument, language: language)
                            } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .foregroundStyle(.tint)
                                    .accessibilityHidden(true)
                                VStack(alignment: .trailing, spacing: 3) {
                                    Text(instrument.title).font(.headline)
                                    Text([instrument.marketName ?? "سوق عالمي", instrument.sector, instrument.shariahStatus]
                                        .compactMap { $0 }
                                        .joined(separator: " · "))
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(instrument.code).font(.subheadline.weight(.semibold)).monospaced()
                                    let metadata = [instrument.assetType, instrument.currency, instrument.source]
                                        .compactMap { $0 }
                                        .joined(separator: " · ")
                                    if !metadata.isEmpty {
                                        Text(metadata).font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .accessibilityElement(children: .combine)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                } else {
                    InvestorPublicFeedSection(
                        feed: selectedFeed,
                        items: filteredFeedItems,
                        loading: feedStore.isLoading,
                        unavailable: feedStore.errorMessage != nil,
                        language: language,
                        refresh: { await refresh() }
                    )
                }
            }
            .navigationTitle("الأسواق")
            .searchable(text: $searchText, prompt: "ابحث بالاسم أو الرمز")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(tr("تحديث", "Refresh", "Actualiser"), systemImage: "arrow.clockwise") { Task { await refresh() } }
                        .disabled(selectedFeed == .markets ? directory.isLoading : feedStore.isLoading)
                }
            }
            .task { await refresh() }
            .onChange(of: selectedFeed) { _, _ in Task { await refresh() } }
            .onChange(of: language) { _, _ in if selectedFeed != .markets { Task { await refresh() } } }
        }
        .tint(.cyan)
    }
}

private struct InvestorMarketAnalysisView: View {
    let instrument: InvestorInstrument
    let language: String
    @StateObject private var analysis = InvestorMarketAnalysisStore()

    private func tr(_ ar: String, _ en: String, _ fr: String) -> String {
        language == "ar" ? ar : language == "fr" ? fr : en
    }

    private var chartPoints: [InvestorRecordedHistoryPoint] { Array(analysis.points.suffix(36)) }
    private var low: Double? { chartPoints.map(\.price).min() }
    private var high: Double? { chartPoints.map(\.price).max() }

    private func barHeight(_ point: InvestorRecordedHistoryPoint) -> CGFloat {
        guard let low, let high, high > low else { return 72 }
        return CGFloat(18 + ((point.price - low) / (high - low)) * 116)
    }

    var body: some View {
        List {
            Section {
                Text(instrument.title).font(.title3.weight(.semibold))
                Text([instrument.code, instrument.marketName, instrument.currency].compactMap { $0 }.joined(separator: " · "))
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Section(tr("سجل الأسعار", "Recorded price history", "Historique des prix enregistrés")) {
                if analysis.isLoading && chartPoints.isEmpty { ProgressView(tr("جارٍ تحميل البيانات المسجلة.", "Loading recorded data.", "Chargement des données enregistrées.")) }
                if chartPoints.count >= 2 {
                    GeometryReader { proxy in
                        HStack(alignment: .bottom, spacing: 2) {
                            ForEach(chartPoints) { point in
                                let barWidth: CGFloat = max(2, (proxy.size.width - CGFloat(max(0, chartPoints.count - 1) * 2)) / CGFloat(chartPoints.count))
                                let accessibilityText = "\(point.observedAt): \(point.price)"
                                Capsule().fill(Color.cyan).frame(width: barWidth, height: barHeight(point))
                                    .accessibilityLabel(accessibilityText)
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    }
                    .frame(height: 142)
                    if let low, let high {
                        LabeledContent(tr("المدى المسجل", "Recorded range", "Plage enregistrée"), value: "\(low.formatted(.number)) — \(high.formatted(.number))")
                    }
                    LabeledContent(tr("المشاهدات", "Observations", "Observations"), value: "\(analysis.pointCount)")
                    metadata([analysis.historySource, analysis.historyGeneratedAt])
                } else {
                    ContentUnavailableView(
                        tr("لا يوجد سجل موثق", "No verified history", "Aucun historique vérifié"),
                        systemImage: "chart.bar.xaxis",
                        description: Text(tr("لا تظهر هذه الشاشة أرقامًا بديلة عند غياب السجل المسجل.", "This screen does not invent fallback values when recorded history is unavailable.", "Cet écran n’invente pas de valeurs de remplacement quand l’historique enregistré est indisponible."))
                    )
                }
            }
            Section(tr("التحليل الفني", "Technical analysis", "Analyse technique")) {
                if let technical = analysis.technical, technical.technicalAvailable == true {
                    scalar(tr("الاتجاه", "Trend", "Tendance"), technical.trend)
                    scalar("RSI", technical.rsi?.text)
                    scalar(tr("العينات", "Samples", "Échantillons"), technical.samples?.text)
                    for key in ["sma20", "sma50", "ema20", "ema50", "support", "resistance"] {
                        scalar(key.uppercased(), technical.indicators?[key]?.text)
                    }
                    metadata([technical.source, technical.upstreamProvider, technical.technicalAsOf])
                } else {
                    Text(tr("مؤشرات التحليل الفني غير متاحة حتى تتوفر مشاهدات موثقة كافية.", "Technical indicators are unavailable until enough verified observations exist.", "Les indicateurs techniques sont indisponibles tant que les observations vérifiées sont insuffisantes."))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle(instrument.code)
        .toolbar { Button(tr("تحديث", "Refresh", "Actualiser"), systemImage: "arrow.clockwise") { Task { await analysis.refresh(symbol: instrument.code) } }.disabled(analysis.isLoading) }
        .task(id: instrument.code) { await analysis.refresh(symbol: instrument.code) }
    }

    @ViewBuilder private func scalar(_ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty { LabeledContent(label, value: value) }
    }

    @ViewBuilder private func metadata(_ values: [String?]) -> some View {
        let text = values.compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.joined(separator: " · ")
        if !text.isEmpty { Text(text).font(.footnote).foregroundStyle(.secondary) }
    }
}

private struct InvestorPublicFeedSection: View {
    let feed: InvestorPublicFeed
    let items: [InvestorPublicFeedItem]
    let loading: Bool
    let unavailable: Bool
    let language: String
    let refresh: () async -> Void
    @Environment(\.openURL) private var openURL

    private func tr(_ ar: String, _ en: String, _ fr: String) -> String {
        language == "ar" ? ar : language == "fr" ? fr : en
    }

    private func label(_ feed: InvestorPublicFeed) -> String {
        switch feed {
        case .news: return tr("الأخبار المالية", "Financial news", "Actualités financières")
        case .calendar: return tr("التقويم الاقتصادي", "Economic calendar", "Calendrier économique")
        case .screening: return tr("فحص الشريعة", "Shariah screening", "Filtrage charia")
        case .markets: return tr("الأسواق", "Markets", "Marchés")
        }
    }

    var body: some View {
        Section(label(feed)) {
            Text(tr("هذه بيانات حية من مصادر الموقع؛ لا تُنشأ بدائل عند تعذر المصدر.", "This uses live website sources and never invents fallback items.", "Ces données viennent des sources du site et aucun élément de remplacement n'est inventé."))
                .font(.footnote).foregroundStyle(.secondary)
            Button(tr("تحديث", "Refresh", "Actualiser"), systemImage: "arrow.clockwise") { Task { await refresh() } }
                .disabled(loading)
        }
        if loading { Section { ProgressView(tr("جارٍ تحميل البيانات.", "Loading data.", "Chargement des données.")) } }
        if unavailable { Section { ContentUnavailableView(tr("تعذر تحميل البيانات", "Data unavailable", "Données indisponibles"), systemImage: "wifi.exclamationmark", description: Text(tr("تحقق من الاتصال ثم حاول مرة أخرى.", "Check your connection and try again.", "Vérifiez votre connexion puis réessayez."))) } }
        if !loading && !unavailable && items.isEmpty { Section { ContentUnavailableView(tr("لا توجد بيانات مطابقة", "No matching data", "Aucune donnée correspondante"), systemImage: "tray") } }
        ForEach(items) { item in
            Section {
                Text(item.title ?? item.symbol ?? "-").font(.headline)
                if feed == .news {
                    if let summary = item.summary, !summary.isEmpty { Text(summary) }
                    metadata([item.source, item.date])
                } else if feed == .calendar {
                    metadata([item.country, item.currency, item.date])
                    scalar(tr("الفعلي", "Actual", "Réel"), item.actual)
                    scalar(tr("المتوقع", "Forecast", "Prévision"), item.forecast)
                    scalar(tr("السابق", "Previous", "Précédent"), item.previous)
                    metadata([item.source])
                } else {
                    if let symbol = item.symbol, !symbol.isEmpty { Text(symbol).monospaced() }
                    Text(item.status ?? tr("غير مصنف", "Unclassified", "Non classé")).foregroundStyle(.secondary)
                    metadata([item.source, item.date])
                }
                if let value = item.originalURL, let url = URL(string: value), url.scheme == "https", url.host != nil {
                    Button(tr("المصدر الأصلي", "Original source", "Source originale"), systemImage: "safari") { openURL(url) }
                }
            }
        }
    }

    @ViewBuilder private func scalar(_ title: String, _ value: InvestorFeedScalar?) -> some View {
        if let value, !value.text.isEmpty { LabeledContent(title, value: value.text) }
    }
    @ViewBuilder private func metadata(_ values: [String?]) -> some View {
        let text = values.compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.joined(separator: " · ")
        if !text.isEmpty { Text(text).font(.footnote).foregroundStyle(.secondary) }
    }
}
