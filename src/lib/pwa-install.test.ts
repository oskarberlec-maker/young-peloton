import { describe, expect, it } from 'vitest';
import { detectInstallEnvironment, getInstallGuidance } from './pwa-install';

describe('PWA installation browser detection and guidance', () => {
  it('detects Chrome on Android', () => {
    const environment = detectInstallEnvironment(
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    );
    expect(environment).toEqual({browser: 'chrome', platform: 'android'});
    expect(getInstallGuidance(environment).steps.join(' ')).toContain('Install app');
  });

  it('detects Firefox on Windows and explains the web app button', () => {
    const environment = detectInstallEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
    );
    expect(environment).toEqual({browser: 'firefox', platform: 'windows'});
    expect(getInstallGuidance(environment).steps.join(' ')).toContain('Web apps icon');
  });

  it('distinguishes Firefox on macOS from Windows', () => {
    const environment = detectInstallEnvironment(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:143.0) Gecko/20100101 Firefox/143.0',
    );
    expect(environment.browser).toBe('firefox');
    expect(environment.platform).toBe('mac');
    expect(getInstallGuidance(environment).note).toContain('Firefox');
  });

  it('detects Opera ahead of Chrome on desktop', () => {
    const environment = detectInstallEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
    );
    expect(environment).toEqual({browser: 'opera', platform: 'windows'});
    expect(getInstallGuidance(environment).note).toContain('vary');
  });

  it('detects Chrome and Firefox on iPhone separately from Safari', () => {
    const chrome = detectInstallEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0.0.0 Mobile/15E148 Safari/604.1');
    const firefox = detectInstallEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/129.0 Mobile/15E148 Safari/605.1.15');
    expect(chrome).toEqual({browser: 'chrome', platform: 'ios'});
    expect(firefox).toEqual({browser: 'firefox', platform: 'ios'});
    expect(getInstallGuidance(chrome).steps.join(' ')).toContain('Home Screen');
  });

  it('returns instructions for unknown browsers and platforms', () => {
    expect(getInstallGuidance({browser:'other',platform:'other'}).steps.length).toBeGreaterThan(0);
  });
});
