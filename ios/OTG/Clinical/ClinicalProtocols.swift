import Foundation

/// ClinicalProtocols provides access to emergency protocols and clinical algorithms
public struct ClinicalProtocols {
    // Protocol categories
    public enum Category: String, CaseIterable {
        case emergency = "Emergency"
        case maternal = "Maternal"
        case childHealth = "Child Health"
        case infectionControl = "Infection Control"
        case other = "Other"
    }

    // Protocol severity levels
    public enum Severity: String {
        case critical = "CRITICAL"
        case high = "HIGH"
        case moderate = "MODERATE"
        case low = "LOW"
    }

    // Common emergency protocols
    public static let postpartumHemorrhageProtocol = ClinicalProtocol(
        id: "pph-2024-01",
        title: "Postpartum Hemorrhage (PPH) Management",
        summary: "Acute management of primary postpartum hemorrhage",
        category: Category.emergency.rawValue,
        severity: Severity.critical.rawValue,
        steps: [
            "Call for help immediately",
            "Assess vital signs and IV access",
            "Uterine massage - massage fundus for 15 seconds",
            "Empty bladder via catheter",
            "Administer oxytocin 10 IU IM (or 5-10 IU IV if available)",
            "If bleeding continues, give ergot alkaloid or misoprostol",
            "Transfer to facility for blood transfusion if needed",
            "Monitor vital signs every 5-15 minutes"
        ],
        medications: [
            "Oxytocin 10 IU IM",
            "Ergot alkaloid 0.5-0.6 mg IM",
            "Misoprostol 800 mcg oral/sublingual",
            "Fresh whole blood for transfusion"
        ],
        precautions: [
            "Avoid ergot alkaloid if hypertensive",
            "Ensure bimanual compression technique is correct",
            "Do not delay transfer for investigations"
        ],
        references: [
            "WHO Essential Medicines List 2023",
            "PCPNC Guidelines 2023, Section 3.2"
        ],
        language: "en"
    )

    public static let maternalSepsissisProtocol = ClinicalProtocol(
        id: "sepsis-2024-01",
        title: "Maternal Sepsis Management",
        summary: "Recognition and treatment of maternal sepsis",
        category: Category.maternal.rawValue,
        severity: Severity.critical.rawValue,
        steps: [
            "Recognize signs: fever, rapid pulse, low BP, confusion",
            "Start broad-spectrum antibiotics immediately",
            "Give IV fluids: crystalloid 30 mL/kg over 1 hour",
            "Obtain blood cultures if possible",
            "Check for source: chorioamnionitis, aspiration, UTI",
            "Consider blood transfusion if Hb < 7",
            "Arrange transfer to facility"
        ],
        medications: [
            "Ceftriaxone 2g IV 6-hourly",
            "Gentamicin 7.5 mg/kg IV daily",
            "Metronidazole 500 mg IV 8-hourly",
            "Fluid: Normal saline or Ringer's lactate"
        ],
        precautions: [
            "Do not delay antibiotics",
            "Monitor urine output carefully",
            "Watch for multi-organ failure"
        ],
        references: [
            "Surviving Sepsis Campaign 2023",
            "WHO Maternal Sepsis Guidelines"
        ],
        language: "en"
    )

    public static let neonatalResuscitationProtocol = ClinicalProtocol(
        id: "neoresus-2024-01",
        title: "Neonatal Resuscitation",
        summary: "Initial management of non-breathing newborn",
        category: Category.childHealth.rawValue,
        severity: Severity.critical.rawValue,
        steps: [
            "Dry and stimulate infant",
            "Check for breathing and heart rate",
            "If HR < 100, start bag-mask ventilation",
            "Give 21% O2 (room air acceptable initially)",
            "If HR < 60 after 15 sec PPV, start chest compressions",
            "Compressions: 3:1 ratio with ventilation",
            "Consider umbilical venous catheter for medications",
            "Continue until HR > 100 or obviously futile"
        ],
        medications: [
            "Epinephrine 0.01-0.03 mg/kg IV",
            "Normal saline for fluid resuscitation",
            "Dextrose 10% for hypoglycemia"
        ],
        precautions: [
            "Keep newborn warm",
            "Avoid hyperoxia (avoid 100% O2)",
            "Check umbilical cord for anomalies"
        ],
        references: [
            "ILCOR Guidelines 2024",
            "PCPNC Neonatal Resuscitation Section"
        ],
        language: "en"
    )

