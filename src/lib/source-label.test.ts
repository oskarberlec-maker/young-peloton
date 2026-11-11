import { expect, it } from 'vitest';
import { sourceLabel } from './source-label';

it('distinguishes documents, entry forms and results without labelling every PDF a guide', () => {
  expect(sourceLabel('https://example.com/2026/technical-guide.pdf')).toBe('Technical guide / regulations');
  expect(sourceLabel('https://example.com/formulaires/insc_equTLJ26.html')).toBe('Registration');
  expect(sourceLabel('https://example.com/results/2026.pdf')).toBe('Results');
  expect(sourceLabel('https://example.com/123.pdf')).toBe('Event information');
  expect(sourceLabel('https://example.com/event/1', 'U19 eligibility evidence')).toBe('U19 eligibility evidence');
});
