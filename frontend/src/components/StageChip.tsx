import React from 'react';
import { BookingStage, STAGE_MAP } from '../utils/bookingStages.js';

export const StageChip: React.FC<{ stage: BookingStage }> = ({ stage }) => {
  const config = STAGE_MAP[stage];
  
  if (!config) return null;

  return (
    <span 
      className="px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap"
      style={{
        backgroundColor: `color-mix(in srgb, ${config.colorVar} 15%, transparent)`,
        color: config.colorVar,
        border: `1px solid color-mix(in srgb, ${config.colorVar} 30%, transparent)`
      }}
    >
      {config.label}
    </span>
  );
};
