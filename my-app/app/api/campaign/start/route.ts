import { NextResponse } from 'next/server';
import { getCampaignState, saveCampaignState, addLogEntry } from '@/lib/state-manager';
import { startBackgroundWorker } from '@/lib/queue-runner';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = getCampaignState();

    if (body.config) {
      state.config = {
        ...state.config,
        ...body.config,
      };
      saveCampaignState(state);
    }

    if (state.leads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No leads available. Please fetch your Google Sheet leads first.',
        },
        { status: 400 }
      );
    }

    // Verify SMTP password exists if not testMode
    if (!state.config.settings.testMode && !state.config.smtp.pass) {
      return NextResponse.json(
        {
          success: false,
          error: 'SMTP Password is missing. Please configure your email password in the SMTP Settings tab.',
        },
        { status: 400 }
      );
    }

    startBackgroundWorker();
    addLogEntry('info', 'Campaign runner started.');

    return NextResponse.json({
      success: true,
      message: 'Campaign started successfully.',
      state: getCampaignState(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
