/**
 * Drug Pregnancy Risk Categories
 *
 * FDA Pregnancy Categories (A/B/C/D/X) and Lactation Risk Categories
 * for all drugs in the formulary.
 *
 * Category Definitions:
 * A: Controlled studies in women demonstrate no fetal risk at any trimester
 * B: Animal studies indicate no fetal risk; no human studies available OR animal studies show risk but human studies are negative
 * C: No adequate animal or human studies; use only if benefits justify potential risk
 * D: Evidence of fetal risk; benefits may warrant use in pregnancy despite potential risks
 * X: Contraindicated in pregnancy; risks clearly outweigh potential benefits
 *
 * Lactation Risk Categories:
 * S (Safe): Medications that are safe to use while breastfeeding
 * L2 (Safer): Drugs that appear to be moderately safe
 * L3 (Moderately Safe): Limited data available; risk of problems is possible
 * L4 (Possibly Hazardous): Positive evidence of fetal/infant risk
 * L5 (Contraindicated): Significant and documented risk
 */

export interface DrugCategory {
  category: 'A' | 'B' | 'C' | 'D' | 'X';
  lactationRisk: 'S' | 'L2' | 'L3' | 'L4' | 'L5';
  rationale: string;
  trimesterSpecific?: {
    first?: 'A' | 'B' | 'C' | 'D' | 'X';
    second?: 'A' | 'B' | 'C' | 'D' | 'X';
    third?: 'A' | 'B' | 'C' | 'D' | 'X';
  };
}

