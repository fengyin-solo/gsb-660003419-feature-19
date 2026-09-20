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
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 class="text-sm font-bold text-slate-400">
            同源词对照表
            <span class="ml-2 text-xs font-normal text-slate-500">
              共 {{ store.cognateSets.length }} 条 · 筛选 {{ store.filteredCognates.length }} 条
              <template v-if="store.selectedRoots.length"> · 已选 {{ store.selectedRoots.length }} 行</template>
            </span>
          </h3>
          <div class="flex items-center gap-2">
            <span v-if="importToast" class="text-xs text-green-400">{{ importToast }}</span>
            <button @click="openImportModal" class="text-xs px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">导入词表</button>
            <button @click="showHistory = true" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors">
              导入记录<template v-if="store.importRecords.length"> ({{ store.importRecords.length }})</template>
            </button>
          </div>
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
                  @click="store.toggleRowSelection(cs.root)"
                  class="border-t border-slate-700 hover:bg-slate-700 cursor-pointer transition-colors"
                  :class="{ 'bg-cyan-900/40 hover:bg-cyan-900/50': store.selectedRoots.includes(cs.root) }">
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

    <!-- 导入词表弹窗 -->
    <div v-if="showImport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="closeImport">
      <div class="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 class="font-bold text-cyan-400 text-sm">导入外部词表</h3>
          <button @click="closeImport" class="text-slate-400 hover:text-slate-200 px-2">✕</button>
        </div>

        <!-- 上传 / 粘贴阶段 -->
        <div v-if="!preview" class="p-4 space-y-3 overflow-y-auto">
          <div class="text-xs text-slate-400 space-y-1 bg-slate-900 rounded p-3">
            <p>支持 CSV / JSON 文件，或直接粘贴内容。CSV 表头：<span class="font-mono text-slate-300">root,meaning,英语,法语,德语,西班牙语,俄语,拉丁语</span>（可选 period,family）。</p>
            <p>JSON 示例：<span class="font-mono text-slate-300">[{ "root": "*sol-", "meaning": "太阳", "languages": { "英语": "sun" } }]</span></p>
            <p>取消或解析失败不会改动任何现有词条。</p>
          </div>
          <input ref="fileInputRef" type="file" accept=".csv,.json,text/csv,application/json" @change="onFileChange"
                 class="text-xs text-slate-400 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 file:cursor-pointer" />
          <textarea v-model="importText" rows="8" placeholder="选择文件后内容会载入此处，也可直接粘贴 CSV / JSON..."
                    class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono focus:outline-none focus:border-cyan-500"></textarea>
          <div v-if="importError" class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
            解析失败：{{ importError }}（未改动任何现有词条）
          </div>
        </div>

        <!-- 预览阶段 -->
        <div v-else class="p-4 space-y-3 overflow-y-auto">
          <div class="flex items-center gap-3 text-xs flex-wrap">
            <span class="text-slate-400">{{ preview.fileName }} · 共 {{ preview.rows.length }} 行</span>
            <span class="px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-800">新增 {{ previewSummary.new }}</span>
            <span class="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">重复词根 {{ previewSummary.conflict }}</span>
            <span class="px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800">非法 {{ previewSummary.invalid }}</span>
            <span class="px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-800">将导入 {{ previewSummary.included }}</span>
          </div>
          <div v-if="preview.missingColumns.length" class="text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded p-2">
            缺失列：{{ preview.missingColumns.join('、') }} —— 对应单元格将以 “—” 占位
          </div>
          <div v-if="preview.ignoredColumns.length" class="text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded p-2">
            已忽略无法识别的列：{{ preview.ignoredColumns.join('、') }}
          </div>
          <div class="space-y-2">
            <div v-for="row in preview.rows" :key="row.index" class="border rounded p-2 text-xs"
                 :class="row.status === 'invalid' ? 'border-red-800 bg-red-900/10' : row.status === 'conflict' ? 'border-amber-800 bg-amber-900/10' : 'border-slate-700 bg-slate-900/50'">
              <div class="flex items-start gap-2">
                <input type="checkbox" v-model="row.include" :disabled="row.status === 'invalid'" class="mt-0.5 accent-cyan-500"
                       :title="row.status === 'invalid' ? '非法行不可导入' : row.status === 'conflict' ? '勾选后与现有词条合并' : '勾选后导入'" />
                <div class="flex-1 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-slate-500">#{{ row.index }}</span>
                    <span class="font-mono font-bold text-slate-200">{{ row.data.root || '(无词根)' }}</span>
                    <span class="text-slate-400">{{ row.data.meaning || '—' }}</span>
                    <span v-if="row.status === 'new'" class="px-1.5 rounded bg-green-900/50 text-green-300">新增</span>
                    <span v-else-if="row.status === 'conflict'" class="px-1.5 rounded bg-amber-900/50 text-amber-300">重复词根</span>
                    <span v-else class="px-1.5 rounded bg-red-900/50 text-red-300">非法</span>
                  </div>
                  <div class="text-slate-500 font-mono">{{ languageLine(row.data) }}</div>
                  <ul v-if="row.issues.length" class="space-y-0.5">
                    <li v-for="(issue, i) in row.issues" :key="i"
                        :class="row.status === 'invalid' ? 'text-red-400' : 'text-amber-300'">· {{ issue }}</li>
                  </ul>
                  <div v-if="row.conflictWith" class="text-slate-500 border-l-2 border-slate-600 pl-2">
                    现有词条：{{ row.conflictWith.root }}（{{ row.conflictWith.meaning }}）
                    <span class="font-mono">{{ languageLine(row.conflictWith) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <template v-if="!preview">
            <button @click="closeImport" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">取消</button>
            <button @click="runParse" :disabled="!importText.trim()"
                    class="text-xs px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed">解析预览</button>
          </template>
          <template v-else>
            <button @click="preview = null" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">返回</button>
            <button @click="closeImport" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">取消导入</button>
            <button @click="confirmImport" :disabled="!previewSummary.included"
                    class="text-xs px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed">
              确认合并 ({{ previewSummary.included }})
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 导入记录弹窗 -->
    <div v-if="showHistory" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="showHistory = false">
      <div class="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 class="font-bold text-cyan-400 text-sm">导入记录</h3>
          <button @click="showHistory = false" class="text-slate-400 hover:text-slate-200 px-2">✕</button>
        </div>
        <div class="p-4 space-y-2 overflow-y-auto">
          <div v-if="!store.importRecords.length" class="text-sm text-slate-500 text-center py-8">暂无导入记录</div>
          <div v-for="rec in store.importRecords" :key="rec.id" class="border border-slate-700 rounded text-xs">
            <button @click="expandedRecord = expandedRecord === rec.id ? null : rec.id"
                    class="w-full flex items-center gap-2 flex-wrap px-3 py-2 text-left hover:bg-slate-700/50 rounded">
              <span class="px-1.5 rounded"
                    :class="rec.status === 'merged' ? 'bg-green-900/50 text-green-300' : rec.status === 'cancelled' ? 'bg-slate-600/50 text-slate-300' : 'bg-red-900/50 text-red-300'">
                {{ rec.status === 'merged' ? '已合并' : rec.status === 'cancelled' ? '已取消' : '失败' }}
              </span>
              <span class="text-slate-500">{{ rec.time }}</span>
              <span class="text-slate-300 font-mono">{{ rec.fileName }}</span>
              <span class="text-slate-500 ml-auto">
                <template v-if="rec.status === 'merged'">共 {{ rec.total }} · 新增 {{ rec.added }} · 合并 {{ rec.merged }} · 跳过 {{ rec.skipped }} · 非法 {{ rec.invalid }}</template>
                <template v-else-if="rec.status === 'cancelled'">共 {{ rec.total }} 行，未改动</template>
                <template v-else>解析失败</template>
              </span>
            </button>
            <div v-if="expandedRecord === rec.id" class="px-3 pb-3 space-y-2 border-t border-slate-700 pt-2">
              <div v-if="rec.message" class="text-slate-400">{{ rec.message }}</div>
              <div v-if="rec.missingColumns.length" class="text-amber-300">缺失列：{{ rec.missingColumns.join('、') }}</div>
              <div v-if="rec.details.length" class="space-y-0.5 max-h-48 overflow-y-auto">
                <div v-for="(d, i) in rec.details" :key="i" class="flex items-baseline gap-2">
                  <span class="px-1 rounded flex-shrink-0"
                        :class="{ 'bg-green-900/50 text-green-300': d.action === 'added', 'bg-cyan-900/50 text-cyan-300': d.action === 'merged', 'bg-slate-600/50 text-slate-300': d.action === 'skipped', 'bg-red-900/50 text-red-300': d.action === 'invalid' }">
                    {{ { added: '新增', merged: '合并', skipped: '跳过', invalid: '非法' }[d.action] }}
                  </span>
                  <span class="font-mono text-slate-300">{{ d.root }}</span>
                  <span class="text-slate-500">{{ d.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end px-4 py-3 border-t border-slate-700">
          <button @click="showHistory = false" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import * as d3 from 'd3'
import { useEtymologyStore, LANGUAGE_FAMILIES } from './store/etymology'
import type { CognateSet, ImportPreview } from './types'

const store = useEtymologyStore()
const svgRef = ref<SVGSVGElement | null>(null)
const COLORS: Record<string, string> = { ie: '#3b82f6', st: '#22c55e', aa: '#f59e0b', ural: '#8b5cf6' }

// ---- 导入状态 ----
const showImport = ref(false)
const showHistory = ref(false)
const importText = ref('')
const importFileName = ref('')
const importError = ref('')
const importToast = ref('')
const preview = ref<ImportPreview | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const expandedRecord = ref<number | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const previewSummary = computed(() => {
  const rows = preview.value?.rows ?? []
  return {
    new: rows.filter(r => r.status === 'new').length,
    conflict: rows.filter(r => r.status === 'conflict').length,
    invalid: rows.filter(r => r.status === 'invalid').length,
    included: rows.filter(r => r.include).length,
  }
})

function languageLine(cs: CognateSet): string {
  return ['英语', '法语', '德语', '西班牙语', '俄语', '拉丁语']
    .map(l => `${l} ${cs.languages[l] || '—'}`).join(' · ')
}

function openImportModal() {
  resetImportState()
  showImport.value = true
}

function resetImportState() {
  preview.value = null
  importText.value = ''
  importFileName.value = ''
  importError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFileName.value = file.name
  importError.value = ''
  const reader = new FileReader()
  reader.onload = () => { importText.value = String(reader.result || '') }
  reader.onerror = () => {
    importError.value = '文件读取失败'
    store.failImport(file.name, '文件读取失败')
  }
  reader.readAsText(file)
}

function runParse() {
  importError.value = ''
  const name = importFileName.value || '手动输入'
  try {
    preview.value = store.parseImport(importText.value, name)
  } catch (err) {
    importError.value = err instanceof Error ? err.message : String(err)
    store.failImport(name, importError.value)
  }
}

/** 取消：存在预览时记录一条 cancelled，绝不改动现有词条 */
function closeImport() {
  if (preview.value) store.cancelImport(preview.value)
  showImport.value = false
  resetImportState()
}

function confirmImport() {
  if (!preview.value) return
  const r = store.applyImport(preview.value)
  showImport.value = false
  resetImportState()
  clearTimeout(toastTimer)
  importToast.value = `导入完成：新增 ${r.added} · 合并 ${r.merged} · 跳过 ${r.skipped} · 非法 ${r.invalid}`
  toastTimer = setTimeout(() => { importToast.value = '' }, 5000)
}

// ---- 力导向图 ----
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

watch(() => store.graph, () => setTimeout(drawGraph, 50))

onMounted(() => { setTimeout(drawGraph, 100) })
</script>
