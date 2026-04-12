import { describe, it, expect } from 'vitest';
import {
  triageMaternalDangerSigns,
  calculateApgarScore,
  classifyPreeclampsiaFeatures,
  MaternalSeverity,
  ApgarInterpretation,
  PreeclampsiaSeverity,
} from '@/lib/triageScoring';

describe('Triage Scoring System', () => {
  describe('triageMaternalDangerSigns', () => {
    it('scores GREEN for normal vitals and no danger signs', () => {
      const vitals = {
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 80,
        respiratoryRate: 18,
        temperature: 37,
        oxygenSaturation: 98,
      };
      const signs = {};

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.severity).toBe(MaternalSeverity.GREEN);
      expect(result.score).toBe(0);
    });

    it('detects massive vaginal bleeding with transfusion recommendation', () => {
      const vitals = {};
      const signs = {
        vaginalBleeding: 'massive' as const,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      // 4 points alone is still GREEN, but shows danger sign and transfusion recommendation
      expect(result.dangerSigns).toContain('MASSIVE vaginal bleeding');
      expect(result.recommendations.some((r) => r.includes('transfusion'))).toBeTruthy();
    });

    it('scores GREEN for heavy vaginal bleeding (3 points)', () => {
      const vitals = {};
      const signs = {
        vaginalBleeding: 'heavy' as const,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      // 3 points < 5, so GREEN
      expect(result.severity).toBe(MaternalSeverity.GREEN);
      expect(result.dangerSigns).toContain('Heavy vaginal bleeding');
    });

    it('detects infection signs (fever + foul discharge)', () => {
      const vitals = {
        temperature: 39,
      };
      const signs = {
        vaginalDischarge: 'foul-smelling' as const,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.dangerSigns).toContain('Signs of infection: fever + foul-smelling discharge');
      expect(result.recommendations.some((r) => r.includes('antibiotics'))).toBeTruthy();
    });

    it('detects severe abdominal pain with uterine rupture risk', () => {
      const vitals = {};
      const signs = {
        severeAbdominalPain: true,
        labourDuration: 28,
        uterineRupture: true,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.dangerSigns).toContain('Severe abdominal pain');
      expect(result.recommendations.some((r) => r.includes('laparotomy'))).toBeTruthy();
    });

    it('detects severe perineal trauma', () => {
      const vitals = {};
      const signs = {
        vaginalTearing: 'severe' as const,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.dangerSigns).toContain('Severe perineal/genital trauma');
      expect(result.recommendations.some((r) => r.toLocaleLowerCase().includes('surgical repair'))).toBeTruthy();
    });

    it('detects preeclampsia signs', () => {
      const vitals = {
        systolicBp: 160,
        diastolicBp: 105,
      };
      const signs = {
        severeHeadache: true,
        visualDisturbances: true,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.dangerSigns.length > 0).toBeTruthy();
    });

    it('detects convulsions (eclampsia)', () => {
      const vitals = {};
      const signs = {
        convulsions: true,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      // Convulsions = 4 points alone is < 5, but is a critical danger sign
      expect(result.dangerSigns).toContain('CONVULSIONS (eclampsia)');
      expect(result.recommendations.some((r) => r.includes('Magnesium sulfate'))).toBeTruthy();
    });

    it('detects loss of consciousness as GREEN (single sign, <5 points)', () => {
      const vitals = {};
      const signs = {
        unconsciousness: true,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      // Unconsciousness alone is 3 points + 1 danger sign = GREEN (need >= 5 for YELLOW)
      expect(result.severity).toBe(MaternalSeverity.GREEN);
      expect(result.dangerSigns).toContain('Unconsciousness/altered mental status');
    });

    it('detects loss of consciousness + massive bleeding as ORANGE', () => {
      const vitals = {};
      const signs = {
        unconsciousness: true,
        vaginalBleeding: 'massive' as const,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      // Combined: 3 + 4 = 7 points and 2 danger signs, triggers ORANGE at dangerSigns >= 2
      expect(result.severity).toBe(MaternalSeverity.ORANGE);
    });

    it('calculates cumulative score correctly', () => {
      const vitals = {
        systolicBp: 170,
        heartRate: 130,
        temperature: 39,
      };
      const signs = {
        vaginalBleeding: 'heavy' as const,
        severeHeadache: true,
      };

      const result = triageMaternalDangerSigns(vitals, signs);

      expect(result.score > 0).toBeTruthy();
      expect(result.severity !== MaternalSeverity.GREEN).toBeTruthy();
    });
  });

  describe('calculateApgarScore', () => {
    it('calculates perfect 10 score (all components 2)', () => {
      const result = calculateApgarScore({
        appearance: 2,
        pulse: 2,
        grimace: 2,
        activity: 2,
        respiration: 2,
      });

      expect(result.score).toBe(10);
      expect(result.interpretation).toBe(ApgarInterpretation.EXCELLENT);
      expect(result.requiresResuscitation).toBe(false);
    });

    it('calculates GOOD score (7-8)', () => {
      const result = calculateApgarScore({
        appearance: 2,
        pulse: 2,
        grimace: 2,
        activity: 1,
        respiration: 1,
      });

      expect(result.score >= 7 && result.score <= 8).toBeTruthy();
      expect(result.interpretation).toBe(ApgarInterpretation.GOOD);
      expect(result.requiresResuscitation).toBe(false);
    });

    it('calculates FAIR score (4-6) requiring intervention', () => {
      const result = calculateApgarScore({
        appearance: 1,
        pulse: 1,
        grimace: 1,
        activity: 1,
        respiration: 1,
      });

      expect(result.score >= 4 && result.score <= 6).toBeTruthy();
      expect(result.interpretation).toBe(ApgarInterpretation.FAIR);
      expect(result.requiresResuscitation).toBe(true);
    });

    it('calculates POOR score (0-3) requiring urgent intervention', () => {
      const result = calculateApgarScore({
        appearance: 0,
        pulse: 0,
        grimace: 0,
        activity: 0,
        respiration: 0,
      });

      expect(result.score <= 3).toBeTruthy();
      expect(result.interpretation).toBe(ApgarInterpretation.POOR);
      expect(result.requiresResuscitation).toBe(true);
      expect(result.recommendations.some((r) => r.includes('EMERGENCY'))).toBeTruthy();
    });
  });

  describe('classifyPreeclampsiaFeatures', () => {
    it('classifies normal BP as NORMAL', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 120,
        diastolicBp: 80,
        proteinuria: 'none',
      });

      expect(result.severity).toBe(PreeclampsiaSeverity.NORMAL);
    });

    it('classifies elevated BP without proteinuria as GESTATIONAL_HYPERTENSION', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 140,
        diastolicBp: 90,
        proteinuria: 'none',
      });

      expect(result.severity).toBe(PreeclampsiaSeverity.GESTATIONAL_HYPERTENSION);
    });

    it('classifies high BP with proteinuria as PREECLAMPSIA_WITHOUT_SEVERE_FEATURES', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 140,
        diastolicBp: 90,
        proteinuria: '1+',
      });

      expect(result.severity).toBe(PreeclampsiaSeverity.PREECLAMPSIA_WITHOUT_SEVERE_FEATURES);
    });

    it('classifies with severe features', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 160,
        diastolicBp: 110,
        proteinuria: '2+',
        headache: true,
        visualDisturbances: true,
        upperQuadrantPain: true,
        gestationWeeks: 36, // >= 34 weeks for requiresDelivery to be true
      });

      expect(result.severity).toBe(PreeclampsiaSeverity.PREECLAMPSIA_WITH_SEVERE_FEATURES);
      expect(result.requiresDelivery).toBe(true);
    });

    it('classifies eclampsia with convulsions', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 160,
        diastolicBp: 110,
        proteinuria: '2+',
        convulsions: true,
      });

      expect(result.severity).toBe(PreeclampsiaSeverity.ECLAMPSIA);
      expect(result.requiresEmergencyTransport).toBe(true);
    });

    it('detects severe features: oliguria', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 150,
        diastolicBp: 100,
        proteinuria: '1+',
        oliguria: true,
      });

      expect(result.features).toContain('Oliguria present');
    });

    it('detects severe features: thrombocytopenia', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 150,
        diastolicBp: 100,
        proteinuria: '1+',
        thrombocytopenia: true,
      });

      expect(result.features).toContain('Low platelets');
    });

    it('detects severe features: elevated creatinine', () => {
      const result = classifyPreeclampsiaFeatures({
        systolicBp: 150,
        diastolicBp: 100,
        proteinuria: '1+',
        elevatedCreatinine: true,
      });

      expect(result.features).toContain('Elevated renal markers');
    });
  });
});