export const DRUG_CATEGORIES: Record<string, DrugCategory> = {
  // Oxytocics & Uterotonics
  oxytocin: {
    category: 'B',
    lactationRisk: 'L2',
    rationale: 'Used in labor; teratogenicity not established in humans; safe for induction',
  },
  misoprostol: {
    category: 'X',
    lactationRisk: 'L3',
    rationale:
      'Contraindicated: uterotonic effect, abortifacient properties; used for medical abortion',
  },
  mifepristone: {
    category: 'X',
    lactationRisk: 'L4',
    rationale: 'Contraindicated: anti-progesterone causes abortion; used for medical abortion',
  },
  ergotamine: {
    category: 'X',
    lactationRisk: 'L4',
    rationale:
      'Contraindicated: potent uterotonic with vasopressor effects; risk of uterine rupture, hypertension',
  },
  methylergonovine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Potent uterotonic; may elevate blood pressure; used for third-stage labor management; avoid in first/second trimester',
    trimesterSpecific: {
      first: 'C',
      second: 'C',
      third: 'B',
    },
  },

  // Anticonvulsants & Seizure Prophylaxis
  magnesium_sulfate: {
    category: 'A',
    lactationRisk: 'L2',
    rationale:
      'Gold standard for eclampsia/preeclampsia seizure prophylaxis; extensive safety data in pregnancy',
  },
  phenytoin: {
    category: 'D',
    lactationRisk: 'L2',
    rationale: 'Fetal hydantoin syndrome risk; but essential for seizure control if needed in pregnancy',
  },
  phenobarbital: {
    category: 'D',
    lactationRisk: 'L3',
    rationale: 'Risk of withdrawal seizures in newborn; neonatal sedation possible; use only if essential',
  },
  carbamazepine: {
    category: 'D',
    lactationRisk: 'L2',
    rationale: 'Teratogenic risk; but may be necessary for seizure control in pregnancy',
  },

  // Hypertensives
  nifedipine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Safe for preeclampsia management; calcium channel blocker with rapid onset; preferred over other agents',
  },
  labetalol: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Alpha and beta-blocker; safe for preeclampsia; does not reduce uteroplacental blood flow significantly',
  },
  hydralazine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Safe for acute hypertension in pregnancy; long history of use in obstetrics; used with methyldopa for chronic HTN',
  },
  methyldopa: {
    category: 'A',
    lactationRisk: 'S',
    rationale: 'Safe in pregnancy; central-acting vasodilator; used for chronic hypertension management',
  },
  amlodipine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale: 'Calcium channel blocker; safe for preeclampsia; less rapid onset than nifedipine',
  },
  atenolol: {
    category: 'D',
    lactationRisk: 'L2',
    rationale: 'Beta-blocker; may reduce fetal growth; association with intrauterine growth restriction reported',
  },
  verapamil: {
    category: 'C',
    lactationRisk: 'L2',
    rationale: 'Calcium channel blocker; safe for use in pregnancy; minimal fetal effects',
  },

  // Corticosteroids
  dexamethasone: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Safe for fetal lung maturity induction in preterm labor; benefit clearly outweighs risks; no teratogenicity at treatment doses',
  },
  betamethasone: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Safe for fetal lung maturity induction; preferred agent for preterm labor; extensively studied in pregnancy',
  },
  prednisone: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Safe for autoimmune conditions in pregnancy; limited transplacental passage; long history of use',
  },

  // Antibiotics
  amoxicillin: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Penicillin derivative; safe in pregnancy; widely used for UTI, GBS prophylaxis',
  },
  ampicillin: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Penicillin derivative; safe in pregnancy; used for GBS prophylaxis in labor',
  },
  cephalosporin: {
    category: 'B',
    lactationRisk: 'S',
    rationale:
      'Beta-lactam; generally safe in pregnancy; cross-reactivity with penicillin is rare; safe for breastfeeding',
  },
  gentamicin: {
    category: 'D',
    lactationRisk: 'L2',
    rationale:
      'Aminoglycoside; risk of ototoxicity and nephrotoxicity; however, benefit in serious infections may outweigh risk; limited transplacental passage',
  },
  metronidazole: {
    category: 'B',
    lactationRisk: 'L2',
    rationale: 'Safe for bacterial vaginosis and trichomoniasis in pregnancy; extensively studied',
  },
  azithromycin: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Macrolide; safe in pregnancy; used for chlamydia, gonorrhea treatment',
  },
  ciprofloxacin: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Fluoroquinolone; limited data in pregnancy; use only if benefit outweighs risk; may disrupt fetal cartilage (animal studies)',
  },
  cefixime: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Cephalosporin; safe for gonorrhea and other infections in pregnancy',
  },
  clotrimazole: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Topical antifungal; minimal systemic absorption; safe for vulvovaginal candidiasis',
  },
  fluconazole: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Systemic antifungal; limited data; avoid in first trimester if possible; use only for serious infections',
  },

  // Antiretrovirals (PMTCT)
  azidothymidine: {
    category: 'C',
    lactationRisk: 'L5',
    rationale:
      'Nucleoside reverse transcriptase inhibitor; safe in pregnancy for PMTCT; contraindicated in breastfeeding (transmission risk)',
  },
  lamivudine: {
    category: 'C',
    lactationRisk: 'L5',
    rationale:
      'Nucleoside reverse transcriptase inhibitor; safe in pregnancy; contraindicated in breastfeeding',
  },
  efavirenz: {
    category: 'D',
    lactationRisk: 'L5',
    rationale: 'NNRTI; teratogenic potential in first trimester (avoid if possible); contraindicated in breastfeeding',
  },
  nevirapine: {
    category: 'C',
    lactationRisk: 'L5',
    rationale:
      'NNRTI; safe for PMTCT in labor; contraindicated in breastfeeding; hepatotoxicity risk in pregnant women',
  },

  // Analgesics
  acetaminophen: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Safe throughout pregnancy; first-line for pain and fever; extensive safety data',
  },
  ibuprofen: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'NSAID; safe in first/second trimester for pain; avoid in third trimester (risk of PDA closure)',
    trimesterSpecific: {
      first: 'B',
      second: 'B',
      third: 'D',
    },
  },
  aspirin: {
    category: 'C',
    lactationRisk: 'S',
    rationale:
      'Safe at low-dose for cardiovascular protection; high-dose avoid; risk of Reye syndrome if maternal use near delivery',
  },
  naproxen: {
    category: 'B',
    lactationRisk: 'S',
    rationale:
      'NSAID; safe in early pregnancy; avoid in third trimester like ibuprofen (PDA closure risk)',
    trimesterSpecific: {
      first: 'B',
      second: 'B',
      third: 'D',
    },
  },
  diclofenac: {
    category: 'B',
    lactationRisk: 'L2',
    rationale: 'NSAID; safe early in pregnancy; avoid in third trimester (PDA closure risk)',
    trimesterSpecific: {
      first: 'B',
      second: 'B',
      third: 'D',
    },
  },
  morphine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Opioid; safe in labor for pain control; minimal transplacental passage; avoid chronic use (neonatal withdrawal risk)',
  },
  codeine: {
    category: 'C',
    lactationRisk: 'L3',
    rationale:
      'Opioid; safe in labor but less preferred than morphine; neonatal respiratory depression possible',
  },
  tramadol: {
    category: 'C',
    lactationRisk: 'L2',
    rationale: 'Opioid-like analgesic; limited data; use only when benefits outweigh risks',
  },

  // Contraceptives
  combined_oral_contraceptive: {
    category: 'X',
    lactationRisk: 'L3',
    rationale:
      'Contraindicated in pregnancy; teratogenic concerns exist (though not confirmed); reduces milk production if used while breastfeeding',
  },
  progestin_only_pill: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Safe in pregnancy (unlikely, as contraceptive); safe while breastfeeding (no impact on milk)',
  },
  dmpa_injection: {
    category: 'B',
    lactationRisk: 'L2',
    rationale:
      'Depot medroxyprogesterone; avoid in confirmed pregnancy; safe while breastfeeding',
  },
  copper_iud: {
    category: 'B',
    lactationRisk: 'S',
    rationale: 'Non-hormonal LARC; contraindicated if pregnancy present (mechanical risk); safe after delivery',
  },
  levonorgestrel_iud: {
    category: 'B',
    lactationRisk: 'S',
    rationale:
      'Hormonal LARC; contraindicated if pregnancy present; safe after delivery and breastfeeding',
  },
  emergency_contraception_levonorgestrel: {
    category: 'B',
    lactationRisk: 'S',
    rationale:
      'Safe for emergency use if unprotected intercourse occurs; minimal teratogenic risk; safe while breastfeeding',
  },
  emergency_contraception_ulipristal: {
    category: 'B',
    lactationRisk: 'L2',
    rationale: 'Selective progesterone receptor modulator; safe for emergency use; minimal breastfeeding data',
  },

  // Antiemetics & GI Agents
  ondansetron: {
    category: 'B',
    lactationRisk: 'L2',
    rationale:
      'Selective 5HT3 antagonist; safe for severe nausea/vomiting; used in labor and post-operative settings',
  },
  metoclopramide: {
    category: 'B',
    lactationRisk: 'S',
    rationale:
      'Dopamine antagonist; safe throughout pregnancy; used for nausea and gastroesophageal reflux',
  },
  omeprazole: {
    category: 'C',
    lactationRisk: 'S',
    rationale:
      'Proton pump inhibitor; safe in pregnancy for GERD; minimal transplacental passage',
  },
  simethicone: {
    category: 'A',
    lactationRisk: 'S',
    rationale: 'Inert silicone; not absorbed; safe throughout pregnancy and breastfeeding',
  },

  // Antithyroid (rarely needed in obstetrics)
  propylthiouracil_ptu: {
    category: 'D',
    lactationRisk: 'L2',
    rationale:
      'Antithyroid for Graves disease in pregnancy; risk of agranulocytosis and liver dysfunction; preferred over methimazole in first trimester',
  },
  methimazole: {
    category: 'D',
    lactationRisk: 'S',
    rationale:
      'Antithyroid; avoid in first trimester (methimazole embryopathy); PTU preferred early; methimazole safe after first trimester',
  },

  // Diuretics (used cautiously in preeclampsia)
  furosemide: {
    category: 'C',
    lactationRisk: 'L3',
    rationale:
      'Loop diuretic; generally avoided in pregnancy unless specific indication (pulmonary edema); may reduce placental blood flow',
  },
  spironolactone: {
    category: 'C',
    lactationRisk: 'L2',
    rationale:
      'Potassium-sparing diuretic; avoid in pregnancy; limited data; may have estrogenic effects',
  },

  // Neonatal medications
  naloxone: {
    category: 'B',
    lactationRisk: 'L2',
    rationale:
      'Opioid antagonist; safe for maternal use; used in neonates for respiratory depression from maternal opioids',
  },
  caffeine: {
    category: 'C',
    lactationRisk: 'L2',
    rationale: 'Neonatal respiratory stimulant; used for apnea of prematurity; safe in neonates',
  },
  indomethacin: {
    category: 'B',
    lactationRisk: 'L2',
    rationale:
      'NSAID; used in neonates for PDA closure; maternal use in third trimester contraindicated (fetal PDA closure); minimal neonatal passage',
  },
};

