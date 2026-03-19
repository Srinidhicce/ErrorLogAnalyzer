import { useState, useEffect } from 'react'
import { analysisService } from '../services/auth.service'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import AnalysisResult from '../components/AnalysisResult'

const HEALTH_COLORS = { healthy: 'var(--green)', warning: 'var(--amber)', critical: 'var(--red)', unknown: 'var(--text-muted)' }

export default function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState({ provider: '', status: '' })
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filter).filter(([,v]) => v)) }
      const { data } = await analysisService.getHistory(params)
      setAnalyses(data.data)
      setPagination(data.pagination)
    } catch { toast.error('Failed to load history') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filter])

  const handleView = async (id) => {
    setDetailLoading(true)
    try {
      const { data } = await analysisService.getById(id)
      setSelected(data.data)
    } catch { toast.error('Failed to load analysis') }
    finally { setDetailLoading(false) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this analysis?')) return
    try {
      await analysisService.delete(id)
      toast.success('Deleted')
      setAnalyses(p => p.filter(a => a._id !== id))
      if (selected?._id === id) setSelected(null)
    } catch { toast.error('Delete failed') }
  }

  const handleExport = async (id, e) => {
    e.stopPropagation()
    try {
      const res = await analysisService.exportPDF(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `analysis-${id}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="section-label">Logs</div>
        <h1 className="page-title">Analysis History</h1>
        
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* List panel */}
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={filter.provider} onChange={e => { setFilter(p => ({ ...p, provider: e.target.value })); setPage(1) }} style={{ width: 'auto' }}>
                <option value="">All Providers</option>
                {['openai', 'gemini', 'anthropic', 'openrouter'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filter.status} onChange={e => { setFilter(p => ({ ...p, status: e.target.value })); setPage(1) }} style={{ width: 'auto' }}>
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <button onClick={() => { setFilter({ provider: '', status: '' }); setPage(1) }} className="btn btn-ghost btn-sm">
                ✕ Clear
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
                {pagination.total || 0} total
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="flex-center" style={{ padding: 60 }}>
                <div className="loading-spinner" style={{ width: 28, height: 28 }} />
              </div>
            ) : analyses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◉</div>
                <h3>No analyses found</h3>
                <p>Your analysis history will appear here</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Provider</th>
                        <th>Errors</th>
                        <th>Health</th>
                        <th>Cache</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyses.map(a => (
                        <tr
                          key={a._id}
                          onClick={() => handleView(a._id)}
                          style={{
                            cursor: 'pointer',
                            background: selected?._id === a._id ? 'var(--cyan-glow)' : undefined,
                            outline: selected?._id === a._id ? '1px solid var(--border-cyan)' : undefined,
                          }}
                        >
                          <td>
                            <div>
                              <span className={`badge ${a.inputType === 'file' ? 'badge-cyan' : 'badge-purple'}`}>{a.inputType}</span>
                              {a.fileName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{a.fileName}</div>}
                            </div>
                          </td>
                          <td style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1, color: 'var(--text-secondary)' }}>{a.provider}</td>
                          <td style={{ color: a.totalErrors > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{a.totalErrors}</td>
                          <td>
                            <span style={{ fontSize: 11, color: HEALTH_COLORS[a.aiAnalysis?.overallHealth || 'unknown'] }}>
                              ● {a.aiAnalysis?.overallHealth || 'unknown'}
                            </span>
                          </td>
                          <td>
                            {a.cacheHit
                              ? <span style={{ fontSize: 11, color: 'var(--green)' }}>⚡ hit</span>
                              : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                            }
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {format(new Date(a.createdAt), 'MMM d, HH:mm')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={e => handleExport(a._id, e)} className="btn btn-ghost btn-sm tooltip" data-tip="Export PDF" style={{ padding: '4px 8px' }}>↓</button>
                              <button onClick={e => handleDelete(a._id, e)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} className="btn btn-ghost btn-sm">← Prev</button>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}>{p}</button>
                    ))}
                    <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn btn-ghost btn-sm">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="animate-fade" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="section-label">Detail View</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Analysis Result</h3>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">✕ Close</button>
            </div>
            {detailLoading
              ? <div className="flex-center" style={{ height: 200 }}><div className="loading-spinner" /></div>
              : <AnalysisResult result={{ ...selected, analysisId: selected._id }} />
            }
          </div>
        )}
      </div>
    </div>
  )
}