package org.unfpa.otg.clinical

/**
 * ClinicalProtocols — offline-accessible emergency management algorithms,
 * triage workflows, and quick reference cards.
 *
 * These are curated from WHO guidelines and local maternal health protocols.
 * All data is pre-embedded in the app and fully accessible offline.
 */
object ClinicalProtocols {

    /**
     * Emergency management protocol for eclampsia.
     * Reference: WHO Essential Maternal Care, PCPNC 2023
     */
    val eclampsiaProtocol = EmergencyProtocol(
        id = "eclampsia-management",
        name = "Eclampsia Management Protocol",
        severity = "CRITICAL",
        overview = """
            Eclampsia is the occurrence of seizures in a woman with preeclampsia.
            It is a medical emergency with high maternal mortality (5-15%).
            Immediate management is critical for maternal and fetal survival.
        """.trimIndent(),
        immediate_actions = listOf(
            "Call for emergency assistance and activate emergency response",
            "Place patient on left lateral decubitus position",
            "Establish IV access (2 large-bore cannulas)",
            "Prepare equipment for airway management and emergency delivery",
            "Obtain baseline vital signs and fetal heart rate if pregnant",
            "Continuous monitoring: BP, HR, RR, SpO2, urine output",
        ),
        medications = listOf(
            MedicationStep(
                name = "Magnesium Sulfate (Loading Dose)",
                dose = "4g IV bolus",
                route = "IV",
                timing = "Give over 5-10 minutes",
                indication = "First-line anticonvulsant for eclampsia",
                contraindications = listOf("Severe renal impairment"),
                notes = "Monitor for magnesium toxicity: loss of deep tendon reflexes"
            ),
            MedicationStep(
                name = "Magnesium Sulfate (Maintenance)",
                dose = "1g/hour IV infusion",
                route = "IV",
                timing = "Continue for 12-24 hours after last seizure",
                indication = "Prevent recurrent seizures",
                contraindications = emptyList(),
                notes = "Check deep tendon reflexes 1-2 hourly; respiratory rate > 12/min"
            ),
            MedicationStep(
                name = "Antihypertensive (Labetalol preferred)",
                dose = "20mg IV bolus, then 40mg at 10-min intervals, max 220mg",
                route = "IV",
                timing = "Titrate to maintain MAP < 125 mmHg",
                indication = "Severe hypertension (SBP > 160 or DBP > 110)",
                contraindications = listOf("Asthma, COPD, heart block"),
                notes = "Slower BP reduction reduces stroke risk"
            ),
        ),
        triage = TriageProtocol(
            name = "Eclampsia Severity Assessment",
            criteria = listOf(
                TriageCriterion("CRITICAL", "Ongoing seizures, altered consciousness, pulmonary edema"),
                TriageCriterion("EMERGENCY", "Single seizure, severe hypertension, headache, visual changes"),
                TriageCriterion("URGENT", "Preeclampsia with warning signs pending delivery"),
            ),
            nextSteps = "Deliver immediately if term; consider expedited delivery if preterm > 34 weeks"
        ),
        monitoring = listOf(
            "Vital signs: every 15 minutes for first hour, then hourly",
            "Deep tendon reflexes: hourly (indicates magnesium level)",
            "Urine output: maintain > 30 mL/hour",
            "Fetal monitoring: continuous if still pregnant",
            "Laboratory: FBC, U&Es, LFTs, coagulation profile, uric acid",
            "Watch for complications: HELLP syndrome, pulmonary edema, DIC, acute kidney injury",
        ),
        complications = listOf(
            "HELLP syndrome (Hemolysis, Elevated Liver enzymes, Low Platelets)",
            "Cerebral hemorrhage or ischemic stroke",
            "Pulmonary edema and acute respiratory distress",
            "Disseminated intravascular coagulation (DIC)",
            "Acute kidney injury",
            "Placental abruption",
        ),
    )

