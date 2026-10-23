export interface EmailProviderPreset {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  imapHost: string;
  imapPort: number;
  sentFolder: string;
  passwordPlaceholder: string;
  guideTitle: string;
  guideSteps: string[];
  importantTip?: string;
}

export const EMAIL_PROVIDERS: EmailProviderPreset[] = [
  {
    id: 'godaddy',
    name: 'GoDaddy / Secureserver',
    shortName: 'GoDaddy',
    badge: 'Current Default',
    smtpHost: 'smtpout.secureserver.net',
    smtpPort: 465,
    secure: true,
    imapHost: 'imap.secureserver.net',
    imapPort: 993,
    sentFolder: 'Sent',
    passwordPlaceholder: 'Enter your GoDaddy email password',
    guideTitle: 'GoDaddy / Secureserver Setup',
    guideSteps: [
      'SMTP Host: smtpout.secureserver.net with Port 465 (SSL).',
      'Username: Full email address (pitch@thefounders.co.in).',
      'Password: Your standard GoDaddy webmail password.',
      'IMAP Host: imap.secureserver.net on Port 993 (SSL), Sent folder: "Sent".',
    ],
    importantTip:
      'GoDaddy daily sending threshold is ~250–500 emails/day per mailbox. Jitter rate limiting ensures safe delivery without provider throttling.',
  },
  {
    id: 'hostinger',
    name: 'Hostinger (Titan / Business)',
    shortName: 'Hostinger',
    badge: 'Popular',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: 465,
    secure: true,
    imapHost: 'imap.hostinger.com',
    imapPort: 993,
    sentFolder: 'Sent',
    passwordPlaceholder: 'Enter Hostinger email password',
    guideTitle: 'Hostinger / Titan Email Setup',
    guideSteps: [
      'SMTP Host: smtp.hostinger.com on Port 465 (SSL).',
      'Username: Complete email address.',
      'Password: Hostinger webmail password.',
      'IMAP Host: imap.hostinger.com on Port 993 (SSL).',
    ],
    importantTip:
      'Hostinger supports up to 500 emails/day on Business plans. Verify your SPF record includes include:_spf.mail.hostinger.com in DNS.',
  },
  {
    id: 'google',
    name: 'Google Workspace / Gmail',
    shortName: 'Google / Gmail',
    badge: 'App Password',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    secure: true,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    sentFolder: '[Gmail]/Sent Mail',
    passwordPlaceholder: 'Enter 16-character App Password (e.g. abcd efgh ijkl mnop)',
    guideTitle: 'Google Workspace / Gmail Setup',
    guideSteps: [
      '1. Open Google Account (myaccount.google.com) > Security.',
      '2. Ensure "2-Step Verification" is active.',
      '3. Search for "App Passwords" in the top bar.',
      '4. Generate an App Password named "FounderMail".',
      '5. Paste the 16-character code into the password field.',
      '6. Host: smtp.gmail.com (Port 465 SSL), IMAP: imap.gmail.com (Port 993).',
    ],
    importantTip:
      'Plain Google account passwords are not accepted by Google SMTP. You must use a 16-character App Password.',
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365 / Outlook',
    shortName: 'Microsoft 365',
    badge: 'STARTTLS',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    secure: false, // STARTTLS
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    sentFolder: 'Sent Items',
    passwordPlaceholder: 'Enter Office 365 password or app password',
    guideTitle: 'Microsoft 365 / Outlook Setup',
    guideSteps: [
      'SMTP Host: smtp.office365.com on Port 587 with STARTTLS.',
      'Username: Corporate Office 365 email.',
      'IMAP Host: outlook.office365.com on Port 993 (SSL), Sent folder: "Sent Items".',
      'Ensure "Authenticated SMTP" is enabled in Microsoft 365 Admin Center for your user.',
    ],
    importantTip:
      'In M365 Admin Center: Users > Active Users > Mail > Manage email apps > enable "Authenticated SMTP".',
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    shortName: 'Zoho Mail',
    badge: 'India & US',
    smtpHost: 'smtppro.zoho.in',
    smtpPort: 465,
    secure: true,
    imapHost: 'imappro.zoho.in',
    imapPort: 993,
    sentFolder: 'Sent',
    passwordPlaceholder: 'Enter Zoho Application-Specific Password',
    guideTitle: 'Zoho Mail Setup',
    guideSteps: [
      'India: SMTP smtppro.zoho.in, IMAP imappro.zoho.in (Port 465 SSL).',
      'US/Global: SMTP smtppro.zoho.com, IMAP imappro.zoho.com (Port 465 SSL).',
      'Username: Full email address.',
      'Password: Zoho App Password (generated in Zoho My Account > Security).',
    ],
    importantTip:
      'If 2FA is active on your Zoho account, you must generate a dedicated App Password.',
  },
  {
    id: 'custom',
    name: 'cPanel / Custom / Namecheap',
    shortName: 'cPanel / Custom',
    badge: 'Self-Hosted',
    smtpHost: 'mail.yourdomain.com',
    smtpPort: 465,
    secure: true,
    imapHost: 'mail.yourdomain.com',
    imapPort: 993,
    sentFolder: 'Sent',
    passwordPlaceholder: 'Enter mailbox password',
    guideTitle: 'cPanel / Namecheap / Custom SMTP Setup',
    guideSteps: [
      'Namecheap: mail.privateemail.com (Port 465 SSL).',
      'cPanel: mail.yourdomain.com or server hostname (Port 465 SSL).',
      'Username: Full email address.',
      'Password: Created in cPanel Email Accounts.',
    ],
    importantTip:
      'Check with your hosting provider that port 465 is unblocked in your hosting firewall.',
  },
];
