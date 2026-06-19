import Foundation

enum MoneyFormatter {
    static func format(_ amount: Decimal, currencyCode: String = "KWD", localeIdentifier: String = "ar_KW") -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.locale = Locale(identifier: localeIdentifier)
        formatter.maximumFractionDigits = currencyCode == "KWD" ? 3 : 2

        return formatter.string(from: NSDecimalNumber(decimal: amount)) ?? "\(amount) \(currencyCode)"
    }
}
