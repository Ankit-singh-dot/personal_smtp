import { NextResponse } from 'next/server';
import { fetchGoogleSheetLeads, parseLeadsFromCsv } from '@/lib/sheets-service';
import { getCampaignState, saveCampaignState, addLogEntry } from '@/lib/state-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const spreadsheetId = body.spreadsheetId?.trim() || '1Q722hLPiWaVKQxxsHO6Pmv013i7Q6-kqxnIlL3_aZRk';
    const sheetName = body.sheetName?.trim() || 'Sheet1';
    const limit = body.limit ? parseInt(body.limit, 10) : undefined;
    const customCsv = body.customCsv;

    let leads = [];

    if (customCsv && customCsv.trim().length > 0) {
      leads = parseLeadsFromCsv(customCsv, limit);
      addLogEntry('info', `Imported ${leads.length} leads from custom CSV.`);
    } else {
      leads = await fetchGoogleSheetLeads(spreadsheetId, sheetName, limit);
      addLogEntry(
        'info',
        `Successfully loaded ${leads.length} leads directly from Google Sheet: "${sheetName}" (${spreadsheetId}).`
      );
    }

    const state = getCampaignState();
    state.leads = leads;
    state.totalLeads = leads.length;
    state.sentCount = 0;
    state.failedCount = 0;
    state.skippedCount = 0;
    state.currentLeadIndex = 0;
    state.status = 'idle';
    state.config.template.spreadsheetId = spreadsheetId;
    state.config.template.sheetName = sheetName;
    if (limit) state.config.template.limit = limit;

    saveCampaignState(state);

    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error: unknown) {
    const err = error as Error;
    addLogEntry('error', `Failed to load Google Sheet: ${err.message}`);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch Google Sheet',
      },
      { status: 500 }
    );
  }
}