    public static let hyperglycemiaInPregnancyProtocol = ClinicalProtocol(
        id: "gdt-2024-01",
        title: "Gestational Diabetes/Hyperglycemia Management",
        summary: "Management of elevated glucose in pregnancy",
        category: Category.maternal.rawValue,
        severity: Severity.moderate.rawValue,
        steps: [
            "Screen: random blood glucose at first visit",
            "If RBS ≥ 140 mg/dL, do fasting glucose",
            "If fasting ≥ 126 or 2-hour OGTT ≥ 200, diagnose GDM",
            "Counsel on diet and exercise",
            "Monitor glucose weekly",
            "Start insulin if diet fails (target FBS 90-130)"
        ],
        medications: [
            "Metformin 500 mg BD (if available)",
            "Insulin NPH/Regular as needed"
        ],
        precautions: [
            "Avoid sulfonamides in first trimester",
            "Monitor for diabetic ketoacidosis",
            "Screen newborn for hypoglycemia"
        ],
        references: [
            "ACOG Gestational Diabetes Guidelines",
            "WHO Hyperglycemia in Pregnancy"
        ],
        language: "en"
    )

    /// Get all available protocols
    public static var allProtocols: [ClinicalProtocol] {
        [
            postpartumHemorrhageProtocol,
            maternalSepsissisProtocol,
            neonatalResuscitationProtocol,
            hyperglycemiaInPregnancyProtocol
        ]
    }

    /// Get protocols by category
    public static func protocols(for category: Category) -> [ClinicalProtocol] {
        allProtocols.filter { $0.category == category.rawValue }
    }

    /// Get protocol by ID
    public static func protocol(withId id: String) -> ClinicalProtocol? {
        allProtocols.first { $0.id == id }
    }
}

/// DrugCalculator provides common dose calculation utilities
public struct DrugCalculator {
    /// Calculate dose based on patient weight
    public static func calculateDose(
        baseDose: Double,
        unitPerKg: Double,
        patientWeightKg: Double
    ) -> Double {
        baseDose + (unitPerKg * patientWeightKg)
    }

    /// Calculate pediatric dose using Young's rule
    public static func youngRule(
        adultDose: Double,
        childAgeYears: Int
    ) -> Double {
        (Double(childAgeYears) / Double(childAgeYears + 12)) * adultDose
    }

    /// Calculate pediatric dose using Clark's rule
    public static func clarksRule(
        adultDose: Double,
        childWeightKg: Double
    ) -> Double {
        (childWeightKg / 70.0) * adultDose
    }

    /// Calculate BSA using Mosteller formula
    public static func calculateBSA(heightCm: Double, weightKg: Double) -> Double {
        sqrt((heightCm * weightKg) / 3600.0)
    }

    /// Calculate dose by BSA
    public static func doseBySA(
        dosePerM2: Double,
        heightCm: Double,
        weightKg: Double
    ) -> Double {
        dosePerM2 * calculateBSA(heightCm: heightCm, weightKg: weightKg)
    }

    /// Get oxytocin dose for labor augmentation
    public static func oxytocin(forAugmentationWithWeight weight: Double) -> (startDose: String, maxDose: String) {
        // Standard: start 2-4 mIU/min, max 20-40 mIU/min
        return (
            startDose: "2-4 mIU/min IV infusion",
            maxDose: "20-40 mIU/min IV infusion"
        )
    }

    /// Get ergot alkaloid contraindications check
    public static func canGiveErgotAlkaloid(bpSystolic: Int) -> Bool {
        bpSystolic < 160  // Contraindicated if SBP ≥ 160
    }
}

/// ClinicalGuidelines provides quick reference information
public struct ClinicalGuidelines {
    // Blood pressure targets in pregnancy
    public static let bpTargets = [
        "Normal": "< 120/80 mmHg",
        "Elevated": "120-129/<80 mmHg",
        "Stage 1 HTN": "130-139/80-89 mmHg",
        "Stage 2 HTN": "≥ 140/90 mmHg"
    ]

    // Anemia thresholds in pregnancy
    public static let anemiaThresholds = [
        "First trimester": "≥ 11.0 g/dL",
        "Second/Third trimester": "≥ 10.5 g/dL",
        "Postpartum": "≥ 10.0 g/dL"
    ]

    // Glucose targets in GDM
    public static let glucoseTargets = [
        "Fasting": "90-130 mg/dL",
        "2-hour postprandial": "< 140 mg/dL",
        "At bedtime": "100-140 mg/dL"
    ]

    // Normal vital signs
    public static let normalVitals = [
        "Heart rate": "60-100 bpm",
        "Blood pressure": "< 120/80 mmHg",
        "Respiratory rate": "12-20 breaths/min",
        "Temperature": "36.5-37.5°C"
    ]
}
