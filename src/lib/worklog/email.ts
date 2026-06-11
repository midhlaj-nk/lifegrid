import { renderSignature, escapeHtml, type SignatureFields } from '@/lib/worklog/signature-template'
import {
  DAILY_COLUMNS_DEFAULT, WEEKLY_COLUMNS_DEFAULT,
  resolveDailyColumn, resolveWeeklyColumn, isBuiltinDailyKey,
  type WeeklyColumnKey, type CustomColumn,
} from '@/lib/worklog/template-columns'

interface TimesheetEntry {
  projectName: string
  taskName: string
  hours: number
  description: string
  status?: string
  custom?: Record<string, string>
}

const STATUS_BG: Record<string, string> = {
  'Completed': 'rgb(106,168,79)',
  'Ongoing': 'rgb(255,217,102)',
  'On-Hold': 'rgb(224,102,102)',
  'On-Queue': 'rgb(109,158,235)',
}

const STATUS_ORDER: Record<string, number> = {
  'Completed': 0,
  'On-Hold': 1,
  'On-Queue': 2,
  'Ongoing': 3,
}

const TH = 'border-width:1px;border-style:solid;border-color:rgb(204,204,204) rgb(0,0,0) rgb(0,0,0) rgb(204,204,204);overflow:hidden;padding:2px 3px;vertical-align:middle;background-color:rgb(183,183,183);font-weight:bold;text-align:center'
const TH_FIRST = 'border-width:1px;border-style:solid;border-color:rgb(204,204,204) rgb(0,0,0) rgb(0,0,0);overflow:hidden;padding:2px 3px;vertical-align:middle;background-color:rgb(183,183,183);font-weight:bold;text-align:center'
const TD = 'border-width:1px;border-style:solid;border-color:rgb(204,204,204) rgb(0,0,0) rgb(0,0,0) rgb(204,204,204);overflow:hidden;padding:2px 3px;vertical-align:middle;text-align:center'
const TD_FIRST = 'border-width:1px;border-style:solid;border-color:rgb(204,204,204) rgb(0,0,0) rgb(0,0,0);overflow:hidden;padding:2px 3px;vertical-align:middle;text-align:center'

export function formatEmailDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${d} ${months[m - 1]} ${y}`
}

function dailyCellValue(
  key: string,
  e: TimesheetEntry,
  rowIdx: number,
): string {
  if (isBuiltinDailyKey(key)) {
    switch (key) {
      case 'slNo': return String(rowIdx + 1)
      case 'project': return escapeHtml(e.projectName)
      case 'task': return escapeHtml(e.taskName)
      case 'status': return escapeHtml(e.status || '')
      case 'remarks': return escapeHtml(e.description)
      case 'hours': return String(e.hours)
      default: {
        const _exhaustive: never = key
        return _exhaustive
      }
    }
  }
  return escapeHtml(e.custom?.[key] ?? '')
}

export function buildEmailHtml(params: {
  date: string
  entries: TimesheetEntry[]
  signatureFields?: Partial<SignatureFields>
  columns?: string[]
  customColumns?: CustomColumn[]
  widthOverrides?: Record<string, number>
}) {
  const { date, entries, signatureFields } = params
  const customColumns = params.customColumns ?? []
  const widthOverrides = params.widthOverrides ?? {}
  const defaults = [...DAILY_COLUMNS_DEFAULT, ...customColumns.map((c) => c.key)]
  const resolvedColumns = (params.columns?.length ? params.columns : defaults)
    .map((k) => ({ key: k, meta: resolveDailyColumn(k, customColumns, widthOverrides) }))
    .filter((x): x is { key: string; meta: NonNullable<ReturnType<typeof resolveDailyColumn>> } => x.meta !== null)
  const columns = resolvedColumns.map((c) => c.key)
  const formattedDate = formatEmailDate(date)

  // Sort: Completed first, Ongoing last
  const sorted = [...entries].sort((a, b) => {
    const sa = STATUS_ORDER[a.status || ''] ?? 99
    const sb = STATUS_ORDER[b.status || ''] ?? 99
    return sa - sb
  })

  const rows = sorted
    .map((e, i) => {
      const bg = e.status ? STATUS_BG[e.status] : ''
      const cells = columns
        .map((key, ci) => {
          const border = ci === 0 ? TD_FIRST : TD
          const baseStyle = key === 'status' && bg ? `${border};background-color:${bg}` : border
          return `<td style="${baseStyle}">${dailyCellValue(key, e, i)}</td>`
        })
        .join('')
      return `<tr style="height:21px">${cells}</tr>`
    })
    .join('')

  const colgroup = resolvedColumns.map((c) => `<col width="${c.meta.width}">`).join('')
  const headerCells = resolvedColumns
    .map((c, ci) => `<td style="${ci === 0 ? TH_FIRST : TH}">${escapeHtml(c.meta.label)}</td>`)
    .join('')

  return `<div dir="ltr">
  <div>
    <span style="font-family:Arial;font-size:13.3333px">Hi Team,</span><br style="font-family:Arial;font-size:13.3333px">
    <span style="font-family:Arial;font-size:13.3333px">Please go through my daily work report,</span>
  </div>
  <div>
    <table cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;border-collapse:collapse;border-width:medium;border-style:none;border-color:currentcolor">
      <colgroup>${colgroup}</colgroup>
      <tbody>
        <tr style="height:21px">
          <td style="border:1px solid rgb(0,0,0);overflow:hidden;padding:2px 3px;vertical-align:middle;background-color:rgb(153,153,153);font-weight:bold;text-align:center" colspan="${columns.length}">Work Report_${formattedDate}</td>
        </tr>
        <tr style="height:21px">${headerCells}</tr>
        ${rows}
      </tbody>
    </table>
  </div>
  <div dir="ltr"><br><br>${renderSignature(signatureFields)}</div>