    /**
     * Emergency management protocol for postpartum hemorrhage (PPH).
     * Reference: WHO Guidelines for Managing Complications of Pregnancy and Childbirth
     */
    val postpartumHemorrhageProtocol = EmergencyProtocol(
        id = "pph-management",
        name = "Postpartum Hemorrhage (PPH) Management",
        severity = "CRITICAL",
        overview = """
            PPH is abnormal vaginal bleeding of > 500 mL in the first 24 hours after delivery
            (or > 1000 mL after cesarean section). It is the leading cause of maternal death.
            Early recognition and prompt treatment are essential.
        """.trimIndent(),
        immediate_actions = listOf(
            "Call for emergency assistance; alert blood bank and theatre",
            "Establish IV access (2 large-bore cannulas, 1 central line if available)",
            "Start rapid IV fluid replacement (Normal saline or Hartmann's, 1-2 L rapid)",
            "Empty uterus: bladder catheterization, manual removal of placenta if retained",
            "Perform uterine massage (every 10-15 minutes)",
            "Assess perineal/vaginal lacerations; repair if present",
            "Assess for DIC: monitor for oozing, petechiae, bleeding from IV sites",
        ),
        medications = listOf(
            MedicationStep(
                name = "Oxytocin (First-line)",
                dose = "10 units IM or slow IV",
                route = "IM or IV (slow)",
                timing = "Give immediately; repeat every 15-30 minutes if needed",
                indication = "Uterotonic: causes sustained uterine contraction",
                contraindications = listOf("None (safe in hypertension if given slowly IV)"),
                notes = "IM injection is preferred; IV must be diluted and given slowly"
            ),
            MedicationStep(
                name = "Ergotamine (if oxytocin unavailable)",
                dose = "0.5mg IM",
                route = "IM",
                timing = "Give immediately; do not repeat",
                indication = "Uterotonic if oxytocin unavailable",
                contraindications = listOf("Hypertension, preeclampsia, sepsis"),
                notes = "Do not give IV (causes severe hypertension and vasospasm)"
            ),
            MedicationStep(
                name = "Misoprostol (if PPH persists)",
                dose = "800 micrograms",
                route = "Sublingual or rectal",
                timing = "Give if bleeding continues after oxytocin",
                indication = "Third-line uterotonic",
                contraindications = emptyList(),
                notes = "Causes sustained contraction; may cause fever and diarrhea"
            ),
            MedicationStep(
                name = "Tranexamic Acid",
                dose = "1g IV",
                route = "IV",
                timing = "Give within 3 hours of delivery if significant bleeding",
                indication = "Reduces need for transfusion by ~30%",
                contraindications = listOf("Active thromboembolism"),
                notes = "Most effective if given early; dilute in saline"
            ),
        ),
        triage = TriageProtocol(
            name = "PPH Severity Assessment",
            criteria = listOf(
                TriageCriterion("CRITICAL", "Massive bleeding > 1L, signs of shock, falling consciousness"),
                TriageCriterion("EMERGENCY", "Bleeding > 500 mL with tachycardia/hypotension"),
                TriageCriterion("URGENT", "Bleeding > 500 mL, stable vitals, responding to uterotinics"),
            ),
            nextSteps = "Critical/Emergency: expedite to theatre for evacuation/transfusion; Urgent: IV fluids, monitor closely"
        ),
        monitoring = listOf(
            "Vital signs: every 5-15 minutes depending on severity",
            "Uterine tone: palpate continuously to ensure firm contraction",
            "Vaginal bleeding: assess sanitary pad saturation/hour",
            "Fluid intake/output: maintain IV access, monitor urine output",
            "Laboratory: FBC, U&Es, coagulation profile, group and cross-match blood",
            "Watch for complications: DIC, anemia, acute kidney injury, shock",
        ),
        complications = listOf(
            "Hemorrhagic shock",
            "Disseminated intravascular coagulation (DIC)",
            "Acute kidney injury",
            "Cerebral edema from rapid fluid infusion",
            "Amniotic fluid embolism (if uterine manipulation)",
            "Infection/sepsis from retained products of conception",
        ),
    )

    /**
     * Triage classification for maternal emergencies.
     * WHO four-color triage system adapted for resource-limited settings.
     */
    data class TriageLevel(
        val level: String,
        val color: String,
        val definition: String,
        val examples: List<String>,
    )

    val triageLevels = listOf(
        TriageLevel(
            level = "RED (Emergency)",
            color = "#D32F2F",
            definition = "Life-threatening, requires immediate intervention",
            examples = listOf(
                "Eclampsia or severe preeclampsia with warning signs",
                "Postpartum hemorrhage > 1L with shock",
                "Ruptured uterus or placental abruption",
                "Amniotic fluid embolism",
                "Severe sepsis with organ dysfunction",
            )
        ),
        TriageLevel(
            level = "YELLOW (Urgent)",
            color = "#F57F17",
            definition = "Potentially serious, requires evaluation within 30 minutes",
            examples = listOf(
                "Moderate preeclampsia",
                "Postpartum hemorrhage 500-1000 mL, stable vitals",
                "Prolonged labor with fetal distress",
                "Incomplete abortion with heavy bleeding",
            )
        ),
        TriageLevel(
            level = "GREEN (Non-urgent)",
            color = "#388E3C",
            definition = "Minor conditions, can wait 2-4 hours",
            examples = listOf(
                "Mild preeclampsia, no warning signs",
                "Normal labor progression",
                "Minor perineal lacerations",
                "Counseling for family planning",
            )
        ),
    )

