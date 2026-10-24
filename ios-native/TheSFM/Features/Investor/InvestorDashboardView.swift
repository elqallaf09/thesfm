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
