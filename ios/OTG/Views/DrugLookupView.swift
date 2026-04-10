import SwiftUI

/// DrugLookupView provides drug formulary search and dose calculations
public struct DrugLookupView: View {
    @StateObject private var formularyService = FormularyService()
    @State private var searchText: String = ""
    @State private var selectedDrug: FormularyEntry?
    @State private var patientWeight: String = ""

    var filteredDrugs: [FormularyEntry] {
        if searchText.isEmpty {
            return formularyService.allDrugs
        }
        return formularyService.allDrugs.filter { drug in
            drug.displayName.localizedCaseInsensitiveContains(searchText) ||
            drug.genericName.localizedCaseInsensitiveContains(searchText) ||
            drug.localNames.values.joined(separator: " ").localizedCaseInsensitiveContains(searchText)
        }
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                SearchBar(text: $searchText)
                    .padding()
                    .background(Color(.systemGray6))

                // Drug list
                if filteredDrugs.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "pills.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text(searchText.isEmpty ? "No drugs available" : "No matching drugs")
                            .font(.headline)
                        Text("Try searching by name or indication")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                } else {
                    List(filteredDrugs) { drug in
                        NavigationLink(destination: DrugDetailView(drug: drug)) {
                            DrugListItemView(drug: drug)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Drug Formulary")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Drug Detail View

struct DrugDetailView: View {
    let drug: FormularyEntry
    @State private var patientWeight: String = ""
    @State private var selectedRoute: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(drug.displayName)
                        .font(.title)
                        .fontWeight(.bold)

                    HStack(spacing: 8) {
                        if drug.whoEmlListed {
                            Label("WHO Listed", systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                        if drug.isVerified {
                            Label("Verified", systemImage: "shield.fill")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)

                VStack(alignment: .leading, spacing: 12) {
                    // Indication
                    SectionView(title: "Indication") {
                        Text(drug.indication)
                            .font(.body)
                    }

                    // Dosing
                    SectionView(title: "Dosing") {
                        VStack(alignment: .leading, spacing: 8) {
                            RowView(label: "Standard Dose", value: drug.dose)
                            RowView(label: "Route", value: drug.route)
                            RowView(label: "Timing", value: drug.timing)

                            if let alternative = drug.alternativeDose {
                                RowView(label: "Alternative", value: alternative)
                            }
                        }
                    }

                    // Contraindications
                    if !drug.contraindications.isEmpty {
                        SectionView(title: "Contraindications") {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(drug.contraindications, id: \.self) { contra in
                                    HStack(spacing: 8) {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(.red)
                                        Text(contra)
                                            .font(.body)
                                    }
                                }
                            }
                        }
                    }

                    // Warnings
                    if !drug.warnings.isEmpty {
                        SectionView(title: "Warnings") {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(drug.warnings, id: \.self) { warning in
                                    HStack(spacing: 8) {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.orange)
                                        Text(warning)
                                            .font(.body)
                                    }
                                }
                            }
                        }
                    }

                    // Source
                    SectionView(title: "Source") {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(drug.source)
                                .font(.body)
                            if let url = URL(string: drug.sourceUrl) {
                                Link(destination: url) {
                                    Text("View source")
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Drug Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Supporting Views

struct DrugListItemView: View {
    let drug: FormularyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(drug.displayName)
                        .font(.headline)
                    Text(drug.indication)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                if drug.isVerified {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            HStack(spacing: 8) {
                Label(drug.dose, systemImage: "syringe.2")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Label(drug.route, systemImage: "arrow.right.circle")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Search drugs...", text: $text)
                .textFieldStyle(.plain)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(8)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

struct SectionView<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)
            content
        }
    }
}

struct RowView: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
        }
    }
}

// MARK: - Formulary Service

class FormularyService: ObservableObject {
    @Published var allDrugs: [FormularyEntry] = []

    init() {
        loadDrugs()
    }

    private func loadDrugs() {
        // TODO: Load from database
        // For now, use empty list
        allDrugs = []
    }
}

#Preview {
    DrugLookupView()
}