    /**
     * Quick reference card for triage vital sign assessment.
     */
    data class VitalSignReference(
        val parameter: String,
        val normal: String,
        val warning: String,
        val emergency: String,
    )

    val vitalSignReferences = listOf(
        VitalSignReference(
            parameter = "Systolic BP",
            normal = "< 140 mmHg",
            warning = "140-159 mmHg",
            emergency = ">= 160 mmHg"
        ),
        VitalSignReference(
            parameter = "Diastolic BP",
            normal = "< 90 mmHg",
            warning = "90-109 mmHg",
            emergency = ">= 110 mmHg"
        ),
        VitalSignReference(
            parameter = "Heart Rate",
            normal = "60-100 bpm",
            warning = "100-120 bpm",
            emergency = "> 120 bpm or < 40 bpm"
        ),
        VitalSignReference(
            parameter = "Respiratory Rate",
            normal = "12-20 breaths/min",
            warning = "20-30 breaths/min",
            emergency = "> 30 breaths/min or < 8 breaths/min"
        ),
        VitalSignReference(
            parameter = "O2 Saturation",
            normal = ">= 95%",
            warning = "90-94%",
            emergency = "< 90%"
        ),
        VitalSignReference(
            parameter = "Temperature",
            normal = "36.5-37.5°C",
            warning = "37.5-38.5°C",
            emergency = "> 38.5°C or < 36°C"
        ),
    )

    /**
     * Data classes for protocol representation.
     */
    data class EmergencyProtocol(
        val id: String,
        val name: String,
        val severity: String,
        val overview: String,
        val immediate_actions: List<String>,
        val medications: List<MedicationStep>,
        val triage: TriageProtocol,
        val monitoring: List<String>,
        val complications: List<String>,
    )

    data class MedicationStep(
        val name: String,
        val dose: String,
        val route: String,
        val timing: String,
        val indication: String,
        val contraindications: List<String>,
        val notes: String,
    )

    data class TriageProtocol(
        val name: String,
        val criteria: List<TriageCriterion>,
        val nextSteps: String,
    )

    data class TriageCriterion(
        val level: String,
        val description: String,
    )

    /**
     * Get all protocols by ID.
     */
    fun getProtocolById(id: String): EmergencyProtocol? = when (id) {
        "eclampsia-management" -> eclampsiaProtocol
        "pph-management" -> postpartumHemorrhageProtocol
        else -> null
    }

    /**
     * Get all available protocols.
     */
    fun getAllProtocols(): List<EmergencyProtocol> = listOf(
        eclampsiaProtocol,
        postpartumHemorrhageProtocol,
    )

    /**
     * Search protocols by keyword.
     */
    fun searchProtocols(query: String): List<EmergencyProtocol> {
        val normalised = query.lowercase()
        return getAllProtocols().filter { protocol ->
            protocol.name.lowercase().contains(normalised) ||
            protocol.overview.lowercase().contains(normalised) ||
            protocol.immediate_actions.any { it.lowercase().contains(normalised) } ||
            protocol.medications.any { it.name.lowercase().contains(normalised) }
        }
    }

    /**
     * Get vital sign reference for a parameter.
     */
    fun getVitalSignReference(parameter: String): VitalSignReference? =
        vitalSignReferences.firstOrNull { it.parameter.equals(parameter, ignoreCase = true) }

    /**
     * Assess triage level based on vital signs and symptoms.
     */
    fun assessTriageLevel(
        symptoms: List<String>,
        systolicBP: Int,
        heartRate: Int,
        respiratoryRate: Int,
        hasConsciousalterations: Boolean = false,
    ): String {
        // Emergency criteria
        if (systolicBP >= 160 || hasConsciousalterations || respiratoryRate > 30 || heartRate > 130) {
            return "RED"
        }

        // Urgent criteria
        if (systolicBP >= 140 || heartRate > 120 || respiratoryRate > 25) {
            return "YELLOW"
        }

        // Non-urgent
        return "GREEN"
    }
}
