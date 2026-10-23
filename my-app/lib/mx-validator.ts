import { promises as dns } from 'dns';

// In-memory cache for MX checks across a campaign
const mxCache = new Map<string, { isValid: boolean; reason?: string }>();

/**
 * Validates email syntax and performs pre-flight DNS MX resolution.
 */
export async function validateEmailMx(email: string): Promise<{
  isValid: boolean;
  reason?: string;
  domain?: string;
}> {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'Empty or missing email address' };
  }

  const cleanEmail = email.trim();

  // Basic RFC 5322 standard check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, reason: 'Invalid email syntax format' };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, reason: 'Malformed email structure' };
  }

  const domain = parts[1].toLowerCase();

  // Check cache first
  if (mxCache.has(domain)) {
    return { ...mxCache.get(domain)!, domain };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      const result = { isValid: false, reason: `No MX records found for domain @${domain}` };
      mxCache.set(domain, result);
      return { ...result, domain };
    }

    const result = { isValid: true };
    mxCache.set(domain, result);
    return { ...result, domain };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const code = err.code || 'UNKNOWN';
    let reason = `Domain @${domain} DNS resolution failed (${code})`;
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') {
      reason = `Recipient domain @${domain} does not exist (hard bounce risk)`;
    } else if (code === 'ENODATA') {
      reason = `Domain @${domain} has no mail exchange (MX) configured`;
    }
    const result = { isValid: false, reason };
    mxCache.set(domain, result);
    return { ...result, domain };
  }
}
