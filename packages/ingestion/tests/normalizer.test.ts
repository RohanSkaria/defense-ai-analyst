import { describe, it, expect } from 'vitest';
import { normalizeEntity, addNormalizationRule } from '../src/normalizer.js';

describe('normalizeEntity', () => {
  it('should normalize contractor names', () => {
    expect(normalizeEntity('Raytheon')).toBe('Raytheon Technologies');
    expect(normalizeEntity('RTX')).toBe('Raytheon Technologies');
    expect(normalizeEntity('Raytheon Tech')).toBe('Raytheon Technologies');

    expect(normalizeEntity('Lockheed')).toBe('Lockheed Martin');
    expect(normalizeEntity('LM')).toBe('Lockheed Martin');

    expect(normalizeEntity('Northrop')).toBe('Northrop Grumman');
    expect(normalizeEntity('NG')).toBe('Northrop Grumman');
  });

  it('should normalize program names', () => {
    expect(normalizeEntity('GD')).toBe('Golden Dome');
    expect(normalizeEntity('GD initiative')).toBe('Golden Dome');
    expect(normalizeEntity('GD program')).toBe('Golden Dome');
    expect(normalizeEntity('the GD program')).toBe('Golden Dome');
  });

  it('should normalize system names', () => {
    expect(normalizeEntity('DDG51')).toBe('DDG-51');
    expect(normalizeEntity('DDG 51')).toBe('DDG-51');
    expect(normalizeEntity('Arleigh Burke')).toBe('DDG-51');
  });

  it('should normalize fiscal years', () => {
    expect(normalizeEntity('FY24')).toBe('FY2024');
    expect(normalizeEntity('Fiscal Year 2024')).toBe('FY2024');
    expect(normalizeEntity('FY 2024')).toBe('FY2024');
  });

  it('should be case-insensitive for known variants', () => {
    expect(normalizeEntity('rtx')).toBe('Raytheon Technologies');
    expect(normalizeEntity('gd')).toBe('Golden Dome');
    expect(normalizeEntity('NG')).toBe('Northrop Grumman');
  });

  it('should trim whitespace', () => {
    expect(normalizeEntity('  Raytheon  ')).toBe('Raytheon Technologies');
    expect(normalizeEntity('\tGD\n')).toBe('Golden Dome');
  });

  it('should return original name if no normalization rule exists', () => {
    expect(normalizeEntity('AN/SPY-6')).toBe('AN/SPY-6');
    expect(normalizeEntity('Unknown System')).toBe('Unknown System');
  });

  it('should support adding custom rules', () => {
    addNormalizationRule('NGAD', 'Next Generation Air Dominance');
    expect(normalizeEntity('NGAD')).toBe('Next Generation Air Dominance');
  });
});
