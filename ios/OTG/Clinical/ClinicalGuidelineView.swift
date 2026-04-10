import SwiftUI

/// ClinicalGuidelineView displays clinical guidelines with citations
public struct ClinicalGuidelineView: View {
    let guideline: ClinicalGuideline
    @State private var expandedSections: Set<String> = []

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(guideline.title)
                        .font(.title)
                        .fontWeight(.bold)

                    Text(guideline.summary)
                        .font(.body)
                        .foregroundColor(.secondary)

                    HStack(spacing: 8) {
                        Label("v\(guideline.version)", systemImage: "tag.fill")
                            .font(.caption)
                            .foregroundColor(.blue)

                        if let updated = guideline.lastUpdated {
                            Label(updated, systemImage: "calendar")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)

                VStack(alignment: .leading, spacing: 12) {
                    // Key Recommendations
                    if !guideline.keyRecommendations.isEmpty {
                        GuidelineSection(
                            title: "Key Recommendations",
                            icon: "star.fill",
                            isExpanded: expandedSections.contains("recommendations")
                        ) {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(guideline.keyRecommendations, id: \.self) { rec in
                                    HStack(alignment: .top, spacing: 8) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                        Text(rec)
                                            .font(.body)
                                    }
                                }
                            }
                        }
                        .onTapGesture {
                            toggleSection("recommendations")
                        }
                    }

                    // Background Information
                    if !guideline.background.isEmpty {
                        GuidelineSection(
                            title: "Background",
                            icon: "info.circle.fill",
                            isExpanded: expandedSections.contains("background")
                        ) {
                            Text(guideline.background)
                                .font(.body)
                        }
                        .onTapGesture {
                            toggleSection("background")
                        }
                    }

