/**
 * Clinical Triage Scoring System
 *
 * Implements evidence-based scoring for:
 * - Maternal danger signs (vital signs, clinical symptoms)
 * - Neonatal Apgar interpretation
 * - Preeclampsia/Eclampsia severity assessment
 *
 * Scoring provides severity classification and clinical recommendations.
 */

// ──────────────────────────────────────────────────────────────────────
// Maternal Danger Signs Scoring
// ──────────────────────────────────────────────────────────────────────

export enum MaternalSeverity {
  GREEN = 'GREEN', // No danger signs
  YELLOW = 'YELLOW', // Caution - monitor closely
  ORANGE = 'ORANGE', // Urgent - escalate care
  RED = 'RED', // Emergency - immediate intervention
}

export interface MaternalVitals {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

export interface MaternalSigns {
  vaginalBleeding?: 'none' | 'spotting' | 'light' | 'heavy' | 'massive';
  vaginalDischarge?: 'normal' | 'foul-smelling' | 'bloody';
  severeAbdominalPain?: boolean;
  severeHeadache?: boolean;
  visualDisturbances?: boolean;
  chestPain?: boolean;
  dyspnea?: boolean;
  pallor?: boolean;
  jaundice?: boolean;
  convulsions?: boolean;
  unconsciousness?: boolean;
  labourDuration?: number; // hours
  vaginalTearing?: 'none' | 'minor' | 'moderate' | 'severe';
  uterineRupture?: boolean;
}

export interface MaternalTriageResult {
  severity: MaternalSeverity;
  score: number;
  maxScore: number;
  dangerSigns: string[];
  recommendations: string[];
  requiresEmergencyTransport: boolean;
}

/**
 * Score maternal danger signs based on vital signs and clinical symptoms.
 * Uses WHO maternal danger signs framework.
 */
export function triageMaternalDangerSigns(
  vitals: MaternalVitals,
  signs: MaternalSigns
): MaternalTriageResult {
  let score = 0;
  const maxScore = 20;
  const dangerSigns: string[] = [];
  const recommendations: string[] = [];

  // Vital Sign Assessment (0-8 points)
  if (vitals.systolicBp !== undefined) {
    if (vitals.systolicBp >= 160 || vitals.systolicBp <= 90) {
      score += 2;
      dangerSigns.push(`Abnormal BP: ${vitals.systolicBp}/${vitals.diastolicBp}`);
    } else if (vitals.systolicBp >= 140 || vitals.systolicBp < 100) {
      score += 1;
    }
  }

  if (vitals.heartRate !== undefined) {
    if (vitals.heartRate >= 120 || vitals.heartRate <= 40) {
      score += 2;
      dangerSigns.push(`Abnormal heart rate: ${vitals.heartRate} bpm`);
    } else if (vitals.heartRate >= 100 || vitals.heartRate < 60) {
      score += 1;
    }
  }

  if (vitals.respiratoryRate !== undefined) {
    if (vitals.respiratoryRate >= 30 || vitals.respiratoryRate <= 10) {
      score += 2;
      dangerSigns.push(`Abnormal respiratory rate: ${vitals.respiratoryRate}/min`);
    }
  }

  if (vitals.temperature !== undefined) {
    if (vitals.temperature >= 38.5 || vitals.temperature <= 36) {
      score += 2;
      dangerSigns.push(`Abnormal temperature: ${vitals.temperature}°C`);
    } else if (vitals.temperature >= 38 || vitals.temperature < 36.5) {
      score += 1;
    }
  }

  // Oxygenation (0-2 points)
  if (vitals.oxygenSaturation !== undefined) {
    if (vitals.oxygenSaturation < 90) {
      score += 2;
      dangerSigns.push(`Low oxygen saturation: ${vitals.oxygenSaturation}%`);
    } else if (vitals.oxygenSaturation < 95) {
      score += 1;
    }
  }

  // Hemorrhage Assessment (0-4 points)
  if (signs.vaginalBleeding === 'massive') {
    score += 4;
    dangerSigns.push('MASSIVE vaginal bleeding');
    recommendations.push('EMERGENCY: Prepare for transfusion, IV access, emergency transport');
  } else if (signs.vaginalBleeding === 'heavy') {
    score += 3;
    dangerSigns.push('Heavy vaginal bleeding');
    recommendations.push('Urgent: IV access, cross-match blood, prepare for emergency transport');
  } else if (signs.vaginalBleeding === 'light') {
    score += 1;
  }

  // Infection Signs (0-3 points)
  if (signs.vaginalDischarge === 'foul-smelling' && vitals.temperature && vitals.temperature >= 38) {
    score += 3;
    dangerSigns.push('Signs of infection: fever + foul-smelling discharge');
    recommendations.push(
      'Urgent: Start broad-spectrum antibiotics, IV fluids, monitor for sepsis'
    );
  } else if (signs.vaginalDischarge === 'foul-smelling') {
    score += 1;
  }

  // Severe Pain/Complications (0-4 points)
  if (signs.severeAbdominalPain) {
    score += 2;
    dangerSigns.push('Severe abdominal pain');
    if (signs.uterineRupture || (signs.labourDuration && signs.labourDuration > 24)) {
      recommendations.push('EMERGENCY: Consider uterine rupture, prepare for laparotomy');
    }
  }

  if (signs.vaginalTearing === 'severe') {
    score += 2;
    dangerSigns.push('Severe perineal/genital trauma');
    recommendations.push('Urgent: Surgical repair required, transfer to facility with OR');
  }

  // Preeclampsia/Eclampsia Signs (0-4 points)
  if (signs.severeHeadache) {
    score += 1;
    dangerSigns.push('Severe headache');
  }

  if (signs.visualDisturbances) {
    score += 2;
    dangerSigns.push('Visual disturbances');
    recommendations.push('Alert: Possible preeclampsia, check BP and urine protein');
  }

  if (signs.convulsions) {
    score += 4;
    dangerSigns.push('CONVULSIONS (eclampsia)');
    recommendations.push('EMERGENCY: Magnesium sulfate, airway management, emergency transport');
  }

  // Cardiac/Respiratory Distress (0-2 points)
  if (signs.chestPain || signs.dyspnea) {
    score += 2;
    dangerSigns.push('Chest pain or dyspnea');
    recommendations.push('Urgent: ECG, chest X-ray, cardiac assessment, oxygen support');
  }

  // Systemic Signs (0-2 points)
  if (signs.pallor || signs.jaundice) {
    score += 1;
    dangerSigns.push(signs.pallor ? 'Pallor (anemia risk)' : 'Jaundice (liver involvement)');
  }

  if (signs.unconsciousness) {
    score += 3;
    dangerSigns.push('Unconsciousness/altered mental status');
    recommendations.push(
      'EMERGENCY: Airway protection, supplemental oxygen, urgent transfer'
    );
  }

  // Determine severity level
  let severity: MaternalSeverity;
  if (score >= 15 || dangerSigns.length >= 3) {
    severity = MaternalSeverity.RED;
    if (!recommendations.includes('EMERGENCY:')) {
      recommendations.unshift('EMERGENCY: Immediate intervention and transfer required');
    }
  } else if (score >= 10 || dangerSigns.length >= 2) {
    severity = MaternalSeverity.ORANGE;
    recommendations.unshift('Urgent: Monitor closely and prepare for escalation');
  } else if (score >= 5) {
    severity = MaternalSeverity.YELLOW;
    recommendations.unshift('Caution: Monitor vital signs closely');
  } else {
    severity = MaternalSeverity.GREEN;
    recommendations.push('No danger signs detected; routine care appropriate');
  }

  return {
    severity,
    score,
    maxScore,
    dangerSigns,
    recommendations,
    requiresEmergencyTransport: severity === MaternalSeverity.RED,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Neonatal Apgar Scoring
// ──────────────────────────────────────────────────────────────────────

export enum ApgarInterpretation {
  EXCELLENT = 'EXCELLENT', // 9-10
  GOOD = 'GOOD', // 7-8
  FAIR = 'FAIR', // 4-6 (requires intervention)
  POOR = 'POOR', // 0-3 (requires urgent intervention)
}

export interface ApgarScores {
  appearance?: 0 | 1 | 2; // Skin color
  pulse?: 0 | 1 | 2; // Heart rate
  grimace?: 0 | 1 | 2; // Reflex irritability
  activity?: 0 | 1 | 2; // Muscle tone
  respiration?: 0 | 1 | 2; // Respiratory effort
  timestamp?: Date; // 1 min, 5 min, 10 min
}

export interface ApgarResult {
  score: number;
  interpretation: ApgarInterpretation;
  appearance: string;
  pulse: string;
  grimace: string;
  activity: string;
  respiration: string;
  recommendations: string[];
  requiresResuscitation: boolean;
}

/**
 * Calculate Apgar score (0-10) and interpretation.
 * Typically done at 1 and 5 minutes of life.
 */
export function calculateApgarScore(scores: ApgarScores): ApgarResult {
  const totalScore = (scores.appearance || 0) +
    (scores.pulse || 0) +
    (scores.grimace || 0) +
    (scores.activity || 0) +
    (scores.respiration || 0);

  const interpretationMap: Record<number, ApgarInterpretation> = {
    0: ApgarInterpretation.POOR,
    1: ApgarInterpretation.POOR,
    2: ApgarInterpretation.POOR,
    3: ApgarInterpretation.POOR,
    4: ApgarInterpretation.FAIR,
    5: ApgarInterpretation.FAIR,
    6: ApgarInterpretation.FAIR,
    7: ApgarInterpretation.GOOD,
    8: ApgarInterpretation.GOOD,
    9: ApgarInterpretation.EXCELLENT,
    10: ApgarInterpretation.EXCELLENT,
  };

  const interpretation = interpretationMap[totalScore] || ApgarInterpretation.POOR;

  const recommendations: string[] = [];
  let requiresResuscitation = false;

  if (totalScore <= 3) {
    recommendations.push('EMERGENCY: Initiate full neonatal resuscitation');
    recommendations.push('- Provide positive pressure ventilation (PPV)');
    recommendations.push('- Prepare for intubation if no response');
    recommendations.push('- Have epinephrine/medications ready');
    requiresResuscitation = true;
  } else if (totalScore <= 6) {
    recommendations.push('Urgent: Begin stimulation and initial resuscitation');
    recommendations.push('- Clear airway, dry, stimulate');
    recommendations.push('- Provide supplemental oxygen');
    recommendations.push('- Monitor HR and response closely');
    requiresResuscitation = true;
  } else if (totalScore <= 8) {
    recommendations.push('Monitor closely for improvement');
    recommendations.push('- May need supplemental oxygen');
    recommendations.push('- Close observation for 5-10 minutes');
    recommendations.push('- Re-assess at 5 minutes');
  } else {
    recommendations.push('Routine care: infant vigorous and responding well');
    recommendations.push('- Dry and keep warm');
    recommendations.push('- Initiate feeding/bonding');
  }

  return {
    score: totalScore,
    interpretation,
    appearance: describeApgarComponent('Appearance', scores.appearance || 0),
    pulse: describeApgarComponent('Pulse', scores.pulse || 0),
    grimace: describeApgarComponent('Grimace', scores.grimace || 0),
    activity: describeApgarComponent('Activity', scores.activity || 0),
    respiration: describeApgarComponent('Respiration', scores.respiration || 0),
    recommendations,
    requiresResuscitation,
  };
}

function describeApgarComponent(component: string, score: 0 | 1 | 2): string {
  const descriptions: Record<string, Record<number, string>> = {
    Appearance: {
      0: 'Blue or pale',
      1: 'Blue at extremities (acrocyanosis)',
      2: 'Pink all over',
    },
    Pulse: {
      0: 'Absent',
      1: '<100 bpm',
      2: '>100 bpm',
    },
    Grimace: {
      0: 'No response',
      1: 'Grimace',
      2: 'Cough/sneeze/cry',
    },
    Activity: {
      0: 'Limp/flaccid',
      1: 'Some flexion',
      2: 'Active, well-flexed',
    },
    Respiration: {
      0: 'Absent',
      1: 'Weak cry/shallow',
      2: 'Strong cry/vigorous',
    },
  };

  return `${component}: ${descriptions[component]?.[score] || 'Unknown'}`;
}

// ──────────────────────────────────────────────────────────────────────
// Preeclampsia/Eclampsia Severity Scoring
// ──────────────────────────────────────────────────────────────────────

export enum PreeclampsiaSeverity {
  NORMAL = 'NORMAL',
  GESTATIONAL_HYPERTENSION = 'GESTATIONAL_HYPERTENSION',
  PREECLAMPSIA_WITHOUT_SEVERE_FEATURES = 'PREECLAMPSIA_WITHOUT_SEVERE_FEATURES',
  PREECLAMPSIA_WITH_SEVERE_FEATURES = 'PREECLAMPSIA_WITH_SEVERE_FEATURES',
  ECLAMPSIA = 'ECLAMPSIA',
}

export interface PreeclampsiaScreening {
  systolicBp?: number;
  diastolicBp?: number;
  meanArterialPressure?: number;
  proteinuria?: 'none' | 'trace' | '1+' | '2+' | '3+' | '4+';
  proteinGperDay?: number; // grams per 24-hour urine
  headache?: boolean;
  visualDisturbances?: boolean;
  upperQuadrantPain?: boolean;
  pulmonaryEdema?: boolean;
  oliguria?: boolean; // <500 mL in 24 hours
  elevatedCreatinine?: boolean; // >1.1 mg/dL
  thrombocytopenia?: boolean; // platelets <100K
  hemolysis?: boolean; // elevated LDH, low haptoglobin
  convulsions?: boolean;
  gestationWeeks?: number;
}

export interface PreeclampsiaResult {
  severity: PreeclampsiaSeverity;
  features: string[];
  recommendations: string[];
  requiresDelivery: boolean;
  requiresEmergencyTransport: boolean;
}

/**
 * Classify preeclampsia severity using ACOG/WHO criteria.
 */
export function classifyPreeclampsiaFeatures(
  screening: PreeclampsiaScreening
): PreeclampsiaResult {
  const features: string[] = [];
  const recommendations: string[] = [];
  let severity = PreeclampsiaSeverity.NORMAL;
  let requiresDelivery = false;
  let requiresEmergencyTransport = false;

  // Check blood pressure
  const systolic = screening.systolicBp || 0;
  const diastolic = screening.diastolicBp || 0;
  const isHypertensive = systolic >= 140 || diastolic >= 90;
  const isSevereHypertensive = systolic >= 160 || diastolic >= 110;

  if (isHypertensive) {
    severity = PreeclampsiaSeverity.GESTATIONAL_HYPERTENSION;
  }

  // Check proteinuria
  const hasProteinuria = screening.proteinuria &&
    screening.proteinuria !== 'none' &&
    screening.proteinuria !== 'trace';
  const hasSevereProteinuria = (screening.proteinGperDay || 0) >= 5 ||
    screening.proteinuria === '3+' ||
    screening.proteinuria === '4+';

  if (isHypertensive && hasProteinuria) {
    severity = PreeclampsiaSeverity.PREECLAMPSIA_WITHOUT_SEVERE_FEATURES;
    features.push('Hypertension + Proteinuria');
  }

  // Check for severe features
  const severeFeatures: string[] = [];

  if (isSevereHypertensive) {
    severeFeatures.push('Severe hypertension (≥160/110)');
    features.push(`Severe BP: ${systolic}/${diastolic}`);
  }

  if (hasSevereProteinuria) {
    severeFeatures.push('Severe proteinuria (≥5 g/24h)');
    features.push('Severe proteinuria');
  }

  if (screening.pulmonaryEdema) {
    severeFeatures.push('Pulmonary edema');
    features.push('Pulmonary edema present');
  }

  if (screening.headache) {
    severeFeatures.push('Severe headache');
    features.push('Severe persistent headache');
  }

  if (screening.visualDisturbances) {
    severeFeatures.push('Visual disturbances');
    features.push('Visual disturbances');
  }

  if (screening.oliguria) {
    severeFeatures.push('Oliguria (<500 mL/24h)');
    features.push('Oliguria present');
  }

  if (screening.elevatedCreatinine) {
    severeFeatures.push('Elevated creatinine (>1.1)');
    features.push('Elevated renal markers');
  }

  if (screening.thrombocytopenia) {
    severeFeatures.push('Thrombocytopenia (<100K)');
    features.push('Low platelets');
  }

  if (screening.hemolysis) {
    severeFeatures.push('Hemolysis');
    features.push('HELLP syndrome features');
  }

  if (screening.convulsions) {
    severity = PreeclampsiaSeverity.ECLAMPSIA;
    features.push('ECLAMPSIA: Seizures present');
    recommendations.push(
      'EMERGENCY: Magnesium sulfate 4g IV, airway protection, immediate delivery planning'
    );
    requiresDelivery = true;
    requiresEmergencyTransport = true;
  } else if (
    isHypertensive &&
    hasProteinuria &&
    severeFeatures.length > 0
  ) {
    severity = PreeclampsiaSeverity.PREECLAMPSIA_WITH_SEVERE_FEATURES;
    recommendations.push(
      'Urgent: Magnesium sulfate for seizure prophylaxis, prepare for delivery'
    );
    recommendations.push('Target delivery within 24 hours if >34 weeks');
    recommendations.push('Consider hospital admission for monitoring');
    requiresDelivery = (screening.gestationWeeks || 0) >= 34;
    requiresEmergencyTransport = severeFeatures.length > 2;
  } else if (isHypertensive && hasProteinuria) {
    severity = PreeclampsiaSeverity.PREECLAMPSIA_WITHOUT_SEVERE_FEATURES;
    recommendations.push('Monitor BP and proteinuria twice weekly');
    recommendations.push('Prepare for delivery at 37 weeks');
    recommendations.push('Urgent transport if develops severe features');
  } else if (isHypertensive) {
    severity = PreeclampsiaSeverity.GESTATIONAL_HYPERTENSION;
    recommendations.push('Monitor BP and for proteinuria');
    recommendations.push('May require antihypertensive therapy if severe');
  }

  return {
    severity,
    features,
    recommendations,
    requiresDelivery,
    requiresEmergencyTransport,
  };
}
