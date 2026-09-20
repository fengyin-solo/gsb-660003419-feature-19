export interface WordNode {
  id: string; word: string; language: string; meaning: string
  family: string; era?: string; x?: number; y?: number
}
export interface WordLink {
  source: string; target: string
  type: 'cognate' | 'derived' | 'borrowed' | 'reconstructed'
  description?: string
}
export interface CognateSet {
  root: string; meaning: string
  languages: Record<string, string>
  period: string; family: string
}
export interface LanguageFamily {
  id: string; name: string; color: string; languages: string[]; era: string
}

/** 导入行上的问题项：重复词根 / 非法词形 / 缺失必填 */
export interface ImportRowIssue {
  type: 'duplicate' | 'invalid' | 'missing'
  message: string
}

/** 预览阶段的一行导入数据 */
export interface ImportRow {
  index: number            // 源文件中的行号（含表头偏移）
  data: CognateSet
  issues: ImportRowIssue[]
  conflict: boolean        // 与现有词根或文件内词根重复
  invalid: boolean         // 非法词形或缺必填项，禁止导入
  skipped: boolean         // 用户选择跳过
  overwrite: boolean       // 冲突行：用户选择覆盖现有词条
}

export type ImportRecordStatus = 'success' | 'cancelled' | 'failed'
export type ImportRowAction = 'added' | 'overwritten' | 'skipped' | 'rejected'

export interface ImportRecordRow {
  root: string
  action: ImportRowAction
  note: string
}

/** 一次导入的历史记录，可回看 */
export interface ImportRecord {
  id: number
  time: string
  fileName: string
  status: ImportRecordStatus
  total: number
  added: number
  overwritten: number
  skipped: number
  rejected: number
  message?: string
  rows: ImportRecordRow[]
}
