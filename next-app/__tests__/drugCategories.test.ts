import { describe, it, expect } from 'vitest';
import { DRUG_CATEGORIES } from '@/lib/drugCategories';

describe('Drug Categories', () => {
  it('defines FDA pregnancy categories A-X', () => {
    const categories = new Set(Object.values(DRUG_CATEGORIES).map((d) => d.category));
    expect(categories).toContain('A');
    expect(categories).toContain('B');
    expect(categories).toContain('C');
    expect(categories).toContain('D');
    expect(categories).toContain('X');
  });

  it('defines lactation risk categories', () => {
    const lactationCategories = new Set(
      Object.values(DRUG_CATEGORIES).map((d) => d.lactationRisk)
    );
    expect(lactationCategories).toContain('S');
    expect(lactationCategories).toContain('L2');
    expect(lactationCategories).toContain('L3');
    expect(lactationCategories).toContain('L4');
    expect(lactationCategories).toContain('L5');
  });

  describe('common obstetric drugs', () => {
    it('classifies oxytocin correctly', () => {
      const oxytocin = DRUG_CATEGORIES['oxytocin'];
      expect(oxytocin.category).toBe('B');
      expect(oxytocin.lactationRisk).toBe('L2');
      expect(oxytocin.rationale).toBeTruthy();
    });

    it('classifies misoprostol correctly', () => {
      const misoprostol = DRUG_CATEGORIES['misoprostol'];
      expect(misoprostol.category).toBe('X');
      expect(misoprostol.lactationRisk).toBe('L3');
      expect(misoprostol.rationale).toContain('Contraindicated');
    });

    it('classifies magnesium sulfate correctly', () => {
      const magnesiumSulfate = DRUG_CATEGORIES['magnesium_sulfate'];
      expect(magnesiumSulfate.category).toBe('A');
      expect(magnesiumSulfate.lactationRisk).toBe('L2');
      expect(magnesiumSulfate.rationale).toContain('eclampsia');
    });

    it('classifies nifedipine correctly', () => {
      const nifedipine = DRUG_CATEGORIES['nifedipine'];
      expect(nifedipine.category).toBe('C');
      expect(nifedipine.lactationRisk).toBe('L2');
      expect(nifedipine.rationale).toContain('preeclampsia');
    });
  });

  describe('trimester-specific categorization', () => {
    it('includes trimester-specific info when available', () => {
      const methylergonovine = DRUG_CATEGORIES['methylergonovine'];
      expect(methylergonovine.trimesterSpecific).toBeDefined();
      expect(methylergonovine.trimesterSpecific?.first).toBe('C');
      expect(methylergonovine.trimesterSpecific?.second).toBe('C');
      expect(methylergonovine.trimesterSpecific?.third).toBe('B');
    });
  });

  describe('drug coverage', () => {
    it('includes anticonvulsants', () => {
      expect(DRUG_CATEGORIES['phenytoin']).toBeDefined();
      expect(DRUG_CATEGORIES['phenobarbital']).toBeDefined();
      expect(DRUG_CATEGORIES['carbamazepine']).toBeDefined();
    });

    it('includes hypertensive agents', () => {
      expect(DRUG_CATEGORIES['labetalol']).toBeDefined();
      expect(DRUG_CATEGORIES['hydralazine']).toBeDefined();
      expect(DRUG_CATEGORIES['atenolol']).toBeDefined();
    });

    it('includes corticosteroids', () => {
      expect(DRUG_CATEGORIES['dexamethasone']).toBeDefined();
      expect(DRUG_CATEGORIES['betamethasone']).toBeDefined();
      expect(DRUG_CATEGORIES['prednisone']).toBeDefined();
    });
  });

  describe('data integrity', () => {
    it('all drugs have required fields', () => {
      Object.entries(DRUG_CATEGORIES).forEach(([drugName, drug]) => {
        expect(drug.category).toBeTruthy();
        expect(drug.lactationRisk).toBeTruthy();
        expect(drug.rationale).toBeTruthy();
        expect(drug.rationale.length > 10).toBeTruthy();
      });
    });

    it('all pregnancy categories are valid', () => {
      const validCategories = ['A', 'B', 'C', 'D', 'X'];
      Object.values(DRUG_CATEGORIES).forEach((drug) => {
        expect(validCategories).toContain(drug.category);
      });
    });

    it('all lactation categories are valid', () => {
      const validLactationCategories = ['S', 'L2', 'L3', 'L4', 'L5'];
      Object.values(DRUG_CATEGORIES).forEach((drug) => {
        expect(validLactationCategories).toContain(drug.lactationRisk);
      });
    });
  });
});
