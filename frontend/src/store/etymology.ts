import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { COGNATE_SETS, LANGUAGE_FAMILIES, buildGraph } from '../mock/data'
import type { CognateSet, ImportPreview, ImportRecord, ImportRecordDetail, ImportRow } from '../types'
export { LANGUAGE_FAMILIES, COGNATE_SETS }

/** 对照表固定展示的语言列 */
const TABLE_LANGUAGES = ['英语', '法语', '德语', '西班牙语', '俄语', '拉丁语']
/** 词根允许：可选 * 开头，字母/附加符号/下标数字，以及 ' ( ) - */
const ROOT_RE = /^\*?[\p{L}\p{M}\u2080-\u2089][\p{L}\p{M}\u2080-\u2089'’()\-]*$/u
/** 词形允许：字母/附加符号/下标数字，以及 ' · - 和空白 */
const WORD_RE = /^[\p{L}\p{M}\u2080-\u2089][\p{L}\p{M}\u2080-\u2089'’·\-\s]*$/u

const HEADER_ALIASES: Record<string, string> = {
  root: 'root', '词根': 'root',
  meaning: 'meaning', '含义': 'meaning', '释义': 'meaning',
  period: 'period', '时期': 'period', '年代': 'period',
  family: 'family', '语系': 'family',
  '英语': '英语', english: '英语', en: '英语',
  '法语': '法语', french: '法语', fr: '法语',
  '德语': '德语', german: '德语', de: '德语',
  '西班牙语': '西班牙语', spanish: '西班牙语', es: '西班牙语',
  '俄语': '俄语', russian: '俄语', ru: '俄语',
  '拉丁语': '拉丁语', latin: '拉丁语', la: '拉丁语',
}

const RECORDS_STORAGE_KEY = 'etymology-import-records'

function now(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

/** 简单 CSV 解析：支持引号包裹、引号转义与换行 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      cur.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      cur.push(field); field = ''
      if (cur.some(f => f.trim() !== '')) rows.push(cur)
      cur = []
    } else field += c
  }
  if (field !== '' || cur.length) {
    cur.push(field)
    if (cur.some(f => f.trim() !== '')) rows.push(cur)
  }
  return rows
}

/** 语系取值：支持 id 或中文名，无法识别时回退印欧语系 */
function resolveFamily(input: string): { id: string; ok: boolean } {
  const v = input.trim()
  if (!v) return { id: 'ie', ok: true }
  const hit = LANGUAGE_FAMILIES.find(f => f.id === v.toLowerCase() || f.name === v)
  return hit ? { id: hit.id, ok: true } : { id: 'ie', ok: false }
}

export const useEtymologyStore = defineStore('etymology', () => {
  const cognateSets = ref<CognateSet[]>(COGNATE_SETS.map(cs => ({ ...cs, languages: { ...cs.languages } })))
  const graph = ref(buildGraph(cognateSets.value))
  const selectedNode = ref<any>(null)
  const searchQuery = ref('')
  const selectedFamily = ref('all')
  /** 选中行以词根为键，合并导入后仍能对应到正确行 */
  const selectedRoots = ref<string[]>([])
  const importRecords = ref<ImportRecord[]>(loadRecords())
  let recordSeq = importRecords.value.reduce((m, r) => Math.max(m, r.id), 0)

  const filteredCognates = computed(() =>
    cognateSets.value.filter(cs => {
      const q = searchQuery.value.toLowerCase()
      const matchSearch = !q || cs.root.toLowerCase().includes(q) || cs.meaning.includes(q) || Object.values(cs.languages).some((w: string) => w.toLowerCase().includes(q))
      const matchFamily = selectedFamily.value === 'all' || cs.family === selectedFamily.value
      return matchSearch && matchFamily
    })
  )

  function toggleRowSelection(root: string) {
    const i = selectedRoots.value.indexOf(root)
    if (i >= 0) selectedRoots.value.splice(i, 1)
    else selectedRoots.value.push(root)
  }

  function loadRecords(): ImportRecord[] {
    try {
      const raw = localStorage.getItem(RECORDS_STORAGE_KEY)
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  function pushRecord(rec: Omit<ImportRecord, 'id' | 'time'>) {
    importRecords.value.unshift({ ...rec, id: ++recordSeq, time: now() })
    if (importRecords.value.length > 50) importRecords.value.length = 50
    try {
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(importRecords.value))
    } catch { /* 存储不可用时仅保留会话内记录 */ }
  }

  /** 校验单行，返回状态与逐条说明 */
  function validateRow(data: CognateSet, index: number, seenInFile: Map<string, number>): Pick<ImportRow, 'status' | 'issues' | 'conflictWith' | 'include'> {
    const issues: string[] = []
    let invalid = false

    if (!data.root) {
      issues.push('缺少词根')
      invalid = true
    } else if (!ROOT_RE.test(data.root)) {
      issues.push(`词根 "${data.root}" 含非法字符`)
      invalid = true
    }
    for (const lang of TABLE_LANGUAGES) {
      const w = data.languages[lang]
      if (w && !WORD_RE.test(w)) {
        issues.push(`非法词形（${lang}）："${w}"`)
        invalid = true
      }
    }
    const fam = resolveFamily(data.family)
    if (!fam.ok) issues.push(`未知语系 "${data.family}"，已按印欧语系处理`)
    data.family = fam.id
    if (!data.meaning) issues.push('含义为空')

    if (invalid) return { status: 'invalid', issues, include: false }

    const key = data.root.toLowerCase()
    const existing = cognateSets.value.find(cs => cs.root.toLowerCase() === key)
    if (existing) {
      issues.unshift(`与现有词根 ${existing.root} 重复，默认跳过；勾选后合并（导入值覆盖非空项）`)
      return { status: 'conflict', issues, conflictWith: existing, include: false }
    }
    const firstAt = seenInFile.get(key)
    if (firstAt !== undefined) {
      issues.unshift(`文件内词根重复（首次出现于第 ${firstAt} 行），默认跳过`)
      return { status: 'conflict', issues, include: false }
    }
    seenInFile.set(key, index)
    return { status: 'new', issues, include: true }
  }

  function normalizeRow(raw: Record<string, string>): CognateSet {
    const languages: Record<string, string> = {}
    for (const lang of TABLE_LANGUAGES) languages[lang] = (raw[lang] ?? '').trim()
    return {
      root: (raw.root ?? '').trim(),
      meaning: (raw.meaning ?? '').trim(),
      period: (raw.period ?? '').trim() || 'PIE',
      family: (raw.family ?? '').trim() || 'ie',
      languages,
    }
  }

  /**
   * 解析外部词表（CSV 或 JSON），生成预览。
   * 解析失败抛错，由调用方记录 failed，不改动任何现有词条。
   */
  function parseImport(text: string, fileName: string): ImportPreview {
    const trimmed = text.trim()
    if (!trimmed) throw new Error('内容为空，未解析到任何词条')

    let raws: Record<string, string>[] = []
    const missingColumns: string[] = []
    const ignoredColumns: string[] = []

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      let parsed: unknown
      try {
        parsed = JSON.parse(trimmed)
      } catch (e) {
        throw new Error('JSON 解析失败：' + (e instanceof Error ? e.message : String(e)))
      }
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      if (!arr.length || arr.some(o => o === null || typeof o !== 'object' || Array.isArray(o))) {
        throw new Error('JSON 结构应为词条对象数组')
      }
      const presentLangs = new Set<string>()
      raws = arr.map(o => {
        const obj = o as Record<string, any>
        const raw: Record<string, string> = {
          root: String(obj.root ?? ''),
          meaning: String(obj.meaning ?? ''),
          period: String(obj.period ?? ''),
          family: String(obj.family ?? ''),
        }
        const langObj = (obj.languages && typeof obj.languages === 'object') ? obj.languages : {}
        for (const lang of TABLE_LANGUAGES) {
          const v = langObj[lang] ?? obj[lang]
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            raw[lang] = String(v)
            presentLangs.add(lang)
          }
        }
        for (const k of Object.keys(langObj)) {
          if (!TABLE_LANGUAGES.includes(k) && !ignoredColumns.includes(k)) ignoredColumns.push(k)
        }
        return raw
      })
      if (!raws.some(r => r.root)) throw new Error('JSON 中缺少 root 字段')
      if (!raws.some(r => r.meaning)) missingColumns.push('meaning')
      for (const lang of TABLE_LANGUAGES) if (!presentLangs.has(lang)) missingColumns.push(lang)
    } else {
      const table = parseCsv(trimmed)
      if (table.length < 2) throw new Error('CSV 至少需要表头和一行数据')
      const keys = table[0].map(h => {
        const alias = HEADER_ALIASES[h.trim().toLowerCase()]
        if (!alias && h.trim() && !ignoredColumns.includes(h.trim())) ignoredColumns.push(h.trim())
        return alias ?? ''
      })
      if (!keys.includes('root')) throw new Error('缺少必需的 root（词根）列')
      for (const col of ['meaning', ...TABLE_LANGUAGES]) {
        if (!keys.includes(col)) missingColumns.push(col)
      }
      raws = table.slice(1).map(cells => {
        const raw: Record<string, string> = {}
        cells.forEach((cell, i) => {
          const k = keys[i]
          if (k) raw[k] = cell.trim()
        })
        return raw
      })
      if (!raws.length) throw new Error('CSV 中没有数据行')
    }

    const seenInFile = new Map<string, number>()
    const rows: ImportRow[] = raws.map((raw, i) => {
      const data = normalizeRow(raw)
      return { index: i + 1, data, ...validateRow(data, i + 1, seenInFile) }
    })
    return { fileName, createdAt: now(), rows, missingColumns, ignoredColumns }
  }

  /**
   * 确认合并：先在新数组上完成全部修改再一次性替换，
   * 任何异常都不会留下改写到一半的词条。
   */
  function applyImport(preview: ImportPreview) {
    const next = cognateSets.value.map(cs => ({ ...cs, languages: { ...cs.languages } }))
    const byRoot = new Map(next.map(cs => [cs.root.toLowerCase(), cs]))
    const details: ImportRecordDetail[] = []
    let added = 0, merged = 0, skipped = 0, invalid = 0

    for (const row of preview.rows) {
      const label = row.data.root || `第 ${row.index} 行`
      if (row.status === 'invalid') {
        invalid++
        details.push({ root: label, action: 'invalid', note: row.issues.join('；') || '校验未通过' })
        continue
      }
      if (!row.include) {
        skipped++
        details.push({ root: label, action: 'skipped', note: row.status === 'conflict' ? '冲突，已跳过' : '未勾选，已跳过' })
        continue
      }
      const key = row.data.root.toLowerCase()
      const existing = byRoot.get(key)
      if (existing) {
        if (row.data.meaning) existing.meaning = row.data.meaning
        for (const lang of TABLE_LANGUAGES) {
          const w = row.data.languages[lang]
          if (w) existing.languages[lang] = w
        }
        merged++
        details.push({ root: label, action: 'merged', note: '与现有词条合并' })
      } else {
        const fresh: CognateSet = { ...row.data, languages: { ...row.data.languages } }
        next.push(fresh)
        byRoot.set(key, fresh)
        added++
        details.push({ root: label, action: 'added', note: '新增词条' })
      }
    }

    cognateSets.value = next
    graph.value = buildGraph(next)
    pushRecord({
      status: 'merged', fileName: preview.fileName,
      total: preview.rows.length, added, merged, skipped, invalid,
      missingColumns: [...preview.missingColumns], details,
    })
    return { added, merged, skipped, invalid }
  }

  /** 取消导入：仅记录，不触碰现有词条 */
  function cancelImport(preview: ImportPreview) {
    pushRecord({
      status: 'cancelled', fileName: preview.fileName,
      total: preview.rows.length, added: 0, merged: 0,
      skipped: preview.rows.length, invalid: 0,
      missingColumns: [...preview.missingColumns],
      message: '用户取消，未改动任何词条',
      details: preview.rows.map(r => ({
        root: r.data.root || `第 ${r.index} 行`,
        action: 'skipped' as const,
        note: '导入已取消',
      })),
    })
  }

  /** 解析失败：仅记录，不触碰现有词条 */
  function failImport(fileName: string, message: string) {
    pushRecord({
      status: 'failed', fileName,
      total: 0, added: 0, merged: 0, skipped: 0, invalid: 0,
      missingColumns: [], message, details: [],
    })
  }

  return {
    graph, selectedNode, searchQuery, selectedFamily, filteredCognates,
    cognateSets, selectedRoots, toggleRowSelection,
    importRecords, parseImport, applyImport, cancelImport, failImport,
  }
})
