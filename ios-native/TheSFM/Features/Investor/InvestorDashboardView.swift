import SwiftUI

struct InvestorDashboardView: View {
    @StateObject private var directory = InvestorMarketDirectoryStore()

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

                if directory.isLoading {
                    HStack { Spacer(); ProgressView("جارٍ تحديث الأسواق…"); Spacer() }
                } else if let errorMessage = directory.errorMessage {
                    ContentUnavailableView("تعذر تحميل الأسواق", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
                } else if directory.instruments.isEmpty {
                    ContentUnavailableView("لا توجد أدوات متاحة", systemImage: "chart.bar.xaxis")
                } else {
                    Section("أدوات الأسواق") {
                        ForEach(directory.instruments) { instrument in
                            HStack(spacing: 12) {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .foregroundStyle(.tint)
                                    .accessibilityHidden(true)
                                VStack(alignment: .trailing, spacing: 3) {
                                    Text(instrument.title).font(.headline)
                                    Text(instrument.marketName ?? "سوق عالمي")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(instrument.code).font(.subheadline.weight(.semibold)).monospaced()
                                    if let currency = instrument.currency {
                                        Text(currency).font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
            .navigationTitle("الأسواق")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("تحديث", systemImage: "arrow.clockwise") { Task { await directory.refresh() } }
                        .disabled(directory.isLoading)
                }
            }
            .task { await directory.refresh() }
        }
        .tint(.cyan)
    }
}
