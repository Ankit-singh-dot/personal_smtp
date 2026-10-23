import { NextResponse } from 'next/server';
import { testSmtpConnection, testImapConnection } from '@/lib/mailer';
import { getCampaignState, saveCampaignState, addLogEntry } from '@/lib/state-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { smtp, imap } = body;

    const state = getCampaignState();

    if (smtp) {
      state.config.smtp = {
        ...state.config.smtp,
        ...smtp,
      };
    }
    if (imap) {
      state.config.imap = {
        ...state.config.imap,
        ...imap,
      };
    }
    saveCampaignState(state);

    const smtpResult = await testSmtpConnection(state.config.smtp);
    let imapResult: { success: boolean; latencyMs: number; error?: string } = {
      success: true,
      latencyMs: 0,
    };

    if (state.config.imap.enabled && state.config.imap.host) {
      imapResult = await testImapConnection(state.config.imap);
    }

    if (smtpResult.success) {
      addLogEntry(
        'success',
        `SMTP verified successfully! Connected to ${state.config.smtp.host}:${state.config.smtp.port} in ${smtpResult.latencyMs}ms.`
      );
    } else {
      addLogEntry(
        'error',
        `SMTP connection failed: ${smtpResult.error}`
      );
    }

    return NextResponse.json({
      smtp: smtpResult,
      imap: imapResult,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: err.message || 'Verification test failed',
      },
      { status: 500 }
    );
  }
}
