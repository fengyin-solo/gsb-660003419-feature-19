<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4">
      <h1 class="text-2xl font-bold text-cyan-400">语言词源图谱与多语系演化追踪</h1>
      <p class="text-sm text-slate-500 mt-1">D3.js力导向图 · 印欧语系演化 · 同源词对照 · 500+词根</p>
    </header>
    <div class="p-4 space-y-4">
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-400">词源力导向网络</h3>
            <div class="flex gap-3 text-xs">
              <span v-for="f in LANGUAGE_FAMILIES" :key="f.id" class="flex items-center gap-1">
                <span class="w-3 h-3 rounded-full" :style="{backgroundColor: f.color}"></span>{{ f.name }}
              </span>
            </div>
          </div>
          <svg ref="svgRef" class="w-full bg-slate-900 rounded" style="height:460px"></svg>
        </div>
        <div class="space-y-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-3">语系概览</h3>
            <div class="space-y-2">
              <div v-for="f in LANGUAGE_FAMILIES" :key="f.id" class="flex items-start gap-2 text-sm">
                <span class="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" :style="{backgroundColor: f.color}"></span>
                <div><div class="font-bold">{{ f.name }}</div><div class="text-xs text-slate-500">{{ f.era }} · {{ f.languages.join('/') }}</div></div>
              </div>
            </div>
          </div>
          <div v-if="store.selectedNode" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 class="text-sm font-bold text-slate-400 mb-2">选中节点</h3>
            <div class="text-lg font-bold text-cyan-400">{{ store.selectedNode.word }}</div>
            <div class="text-sm text-slate-400">{{ store.selectedNode.language }} — {{ store.selectedNode.meaning }}</div>
          </div>
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-xs text-slate-400">
            <h3 class="text-sm font-bold text-slate-400 mb-2">Grimm定律</h3>
            <div class="space-y-1">
              <div class="bg-slate-900 rounded p-2"><span class="text-cyan-400">p→f: </span>pater → father</div>
              <div class="bg-slate-900 rounded p-2"><span class="text-green-400">t→θ: </span>tres → three</div>
              <div class="bg-slate-900 rounded p-2"><span class="text-orange-400">k→h: </span>cord → heart</div>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="text-sm font-bold text-slate-400">
            同源词对照表
            <span class="ml-2 text-xs font-normal text-slate-500">
              共 {{ store.filteredCognates.length }} 条结果<template v-if="store.filteredCognates.length !== store.cognates.length">（总 {{ store.cognates.length }} 条）</template>
            </span>
            <span v-if="store.selectedRoot" class="ml-2 text-xs font-normal text-cyan-400">选中：{{ store.selectedRoot }}</span>
          </h3>
          <div class="flex gap-2 text-xs">
            <button class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" @click="downloadTemplate">下载模板</button>
            <button class="px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white" @click="triggerFilePick">导入词表</button>
            <button class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" @click="showHistory = true">
              导入记录<template v-if="store.importHistory.length">（{{ store.importHistory.length }}）</template>
            </button>
          </div>
        </div>
        <input ref="fileInput" type="file" accept=".csv,.tsv,.txt,.json" class="hidden" @change="onFileChange" />
        <div v-if="importError" class="mb-3 text-xs bg-red-900/40 border border-red-700 text-red-300 rounded px-3 py-2 flex items-center justify-between">
          <span>导入失败：{{ importError }}（已有词条未受影响）</span>
          <button class="text-red-400 hover:text-red-200 ml-3" @click="importError = ''">✕</button>
        </div>
        <div class="flex gap-2 mb-3">
          <input v-model="store.searchQuery" placeholder="搜索词根/含义..." class="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500" />
          <select v-model="store.selectedFamily" class="bg-slate-900 border border-slate-600 rounded px-2 text-sm text-slate-300">
            <option value="all">全部语系</option>
            <option v-for="f in LANGUAGE_FAMILIES" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>
        <div class="overflow-x-auto max-h-64 overflow-y-auto">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-slate-700">
              <tr>
                <th class="px-2 py-2 text-left text-slate-300">词根</th>
                <th class="px-2 py-2 text-left text-slate-300">含义</th>
                <th class="px-2 py-2 text-left text-cyan-400">英语</th>
                <th class="px-2 py-2 text-left text-blue-400">法语</th>
                <th class="px-2 py-2 text-left text-green-400">德语</th>
                <th class="px-2 py-2 text-left text-orange-400">西班牙语</th>
                <th class="px-2 py-2 text-left text-purple-400">俄语</th>
                <th class="px-2 py-2 text-left text-yellow-400">拉丁语</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cs in store.filteredCognates" :key="cs.root"
                  class="border-t border-slate-700 hover:bg-slate-700 cursor-pointer"
                  :class="{ 'bg-cyan-900/30': store.selectedRoot === cs.root }"
                  @click="store.selectedRoot = store.selectedRoot === cs.root ? null : cs.root">
                <td class="px-2 py-1.5 font-mono text-slate-200 font-bold">{{ cs.root }}</td>
                <td class="px-2 py-1.5 text-slate-400">{{ cs.meaning }}</td>
                <td class="px-2 py-1.5 font-mono text-cyan-300">{{ cs.languages['英语'] || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-blue-300">{{ cs.languages['法语'] || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-green-300">{{ cs.languages['德语'] || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-orange-300">{{ cs.languages['西班牙语'] || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-purple-300">{{ cs.languages['俄语'] || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-yellow-300">{{ cs.languages['拉丁语'] || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 导入预览：逐条确认后再合并 -->
    <div v-if="showPreview" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="cancelImport">
      <div class="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div class="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 class="font-bold text-cyan-400 text-sm">导入预览 — {{ importFileName }}</h3>
          <button class="text-slate-400 hover:text-slate-200" @click="cancelImport">✕</button>
        </div>
        <div class="px-4 py-2 text-xs space-y-1 border-b border-slate-700">
          <div class="flex gap-4 flex-wrap">
            <span class="text-slate-400">共 {{ importRows.length }} 行</span>
            <span class="text-green-400">新增 {{ stats.fresh }}</span>
            <span class="text-yellow-400">重复词根 {{ stats.conflict }}</span>
            <span class="text-red-400">非法/缺项 {{ stats.invalid }}</span>
            <span class="text-cyan-300">确认后导入 {{ stats.toImport }} 条</span>
          </div>
          <div v-if="missingOptional.length" class="text-yellow-400">缺失列：{{ missingOptional.join('、') }}（对应单元格将以 — 占位）</div>
          <div class="text-slate-500">重复词根默认跳过，可逐条改为「覆盖现有词条」；非法词形与缺必填项的行不可导入。取消不会改写任何现有词条。</div>
        </div>
        <div class="overflow-auto flex-1">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-slate-700">
              <tr>
                <th class="px-2 py-2 text-left text-slate-300">行</th>
                <th class="px-2 py-2 text-left text-slate-300">词根</th>
                <th class="px-2 py-2 text-left text-slate-300">含义</th>
                <th class="px-2 py-2 text-left text-slate-300">词形</th>
                <th class="px-2 py-2 text-left text-slate-300">校验结果</th>
                <th class="px-2 py-2 text-left text-slate-300">处理</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in importRows" :key="row.index" class="border-t border-slate-700"
                  :class="row.invalid ? 'bg-red-900/20' : row.conflict ? 'bg-yellow-900/10' : ''">
                <td class="px-2 py-1.5 text-slate-500">{{ row.index }}</td>
                <td class="px-2 py-1.5 font-mono font-bold text-slate-200">{{ row.data.root || '—' }}</td>
                <td class="px-2 py-1.5 text-slate-400">{{ row.data.meaning || '—' }}</td>
                <td class="px-2 py-1.5 font-mono text-slate-400 max-w-48 truncate" :title="wordSummary(row)">{{ wordSummary(row) }}</td>
                <td class="px-2 py-1.5">
                  <span v-if="!row.issues.length" class="text-green-400">校验通过</span>
                  <span v-for="(iss, i) in row.issues" :key="i" class="block" :class="issueClass(iss.type)">{{ iss.message }}</span>
                </td>
                <td class="px-2 py-1.5">
                  <span v-if="row.invalid" class="text-red-400">不可导入</span>
                  <select v-else-if="row.conflict" v-model="row.overwrite" class="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-300">
                    <option :value="false">跳过</option>
                    <option :value="true">覆盖现有词条</option>
                  </select>
                  <label v-else class="flex items-center gap-1 text-slate-300">
                    <input type="checkbox" v-model="row.skipped" /> 跳过
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t border-slate-700 flex justify-end gap-2 text-xs">
          <button class="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" @click="cancelImport">取消</button>
          <button class="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="stats.toImport === 0" @click="confirmImport">确认导入（{{ stats.toImport }} 条）</button>
        </div>
      </div>
    </div>

    <!-- 导入记录回看 -->
    <div v-if="showHistory" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showHistory = false">
      <div class="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div class="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 class="font-bold text-cyan-400 text-sm">导入记录</h3>
          <button class="text-slate-400 hover:text-slate-200" @click="showHistory = false">✕</button>
        </div>
        <div class="overflow-auto flex-1">
          <div v-if="!store.importHistory.length" class="p-6 text-center text-sm text-slate-500">暂无导入记录</div>
          <div v-for="rec in store.importHistory" :key="rec.id" class="border-b border-slate-700 px-4 py-3 text-xs">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-1.5 py-0.5 rounded" :class="statusBadge(rec.status)">{{ statusText(rec.status) }}</span>
              <span class="font-bold text-slate-200">{{ rec.fileName }}</span>
              <span class="text-slate-500">{{ rec.time }}</span>
            </div>
            <div v-if="rec.status === 'success'" class="text-slate-400 mt-1">
              共 {{ rec.total }} 行：新增 {{ rec.added }} · 覆盖 {{ rec.overwritten }} · 跳过 {{ rec.skipped }} · 拒绝 {{ rec.rejected }}
            </div>
            <div v-else class="text-slate-400 mt-1">{{ rec.message }}<template v-if="rec.total">（已解析 {{ rec.total }} 行）</template></div>
            <details v-if="rec.rows.length" class="mt-1">
              <summary class="cursor-pointer text-slate-500 hover:text-slate-300">逐条明细（{{ rec.rows.length }}）</summary>
              <table class="w-full mt-1">
                <tbody>
                  <tr v-for="(r, i) in rec.rows" :key="i" class="border-t border-slate-700/50">
                    <td class="py-1 pr-2 font-mono text-slate-300">{{ r.root }}</td>
                    <td class="py-1 pr-2"><span class="px-1 rounded" :class="actionBadge(r.action)">{{ actionText(r.action) }}</span></td>
                    <td class="py-1 text-slate-500">{{ r.note }}</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import { useEtymologyStore, LANGUAGE_FAMILIES } from './store/etymology'
import { parseWordFile, analyzeRows, LANGUAGE_COLUMNS } from './utils/importWords'
import type { ImportRow, ImportRowIssue, ImportRecordStatus, ImportRowAction } from './types'

const store = useEtymologyStore()
const svgRef = ref<SVGSVGElement | null>(null)
const COLORS: Record<string, string> = { ie: '#3b82f6', st: '#22c55e', aa: '#f59e0b', ural: '#8b5cf6' }

const fileInput = ref<HTMLInputElement | null>(null)
const showPreview = ref(false)
const showHistory = ref(false)
const importRows = ref<ImportRow[]>([])
const importFileName = ref('')
const importError = ref('')
const missingOptional = ref<string[]>([])

const isSkipped = (r: ImportRow) => r.skipped || (r.conflict && !r.overwrite)
const stats = computed(() => ({
  fresh: importRows.value.filter(r => !r.conflict && !r.invalid).length,
  conflict: importRows.value.filter(r => r.conflict).length,
  invalid: importRows.value.filter(r => r.invalid).length,
  toImport: importRows.value.filter(r => !r.invalid && !isSkipped(r)).length,
}))

function triggerFilePick() { fileInput.value?.click() }

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = ''
  try {
    const text = await file.text()
    const parsed = parseWordFile(text, file.name)
    missingOptional.value = parsed.missingOptional
    importRows.value = analyzeRows(parsed, store.cognates.map(cs => cs.root))
    importFileName.value = file.name
    showPreview.value = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : '无法读取文件'
    importError.value = msg
    store.recordImportFailed(file.name, msg)
  }
}

function cancelImport() {
  store.recordImportCancelled(importFileName.value, importRows.value.length)
  showPreview.value = false
  importRows.value = []
}

function confirmImport() {
  store.applyImport(importRows.value, importFileName.value)
  showPreview.value = false
  importRows.value = []
}

function downloadTemplate() {
  const header = ['词根', '含义', ...LANGUAGE_COLUMNS].join(',')
  const sample = ['*ḱer-', '角', 'horn', 'corne', 'Horn', 'cuerno', 'рог', 'cornū'].join(',')
  const blob = new Blob(['\uFEFF' + header + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '同源词表模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function wordSummary(row: ImportRow): string {
  const parts = Object.entries(row.data.languages).map(([lang, w]) => `${lang}:${w}`)
  return parts.length ? parts.join(' · ') : '—'
}

function issueClass(type: ImportRowIssue['type']): string {
  return type === 'duplicate' ? 'text-yellow-400' : type === 'invalid' ? 'text-red-400' : 'text-orange-400'
}

function statusText(s: ImportRecordStatus): string {
  return s === 'success' ? '成功' : s === 'cancelled' ? '已取消' : '失败'
}
function statusBadge(s: ImportRecordStatus): string {
  return s === 'success' ? 'bg-green-900/60 text-green-300' : s === 'cancelled' ? 'bg-slate-700 text-slate-300' : 'bg-red-900/60 text-red-300'
}
function actionText(a: ImportRowAction): string {
  return { added: '新增', overwritten: '覆盖', skipped: '跳过', rejected: '拒绝' }[a]
}
function actionBadge(a: ImportRowAction): string {
  return {
    added: 'bg-green-900/60 text-green-300',
    overwritten: 'bg-cyan-900/60 text-cyan-300',
    skipped: 'bg-slate-700 text-slate-300',
    rejected: 'bg-red-900/60 text-red-300',
  }[a]
}

function drawGraph() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  const W = svgRef.value.getBoundingClientRect().width || 700, H = 460
  const nodes = store.graph.nodes.map((n: any) => ({ ...n }))
  const links = store.graph.links.map((l: any) => ({ ...l }))
  const sim = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(55))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(22))
  const g = svg.append('g')
  svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on('zoom', (e) => g.attr('transform', e.transform)) as any)
  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', '#475569').attr('stroke-width', 1).attr('opacity', 0.5)
  const node = g.append('g').selectAll('g').data(nodes).join('g')
    .call(d3.drag<any, any>()
      .on('start', (e, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag', (e, d: any) => { d.fx = e.x; d.fy = e.y })
      .on('end', (e, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))
    .on('click', (_: any, d: any) => { store.selectedNode = d })
  node.append('circle')
    .attr('r', (d: any) => d.language === 'Proto-IE' ? 12 : 7)
    .attr('fill', (d: any) => COLORS[d.family] || '#64748b')
    .attr('stroke', '#1e293b').attr('stroke-width', 1.5)
  node.append('text').attr('dy', -14).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#e2e8f0')
    .text((d: any) => d.word.length > 8 ? d.word.slice(0, 8) + '…' : d.word)
  node.append('title').text((d: any) => `${d.word} (${d.language}): ${d.meaning}`)
  sim.on('tick', () => {
    link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })
}

onMounted(() => { setTimeout(drawGraph, 100) })
watch(() => store.graph, () => { setTimeout(drawGraph, 50) })
</script>
