import { NextResponse } from 'next/server';
import { pauseQueue, resumeQueue, stopQueue } from '@/lib/queue-runner';
import { getCampaignState, saveCampaignState, addLogEntry } from '@/lib/state-manager';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'pause';

    if (action === 'pause') {
      pauseQueue();
    } else if (action === 'resume') {
      resumeQueue();
    } else if (action === 'stop') {
      stopQueue();
    }

    return NextResponse.json({
      success: true,
      action,
      state: getCampaignState(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
