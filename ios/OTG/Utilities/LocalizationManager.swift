import Foundation

/// LocalizationManager handles multi-language support
/// Supports: English, Swahili, Amharic, French, Tigrinya, Somali
public class LocalizationManager: ObservableObject {
    @Published var currentLanguage: String = "en"

    static let supported = ["en", "sw", "am", "fr", "ti", "so"]
    static let languageNames: [String: String] = [
        "en": "English",
        "sw": "Kiswahili",
        "am": "አማርኛ",
        "fr": "Français",
        "ti": "ትግርኛ",
        "so": "Af Soomaali"
    ]

    init() {
        // Get system language or default to English
        let systemLocale = Locale.current.language.languageCode?.identifier ?? "en"
        currentLanguage = LocalizationManager.supported.contains(systemLocale) ? systemLocale : "en"
    }

    /// Get localized string
    public func localize(_ key: String, for language: String? = nil) -> String {
        let lang = language ?? currentLanguage
        let filename = "Strings.\(lang)"

        guard let filepath = Bundle.main.path(forResource: filename, ofType: "strings") else {
            return key
        }

        guard let stringsDict = NSDictionary(contentsOfFile: filepath) else {
            return key
        }

        return (stringsDict[key] as? String) ?? key
    }

    /// Get date formatter for language
    public func dateFormatter(dateStyle: DateFormatter.Style = .medium) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: currentLanguage)
        formatter.dateStyle = dateStyle
        return formatter
    }

    /// Get number formatter for language
    public func numberFormatter() -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: currentLanguage)
        return formatter
    }
}
