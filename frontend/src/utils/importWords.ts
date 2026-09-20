import type { CognateSet, ImportRow, ImportRowIssue } from '../types'

export const REQUIRED_COLUMNS = ['词根', '含义'] as const
export const LANGUAGE_COLUMNS = ['英语', '法语', '德语', '西班牙语', '俄语', '拉丁语'] as const
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...LANGUAGE_COLUMNS] as string[]

/** 表头别名：兼容中文列名与常见英文列名 */
const HEADER_ALIASES: Record<string, string> = {
  '词根': '词根', 'root': '词根',
  '含义': '含义', 'meaning': '含义', '释义': '含义',
  '英语': '英语', 'english': '英语', 'en': '英语',
  '法语': '法语', 'french': '法语', 'fr': '法语',
  '德语': '德语', 'german': '德语', 'de': '德语',
  '西班牙语': '西班牙语', 'spanish': '西班牙语', 'es': '西班牙语',
  '俄语': '俄语', 'russian': '俄语', 'ru': '俄语',
  '拉丁语': '拉丁语', 'latin': '拉丁语', 'la': '拉丁语',
}

export class ImportParseError extends Error {}

export interface ParsedWordFile {
  /** 按规范列序投影后的数据行：[词根, 含义, 英语, 法语, 德语, 西班牙语, 俄语, 拉丁语] */
  rows: string[][]
  /** 数据起始行号（表头为第 1 行），用于预览中标注来源行 */
  startLine: number
  /** 缺失的可选语言列，对应单元格将以 — 占位 */
  missingOptional: string[]
}

/** 解析上传的词表文件（CSV / TSV / JSON），解析失败抛出 ImportParseError */
export function parseWordFile(text: string, fileName: string): ParsedWordFile {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) throw new ImportParseError('文件内容为空')
  const table = (fileName.endsWith('.json') || trimmed.startsWith('['))
    ? tableFromJson(trimmed)
    : parseDelimited(trimmed)
  if (table.length === 0) throw new ImportParseError('文件中没有可解析的内容')

  const columnIndex: Record<string, number> = {}
  table[0].forEach((h, i) => {
    const key = HEADER_ALIASES[h.trim()] ?? HEADER_ALIASES[h.trim().toLowerCase()]
    if (key && columnIndex[key] === undefined) columnIndex[key] = i
  })
  const missingRequired = REQUIRED_COLUMNS.filter(c => columnIndex[c] === undefined)
  if (missingRequired.length > 0) {
    throw new ImportParseError(`缺少必需列：${missingRequired.join('、')}（需要列：词根、含义；可选列：${LANGUAGE_COLUMNS.join('、')}）`)
  }
  const missingOptional = LANGUAGE_COLUMNS.filter(c => columnIndex[c] === undefined)

  const rows = table.slice(1)
    .filter(r => r.some(cell => (cell ?? '').trim() !== ''))
    .map(r => ALL_COLUMNS.map(col => {
      const idx = columnIndex[col]
      return idx === undefined ? '' : (r[idx] ?? '').trim()
    }))
  if (rows.length === 0) throw new ImportParseError('文件中没有数据行')
  return { rows, startLine: 2, missingOptional }
}

/** 逐行校验：标记重复词根、缺失必填项与非法词形 */
export function analyzeRows(parsed: ParsedWordFile, existingRoots: string[]): ImportRow[] {
  const existing = new Set(existingRoots)
  const seenInFile = new Map<string, number>()
  return parsed.rows.map((cells, i) => {
    const [root, meaning, ...langs] = cells
    const languages: Record<string, string> = {}
    LANGUAGE_COLUMNS.forEach((col, li) => { if (langs[li]) languages[col] = langs[li] })
    const data: CognateSet = { root, meaning, languages, period: 'PIE', family: 'ie' }
    const issues: ImportRowIssue[] = []
    let conflict = false
    let invalid = false

    if (!root) { invalid = true; issues.push({ type: 'missing', message: '缺少词根（必填）' }) }
    if (!meaning) { invalid = true; issues.push({ type: 'missing', message: '缺少含义（必填）' }) }
    if (root) {
      if (existing.has(root)) {
        conflict = true
        issues.push({ type: 'duplicate', message: `与现有词根 ${root} 重复` })
      } else if (seenInFile.has(root)) {
        conflict = true
        issues.push({ type: 'duplicate', message: `文件内重复：第 ${seenInFile.get(root)} 行已出现该词根` })
      } else {
        seenInFile.set(root, i + parsed.startLine)
      }
    }
    Object.entries(languages).forEach(([lang, word]) => {
      if (!isValidWordForm(word)) {
        invalid = true
        issues.push({ type: 'invalid', message: `非法词形：${lang}「${word}」含数字或非法符号` })
      }
    })
    // skipped 仅用于普通行的「跳过」勾选；冲突行的去留由 overwrite 决定，非法行强制拒绝
    return { index: i + parsed.startLine, data, issues, conflict, invalid, skipped: false, overwrite: false }
  })
}

/** 词形不允许出现数字与括号/运算符等符号（允许各文字字母、变音符、连字符、撇号、空格与重构标记 *） */
const ILLEGAL_WORD_RE = /[0-9<>@#$%^&=[\]{}\\|~`_+]/
function isValidWordForm(word: string): boolean {
  return !ILLEGAL_WORD_RE.test(word)
}

/** 解析 CSV / TSV，支持引号包裹与转义引号 */
function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0]
  const delim = firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else field += ch
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

/** JSON 词表：对象数组，键名支持中文或英文别名 */
function tableFromJson(text: string): string[][] {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new ImportParseError('JSON 解析失败，请检查文件格式') }
  if (!Array.isArray(data)) throw new ImportParseError('JSON 词表须为对象数组')
  const rows = data.map(item => {
    const normalized: Record<string, string> = {}
    if (typeof item === 'object' && item !== null) {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        const key = HEADER_ALIASES[k.trim()] ?? HEADER_ALIASES[k.trim().toLowerCase()]
        if (key) normalized[key] = String(v ?? '')
      }
    }
    return ALL_COLUMNS.map(col => normalized[col] ?? '')
  })
  return [ALL_COLUMNS, ...rows]
}
