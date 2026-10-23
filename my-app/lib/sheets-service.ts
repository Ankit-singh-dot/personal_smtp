import { parseCSV } from './csv-parser';
import { LeadRecord } from './types';

export async function fetchGoogleSheetLeads(
  spreadsheetId: string,
  sheetName: string = 'Sheet1',
  limit?: number
): Promise<LeadRecord[]> {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    spreadsheetId
  )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Personal-SMTP-Automation; +https://thefounders.co.in)',
      Accept: 'text/csv,text/plain,*/*',
    },
    // No-store to ensure fresh data
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google Sheet (${response.status} ${response.statusText}). Make sure the spreadsheet is shared as "Anyone with the link can view".`
    );
  }

  const csvText = await response.text();
  return parseLeadsFromCsv(csvText, limit);
}

export function parseLeadsFromCsv(csvText: string, limit?: number): LeadRecord[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  // Determine headers
  const headerRow = rows[0];
  const headersLower = headerRow.map((h) => h.toLowerCase().trim());

  // Find column indices
  let startupIdx = headersLower.findIndex((h) => h.includes('startup') || h.includes('company') || h.includes('name'));
  let sectorIdx = headersLower.findIndex((h) => h.includes('sector') || h.includes('industry'));
  let cityIdx = headersLower.findIndex((h) => h.includes('city') || h.includes('location'));
  let websiteIdx = headersLower.findIndex((h) => h.includes('website') || h.includes('url') || h.includes('domain'));
  let emailIdx = headersLower.findIndex(
    (h) => h.includes('email') || h.includes('contact') || h.includes('mail')
  );
  let notesIdx = headersLower.findIndex((h) => h.includes('notes') || h.includes('remark') || h.includes('desc'));

  // Default fallbacks if header names aren't matched
  if (startupIdx === -1) startupIdx = 0;
  if (sectorIdx === -1) sectorIdx = 1;
  if (cityIdx === -1) cityIdx = 2;
  if (websiteIdx === -1) websiteIdx = 3;
  if (emailIdx === -1) emailIdx = 4;
  if (notesIdx === -1) notesIdx = 5;

  const leads: LeadRecord[] = [];
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    if (limit && leads.length >= limit) break;

    const row = dataRows[i];
    const email = (row[emailIdx] || '').trim();

    // Skip empty rows or rows without any email
    if (!email) continue;

    const startup = (row[startupIdx] || '').trim();
    const sector = (row[sectorIdx] || '').trim();
    const city = (row[cityIdx] || '').trim();
    const website = (row[websiteIdx] || '').trim();
    const notes = (row[notesIdx] || '').trim();

    const rawMap: Record<string, string> = {};
    row.forEach((val, colIdx) => {
      const headerName = headerRow[colIdx] || `Col_${colIdx}`;
      rawMap[headerName] = val;
      rawMap[`${colIdx}`] = val;
    });
    rawMap['Startup'] = startup;
    rawMap['Sector'] = sector;
    rawMap['City'] = city;
    rawMap['Website'] = website;
    rawMap['Contact Email'] = email;
    rawMap['Notes'] = notes;

    leads.push({
      id: `lead_${i + 1}_${Date.now()}`,
      rowNumber: i + 2, // 1-indexed including header
      startup,
      sector,
      city,
      website,
      email,
      notes,
      raw: rawMap,
      status: 'pending',
    });
  }

  return leads;
}
