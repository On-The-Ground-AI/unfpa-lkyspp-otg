import SwiftUI

/// ClinicalProtocolsView displays emergency protocols and clinical guidelines
public struct ClinicalProtocolsView: View {
    @StateObject private var protocolService = ClinicalProtocolService()
    @State private var selectedCategory: String = "Emergency"
    @State private var searchText: String = ""

    let categories = ["Emergency", "Maternal", "Child Health", "Infection Control"]

    var filteredProtocols: [ClinicalProtocol] {
        let categorized = protocolService.protocols.filter { $0.category == selectedCategory }
        if searchText.isEmpty {
            return categorized
        }
        return categorized.filter { protocol in
            protocol.title.localizedCaseInsensitiveContains(searchText) ||
            protocol.summary.localizedCaseInsensitiveContains(searchText)
        }
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                // Search and filter
                VStack(spacing: 8) {
                    // Category picker
                    Picker("Category", selection: $selectedCategory) {
                        ForEach(categories, id: \.self) { cat in
                            Text(cat).tag(cat)
                        }
                    }
                    .pickerStyle(.segmented)

                    // Search bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search protocols...", text: $searchText)
                            .textFieldStyle(.plain)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                .padding()

                // Protocol list
                if filteredProtocols.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("No protocols found")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(filteredProtocols) { proto in
                        NavigationLink(destination: ProtocolDetailView(protocol: proto)) {
                            ProtocolListItemView(protocol: proto)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Clinical Protocols")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Protocol Detail View

struct ProtocolDetailView: View {
    let proto: ClinicalProtocol
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(proto.title)
                            .font(.title)
                            .fontWeight(.bold)
                        Spacer()
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }

                    Text(proto.summary)
                        .font(.body)
                        .foregroundColor(.secondary)

                    HStack(spacing: 12) {
                        Label(proto.category, systemImage: "tag.fill")
                            .font(.caption)
                            .foregroundColor(.blue)

                        if let severity = proto.severity {
                            Label(severity, systemImage: "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundColor(severityColor(severity))
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)

                VStack(alignment: .leading, spacing: 16) {
                    // Steps/Algorithm
                    if !proto.steps.isEmpty {
                        SectionHeaderView(title: "Steps")
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(Array(proto.steps.enumerated()), id: \.offset) { idx, step in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("\(idx + 1).")
                                        .fontWeight(.bold)
                                        .foregroundColor(.blue)
                                    Text(step)
                                        .font(.body)
                                }
                            }
                        }
                    }

                    // Key medications
                    if !proto.medications.isEmpty {
                        SectionHeaderView(title: "Key Medications")
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(proto.medications, id: \.self) { med in
                                HStack(spacing: 8) {
                                    Image(systemName: "syringe.2")
                                        .foregroundColor(.orange)
                                    Text(med)
                                        .font(.body)
                                }
                            }
                        }
                    }

                    // Contraindications/Precautions
                    if !proto.precautions.isEmpty {
                        SectionHeaderView(title: "Precautions")
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(proto.precautions, id: \.self) { precaution in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundColor(.yellow)
                                    Text(precaution)
                                        .font(.body)
                                }
                            }
                        }
                    }

                    // References
                    if !proto.references.isEmpty {
                        SectionHeaderView(title: "References")
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(proto.references, id: \.self) { ref in
                                Text(ref)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarBackButtonHidden(false)
    }

    private func severityColor(_ severity: String) -> Color {
        switch severity {
        case "CRITICAL": return .red
        case "HIGH": return .orange
        case "MODERATE": return .yellow
        default: return .green
        }
    }
}

// MARK: - Supporting Views

struct ProtocolListItemView: View {
    let proto: ClinicalProtocol

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(proto.title)
                        .font(.headline)
                    Text(proto.summary)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                if let severity = proto.severity {
                    VStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(proto.severityColor(severity))
                        Text(severity)
                            .font(.caption2)
                    }
                }
            }
            HStack(spacing: 8) {
                Label(proto.category, systemImage: "tag")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
        .padding(.vertical, 4)
    }
}

struct SectionHeaderView: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundColor(.primary)
    }
}

// MARK: - Clinical Protocol Model

struct ClinicalProtocol: Identifiable, Codable {
    let id: String
    let title: String
    let summary: String
    let category: String
    let severity: String?
    let steps: [String]
    let medications: [String]
    let precautions: [String]
    let references: [String]
    let language: String

    func severityColor(_ severity: String) -> Color {
        switch severity {
        case "CRITICAL": return .red
        case "HIGH": return .orange
        case "MODERATE": return .yellow
        default: return .green
        }
    }
}

// MARK: - Clinical Protocol Service

class ClinicalProtocolService: ObservableObject {
    @Published var protocols: [ClinicalProtocol] = []

    init() {
        loadProtocols()
    }

    private func loadProtocols() {
        // TODO: Load from knowledge base
        // For now, use empty list
        protocols = []
    }
}

#Preview {
    ClinicalProtocolsView()
}
