import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { COGNATE_SETS, LANGUAGE_FAMILIES, buildGraph } from '../mock/data'
import type { CognateSet, ImportRecord, ImportRecordRow, ImportRow } from '../types'
export { LANGUAGE_FAMILIES, COGNATE_SETS }

export const useEtymologyStore = defineStore('etymology', () => {
  const cognates = ref<CognateSet[]>(COGNATE_SETS.map(cs => ({ ...cs, languages: { ...cs.languages } })))
  const graph = ref(buildGraph())
  const selectedNode = ref<any>(null)
  const selectedRoot = ref<string | null>(null)
  const searchQuery = ref('')
  const selectedFamily = ref('all')
  const importHistory = ref<ImportRecord[]>([])
  let importSeq = 0

  const filteredCognates = computed(() =>
    cognates.value.filter(cs => {
      const q = searchQuery.value.toLowerCase()
      const matchSearch = !q || cs.root.toLowerCase().includes(q) || cs.meaning.includes(q) || Object.values(cs.languages).some((w: string) => w.toLowerCase().includes(q))
      const matchFamily = selectedFamily.value === 'all' || cs.family === selectedFamily.value
      return matchSearch && matchFamily
    })
  )

  function pushRecord(partial: Omit<ImportRecord, 'id' | 'time'>) {
    importHistory.value.unshift({ ...partial, id: ++importSeq, time: new Date().toLocaleString('zh-CN') })
  }

  /** 确认后合并导入行：新增 / 覆盖 / 跳过 / 拒绝，并同步重建图谱 */
  function applyImport(rows: ImportRow[], fileName: string) {
    const list = cognates.value.map(cs => ({ ...cs, languages: { ...cs.languages } }))
    const recordRows: ImportRecordRow[] = []
    let added = 0, overwritten = 0, skipped = 0, rejected = 0
    for (const row of rows) {
      const root = row.data.root || '(空词根)'
      if (row.invalid) {
        rejected++
        recordRows.push({ root, action: 'rejected', note: row.issues.map(i => i.message).join('；') })
        continue
      }
      if (row.skipped || (row.conflict && !row.overwrite)) {
        skipped++
        recordRows.push({ root, action: 'skipped', note: row.conflict ? '重复词根，选择跳过' : '选择跳过' })
        continue
      }
      const idx = list.findIndex(cs => cs.root === row.data.root)
      if (idx >= 0) {
        list[idx] = { ...row.data, languages: { ...row.data.languages } }
        overwritten++
        recordRows.push({ root, action: 'overwritten', note: '覆盖已有词条' })
      } else {
        list.push({ ...row.data, languages: { ...row.data.languages } })
        added++
        recordRows.push({ root, action: 'added', note: '新增词条' })
      }
    }
    cognates.value = list
    graph.value = buildGraph(list)
    pushRecord({ fileName, status: 'success', total: rows.length, added, overwritten, skipped, rejected, rows: recordRows })
  }

  /** 取消导入：仅记录，不改写任何词条 */
  function recordImportCancelled(fileName: string, total: number) {
    pushRecord({ fileName, status: 'cancelled', total, added: 0, overwritten: 0, skipped: 0, rejected: 0, message: '用户取消，未改写任何词条', rows: [] })
  }

  /** 解析失败：仅记录，不改写任何词条 */
  function recordImportFailed(fileName: string, message: string) {
    pushRecord({ fileName, status: 'failed', total: 0, added: 0, overwritten: 0, skipped: 0, rejected: 0, message, rows: [] })
  }

  return {
    cognates, graph, selectedNode, selectedRoot, searchQuery, selectedFamily, filteredCognates,
    importHistory, applyImport, recordImportCancelled, recordImportFailed,
  }
})
