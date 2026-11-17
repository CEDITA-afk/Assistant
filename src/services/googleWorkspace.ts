import type {
  CalendarEvent,
  DriveAttachment,
  ExpenseItem,
  MonthlyBudget,
  ShoppingItem,
  TaskItem,
  WorkspaceData,
} from '../types/workspace';
import {
  decryptWorkspaceData,
  encryptWorkspaceData,
  type EncryptedVaultPayload,
} from '../utils/cryptoSync';

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTaskRecord {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  updated?: string;
}

export interface DriveFileRecord {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: string[];
}

async function googleFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 401) {
      throw new Error('Google Workspace session expired. Please reconnect your Google account.');
    }
    throw new Error(`Google API error (${res.status}): ${text.slice(0, 180)}`);
  }

  if (res.status === 204) {
    return {} as T;
  }
  return (await res.json()) as T;
}

async function googleFetchText(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 401) {
      throw new Error('Google Workspace session expired. Please reconnect your Google account.');
    }
    throw new Error(`Google API error (${res.status}): ${text.slice(0, 180)}`);
  }
  return res.text();
}

// ---------------- GOOGLE CALENDAR ----------------

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  daysAhead = 21
): Promise<CalendarEvent[]> {
  const now = new Date();
  now.setDate(now.getDate() - 3);
  const max = new Date();
  max.setDate(max.getDate() + daysAhead);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: now.toISOString(),
    timeMax: max.toISOString(),
    maxResults: '40',
  });

  const data = await googleFetch<{
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    accessToken
  );

  return (data.items || []).map((ev) => {
    const startRaw = ev.start?.dateTime || ev.start?.date || new Date().toISOString();
    const endRaw = ev.end?.dateTime || ev.end?.date || startRaw;
    const isAllDay = !ev.start?.dateTime;
    const startDt = new Date(startRaw);
    const endDt = new Date(endRaw);
    const date = startRaw.slice(0, 10);
    const startTime = isAllDay
      ? '09:00'
      : `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`;
    const endTime = isAllDay
      ? '10:00'
      : `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`;

    return {
      id: `gcal-${ev.id}`,
      googleEventId: ev.id,
      title: ev.summary || '(Untitled Event)',
      date,
      startTime,
      endTime,
      location: ev.location,
      description: ev.description,
      category: 'work',
      reminderMinutes: 15,
    };
  });
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<string> {
  const tzOffset = -new Date().getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const absH = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const absM = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const offsetStr = `${sign}${absH}:${absM}`;

  const body = {
    summary: event.title,
    location: event.location || undefined,
    description: event.description || undefined,
    start: { dateTime: `${event.date}T${event.startTime}:00${offsetStr}` },
    end: { dateTime: `${event.date}T${event.endTime}:00${offsetStr}` },
  };

  const created = await googleFetch<{ id: string }>(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return created.id;
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    accessToken,
    { method: 'DELETE' }
  );
}

// ---------------- GOOGLE TASKS ----------------

export async function fetchGoogleTaskLists(
  accessToken: string
): Promise<GoogleTaskList[]> {
  const data = await googleFetch<{ items?: GoogleTaskList[] }>(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
    accessToken
  );
  return data.items || [];
}

export async function fetchGoogleTasks(
  accessToken: string,
  taskListId = '@default'
): Promise<GoogleTaskRecord[]> {
  const data = await googleFetch<{ items?: GoogleTaskRecord[] }>(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&maxResults=50`,
    accessToken
  );
  return data.items || [];
}

export async function createGoogleTask(
  accessToken: string,
  task: TaskItem,
  taskListId = '@default'
): Promise<string> {
  const res = await googleFetch<{ id: string }>(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        notes: task.notes || `Eisenhower ${task.quadrant} · Priority: ${task.priority}`,
        due: `${task.dueDate}T12:00:00.000Z`,
        status: task.kanbanStatus === 'done' ? 'completed' : 'needsAction',
      }),
    }
  );
  return res.id;
}

export async function updateGoogleTaskStatus(
  accessToken: string,
  googleTaskId: string,
  completed: boolean,
  taskListId = '@default'
): Promise<void> {
  await googleFetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction',
      }),
    }
  );
}

export async function deleteGoogleTask(
  accessToken: string,
  googleTaskId: string,
  taskListId = '@default'
): Promise<void> {
  await googleFetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`,
    accessToken,
    { method: 'DELETE' }
  );
}