</div>`
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh access token')
  return data.access_token
}

export async function sendWorkReport(params: {
  accessToken: string
  refreshToken?: string | null
  userEmail: string
  userName: string
  subjectName?: string
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  date: string
  entries: TimesheetEntry[]
  signatureFields?: Partial<SignatureFields>
  columns?: string[]
  customColumns?: CustomColumn[]
  widthOverrides?: Record<string, number>
  customHtml?: string
  customSubject?: string
}) {
  const { userEmail, userName, subjectName, recipients, cc = [], bcc = [], date, entries, signatureFields, columns, customColumns, widthOverrides, customHtml, customSubject } = params
  let { accessToken } = params

  const formattedDate = formatEmailDate(date)
  const html = customHtml ?? buildEmailHtml({ date, entries, signatureFields, columns, customColumns, widthOverrides })
  const subject = customSubject || `Daily Work Report_${formattedDate}_${(subjectName || userName).toUpperCase()}`

  const headers: string[] = [
    `From: "${userName}" <${userEmail}>`,
    `To: ${recipients.join(', ')}`,
  ]
  if (cc.length) headers.push(`Cc: ${cc.join(', ')}`)
  if (bcc.length) headers.push(`Bcc: ${bcc.join(', ')}`)
  headers.push(`Subject: ${subject}`, `Content-Type: text/html; charset=utf-8`, `MIME-Version: 1.0`, ``)

  const message = [...headers, html].join('\r\n')
  const raw = Buffer.from(message).toString('base64url')

  async function trySend(token: string) {
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })
  }

  let res = await trySend(accessToken)

  if (res.status === 401 && params.refreshToken) {
    accessToken = await refreshAccessToken(params.refreshToken)
    res = await trySend(accessToken)
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || `Gmail API error ${res.status}`)
  }
}

interface WeeklyEntry {
  projectName: string
  taskName: string
  status: string
  description: string
}

function weeklyCellValue(key: WeeklyColumnKey, e: WeeklyEntry, rowIdx: number): string {
  switch (key) {
    case 'slNo': return String(rowIdx + 1)
    case 'project': return escapeHtml(e.projectName)
    case 'task': return escapeHtml(e.taskName)
    case 'status': return escapeHtml(e.status || '')
    case 'remarks': return escapeHtml(e.description)
  }
}

export function buildWeeklyEmailHtml(params: {
  weekLabel: string
  entries: WeeklyEntry[]
  signatureFields?: Partial<SignatureFields>
  columns?: WeeklyColumnKey[]
  widthOverrides?: Record<string, number>
}) {
  const { weekLabel, entries, signatureFields } = params
  const widthOverrides = params.widthOverrides ?? {}
  const columns = params.columns?.length ? params.columns : WEEKLY_COLUMNS_DEFAULT
  const resolved = columns.map((k) => ({ key: k, meta: resolveWeeklyColumn(k, widthOverrides) }))

  const sorted = [...entries].sort((a, b) => {
    const sa = STATUS_ORDER[a.status || ''] ?? 99
    const sb = STATUS_ORDER[b.status || ''] ?? 99
    return sa - sb
  })

  const rows = sorted
    .map((e, i) => {
      const bg = STATUS_BG[e.status] || ''
      const cells = columns
        .map((key, ci) => {
          const border = ci === 0 ? TD_FIRST : TD
          const baseStyle = key === 'status' && bg ? `${border};background-color:${bg}` : border
          return `<td style="${baseStyle}">${weeklyCellValue(key, e, i)}</td>`
        })
        .join('')
      return `<tr style="height:21px">${cells}</tr>`
    })
    .join('')

  const colgroup = resolved.map((c) => `<col width="${c.meta.width}">`).join('')
  const headerCells = resolved
    .map((c, ci) => `<td style="${ci === 0 ? TH_FIRST : TH}">${escapeHtml(c.meta.label)}</td>`)
    .join('')

  return `<div dir="ltr">
  <div>
    <span style="font-size:10pt;font-family:Arial">Hi Team,<br>Please go through my weekly work report,<br></span>
    <table cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;border-collapse:collapse;border-width:medium;border-style:none;border-color:currentcolor">
      <colgroup>${colgroup}</colgroup>
      <tbody>
        <tr style="height:21px">
          <td style="border:1px solid rgb(0,0,0);overflow:hidden;padding:2px 3px;vertical-align:middle;background-color:rgb(153,153,153);font-weight:bold;text-align:center" colspan="${columns.length}">Work Report_${weekLabel}</td>
        </tr>
        <tr style="height:21px">${headerCells}</tr>
        ${rows}
      </tbody>
    </table>
  </div>
  <div dir="ltr"><br><br>${renderSignature(signatureFields)}</div>
