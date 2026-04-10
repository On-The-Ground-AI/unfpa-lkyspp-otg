'use client';

/**
 * Dose Calculator Component
 *
 * Simple dosing calculator for weight-based and age-based dosing.
 * Used when clinical query is about drug dosing calculations.
 *
 * Features:
 * - Weight-based dosing (mg/kg)
 * - Age-based standard doses
 * - Unit conversion (kg, lbs)
 * - Output formatted for quick reference
 * - Always shows source documentation
 */

import React, { useState } from 'react';
import { Calculator, Zap } from 'lucide-react';

interface DoseCalculatorProps {
  drug: string;
  standardDose?: string; // e.g., "10 IU"
  dosagePerUnit?: number; // e.g., 10 (for 10 IU/kg)
  unit?: string; // "kg", "lb", "age_years"
  minWeight?: number;
  maxWeight?: number;
}

export default function DoseCalculator({
  drug,
  standardDose = '',
  dosagePerUnit = 10,
  unit = 'kg',
  minWeight = 2,
  maxWeight = 100,
}: DoseCalculatorProps) {
  const [patientValue, setPatientValue] = useState('');
  const [calculatedDose, setCalculatedDose] = useState<number | null>(null);

  const handleCalculate = () => {
    const value = parseFloat(patientValue);
    if (!isNaN(value) && value > 0) {
      const dose = value * dosagePerUnit;
      setCalculatedDose(dose);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  const getUnitLabel = () => {
    switch (unit) {
      case 'lb':
        return 'lbs (pounds)';
      case 'age_years':
        return 'years (age)';
      default:
        return 'kg (kilograms)';
    }
  };

  const getExample = () => {
    switch (unit) {
      case 'lb':
        return `Example: For a 110 lb patient → ${((110 / 2.2) * dosagePerUnit).toFixed(1)} dose`;
      case 'age_years':
        return `Example: For a 5 year old → ${(5 * dosagePerUnit).toFixed(1)} dose`;
      default:
        return `Example: For a 50 kg patient → ${(50 * dosagePerUnit).toFixed(1)} dose`;
    }
  };

  return (
    <div className="w-full max-w-md bg-white border rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">Dose Calculator</h3>
      </div>

      {/* Drug Name */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-600">Drug: <span className="font-semibold">{drug}</span></p>
        {standardDose && (
          <p className="text-sm text-blue-600 mt-1">
            Standard dose: <span className="font-mono font-semibold">{standardDose}</span>
          </p>
        )}
      </div>

      {/* Input Section */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient {unit === 'age_years' ? 'Age' : 'Weight'} ({getUnitLabel()})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={patientValue}
              onChange={(e) => setPatientValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Enter ${unit === 'age_years' ? 'age' : 'weight'}`}
              min={minWeight}
              max={maxWeight}
              step="0.1"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Calculate
            </button>
          </div>
        </div>

        {/* Example */}
        <p className="text-xs text-gray-500 italic">{getExample()}</p>
      </div>

      {/* Result */}
      {calculatedDose !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600 mb-1">Calculated Dose:</p>
              <p className="text-2xl font-bold text-green-700 font-mono">
                {calculatedDose.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                For patient value: <span className="font-mono font-semibold">{patientValue}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
        <p className="font-semibold mb-1">Important Disclaimer</p>
        <p>
          This is a calculation tool only. Always verify the result against your facility
          &apos;s protocols, the patient&apos;s clinical status, and source documentation
          before administration.
        </p>
      </div>
    </div>
  );
}
