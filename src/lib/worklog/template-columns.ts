export type DailyColumnKey = 'slNo' | 'project' | 'task' | 'status' | 'remarks' | 'hours'
export type WeeklyColumnKey = 'slNo' | 'project' | 'task' | 'status' | 'remarks'

export const DAILY_COLUMNS_DEFAULT: DailyColumnKey[] = ['slNo', 'project', 'task', 'status', 'remarks', 'hours']
export const WEEKLY_COLUMNS_DEFAULT: WeeklyColumnKey[] = ['slNo', 'project', 'task', 'status', 'remarks']

export const DAILY_COLUMN_META: Record<DailyColumnKey, { label: string; width: number }> = {
  slNo:    { label: 'Sl No',       width: 43 },
  project: { label: 'Project',     width: 112 },
  task:    { label: 'Task',        width: 161 },
  status:  { label: 'Status',      width: 107 },
  remarks: { label: 'Remarks',     width: 327 },
  hours:   { label: 'Hours Spent', width: 95 },
}

export const WEEKLY_COLUMN_META: Record<WeeklyColumnKey, { label: string; width: number }> = {
  slNo:    { label: 'Sl No',   width: 43 },
  project: { label: 'Project', width: 112 },
  task:    { label: 'Task',    width: 161 },
  status:  { label: 'Status',  width: 107 },
  remarks: { label: 'Remarks', width: 327 },
}

export interface CustomColumn {
  key: string
  label: string
  width?: number
}

export const CUSTOM_KEY_PREFIX = 'c_'
export const CUSTOM_DEFAULT_WIDTH = 140

export function newCustomColumnKey(): string {
  return `${CUSTOM_KEY_PREFIX}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function parseCustomColumns(raw: string | null | undefined): CustomColumn[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: CustomColumn[] = []
    for (const c of parsed) {
      if (!c || typeof c !== 'object') continue
      const key = typeof c.key === 'string' ? c.key : ''
      const label = typeof c.label === 'string' ? c.label.trim() : ''
      if (!key.startsWith(CUSTOM_KEY_PREFIX) || !label || seen.has(key)) continue
      seen.add(key)
      const width = typeof c.width === 'number' && Number.isFinite(c.width) && c.width >= 40 && c.width <= 600
        ? Math.round(c.width)
        : CUSTOM_DEFAULT_WIDTH
      out.push({ key, label, width })
    }
    return out
  } catch {
    return []
  }
}

export function serializeCustomColumns(cols: CustomColumn[]): string {
  if (!cols.length) return ''
  return JSON.stringify(
    cols.map((c) => ({ key: c.key, label: c.label, width: c.width ?? CUSTOM_DEFAULT_WIDTH })),
  )
}

export const COLUMN_WIDTH_MIN = 40
export const COLUMN_WIDTH_MAX = 600

export function parseColumnWidths(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k !== 'string' || !k) continue
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      if (v < COLUMN_WIDTH_MIN || v > COLUMN_WIDTH_MAX) continue
      out[k] = Math.round(v)
    }
    return out
  } catch {
    return {}
  }
}

export function serializeColumnWidths(map: Record<string, number>): string {
  const entries = Object.entries(map).filter(
    ([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= COLUMN_WIDTH_MIN && v <= COLUMN_WIDTH_MAX,
  )
  if (!entries.length) return ''
  return JSON.stringify(Object.fromEntries(entries.map(([k, v]) => [k, Math.round(v)])))
}

function parseColumnList(raw: string | null | undefined, allowed: readonly string[]): string[] {
  if (!raw) return [...allowed]
  const allowedSet = new Set<string>(allowed)
  const seen = new Set<string>()
  const picked: string[] = []
  for (const s of raw.split(',')) {
    const k = s.trim()
    if (allowedSet.has(k) && !seen.has(k)) {
      seen.add(k)
      picked.push(k)
    }
  }
  return picked.length ? picked : [...allowed]
}

export function parseDailyColumns(
  raw: string | null | undefined,
  customColumns: readonly CustomColumn[] = [],
): string[] {
  const allowed: string[] = [...DAILY_COLUMNS_DEFAULT, ...customColumns.map((c) => c.key)]
  return parseColumnList(raw, allowed)
}

export function parseWeeklyColumns(raw: string | null | undefined): WeeklyColumnKey[] {
  return parseColumnList(raw, WEEKLY_COLUMNS_DEFAULT) as WeeklyColumnKey[]
}

export function resolveDailyColumn(
  key: string,
  customColumns: readonly CustomColumn[],
  widthOverrides: Record<string, number> = {},
): { label: string; width: number; isCustom: boolean } | null {
  if ((DAILY_COLUMNS_DEFAULT as readonly string[]).includes(key)) {
    const m = DAILY_COLUMN_META[key as DailyColumnKey]
    return { label: m.label, width: widthOverrides[key] ?? m.width, isCustom: false }
  }
  const c = customColumns.find((x) => x.key === key)
  if (c) return { label: c.label, width: widthOverrides[key] ?? c.width ?? CUSTOM_DEFAULT_WIDTH, isCustom: true }
  return null
}

export function resolveWeeklyColumn(
  key: WeeklyColumnKey,
  widthOverrides: Record<string, number> = {},
): { label: string; width: number } {
  const m = WEEKLY_COLUMN_META[key]
  return { label: m.label, width: widthOverrides[key] ?? m.width }
}

export function isBuiltinDailyKey(key: string): key is DailyColumnKey {
  return (DAILY_COLUMNS_DEFAULT as readonly string[]).includes(key)
}
