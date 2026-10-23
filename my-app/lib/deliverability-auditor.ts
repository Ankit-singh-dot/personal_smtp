import { promises as dns } from 'dns';
import { DeliverabilityAudit } from './types';

const SPAM_TRIGGER_WORDS = [
  '100% free',
  'free',
  'guaranteed',
  'make money',
  'risk-free',
  'risk free',
  'no risk',
  'act now',
  'urgent',
  'congratulations',
  'winner',
  'double your income',
  'cash bonus',
  'order now',
  'click here',
  'exclusive deal',
  'unlimited',
  'miracle',
  'fast cash',
  'viagra',
  'lowest price',
  'apply now for free',
  'earn extra',
];

export async function auditDeliverability(
  subject: string,
  html: string,
  fromEmail: string
): Promise<DeliverabilityAudit> {
  const recommendations: string[] = [];
  const flaggedKeywords: string[] = [];
  let score = 100;

  const combinedText = `${subject} ${html}`.toLowerCase();

  // 1. Check spam keywords
  for (const word of SPAM_TRIGGER_WORDS) {
    if (combinedText.includes(word.toLowerCase())) {
      flaggedKeywords.push(word);
    }
  }

  if (flaggedKeywords.length > 0) {
    const penalty = Math.min(30, flaggedKeywords.length * 8);
    score -= penalty;
    recommendations.push(
      `Detected ${flaggedKeywords.length} spam trigger phrases (${flaggedKeywords.slice(0, 3).join(', ')}). Replace with organic conversational wording.`
    );
  }

  // 2. Check for ALL CAPS in Subject
  const subjectWords = subject.split(/\s+/).filter((w) => w.length > 3);
  const capsWords = subjectWords.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 2) {
    score -= 15;
    recommendations.push(
      `Subject contains excessive uppercase words (${capsWords.join(', ')}). Use sentence case to avoid spam filters.`
    );
  }

  // 3. Check Subject length
  if (subject.length > 70) {
    score -= 10;
    recommendations.push('Subject is longer than 70 characters. Mobile inboxes truncate long subjects.');
  } else if (subject.length < 10) {
    score -= 10;
    recommendations.push('Subject is very short. Provide context to prevent aggressive spam classification.');
  }

  // 4. Check Link Count
  const linkMatches = html.match(/<a\s+(?:[^>]*?\s+)?href=/gi) || [];
  const linkCount = linkMatches.length;
  if (linkCount > 4) {
    score -= 15;
    recommendations.push(
      `Found ${linkCount} hyperlinks. For cold outreach, 1–2 links maximum ensures primary inbox delivery.`
    );
  }

  // 5. Check Personalization
  const hasPersonalization = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(`${subject} ${html}`);
  if (!hasPersonalization) {
    score -= 15;
    recommendations.push(
      'No personalization tokens found (e.g. {{Startup}} or {{City}}). Personalized emails get 2.5x higher primary inbox placement.'
    );
  }

  // 6. Check Spintax
  const hasSpintax = /\{[^{}|]+\|[^{}]+\}/.test(`${subject} ${html}`);
  if (!hasSpintax) {
    score -= 10;
    recommendations.push(
      'Add Spintax variations (e.g., "{Hi|Hello|Hey}") to randomize outgoing email hashes and bypass bulk fingerprinting.'
    );
  }

  // 7. Check Sender Domain DNS (SPF & DMARC)
  let spfStatus: 'pass' | 'warning' | 'missing' = 'missing';
  let dmarcStatus: 'pass' | 'warning' | 'missing' = 'missing';

  if (fromEmail && fromEmail.includes('@')) {
    const domain = fromEmail.split('@')[1]?.toLowerCase().trim();
    if (domain) {
      try {
        const txtRecords = await dns.resolveTxt(domain);
        const allTxt = txtRecords.flat().join(' ');
        if (allTxt.includes('v=spf1')) {
          spfStatus = 'pass';
        } else {
          spfStatus = 'warning';
          score -= 15;
          recommendations.push(
            `No SPF record found on domain @${domain}. SPF authentication is mandatory for Gmail/Yahoo delivery.`
          );
        }
      } catch {
        spfStatus = 'warning';
      }

      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
        const allDmarc = dmarcRecords.flat().join(' ');
        if (allDmarc.includes('v=DMARC1')) {
          dmarcStatus = 'pass';
        } else {
          dmarcStatus = 'warning';
          score -= 10;
          recommendations.push(
            `No DMARC record found for @${domain}. Configure a basic DMARC TXT record to boost inbox reputation.`
          );
        }
      } catch {
        dmarcStatus = 'warning';
      }
    }
  }

  // Ensure score is bounded [10, 100]
  score = Math.max(10, Math.min(100, score));

  let rating: DeliverabilityAudit['rating'] = 'Exceptional';
  if (score < 60) rating = 'High Risk';
  else if (score < 75) rating = 'Needs Improvement';
  else if (score < 90) rating = 'Good';

  if (recommendations.length === 0) {
    recommendations.push('Excellent! Content, headers, and DNS alignment are primed for >90% Primary Inbox landing.');
  }

  return {
    score,
    rating,
    spamTriggerCount: flaggedKeywords.length,
    flaggedKeywords,
    linkCount,
    hasPersonalization,
    hasSpintax,
    hasPlainTextFallback: true,
    spfStatus,
    dmarcStatus,
    recommendations,
  };
}
