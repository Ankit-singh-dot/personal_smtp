/**
 * Spintax, Personalization, and Plain-Text Generator Engine
 */

/**
 * Resolves spintax strings like {Hello|Hi|Hey} recursively.
 */
export function resolveSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/g;
  let result = text;
  let hasMatches = true;

  while (hasMatches) {
    const prev = result;
    result = result.replace(spintaxRegex, (_, options) => {
      const choices = options.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      return chosen;
    });
    hasMatches = result !== prev && /\{([^{}]+)\}/.test(result);
  }

  return result;
}

/**
 * Injects lead variables into text/html templates (e.g., {{Startup}}, {{City}}).
 */
export function injectVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  if (!template) return '';
  let output = template;

  // Replace each variable case-insensitively
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'gi');
    output = output.replace(regex, value || '');
  }

  // Also support {{1.`4`}} or {{0}} numeric index fallbacks if mapped
  for (const [key, value] of Object.entries(variables)) {
    const rawKey = key.replace(/[^a-zA-Z0-9_]/g, '');
    if (rawKey) {
      const regex = new RegExp(`\\{\\{\\s*${escapeRegex(rawKey)}\\s*\\}\\}`, 'gi');
      output = output.replace(regex, value || '');
    }
  }

  return output;
}

/**
 * Converts rich HTML into clean, authentic plain text for multipart emails.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  let text = html;

  // Convert links: <a href="url">text</a> -> text (url)
  text = text.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (_, href, anchor) => {
    const cleanAnchor = anchor.replace(/<[^>]*>/g, '').trim();
    if (cleanAnchor.toLowerCase() === href.toLowerCase() || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return cleanAnchor;
    }
    return `${cleanAnchor} [${href}]`;
  });

  // Convert lists
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
  text = text.replace(/<\/?ul[^>]*>/gi, '\n');
  text = text.replace(/<\/?ol[^>]*>/gi, '\n');

  // Paragraphs and breaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');

  // Headings
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&bull;/g, '•')
    .replace(/&nbsp;/g, ' ');

  // Normalize excessive empty lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * Previews a template with a given lead data and spintax resolution.
 */
export function generateEmailContent(
  subjectTemplate: string,
  htmlTemplate: string,
  variables: Record<string, string | undefined>,
  applySpintax: boolean = true
): { subject: string; html: string; text: string } {
  // Step 1: Inject lead variables
  const subjectWithVars = injectVariables(subjectTemplate, variables);
  const htmlWithVars = injectVariables(htmlTemplate, variables);

  // Step 2: Apply Spintax if enabled
  const finalSubject = applySpintax ? resolveSpintax(subjectWithVars) : subjectWithVars;
  const finalHtml = applySpintax ? resolveSpintax(htmlWithVars) : htmlWithVars;

  // Step 3: Generate clean Plain Text alternative
  const finalText = htmlToPlainText(finalHtml);

  return {
    subject: finalSubject.trim(),
    html: finalHtml.trim(),
    text: finalText.trim(),
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
