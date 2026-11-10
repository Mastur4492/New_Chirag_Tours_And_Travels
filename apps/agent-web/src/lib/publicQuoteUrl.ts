/**
 * Public Customer Quotation URL Resolver & Safety Safeguard
 * 
 * In production/staging, the customer portal public URL MUST be configured via
 * NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL (or NEXT_PUBLIC_CUSTOMER_PORTAL_URL) to ensure
 * external travelers receive a reachable, publicly routed link.
 * 
 * If no public domain is configured, local development falls back to the current origin,
 * but clearly flags the link as localhost/development so it cannot be misrepresented as
 * a production-ready customer link.
 */

export interface PublicQuoteUrlResult {
  url: string;
  baseUrl: string;
  isDevelopmentOrLocalhost: boolean;
  isConfiguredDomain: boolean;
  warningMessage?: string;
}

export function resolvePublicQuoteUrl(token: string): PublicQuoteUrlResult {
  const envBaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CUSTOMER_PORTAL_URL) ||
    '';

  const cleanEnvBaseUrl = envBaseUrl.trim().replace(/\/+$/, '');
  const isConfiguredDomain = Boolean(cleanEnvBaseUrl);

  let baseUrl = '';
  if (isConfiguredDomain) {
    baseUrl = cleanEnvBaseUrl;
  } else if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    if (origin.includes(':3001') || origin.includes(':3002')) {
      baseUrl = origin.replace(/:300[12]/, ':3000');
    } else if (origin.includes('newchirag-admin') || origin.includes('newchirag-agent')) {
      baseUrl = origin.replace(/newchirag-(admin|agent)/, 'newchirag-customer');
    } else {
      baseUrl = origin;
    }
  } else {
    baseUrl = 'http://localhost:3000';
  }

  // Detect whether the resolved base URL points to localhost, loopback, or private host
  const isDevelopmentOrLocalhost =
    !isConfiguredDomain ||
    /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|:\d{4}/i.test(baseUrl);

  const url = token ? `${baseUrl}/quote/${token}` : '';

  const warningMessage = isDevelopmentOrLocalhost
    ? 'Development / Localhost Link: NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL is not configured with a public customer domain. This link runs on a local port and cannot be opened by external travelers on their mobile devices.'
    : undefined;

  return {
    url,
    baseUrl,
    isDevelopmentOrLocalhost,
    isConfiguredDomain,
    warningMessage,
  };
}
