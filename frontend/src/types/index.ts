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

/** 导入预览中的单行：解析 + 校验后的结果 */
export interface ImportRow {
  index: number                 // 数据行号（从 1 开始，不含表头）
  data: CognateSet
  status: 'new' | 'conflict' | 'invalid'
  issues: string[]              // 逐条说明：缺失、非法词形、重复原因等
  conflictWith?: CognateSet     // 与之冲突的现有词条
  include: boolean              // 用户是否选择导入该行
}

/** 一次待确认的导入预览 */
export interface ImportPreview {
  fileName: string
  createdAt: string
  rows: ImportRow[]
  missingColumns: string[]      // 文件中缺失的期望列
  ignoredColumns: string[]      // 无法识别而被忽略的列
}

export interface ImportRecordDetail {
  root: string
  action: 'added' | 'merged' | 'skipped' | 'invalid'
  note: string
}

/** 一条导入记录，可回看 */
export interface ImportRecord {
  id: number
  time: string
  fileName: string
  status: 'merged' | 'cancelled' | 'failed'
  total: number
  added: number
  merged: number
  skipped: number
  invalid: number
  missingColumns: string[]
  message?: string
  details: ImportRecordDetail[]
}
