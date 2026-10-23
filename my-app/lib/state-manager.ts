import fs from 'fs';
import path from 'path';
import { CampaignState, LogEntry } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'campaign-state.json');

const DEFAULT_STATE: CampaignState = {
  status: 'idle',
  currentLeadIndex: 0,
  totalLeads: 0,
  sentCount: 0,
  failedCount: 0,
  skippedCount: 0,
  leads: [],
  logs: [
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Email Automation Engine initialized. Ready to fetch Google Sheets leads.',
    },
  ],
  config: {
    smtp: {
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      user: 'pitch@thefounders.co.in',
      pass: '',
      fromName: 'The Founders Team',
      fromEmail: 'pitch@thefounders.co.in',
      replyTo: 'pitch@thefounders.co.in',
    },
    imap: {
      enabled: true,
      host: 'imap.secureserver.net',
      port: 993,
      secure: true,
      user: 'pitch@thefounders.co.in',
      pass: '',
      sentFolder: 'Sent',
    },
    settings: {
      minDelaySec: 35,
      maxDelaySec: 75,
      maxPerHour: 30,
      maxPerDay: 200,
      enableMxValidation: true,
      enableSpintax: true,
      enableJitter: true,
      testMode: false,
      sendPlainFallback: true,
    },
    template: {
      spreadsheetId: '1Q722hLPiWaVKQxxsHO6Pmv013i7Q6-kqxnIlL3_aZRk',
      sheetName: 'Sheet1',
      limit: 105,
      subject:
        '{Pitch your startup|Invite to pitch|Exclusive Pitch Opportunity} to 15+ investors — Founders x Investors, Sept 6 (Mumbai)',
      html: `<p>{Hi|Hello|Hey} {{Startup}} team,</p>

<p>
  We're hosting the <strong>26th edition of The Founders x Investors Pitch</strong>,
  and we'd love for you to apply to pitch.
</p>

<p>
  <strong>When:</strong> Sun, 6 Sep 2026, 4–8 PM<br>
  <strong>Where:</strong> AIC-NMIMS Incubation Centre, Vile Parle (W), Mumbai
</p>

<p>
  <strong>15+ investors</strong>, <strong>80+ founders/operators/startups</strong>.
</p>

<p><strong>Investors confirmed:</strong></p>

<ul>
  <li>Sandeep</li>
  <li>Kushi Agrawal – 247VC</li>
  <li>Flora Sheth – Ashwin Sheth Family Office</li>
  <li>Mahek Solanki</li>
  <li>Varun Deep Singh – Foundershala Ventures</li>
  <li>V3 Ventures</li>
  <li>Colossa Ventures</li>
  <li>IPV</li>
  <li>Gauri</li>
  <li>Anshul – BlackSoil Ventures</li>
  <li>Raj Sharma</li>
</ul>

<p><strong>Format:</strong></p>

<ul>
  <li>10 shortlisted startups: 7-min pitch + 7-min Q&amp;A</li>
  <li>Networking, 60–80 attendees</li>
  <li>Consolidated investor feedback post-event</li>
</ul>

<p>
  <strong>Apply:</strong>
  <a href="https://go.allevents.in/7qr3">Apply to pitch</a>
</p>

<p>
  Share your pitch deck at
  <a href="mailto:pitch@thefounders.co.in">pitch@thefounders.co.in</a>
</p>

<p>
  For more details, contact Bhavya at
  <a href="tel:9588017610">9588017610</a>
</p>

<p>
  Best,<br>
  <strong>The Founders Team</strong>
</p>`,
    },
  },
};

export function getCampaignState(): CampaignState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data) as CampaignState;
    }
  } catch (err) {
    console.error('Failed to read campaign state:', err);
  }
  return DEFAULT_STATE;
}

export function saveCampaignState(state: CampaignState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save campaign state:', err);
  }
}

export function addLogEntry(
  type: LogEntry['type'],
  message: string,
  leadEmail?: string
): LogEntry {
  const state = getCampaignState();
  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    leadEmail,
  };

  // Keep latest 250 log entries to avoid bloated state
  state.logs.unshift(entry);
  if (state.logs.length > 250) {
    state.logs = state.logs.slice(0, 250);
  }

  saveCampaignState(state);
  return entry;
}
