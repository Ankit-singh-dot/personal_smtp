export interface LeadRecord {
  id: string;
  rowNumber: number;
  startup: string;
  sector: string;
  city: string;
  website: string;
  email: string;
  notes: string;
  raw: Record<string, string>;
  status: 'pending' | 'validating' | 'sending' | 'sent' | 'skipped' | 'failed';
  error?: string;
  sentAt?: string;
  messageId?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface ImapConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  sentFolder: string;
}

export interface AntiBanSettings {
  minDelaySec: number;
  maxDelaySec: number;
  maxPerHour: number;
  maxPerDay: number;
  enableMxValidation: boolean;
  enableSpintax: boolean;
  enableJitter: boolean;
  testMode: boolean; // if true, simulates send without hitting real SMTP
  sendPlainFallback: boolean;
}

export interface CampaignTemplate {
  subject: string;
  html: string;
  spreadsheetId: string;
  sheetName: string;
  limit: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  leadEmail?: string;
}

export interface DeliverabilityAudit {
  score: number; // 0 - 100
  rating: 'Exceptional' | 'Good' | 'Needs Improvement' | 'High Risk';
  spamTriggerCount: number;
  flaggedKeywords: string[];
  linkCount: number;
  hasPersonalization: boolean;
  hasSpintax: boolean;
  hasPlainTextFallback: boolean;
  spfStatus: 'pass' | 'warning' | 'missing';
  dmarcStatus: 'pass' | 'warning' | 'missing';
  recommendations: string[];
}

export interface CampaignState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentLeadIndex: number;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  startedAt?: string;
  completedAt?: string;
  leads: LeadRecord[];
  logs: LogEntry[];
  config: {
    smtp: SmtpConfig;
    imap: ImapConfig;
    settings: AntiBanSettings;
    template: CampaignTemplate;
  };
}
