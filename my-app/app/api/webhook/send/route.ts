import { NextResponse } from 'next/server';
import { getCampaignState, addLogEntry } from '@/lib/state-manager';
import { fetchGoogleSheetLeads } from '@/lib/sheets-service';
import { startBackgroundWorker } from '@/lib/queue-runner';
import { sendEmailMessage } from '@/lib/mailer';
import { generateEmailContent } from '@/lib/spintax';
import { validateEmailMx } from '@/lib/mx-validator';

/**
 * Drop-in free replacement for Make.com gateway:CustomWebHook
 * Can be called via POST /api/webhook/send
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = getCampaignState();

    addLogEntry('info', 'Webhook trigger received.');

    // Case 1: Direct single email dispatch via webhook payload
    if (body.to || body.email) {
      const recipientEmail = (body.to || body.email).trim();
      const rawVariables = {
        Startup: body.startup || body.company || '',
        Sector: body.sector || '',
        City: body.city || '',
        Website: body.website || '',
        'Contact Email': recipientEmail,
        ...body,
      };

      // MX Check
      if (state.config.settings.enableMxValidation) {
        const mxResult = await validateEmailMx(recipientEmail);
        if (!mxResult.isValid) {
          addLogEntry('warning', `Webhook send skipped: ${mxResult.reason}`, recipientEmail);
          return NextResponse.json({
            success: false,
            skipped: true,
            reason: mxResult.reason,
          });
        }
      }

      const { subject, html, text } = generateEmailContent(
        body.subject || state.config.template.subject,
        body.html || state.config.template.html,
        rawVariables,
        state.config.settings.enableSpintax
      );

      const result = await sendEmailMessage(state.config.smtp, state.config.imap, {
        to: recipientEmail,
        subject,
        html,
        text: state.config.settings.sendPlainFallback ? text : '',
      });

      if (result.success) {
        addLogEntry('success', `Webhook dispatched email to ${recipientEmail}`, recipientEmail);
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          recipient: recipientEmail,
        });
      } else {
        addLogEntry('error', `Webhook send failed for ${recipientEmail}: ${result.error}`, recipientEmail);
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
    }

    // Case 2: Trigger full Google Sheet campaign via webhook (replaces entire Make.com flow)
    const spreadsheetId =
      body.spreadsheetId || state.config.template.spreadsheetId || '1Q722hLPiWaVKQxxsHO6Pmv013i7Q6-kqxnIlL3_aZRk';
    const sheetName = body.sheetName || state.config.template.sheetName || 'Sheet1';
    const limit = body.limit ? parseInt(body.limit, 10) : state.config.template.limit || 105;

    // Fetch fresh leads if none or requested
    if (state.leads.length === 0 || body.reloadSheet) {
      const leads = await fetchGoogleSheetLeads(spreadsheetId, sheetName, limit);
      state.leads = leads;
      state.totalLeads = leads.length;
      state.sentCount = 0;
      state.failedCount = 0;
      state.skippedCount = 0;
      state.currentLeadIndex = 0;
    }

    startBackgroundWorker();
    addLogEntry('info', `Webhook initiated campaign for ${state.leads.length} leads.`);

    return NextResponse.json({
      success: true,
      message: 'Campaign execution started via webhook trigger.',
      totalLeads: state.leads.length,
      spreadsheetId,
      sheetName,
    });
  } catch (error: unknown) {
    const err = error as Error;
    addLogEntry('error', `Webhook trigger error: ${err.message}`);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    method: 'POST',
    description: 'Free self-hosted drop-in replacement for Make.com gateway:CustomWebHook',
    endpoint: '/api/webhook/send',
    samplePayloads: {
      triggerFullCampaign: {
        reloadSheet: true,
        limit: 105,
      },
      sendSingleLead: {
        to: 'founder@example.com',
        startup: 'Acme AI',
        sector: 'Fintech',
        city: 'Mumbai',
      },
    },
  });
}