// ---------------- GOOGLE DRIVE DOCUMENTS (READ & WRITE) ----------------

export async function listDriveFiles(
  accessToken: string,
  query?: string
): Promise<DriveFileRecord[]> {
  const qParts = ['trashed = false'];
  if (query && query.trim()) {
    const safe = query.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${safe}'`);
  }
  const params = new URLSearchParams({
    q: qParts.join(' and '),
    pageSize: '30',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime,size)',
  });

  const data = await googleFetch<{ files?: DriveFileRecord[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files || [];
}

export async function createCollaborativeDriveDoc(
  accessToken: string,
  title: string,
  content: string
): Promise<DriveFileRecord> {
  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
  };
  const boundary = 'cadence_multipart_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  return googleFetch<DriveFileRecord>(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime',
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
}

export async function readDriveDocumentContent(
  accessToken: string,
  file: Pick<DriveFileRecord, 'id' | 'mimeType'>
): Promise<string> {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    return googleFetchText(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/plain`,
      accessToken
    );
  }
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    return googleFetchText(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/csv`,
      accessToken
    );
  }
  if (file.mimeType === 'application/vnd.google-apps.presentation') {
    return googleFetchText(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/plain`,
      accessToken
    );
  }
  return googleFetchText(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
    accessToken
  );
}

export async function updateDriveDocumentContent(
  accessToken: string,
  fileId: string,
  content: string,
  mimeType = 'text/plain'
): Promise<DriveFileRecord> {
  return googleFetch<DriveFileRecord>(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,mimeType,webViewLink,modifiedTime`,
    accessToken,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': `${mimeType}; charset=UTF-8`,
      },
      body: content,
    }
  );
}

export function matchDriveFilesToTask(
  taskTitle: string,
  taskNotes: string | undefined,
  driveFiles: DriveFileRecord[]
): DriveAttachment[] {
  const keywords = `${taskTitle} ${taskNotes || ''}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);

  if (keywords.length === 0) return [];

  return driveFiles
    .filter((file) => {
      const nameLower = file.name.toLowerCase();
      return keywords.some((kw) => nameLower.includes(kw));
    })
    .slice(0, 3)
    .map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      autoMatched: true,
      source: 'drive' as const,
    }));
}

// ---------------- ENCRYPTED DRIVE APPDATA SYNC ----------------

const VAULT_FILENAME = 'cadence-encrypted-vault.json';

async function findVaultFileId(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${VAULT_FILENAME}'`,
    fields: 'files(id,name,modifiedTime)',
  });
  const data = await googleFetch<{ files?: Array<{ id: string; modifiedTime?: string }> }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files?.[0]?.id || null;
}

export async function uploadEncryptedVaultToDrive(
  accessToken: string,
  workspace: WorkspaceData,
  passphrase: string
): Promise<{ fileId: string; updatedAt: string }> {
  const payload = await encryptWorkspaceData(workspace, passphrase);
  const existingId = await findVaultFileId(accessToken);

  const boundary = 'cadence_vault_boundary';
  const metadata = existingId
    ? { name: VAULT_FILENAME }
    : { name: VAULT_FILENAME, parents: ['appDataFolder'] };

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
  ].join('\r\n');

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=id,modifiedTime`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';

  const result = await googleFetch<{ id: string }>(url, accessToken, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  return { fileId: result.id, updatedAt: payload.updatedAt };
}

export async function downloadEncryptedVaultFromDrive(
  accessToken: string,
  passphrase: string
): Promise<WorkspaceData> {
  const existingId = await findVaultFileId(accessToken);
  if (!existingId) {
    throw new Error('No encrypted Cadence vault found in Google Drive appDataFolder yet.');
  }

  const payload = await googleFetch<EncryptedVaultPayload>(
    `https://www.googleapis.com/drive/v3/files/${existingId}?alt=media`,
    accessToken
  );
  return decryptWorkspaceData(payload, passphrase);
}

