import { describe, expect, it } from 'vitest';
import { COUNTRY_REQUIREMENTS } from './country-requirements';

describe('federation email guidance for foreign U19 entrants', () => {
  const countries = ['NO', 'CZ', 'GR', 'IE', 'DK', 'CY', 'CH', 'GB', 'LT', 'MT'];
  it('records a dated reply for all ten replying federations', () => {
    for (const code of countries) {
      const reply = COUNTRY_REQUIREMENTS[code]?.federationEmail;
      expect(reply, code).toBeDefined();
      expect(reply?.replyDate).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(reply?.details.length).toBeGreaterThan(30);
    }
  });

  it('does not treat a missing eligibility confirmation as permission', () => {
    expect(COUNTRY_REQUIREMENTS.LT.federationEmail?.status).toBe('unconfirmed');
    expect(COUNTRY_REQUIREMENTS.MT.federationEmail?.status).toBe('unconfirmed');
  });

  it('preserves the explicit Norwegian national championship exception', () => {
    const norway = COUNTRY_REQUIREMENTS.NO.federationEmail;
    expect(norway?.status).toBe('allowed-with-exceptions');
    expect(norway?.details).toMatch(/except national championships/);
  });

  it('keeps foreign guidance separate from the domestic club licensing rules', () => {
    expect(COUNTRY_REQUIREMENTS.DK.club).toBe('required');
    expect(COUNTRY_REQUIREMENTS.DK.federationEmail?.status).toBe('conditional');
    expect(COUNTRY_REQUIREMENTS.GB.club).toBe('optional');
  });
});
