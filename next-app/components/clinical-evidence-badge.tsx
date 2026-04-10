'use client';

/**
 * Clinical Evidence Badge Component
 *
 * Displays evidence level and WHO EML status for clinical information.
 * Used in clinical chat to highlight verified and guideline-based content.
 *
 * Evidence levels:
 * - guideline: From WHO/national clinical guidelines
 * - protocol: From facility protocols or clinical pathways
 * - general: General clinical knowledge
 * - formulary: From verified drug formulary
 */

import React from 'react';
import { CheckCircle2, AlertCircle, BookOpen, Pill } from 'lucide-react';

export type EvidenceLevel = 'guideline' | 'protocol' | 'general' | 'formulary';

interface ClinicalEvidenceBadgeProps {
  level: EvidenceLevel;
  whoEmlListed?: boolean;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ClinicalEvidenceBadge({
  level,
  whoEmlListed = false,
  isVerified = true,
  size = 'md',
  showLabel = true,
}: ClinicalEvidenceBadgeProps) {
  const configs: Record<EvidenceLevel, { icon: React.ReactNode; bg: string; border: string; text: string; label: string; title: string }> = {
    guideline: {
      icon: <BookOpen size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      label: 'WHO Guideline',
      title: 'Based on WHO clinical guidelines',
    },
    protocol: {
      icon: <CheckCircle2 size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      label: 'Clinical Protocol',
      title: 'Based on verified clinical protocol',
    },
    formulary: {
      icon: <Pill size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      label: 'Formulary Verified',
      title: 'From verified drug formulary',
    },
    general: {
      icon: <AlertCircle size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      label: 'General Knowledge',
      title: 'General clinical knowledge',
    },
  };

  const config = configs[level];
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div
        className={`inline-flex items-center ${sizeClasses[size]} rounded-full border ${config.bg} ${config.border} ${config.text} font-medium`}
        title={config.title}
      >
        {config.icon}
        {showLabel && <span>{config.label}</span>}
      </div>

      {whoEmlListed && (
        <div
          className={`inline-flex items-center ${sizeClasses[size]} rounded-full border bg-green-50 border-green-200 text-green-700 font-medium`}
          title="Listed on WHO Essential Medicines List"
        >
          <CheckCircle2 size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />
          {showLabel && <span>WHO EML</span>}
        </div>
      )}

      {isVerified && level !== 'general' && (
        <div
          className={`inline-flex items-center ${sizeClasses[size]} rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 font-medium`}
          title="Verified by clinical team"
        >
          <CheckCircle2 size={size === 'lg' ? 18 : size === 'md' ? 16 : 14} />
          {showLabel && <span>Verified</span>}
        </div>
      )}
    </div>
  );
}
