import { NextResponse } from 'next/server';
import { getCampaignState } from '@/lib/state-manager';
import { isQueueRunning } from '@/lib/queue-runner';

export async function GET() {
  const state = getCampaignState();
  return NextResponse.json({
    state,
    isWorkerActive: isQueueRunning(),
  });
}