</div>`
}

export async function sendWeeklyWorkReport(params: {
  accessToken: string
  refreshToken?: string | null
  userEmail: string
  userName: string
  subjectName?: string
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  weekLabel: string
  entries: WeeklyEntry[]
  signatureFields?: Partial<SignatureFields>
  columns?: WeeklyColumnKey[]
  widthOverrides?: Record<string, number>
}) {
  const { userEmail, userName, subjectName, recipients, cc = [], bcc = [], weekLabel, entries, signatureFields, columns, widthOverrides } = params
  let { accessToken } = params

  const html = buildWeeklyEmailHtml({ weekLabel, entries, signatureFields, columns, widthOverrides })
  const subject = `Weekly Work Report_${weekLabel}_${(subjectName || userName).toUpperCase()}`

  const headers: string[] = [
    `From: "${userName}" <${userEmail}>`,
    `To: ${recipients.join(', ')}`,
  ]
  if (cc.length) headers.push(`Cc: ${cc.join(', ')}`)
  if (bcc.length) headers.push(`Bcc: ${bcc.join(', ')}`)
  headers.push(`Subject: ${subject}`, `Content-Type: text/html; charset=utf-8`, `MIME-Version: 1.0`, ``)

  const message = [...headers, html].join('\r\n')
  const raw = Buffer.from(message).toString('base64url')

  async function trySend(token: string) {
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })
  }

  let res = await trySend(accessToken)
  if (res.status === 401 && params.refreshToken) {
    accessToken = await refreshAccessToken(params.refreshToken)
    res = await trySend(accessToken)
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || `Gmail API error ${res.status}`)
  }
}
