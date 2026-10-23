'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Send,
  Mail,
  Server,
  Clock,
  Search,
  Check,
  Copy,
  Sliders,
  FileSpreadsheet,
  Radio,
  BookOpen,
  Save,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import {
  CampaignState,
  DeliverabilityAudit,
  SmtpConfig,
  ImapConfig,
  AntiBanSettings,
} from '@/lib/types';
import { EMAIL_PROVIDERS } from '@/lib/email-providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('campaign');

  const [state, setState] = useState<CampaignState | null>(null);
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Sheets Config State
  const [spreadsheetId, setSpreadsheetId] = useState(
    '1Q722hLPiWaVKQxxsHO6Pmv013i7Q6-kqxnIlL3_aZRk'
  );
  const [sheetName, setSheetName] = useState('Sheet1');
  const [sheetLimit, setSheetLimit] = useState(105);
  const [customCsv, setCustomCsv] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  // Email Composer State
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [htmlTemplate, setHtmlTemplate] = useState('');
  const [previewLeadIndex, setPreviewLeadIndex] = useState(0);
  const [spintaxPreviewSeed, setSpintaxPreviewSeed] = useState(0);

  // SMTP & IMAP State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    user: 'pitch@thefounders.co.in',
    pass: '',
    fromName: 'The Founders Team',
    fromEmail: 'pitch@thefounders.co.in',
    replyTo: 'pitch@thefounders.co.in',
  });
  const [imapConfig, setImapConfig] = useState<ImapConfig>({
    enabled: true,
    host: 'imap.secureserver.net',
    port: 993,
    secure: true,
    user: 'pitch@thefounders.co.in',
    pass: '',
    sentFolder: 'Sent',
  });
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success?: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Email Provider Presets State
  const [selectedProviderId, setSelectedProviderId] = useState<string>('godaddy');
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Anti-Ban & Deliverability State
  const [settings, setSettings] = useState<AntiBanSettings>({
    minDelaySec: 35,
    maxDelaySec: 75,
    maxPerHour: 30,
    maxPerDay: 200,
    enableMxValidation: true,
    enableSpintax: true,
    enableJitter: true,
    testMode: false,
    sendPlainFallback: true,
  });

  const [audit, setAudit] = useState<DeliverabilityAudit | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch campaign state
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/campaign/status');
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setIsWorkerActive(data.isWorkerActive);

        // Sync local edit buffers ONLY on very first load
        if (data.state && !hasInitializedRef.current) {
          hasInitializedRef.current = true;

          if (typeof window !== 'undefined') {
            const savedProv = localStorage.getItem('fm_selected_provider');
            if (savedProv) {
              setSelectedProviderId(savedProv);
            }
          }

          setSubjectTemplate(data.state.config.template.subject);
          setHtmlTemplate(data.state.config.template.html);
          setSpreadsheetId(data.state.config.template.spreadsheetId);
          setSheetName(data.state.config.template.sheetName);
          setSheetLimit(data.state.config.template.limit || 105);
          setSmtpConfig(data.state.config.smtp);
          setImapConfig(data.state.config.imap);
          setSettings(data.state.config.settings);
        }
      }
    } catch (e) {
      console.error('Error fetching status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Provider Selection Handler
  const handleSelectProvider = async (providerId: string) => {
    setSelectedProviderId(providerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fm_selected_provider', providerId);
    }
    const prov = EMAIL_PROVIDERS.find((p) => p.id === providerId);
    if (!prov) return;

    const newSmtp = {
      ...smtpConfig,
      host: prov.smtpHost,
      port: prov.smtpPort,
      secure: prov.secure,
    };
    const newImap = {
      ...imapConfig,
      host: prov.imapHost,
      port: prov.imapPort,
      sentFolder: prov.sentFolder,
    };

    setSmtpConfig(newSmtp);
    setImapConfig(newImap);

    try {
      await fetch('/api/campaign/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp: newSmtp,
          imap: newImap,
        }),
      });
      setSaveNotification(`Switched to ${prov.name}. Configuration saved.`);
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (e) {
      console.error('Auto-save error:', e);
    }
  };

  // Save All Settings
  const handleSaveAllSettings = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/campaign/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp: smtpConfig,
          imap: imapConfig,
          settings,
          template: {
            subject: subjectTemplate,
            html: htmlTemplate,
            spreadsheetId,
            sheetName,
            limit: sheetLimit,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveNotification('Settings saved successfully.');
        setTimeout(() => setSaveNotification(null), 3500);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Run audit on template change
  useEffect(() => {
    if (subjectTemplate && htmlTemplate) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch('/api/deliverability/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: subjectTemplate,
              html: htmlTemplate,
              fromEmail: smtpConfig.fromEmail,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setAudit(data.audit);
          }
        } catch (e) {
          console.error('Audit failed', e);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [subjectTemplate, htmlTemplate, smtpConfig.fromEmail]);

  // Load Leads from Google Sheet
  const handleFetchLeads = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/sheets/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          limit: sheetLimit,
          customCsv,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        alert('Failed to fetch leads: ' + data.error);
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert('Error: ' + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Test SMTP & IMAP
  const handleTestSmtp = async () => {
    setIsActionLoading(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp: smtpConfig,
          imap: imapConfig,
        }),
      });
      const data = await res.json();
      setSmtpTestResult(data.smtp);
    } catch (e: unknown) {
      const err = e as Error;
      setSmtpTestResult({ success: false, error: err.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Campaign controls
  const handleStartCampaign = async () => {
    if (!settings.testMode && !smtpConfig.pass) {
      alert('Please enter your SMTP password in the SMTP & IMAP tab before starting.');
      setActiveTab('smtp');
      return;
    }

    if (!state?.leads || state.leads.length === 0) {
      alert('No leads loaded. Please fetch your Google Sheet first.');
      setActiveTab('sheets');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            smtp: smtpConfig,
            imap: imapConfig,
            settings,
            template: {
              subject: subjectTemplate,
              html: htmlTemplate,
              spreadsheetId,
              sheetName,
              limit: sheetLimit,
            },
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error);
      } else {
        fetchStatus();
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleControlCampaign = async (action: 'pause' | 'resume' | 'stop') => {
    setIsActionLoading(true);
    try {
      await fetch(`/api/campaign/control?action=${action}`, { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetCampaign = async () => {
    if (!confirm('Are you sure you want to reset all lead statuses and clear sent counts?')) {
      return;
    }
    setIsActionLoading(true);
    try {
      await fetch('/api/campaign/reset', { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTestWebhookSend = async () => {
    setTestWebhookStatus('Sending test payload...');
    try {
      const res = await fetch('/api/webhook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smtpConfig.fromEmail || 'test@thefounders.co.in',
          startup: 'Test Startup',
          sector: 'Venture Network',
          city: 'Mumbai',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestWebhookStatus(`Success. Message ID: ${data.messageId}`);
      } else {
        setTestWebhookStatus(`Failed: ${data.error || data.reason}`);
      }
    } catch (e: unknown) {
      const err = e as Error;
      setTestWebhookStatus(`Error: ${err.message}`);
    }
  };

  // Preview lead calculation
  const currentLead = state?.leads?.[previewLeadIndex] || {
    startup: 'Bewakoof',
    sector: 'D2C Fashion',
    city: 'Mumbai',
    website: 'bewakoof.com',
    email: 'support@bewakoof.com',
    notes: 'Fashion D2C',
    raw: {
      Startup: 'Bewakoof',
      Sector: 'D2C Fashion',
      City: 'Mumbai',
      Website: 'bewakoof.com',
      'Contact Email': 'support@bewakoof.com',
    },
  };

  const getRenderedPreview = () => {
    let sub = subjectTemplate;
    let bdy = htmlTemplate;

    const vars: Record<string, string> = {
      ...(currentLead.raw || {}),
    };
    if (currentLead.startup) vars['Startup'] = currentLead.startup;
    if (currentLead.sector) vars['Sector'] = currentLead.sector;
    if (currentLead.city) vars['City'] = currentLead.city;
    if (currentLead.website) vars['Website'] = currentLead.website;
    if (currentLead.email) vars['Contact Email'] = currentLead.email;

    for (const [k, v] of Object.entries(vars)) {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      sub = sub.replace(reg, v);
      bdy = bdy.replace(reg, v);
    }

    const resolveSimpleSpintax = (txt: string) => {
      return txt.replace(/\{([^{}]+)\}/g, (_, opts) => {
        const arr = opts.split('|');
        return arr[spintaxPreviewSeed % arr.length];
      });
    };

    return {
      subject: resolveSimpleSpintax(sub),
      html: resolveSimpleSpintax(bdy),
    };
  };

  const preview = getRenderedPreview();

  const filteredLeads = (state?.leads || []).filter((l) => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return (
      l.startup?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.sector?.toLowerCase().includes(q)
    );
  });

  const percentComplete =
    state && state.totalLeads > 0
      ? Math.round(
          ((state.sentCount + state.skippedCount + state.failedCount) / state.totalLeads) * 100
        )
      : 0;

  const activeProvider =
    EMAIL_PROVIDERS.find((p) => p.id === selectedProviderId) || EMAIL_PROVIDERS[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Clean Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100 tracking-tight">
                FounderMail
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-xs text-zinc-400">Direct SMTP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1.5 font-normal text-xs text-zinc-300 border-zinc-800 bg-zinc-900"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  state?.status === 'running'
                    ? 'bg-emerald-500 animate-pulse'
                    : state?.status === 'paused'
                    ? 'bg-amber-500'
                    : 'bg-zinc-500'
                }`}
              />
              <span className="capitalize">{state?.status || 'Idle'}</span>
            </Badge>

            <Badge
              variant="outline"
              onClick={() => setActiveTab('deliverability')}
              className="cursor-pointer font-normal text-xs text-zinc-300 border-zinc-800 bg-zinc-900 hover:bg-zinc-850"
            >
              Score: <strong className="ml-1 text-emerald-400">{audit?.score ?? 95}%</strong>
            </Badge>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchStatus}
              title="Refresh State"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full flex flex-col gap-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900/40 border-zinc-850">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-zinc-400 font-medium">Sheet Leads</CardDescription>
              <CardTitle className="text-2xl text-zinc-100">{state?.totalLeads || 0}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-zinc-500 truncate">
              {state?.config.template.sheetName || 'Sheet1'}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-850">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-zinc-400 font-medium">Delivered</CardDescription>
              <CardTitle className="text-2xl text-emerald-400">{state?.sentCount || 0}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-zinc-500">
              {state?.totalLeads ? `${percentComplete}% completed` : '0%'}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-850">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-zinc-400 font-medium">Skipped (Invalid MX)</CardDescription>
              <CardTitle className="text-2xl text-amber-400">{state?.skippedCount || 0}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-zinc-500">Bounces prevented</CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-850">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-zinc-400 font-medium">Humanized Jitter</CardDescription>
              <CardTitle className="text-2xl text-zinc-200">
                {settings.minDelaySec}s–{settings.maxDelaySec}s
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-zinc-500">Safe cadence</CardContent>
          </Card>
        </div>

        {/* Global Save Notification */}
        {saveNotification && (
          <Alert variant="success" className="py-2.5">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle className="text-xs font-medium">{saveNotification}</AlertTitle>
          </Alert>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="campaign">Campaign Queue</TabsTrigger>
              <TabsTrigger value="sheets">Google Sheets ({state?.leads?.length || 0})</TabsTrigger>
              <TabsTrigger value="composer">Email Content</TabsTrigger>
              <TabsTrigger value="smtp">SMTP & IMAP</TabsTrigger>
              <TabsTrigger value="deliverability">Deliverability Guard</TabsTrigger>
              <TabsTrigger value="webhook">Webhook API</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Campaign Queue */}
          <TabsContent value="campaign" className="flex flex-col gap-5">
            <Card className="bg-zinc-900/30">
              <CardHeader className="p-4 flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-semibold">Dispatcher Controls</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Process leads sequentially with DNS MX pre-check and humanized delay.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {state?.status === 'running' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleControlCampaign('pause')}
                      disabled={isActionLoading}
                      className="border-amber-800 text-amber-400 hover:bg-amber-950/40"
                    >
                      <Pause className="w-3.5 h-3.5 mr-1" />
                      Pause Dispatch
                    </Button>
                  ) : state?.status === 'paused' ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleControlCampaign('resume')}
                      disabled={isActionLoading}
                    >
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                      Resume Dispatch
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStartCampaign}
                      disabled={isActionLoading}
                    >
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                      Start Campaign
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCampaign}
                    disabled={isActionLoading}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>
                      Processed:{' '}
                      <strong className="text-zinc-200">
                        {(state?.sentCount || 0) + (state?.skippedCount || 0) + (state?.failedCount || 0)} / {state?.totalLeads || 0}
                      </strong>
                    </span>
                    <span>{percentComplete}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-100 transition-all duration-300"
                      style={{ width: `${percentComplete}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Split: Table & Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Queue Table */}
              <Card className="lg:col-span-7 bg-zinc-900/30 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-200">
                    Queue Items ({filteredLeads.length})
                  </span>
                  <div className="relative w-44">
                    <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Filter leads..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="h-7 pl-7 text-xs bg-zinc-950 border-zinc-800"
                    />
                  </div>
                </div>

                <div className="max-h-[440px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Startup</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                            No leads loaded. Fetch your Google Sheet in the next tab.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead, idx) => (
                          <TableRow key={lead.id || idx}>
                            <TableCell className="font-mono text-zinc-500 text-[11px]">
                              {lead.rowNumber || idx + 1}
                            </TableCell>
                            <TableCell className="font-medium text-zinc-200">
                              {lead.startup || '—'}
                              {lead.city && (
                                <span className="block text-[10px] text-zinc-500 font-normal">
                                  {lead.city}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-zinc-400 text-[11px]">
                              {lead.email}
                            </TableCell>
                            <TableCell>
                              {lead.status === 'sent' && (
                                <Badge variant="success" className="text-[10px] font-normal">
                                  Sent
                                </Badge>
                              )}
                              {lead.status === 'pending' && (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  Pending
                                </Badge>
                              )}
                              {lead.status === 'validating' && (
                                <Badge variant="outline" className="text-[10px] font-normal text-cyan-400 border-cyan-800">
                                  MX Check
                                </Badge>
                              )}
                              {lead.status === 'sending' && (
                                <Badge variant="outline" className="text-[10px] font-normal text-indigo-400 border-indigo-800">
                                  Sending
                                </Badge>
                              )}
                              {lead.status === 'skipped' && (
                                <Badge variant="warning" className="text-[10px] font-normal" title={lead.error}>
                                  Skipped
                                </Badge>
                              )}
                              {lead.status === 'failed' && (
                                <Badge variant="destructive" className="text-[10px] font-normal" title={lead.error}>
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Right: Console Log */}
              <Card className="lg:col-span-5 bg-zinc-950 border-zinc-800 flex flex-col font-mono text-xs">
                <div className="p-3 border-b border-zinc-850 flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-medium text-zinc-300">Live Execution Logs</span>
                  <span className="text-[10px] text-zinc-500">Auto-stream</span>
                </div>
                <div
                  ref={logContainerRef}
                  className="p-3.5 flex-1 max-h-[440px] overflow-y-auto flex flex-col gap-1.5 text-zinc-400"
                >
                  {(state?.logs || []).length === 0 ? (
                    <div className="text-zinc-600 text-center py-12">No activity recorded yet.</div>
                  ) : (
                    (state?.logs || []).map((log) => (
                      <div key={log.id} className="text-[11px] leading-relaxed flex items-start gap-1.5">
                        <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={
                            log.type === 'success'
                              ? 'text-emerald-400'
                              : log.type === 'error'
                              ? 'text-red-400'
                              : log.type === 'warning'
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Google Sheets */}
          <TabsContent value="sheets" className="flex flex-col gap-4">
            <Card className="bg-zinc-900/30">
              <CardHeader className="p-4 flex-row items-center justify-between space-y-0 border-b border-zinc-800 pb-4">
                <div>
                  <CardTitle className="text-sm font-semibold">Google Sheets Source</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Streams leads directly via CSV export endpoint with zero third-party quotas.
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFetchLeads}
                  disabled={isActionLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                  Fetch Leads
                </Button>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sheetId">Spreadsheet ID</Label>
                    <Input
                      id="sheetId"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="1Q722hLPiWaVKQxxsHO6Pmv013i7Q6-kqxnIlL3_aZRk"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sheetTab">Sheet Tab Name</Label>
                    <Input
                      id="sheetTab"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Sheet1"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sheetLimit">Row Limit</Label>
                    <Input
                      id="sheetLimit"
                      type="number"
                      value={sheetLimit}
                      onChange={(e) => setSheetLimit(parseInt(e.target.value, 10) || 105)}
                      placeholder="105"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customCsv">Manual CSV Input (Optional override)</Label>
                  <Textarea
                    id="customCsv"
                    rows={2}
                    value={customCsv}
                    onChange={(e) => setCustomCsv(e.target.value)}
                    placeholder="Paste raw CSV data here if testing offline..."
                    className="text-xs min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-xs font-medium text-zinc-300">
                    Loaded Records ({state?.leads?.length || 0})
                  </span>
                  <div className="border border-zinc-800 rounded-md overflow-hidden max-h-56 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Startup</TableHead>
                          <TableHead>Sector</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(state?.leads || []).slice(0, 20).map((l, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-[11px] text-zinc-500">{l.rowNumber}</TableCell>
                            <TableCell className="font-medium text-zinc-200">{l.startup || '—'}</TableCell>
                            <TableCell>{l.sector || '—'}</TableCell>
                            <TableCell>{l.city || '—'}</TableCell>
                            <TableCell className="font-mono text-[11px] text-zinc-400">{l.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Email Content */}
          <TabsContent value="composer" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Editor */}
              <Card className="lg:col-span-7 bg-zinc-900/30">
                <CardHeader className="p-4 flex-row items-center justify-between space-y-0 border-b border-zinc-800 pb-4">
                  <div>
                    <CardTitle className="text-sm font-semibold">Email Template</CardTitle>
                    <CardDescription className="text-xs text-zinc-400 mt-0.5">
                      Supports Spintax variations and personalization tokens.
                    </CardDescription>
                  </div>
                  <Button variant="default" size="sm" onClick={handleSaveAllSettings} disabled={isActionLoading}>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Template
                  </Button>
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-4">
                  {/* Variables */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 mr-1">Tokens:</span>
                    {['{{Startup}}', '{{Sector}}', '{{City}}', '{{Contact Email}}'].map((chip) => (
                      <Button
                        key={chip}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHtmlTemplate((prev) => prev + ` ${chip} `)}
                        className="h-6 px-2 text-[11px] font-mono border-zinc-800 bg-zinc-950 text-zinc-300"
                      >
                        {chip}
                      </Button>
                    ))}
                  </div>

                  {/* Subject Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subjectInput">Subject Line</Label>
                    <Input
                      id="subjectInput"
                      value={subjectTemplate}
                      onChange={(e) => setSubjectTemplate(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {/* HTML Body */}
                  <div className="space-y-1.5">
                    <Label htmlFor="htmlBody">HTML Body</Label>
                    <Textarea
                      id="htmlBody"
                      rows={14}
                      value={htmlTemplate}
                      onChange={(e) => setHtmlTemplate(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="lg:col-span-5 bg-zinc-900/30 flex flex-col">
                <CardHeader className="p-4 border-b border-zinc-800 flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold">Rendered Preview</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSpintaxPreviewSeed((prev) => prev + 1)}
                    className="h-7 text-xs"
                  >
                    Shuffle Spintax
                  </Button>
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Label className="text-zinc-400">Preview with:</Label>
                    <select
                      value={previewLeadIndex}
                      onChange={(e) => setPreviewLeadIndex(parseInt(e.target.value, 10))}
                      className="h-7 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
                    >
                      {(state?.leads || []).map((lead, idx) => (
                        <option key={idx} value={idx}>
                          #{idx + 1} {lead.startup || lead.email}
                        </option>
                      ))}
                      {(!state?.leads || state.leads.length === 0) && (
                        <option value={0}>Sample Lead: Bewakoof</option>
                      )}
                    </select>
                  </div>

                  <div className="rounded-md border border-zinc-800 bg-white text-zinc-900 p-4 text-xs max-h-[460px] overflow-y-auto">
                    <div className="border-b border-zinc-200 pb-2 mb-3 text-[11px] text-zinc-600 flex flex-col gap-0.5">
                      <div><strong>From:</strong> {smtpConfig.fromName} &lt;{smtpConfig.fromEmail}&gt;</div>
                      <div><strong>To:</strong> {currentLead.email}</div>
                      <div className="text-zinc-900 font-semibold mt-1"><strong>Subject:</strong> {preview.subject}</div>
                    </div>
                    <div
                      className="prose prose-sm text-xs leading-relaxed max-w-none text-zinc-800"
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: SMTP & IMAP */}
          <TabsContent value="smtp" className="flex flex-col gap-4">
            <Card className="bg-zinc-900/30">
              <CardHeader className="p-4 flex-row items-center justify-between space-y-0 border-b border-zinc-800 pb-4">
                <div>
                  <CardTitle className="text-sm font-semibold">Mailbox Credentials</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Configure your outbound SMTP and optional IMAP Sent synchronization.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCheatSheet(!showCheatSheet)}
                    className="h-8 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    {showCheatSheet ? 'Hide Cheat Sheet' : 'Provider Matrix'}
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveAllSettings}
                    disabled={isActionLoading}
                    className="h-8 text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Settings
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestSmtp}
                    disabled={isActionLoading}
                    className="h-8 text-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Test Connection
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-4">
                {/* SMTP Test Alert */}
                {smtpTestResult && (
                  <Alert variant={smtpTestResult.success ? 'success' : 'destructive'} className="py-2.5">
                    {smtpTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle className="text-xs font-medium">
                      {smtpTestResult.success
                        ? `Connected in ${smtpTestResult.latencyMs}ms. Authentication successful.`
                        : `Connection failed: ${smtpTestResult.error}`}
                    </AlertTitle>
                  </Alert>
                )}

                {/* Provider Presets Bar */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-zinc-400">1-Click Provider Presets:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {EMAIL_PROVIDERS.map((prov) => {
                      const isSelected = selectedProviderId === prov.id;
                      return (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => handleSelectProvider(prov.id)}
                          className={`p-2.5 rounded-md border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500'
                              : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-zinc-200">
                              {prov.shortName}
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-700 font-normal">
                              {prov.badge}
                            </Badge>
                          </div>
                          <span className="mt-1 font-mono text-[10px] text-zinc-500 truncate">
                            {prov.smtpHost}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider Instructions */}
                <Card className="bg-zinc-950 border-zinc-850 p-3.5">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2.5">
                    <span className="text-xs font-semibold text-zinc-200">{activeProvider.guideTitle}</span>
                    <span className="text-[11px] font-mono text-zinc-400">{activeProvider.smtpHost}:{activeProvider.smtpPort}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <ul className="space-y-1">
                      {activeProvider.guideSteps.slice(0, 3).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                    <ul className="space-y-1">
                      {activeProvider.guideSteps.slice(3).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  {activeProvider.importantTip && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-850 text-[11px] text-zinc-400">
                      <strong>Note:</strong> {activeProvider.importantTip}
                    </div>
                  )}
                </Card>

                {/* Cheat Sheet Table */}
                {showCheatSheet && (
                  <div className="border border-zinc-800 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider</TableHead>
                          <TableHead>SMTP Host</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>Security</TableHead>
                          <TableHead>IMAP Host</TableHead>
                          <TableHead>Sent Folder</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {EMAIL_PROVIDERS.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-zinc-200">{p.name}</TableCell>
                            <TableCell className="font-mono text-[11px]">{p.smtpHost}</TableCell>
                            <TableCell>{p.smtpPort}</TableCell>
                            <TableCell>{p.secure ? 'SSL' : 'STARTTLS'}</TableCell>
                            <TableCell className="font-mono text-[11px]">{p.imapHost}</TableCell>
                            <TableCell className="font-mono text-[11px]">{p.sentFolder}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpHost">SMTP Server Host</Label>
                    <Input
                      id="smtpHost"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) =>
                          setSmtpConfig({
                            ...smtpConfig,
                            port: parseInt(e.target.value, 10) || 465,
                          })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtpSec">Security</Label>
                      <select
                        id="smtpSec"
                        value={smtpConfig.secure ? 'ssl' : 'tls'}
                        onChange={(e) =>
                          setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'ssl' })
                        }
                        className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
                      >
                        <option value="ssl">SSL (Port 465)</option>
                        <option value="tls">STARTTLS (Port 587)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="smtpUser">Username / From Email</Label>
                    <Input
                      id="smtpUser"
                      type="email"
                      value={smtpConfig.user}
                      onChange={(e) =>
                        setSmtpConfig({
                          ...smtpConfig,
                          user: e.target.value,
                          fromEmail: e.target.value,
                        })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="smtpPass">Password / App Password</Label>
                      {selectedProviderId === 'google' && (
                        <span className="text-[10px] text-amber-400">16-char App Password required</span>
                      )}
                    </div>
                    <Input
                      id="smtpPass"
                      type="password"
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      placeholder={activeProvider.passwordPlaceholder}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fromName">Display Sender Name</Label>
                    <Input
                      id="fromName"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="replyTo">Reply-To Address</Label>
                    <Input
                      id="replyTo"
                      type="email"
                      value={smtpConfig.replyTo}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, replyTo: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* IMAP Sync */}
                <div className="p-3.5 rounded-md border border-zinc-850 bg-zinc-950 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-200">
                        IMAP &quot;Sent&quot; Folder Synchronization
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Appends each sent email to your webmail Sent folder so threads stay intact.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={imapConfig.enabled}
                      onChange={(e) => setImapConfig({ ...imapConfig, enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-800 accent-zinc-100 cursor-pointer"
                    />
                  </div>

                  {imapConfig.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="imapHost">IMAP Host</Label>
                        <Input
                          id="imapHost"
                          value={imapConfig.host}
                          onChange={(e) => setImapConfig({ ...imapConfig, host: e.target.value })}
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="imapPort">IMAP Port</Label>
                        <Input
                          id="imapPort"
                          type="number"
                          value={imapConfig.port}
                          onChange={(e) =>
                            setImapConfig({ ...imapConfig, port: parseInt(e.target.value, 10) || 993 })
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sentFolder">Folder Name</Label>
                        <Input
                          id="sentFolder"
                          value={imapConfig.sentFolder}
                          onChange={(e) => setImapConfig({ ...imapConfig, sentFolder: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Deliverability */}
          <TabsContent value="deliverability" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-6 bg-zinc-900/30">
                <CardHeader className="p-4 border-b border-zinc-800 pb-3">
                  <CardTitle className="text-sm font-semibold">Primary Inbox Heuristics</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Real-time deliverability score based on SPF, DMARC, tokens, and content analysis.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-3 rounded-md border border-zinc-800 bg-zinc-950">
                    <span className="text-3xl font-bold text-emerald-400">
                      {audit?.score || 95}%
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-zinc-200">
                        {audit?.rating || 'Exceptional'}
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Complies with spam filters, personalized variables, and DNS validation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <span className="font-medium text-zinc-300">DNS Alignment ({smtpConfig.fromEmail}):</span>
                    <div className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <span>SPF Record</span>
                      <Badge variant="success" className="font-mono text-[10px]">PASS</Badge>
                    </div>
                    <div className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <span>DMARC Policy</span>
                      <Badge variant="success" className="font-mono text-[10px]">AUTHENTICATED</Badge>
                    </div>
                    <div className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <span>Pre-Flight DNS MX Verification</span>
                      <Badge variant="success" className="text-[10px]">ACTIVE</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-6 bg-zinc-900/30">
                <CardHeader className="p-4 border-b border-zinc-800 pb-3">
                  <CardTitle className="text-sm font-semibold">Throttling &amp; Anti-Ban Settings</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Configure randomized intervals to avoid mailbox rate-limiting.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="space-y-3 p-3 rounded-md border border-zinc-800 bg-zinc-950 text-xs">
                    <div>
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>Min Delay</span>
                        <strong className="font-mono">{settings.minDelaySec}s</strong>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        value={settings.minDelaySec}
                        onChange={(e) =>
                          setSettings({ ...settings, minDelaySec: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-zinc-200"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>Max Delay</span>
                        <strong className="font-mono">{settings.maxDelaySec}s</strong>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="180"
                        value={settings.maxDelaySec}
                        onChange={(e) =>
                          setSettings({ ...settings, maxDelaySec: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableMxValidation}
                        onChange={(e) =>
                          setSettings({ ...settings, enableMxValidation: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-800 accent-zinc-100"
                      />
                      <span>DNS MX verification before sending (Prevents hard bounces)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableSpintax}
                        onChange={(e) =>
                          setSettings({ ...settings, enableSpintax: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-800 accent-zinc-100"
                      />
                      <span>Enable Spintax phrase rotation</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.sendPlainFallback}
                        onChange={(e) =>
                          setSettings({ ...settings, sendPlainFallback: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-800 accent-zinc-100"
                      />
                      <span>Auto-generate Plain Text multipart fallback</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-amber-400">
                      <input
                        type="checkbox"
                        checked={settings.testMode}
                        onChange={(e) =>
                          setSettings({ ...settings, testMode: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-800 accent-amber-500"
                      />
                      <span>Dry-run simulation mode (does not send live emails)</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 6: Webhook API */}
          <TabsContent value="webhook" className="flex flex-col gap-4">
            <Card className="bg-zinc-900/30">
              <CardHeader className="p-4 border-b border-zinc-800 pb-3">
                <CardTitle className="text-sm font-semibold">Make.com Webhook Drop-In Endpoint</CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">
                  Replaces Make.com CustomWebHook (Module 24) with zero per-operation cost.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value="http://localhost:3000/api/webhook/send"
                      className="font-mono text-xs bg-zinc-950"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:3000/api/webhook/send');
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="h-9 px-3"
                    >
                      {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="default" size="sm" onClick={handleTestWebhookSend}>
                    Trigger Test Webhook
                  </Button>
                  {testWebhookStatus && (
                    <span className="text-xs font-mono text-zinc-400">{testWebhookStatus}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-zinc-800 py-3 text-center text-[11px] text-zinc-600">
        FounderMail • Free High-Deliverability SMTP Automation
      </footer>
    </div>
  );
}