                    // Clinical Considerations
                    if !guideline.considerations.isEmpty {
                        GuidelineSection(
                            title: "Clinical Considerations",
                            icon: "lightbulb.fill",
                            isExpanded: expandedSections.contains("considerations")
                        ) {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(guideline.considerations, id: \.self) { consideration in
                                    HStack(alignment: .top, spacing: 8) {
                                        Image(systemName: "lightbulb")
                                            .foregroundColor(.orange)
                                        Text(consideration)
                                            .font(.body)
                                    }
                                }
                            }
                        }
                        .onTapGesture {
                            toggleSection("considerations")
                        }
                    }

                    // Evidence and Citations
                    if !guideline.evidence.isEmpty {
                        GuidelineSection(
                            title: "Evidence & Citations",
                            icon: "doc.text.fill",
                            isExpanded: expandedSections.contains("evidence")
                        ) {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(guideline.evidence, id: \.self) { ev in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(ev.title)
                                            .fontWeight(.semibold)
                                        Text(ev.source)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        if let url = URL(string: ev.url) {
                                            Link(destination: url) {
                                                Text("View full source")
                                                    .font(.caption)
                                                    .foregroundColor(.blue)
                                            }
                                        }
                                    }
                                    .padding(8)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(4)
                                }
                            }
                        }
                        .onTapGesture {
                            toggleSection("evidence")
                        }
                    }

                    // References
                    if !guideline.references.isEmpty {
                        GuidelineSection(
                            title: "References",
                            icon: "books.vertical.fill",
                            isExpanded: expandedSections.contains("references")
                        ) {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(Array(guideline.references.enumerated()), id: \.offset) { idx, ref in
                                    HStack(alignment: .top, spacing: 8) {
                                        Text("[\(idx + 1)]")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        Text(ref)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                        .onTapGesture {
                            toggleSection("references")
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func toggleSection(_ section: String) {
        withAnimation {
            if expandedSections.contains(section) {
                expandedSections.remove(section)
            } else {
                expandedSections.insert(section)
            }
        }
    }
}

// MARK: - Supporting Views

struct GuidelineSection<Content: View>: View {
    let title: String
    let icon: String
    let isExpanded: Bool
    let content: Content

    init(
        title: String,
        icon: String,
        isExpanded: Bool,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.icon = icon
        self.isExpanded = isExpanded
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                Text(title)
                    .fontWeight(.semibold)
                Spacer()
                Image(systemName: "chevron.right")
                    .rotationEffect(.degrees(isExpanded ? 90 : 0))
                    .foregroundColor(.gray)
            }
            .padding(8)
            .background(Color(.systemGray6))
            .cornerRadius(6)

            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    content
                }
                .padding(8)
                .background(Color(.systemBackground))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - Models

public struct ClinicalGuideline: Identifiable, Codable {
    public let id: String
    public let title: String
    public let summary: String
    public let version: String
    public let lastUpdated: String?
    public let keyRecommendations: [String]
    public let background: String
    public let considerations: [String]
    public let evidence: [Evidence]
    public let references: [String]

    public struct Evidence: Codable {
        public let title: String
        public let source: String
        public let url: String
    }
}

// MARK: - Sample Guidelines

public struct SampleGuidelines {
    public static let preeclampsiaGuideline = ClinicalGuideline(
        id: "pe-2024",
        title: "Hypertension in Pregnancy: Diagnosis and Management",
        summary: "Comprehensive guidelines for managing hypertensive disorders in pregnancy including preeclampsia and eclampsia",
        version: "2024.1",
        lastUpdated: "2024-03-15",
        keyRecommendations: [
            "Screen all pregnant women for hypertension at every antenatal visit",
            "Use BP ≥140/90 as threshold for Stage 2 hypertension",
            "Start antihypertensive therapy if SBP ≥160 or DBP ≥110 mmHg",
            "First-line agents: methyldopa, labetalol, nifedipine (avoid ACE-I and ARBs)",
            "For preeclampsia/eclampsia: use magnesium sulfate for seizure prophylaxis",
            "Manage severe features with magnesium sulfate and antihypertensive therapy",
            "Plan delivery at 37 weeks for stable preeclampsia, immediately for severe features"
        ],
        background: "Hypertensive disorders affect 5-10% of pregnancies and are a leading cause of maternal mortality. Early recognition and appropriate management can prevent serious complications including stroke, pulmonary edema, HELLP syndrome, and eclampsia.",
        considerations: [
            "White coat hypertension is common in pregnancy; consider home BP monitoring",
            "Preeclampsia can develop suddenly in previously normotensive women",
            "HELLP syndrome may present without hypertension in some cases",
            "Postpartum preeclampsia can develop up to 6 weeks after delivery"
        ],
        evidence: [
            ClinicalGuideline.Evidence(
                title: "ACOG Practice Bulletin on Hypertension in Pregnancy",
                source: "American College of Obstetricians and Gynecologists",
                url: "https://www.acog.org"
            ),
            ClinicalGuideline.Evidence(
                title: "WHO Recommendations for PE Management",
                source: "World Health Organization",
                url: "https://www.who.int"
            )
        ],
        references: [
            "Hypertension in Pregnancy (ACOG Technical Bulletin #220)",
            "WHO Expert Groups on Maternal Mortality",
            "International Society for the Study of Hypertension in Pregnancy"
        ]
    )

    public static let gestationalDiabetesGuideline = ClinicalGuideline(
        id: "gdm-2024",
        title: "Gestational Diabetes Mellitus: Screening and Management",
        summary: "Evidence-based approach to screening, diagnosis, and management of gestational diabetes",
        version: "2024.1",
        lastUpdated: "2024-03-20",
        keyRecommendations: [
            "Screen all pregnant women at 24-28 weeks using 50-g glucose challenge test",
            "Diagnose with 75-g OGTT if GCT ≥ 140 mg/dL",
            "Initial management: medical nutrition therapy with glucose monitoring",
            "Start insulin if fasting glucose ≥ 95 or 2-hour ≥ 155 mg/dL after 1-2 weeks diet",
            "Target glucose: fasting 80-95, postprandial < 140 mg/dL",
            "Screen newborn for hypoglycemia",
            "Counsel on postpartum glucose testing and breastfeeding benefits"
        ],
        background: "Gestational diabetes affects 2-10% of pregnancies and increases risk of maternal complications (preeclampsia, operative delivery) and fetal complications (macrosomia, neonatal hypoglycemia, long-term metabolic disease). Early detection and management improve outcomes.",
        considerations: [
            "Medical nutrition therapy is first-line treatment and succeeds in 80% of cases",
            "Insulin should not be delayed if glucose targets not met",
            "Maternal obesity is a major risk factor",
            "Ethnic minorities have higher GDM prevalence",
            "Long-term follow-up shows 50% develop type 2 diabetes within 5-10 years"
        ],
        evidence: [
            ClinicalGuideline.Evidence(
                title: "ACOG Practice Bulletin on Gestational Diabetes",
                source: "American College of Obstetricians and Gynecologists",
                url: "https://www.acog.org"
            )
        ],
        references: [
            "Gestational Diabetes Mellitus (ACOG Technical Bulletin #222)",
            "ADA Standards of Care for Diabetes in Pregnancy",
            "International Association of Diabetes and Pregnancy Study Groups"
        ]
    )
}

#Preview {
    ClinicalGuidelineView(guideline: SampleGuidelines.preeclampsiaGuideline)
}
