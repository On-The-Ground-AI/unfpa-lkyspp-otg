import Foundation

/// DrugCalculator view for dose calculations
public struct DrugCalculatorView: View {
    @State private var selectedCalculation: CalculationType = .weight
    @State private var adultDose: String = ""
    @State private var weight: String = ""
    @State private var age: String = ""
    @State private var height: String = ""
    @State private var result: Double? = nil

    enum CalculationType: String, CaseIterable {
        case weight = "Weight-based"
        case youngs = "Young's Rule"
        case clarks = "Clark's Rule"
        case bsa = "Body Surface Area"
    }

    public var body: some View {
        Form {
            Section("Calculation Method") {
                Picker("Type", selection: $selectedCalculation) {
                    ForEach(CalculationType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Input Values") {
                switch selectedCalculation {
                case .weight:
                    TextField("Adult Dose", text: $adultDose)
                        .keyboardType(.decimalPad)
                    TextField("Patient Weight (kg)", text: $weight)
                        .keyboardType(.decimalPad)

                case .youngs:
                    TextField("Adult Dose", text: $adultDose)
                        .keyboardType(.decimalPad)
                    TextField("Child Age (years)", text: $age)
                        .keyboardType(.numberPad)

                case .clarks:
                    TextField("Adult Dose", text: $adultDose)
                        .keyboardType(.decimalPad)
                    TextField("Child Weight (kg)", text: $weight)
                        .keyboardType(.decimalPad)

                case .bsa:
                    TextField("Dose per m²", text: $adultDose)
                        .keyboardType(.decimalPad)
                    TextField("Height (cm)", text: $height)
                        .keyboardType(.decimalPad)
                    TextField("Weight (kg)", text: $weight)
                        .keyboardType(.decimalPad)
                }
            }

            if let result = result {
                Section("Calculated Dose") {
                    HStack {
                        Text("Result")
                        Spacer()
                        Text(String(format: "%.2f", result))
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                }
            }

            Section {
                Button(action: calculate) {
                    HStack {
                        Image(systemName: "calculator")
                        Text("Calculate")
                    }
                }
            }
        }
        .navigationTitle("Dose Calculator")
    }

    private func calculate() {
        guard let adult = Double(adultDose) else { return }

        switch selectedCalculation {
        case .weight:
            guard let w = Double(weight) else { return }
            result = DrugCalculator.calculateDose(baseDose: adult, unitPerKg: 0, patientWeightKg: w)

        case .youngs:
            guard let a = Int(age) else { return }
            result = DrugCalculator.youngRule(adultDose: adult, childAgeYears: a)

        case .clarks:
            guard let w = Double(weight) else { return }
            result = DrugCalculator.clarksRule(adultDose: adult, childWeightKg: w)

        case .bsa:
            guard let h = Double(height), let w = Double(weight) else { return }
            result = DrugCalculator.doseBySA(dosePerM2: adult, heightCm: h, weightKg: w)
        }
    }
}

// MARK: - Common Drug Doses

public struct CommonDrugs {
    public static let oxytocin = DrugProtocol(
        name: "Oxytocin",
        indication: "Labor augmentation, PPH prevention",
        routes: ["IV infusion", "IM"],
        doses: [
            "Labor: 2-4 mIU/min IV, increase by 4 mIU/min q30min until contractions (max 20-40 mIU/min)",
            "PPH: 10 IU IM or 5 IU IV slow",
            "Pre-eclampsia/eclampsia PPH prevention: 5 IU IM or 5-10 IU IV"
        ],
        contraindications: [
            "SBP ≥ 160 mmHg",
            "Placenta previa",
            "Vasa previa"
        ]
    )

    public static let magnesiumSulfate = DrugProtocol(
        name: "Magnesium Sulfate",
        indication: "Pre-eclampsia, eclampsia, seizure prophylaxis",
        routes: ["IV", "IM"],
        doses: [
            "Loading: 4g IV over 5-20 min (or 10g IM)",
            "Maintenance: 1g/hour IV for 12-24 hours"
        ],
        contraindications: [
            "Myasthenia gravis",
            "Renal failure (Cr > 3)",
            "Absent patellar reflex"
        ]
    )

    public static let misoprostol = DrugProtocol(
        name: "Misoprostol",
        indication: "Abortion, PPH, labor induction",
        routes: ["Oral", "Sublingual", "Vaginal"],
        doses: [
            "Incomplete abortion: 600 mcg oral/sublingual",
            "PPH: 800 mcg oral",
            "Labor induction: 25 mcg vaginal q3-6h"
        ],
        contraindications: [
            "Allergy to prostaglandins",
            "Cardiac disease"
        ]
    )

    public static let metformin = DrugProtocol(
        name: "Metformin",
        indication: "Gestational diabetes, PCOS",
        routes: ["Oral"],
        doses: [
            "Initial: 500 mg once or twice daily",
            "Maintenance: 1500-2000 mg daily in divided doses",
            "Max: 2550 mg daily"
        ],
        contraindications: [
            "eGFR < 30 mL/min",
            "Acute illness with dehydration",
            "IV contrast procedures"
        ]
    )
}

// MARK: - Drug Protocol

public struct DrugProtocol: Codable {
    public let name: String
    public let indication: String
    public let routes: [String]
    public let doses: [String]
    public let contraindications: [String]

    init(
        name: String,
        indication: String,
        routes: [String],
        doses: [String],
        contraindications: [String]
    ) {
        self.name = name
        self.indication = indication
        self.routes = routes
        self.doses = doses
        self.contraindications = contraindications
    }
}

// Suppress SwiftUI import requirement when not available
import SwiftUI
