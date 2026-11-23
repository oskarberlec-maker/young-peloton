/** Public production origin. The .eu domain is the canonical address for search engines. */
export const SITE_URL = 'https://www.youngpeloton.eu';
export const SITE_NAME = 'Young Peloton';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Static race data lives under /public. In the browser a relative path works; during
 * server-side rendering there is no page origin, so the production site is used.
 */
export const dataOrigin = () => (typeof window === 'undefined' ? SITE_URL : '');
