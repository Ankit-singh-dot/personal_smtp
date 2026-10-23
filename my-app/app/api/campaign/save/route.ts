import { NextResponse } from 'next/server';
import { getCampaignState, saveCampaignState } from '@/lib/state-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = getCampaignState();

    if (body.smtp) {
      state.config.smtp = {
        ...state.config.smtp,
        ...body.smtp,
      };
    }

    if (body.imap) {
      state.config.imap = {
        ...state.config.imap,
        ...body.imap,
      };
    }

    if (body.settings) {
      state.config.settings = {
        ...state.config.settings,
        ...body.settings,
      };
    }

    if (body.template) {
      state.config.template = {
        ...state.config.template,
        ...body.template,
      };
    }

    saveCampaignState(state);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      state,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to save configuration',
      },
      { status: 500 }
    );
  }
}