/**
 * Get pregnancy and lactation risk category for a drug.
 * Returns undefined if drug not in database.
 */
export function getDrugCategory(drugName: string): DrugCategory | undefined {
  const normalized = drugName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return DRUG_CATEGORIES[normalized];
}

/**
 * Get all drugs in a specific category.
 */
export function getDrugsByCategory(
  category: 'A' | 'B' | 'C' | 'D' | 'X'
): { drug: string; rationale: string }[] {
  return Object.entries(DRUG_CATEGORIES)
    .filter(([, data]) => data.category === category)
    .map(([drug, data]) => ({
      drug: drug.replace(/_/g, ' '),
      rationale: data.rationale,
    }));
}

/**
 * Check if drug is safe in specific trimester.
 */
export function isSafeInTrimester(
  drugName: string,
  trimester: 1 | 2 | 3
): boolean {
  const drug = getDrugCategory(drugName);
  if (!drug) return false;

  const categoryMap = {
    1: drug.trimesterSpecific?.first || drug.category,
    2: drug.trimesterSpecific?.second || drug.category,
    3: drug.trimesterSpecific?.third || drug.category,
  };

  const category = categoryMap[trimester];
  return category !== 'X' && category !== 'D';
}

/**
 * Check if drug is safe for breastfeeding.
 */
export function isSafeForBreastfeeding(drugName: string): boolean {
  const drug = getDrugCategory(drugName);
  if (!drug) return false;

  return drug.lactationRisk !== 'L4' && drug.lactationRisk !== 'L5';
}