// ---------------- GOOGLE SHEETS (READ & WRITE) ----------------

export async function listGoogleSpreadsheets(
  accessToken: string
): Promise<DriveFileRecord[]> {
  const params = new URLSearchParams({
    q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    pageSize: '20',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime)',
  });
  const data = await googleFetch<{ files?: DriveFileRecord[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files || [];
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const meta = await googleFetch<{
    spreadsheetId: string;
    properties: { title: string };
    sheets: Array<{ properties: { title: string } }>;
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    accessToken
  );
  return {
    spreadsheetId: meta.spreadsheetId,
    title: meta.properties.title,
    sheets: meta.sheets.map((s) => s.properties.title),
  };
}

export async function readSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const data = await googleFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    accessToken
  );
  return data.values || [];
}

export async function writeSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: Array<Array<string | number>>
): Promise<void> {
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    }
  );
}

export async function appendSheetRow(
  accessToken: string,
  spreadsheetId: string,
  sheetTab: string,
  row: Array<string | number>
): Promise<void> {
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`${sheetTab}!A1`)}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }
  );
}

export async function createFinanceSpreadsheet(
  accessToken: string
): Promise<{ spreadsheetId: string; title: string; url: string }> {
  const res = await googleFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
  }>('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: 'Cadence Finance & Shopping Ledger' },
      sheets: [
        { properties: { title: 'Expenses' } },
        { properties: { title: 'Budget' } },
        { properties: { title: 'Shopping' } },
      ],
    }),
  });

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${res.spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Expenses!A1:E1', values: [['Date', 'Description', 'Category', 'Amount', 'Notes']] },
          { range: 'Budget!A1:C1', values: [['Category', 'Monthly Limit', 'Month']] },
          { range: 'Shopping!A1:E1', values: [['Item', 'Category', 'Quantity', 'Est. Price', 'Checked']] },
        ],
      }),
    }
  );

  return {
    spreadsheetId: res.spreadsheetId,
    title: res.properties.title,
    url: res.spreadsheetUrl,
  };
}

export async function syncFinanceDataToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  expenses: ExpenseItem[],
  budget: MonthlyBudget,
  shoppingList: ShoppingItem[]
): Promise<void> {
  const meta = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const tabTitles = meta.sheets;
  const expTab = tabTitles.find((t) => t.toLowerCase().includes('expense')) || tabTitles[0];
  const budgetTab = tabTitles.find((t) => t.toLowerCase().includes('budget')) || tabTitles[0];
  const shopTab = tabTitles.find((t) => t.toLowerCase().includes('shop')) || tabTitles[0];

  const expenseRows = [
    ['Date', 'Description', 'Category', 'Amount', 'Notes'],
    ...expenses.map((e) => [e.date, e.description, e.category, e.amount, e.notes || '']),
  ];

  const budgetRows = [
    ['Category', 'Monthly Limit', 'Month'],
    ...Object.entries(budget.categoryLimits).map(([cat, limit]) => [cat, limit, budget.month]),
    ['TOTAL LIMIT', budget.totalLimit, budget.month],
  ];

  const shoppingRows = [
    ['Item', 'Category', 'Quantity', 'Est. Price', 'Checked'],
    ...shoppingList.map((s) => [s.name, s.category, s.quantity, s.estimatedPrice, s.checked ? 'Yes' : 'No']),
  ];

  const updates: Array<{ range: string; values: Array<Array<string | number>> }> = [
    { range: `${expTab}!A1`, values: expenseRows },
  ];

  if (budgetTab !== expTab) {
    updates.push({ range: `${budgetTab}!A1`, values: budgetRows });
  }
  if (shopTab !== expTab && shopTab !== budgetTab) {
    updates.push({ range: `${shopTab}!A1`, values: shoppingRows });
  }

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates,
      }),
    }
  );
}
