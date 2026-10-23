import { NextResponse } from 'next/server';
import { getCampaignState, saveCampaignState, addLogEntry } from '@/lib/state-manager';
import { stopQueue } from '@/lib/queue-runner';

export async function POST() {
  try {
    stopQueue();
    const state = getCampaignState();

    state.leads = state.leads.map((l) => ({
      ...l,
      status: 'pending',
      error: undefined,
      sentAt: undefined,
      messageId: undefined,
    }));

    state.sentCount = 0;
    state.failedCount = 0;
    state.skippedCount = 0;
    state.currentLeadIndex = 0;
    state.status = 'idle';
    state.startedAt = undefined;
    state.completedAt = undefined;

    saveCampaignState(state);
    addLogEntry('info', 'Campaign queue reset. All leads returned to pending status.');

    return NextResponse.json({
      success: true,
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
