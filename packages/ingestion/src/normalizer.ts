/**
 * Entity name normalization rules
 * Maps common variations to canonical names
 */
const NORMALIZATION_MAP: Record<string, string> = {
  // Programs
  'GD': 'Golden Dome',
  'GD initiative': 'Golden Dome',
  'GD program': 'Golden Dome',
  'the GD program': 'Golden Dome',

  // Contractors
  'Raytheon': 'Raytheon Technologies',
  'RTX': 'Raytheon Technologies',
  'Raytheon Tech': 'Raytheon Technologies',
  'Lockheed': 'Lockheed Martin',
  'LM': 'Lockheed Martin',
  'L3Harris': 'L3Harris Technologies',
  'L3': 'L3Harris Technologies',
  'Northrop': 'Northrop Grumman',
  'NG': 'Northrop Grumman',

  // Systems
  'DDG51': 'DDG-51',
  'DDG 51': 'DDG-51',
  'Arleigh Burke': 'DDG-51',

  // Fiscal years
  'FY24': 'FY2024',
  'Fiscal Year 2024': 'FY2024',
  'FY 2024': 'FY2024',
  'FY25': 'FY2025',
  'Fiscal Year 2025': 'FY2025',
  'FY 2025': 'FY2025',
};

/**
 * Normalize entity name to canonical form
 * Uses exact match first, then case-insensitive fallback
 */
export function normalizeEntity(name: string): string {
  // Trim whitespace
  const trimmed = name.trim();

  // Exact match
  if (NORMALIZATION_MAP[trimmed]) {
    return NORMALIZATION_MAP[trimmed];
  }

  // Case-insensitive match
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(NORMALIZATION_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // No normalization needed
  return trimmed;
}

/**
 * Add custom normalization rule
 */
export function addNormalizationRule(variant: string, canonical: string): void {
  NORMALIZATION_MAP[variant] = canonical;
}

/**
 * Get all normalization rules
 */
export function getNormalizationRules(): Record<string, string> {
  return { ...NORMALIZATION_MAP };
}
