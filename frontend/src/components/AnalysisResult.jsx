import { analysisService } from '../services/auth.service'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const HEALTH_CONFIG = {
  healthy: { color: 'var(--green)', bg: 'rgba(0,255,136,0.08)', icon: '✓', label: 'Healthy' },
  warning: { color: 'var(--amber)', bg: 'rgba(255,184,0,0.08)', icon: '⚠', label: 'Warning' },
  critical: { color: 'var(--red)', bg: 'rgba(255,71,87,0.08)', icon: '✕', label: 'Critical' },
  unknown: { color: 'var(--text-muted)', bg: 'var(--bg-elevated)', icon: '?', label: 'Unknown' },
}

const SEV_COLOR = { CRITICAL: 'var(--red)', ERROR: 'var(--amber)', WARNING: '#ffd666', INFO: 'var(--cyan)' }

export default function AnalysisResult({ result }) {
  const health = HEALTH_CONFIG[result.aiAnalysis?.overallHealth] || HEALTH_CONFIG.unknown
  const ai = result.aiAnalysis || {}

  const handleExport = async () => {
    if (!result.analysisId) return toast.error('Analysis ID not available')
    try {
      const res = await analysisService.exportPDF(result.analysisId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `log-analysis-${result.analysisId}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div className="card card-glow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: health.bg, border: `1px solid ${health.color}`, borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color: health.color }}>{health.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: health.color, letterSpacing: 1, textTransform: 'uppercase' }}>Overall Health</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: health.color, fontSize: '1.1rem' }}>{health.label}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">⬡ {result.provider?.toUpperCase()}</span>
            {result.cacheHit && <span className="badge badge-green">⚡ Cached</span>}
            <span className="badge badge-amber">⚠ {result.totalErrors} errors</span>
            {result.totalMasked > 0 && <span className="badge badge-purple">🔒 {result.totalMasked} masked</span>}
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {result.processingTimeMs}ms
            </span>
          </div>
        </div>
        <button onClick={handleExport} className="btn btn-outline btn-sm">↓ Export PDF</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Root cause */}
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 4, height: '100%', minHeight: 40, background: 'var(--red)', borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div className="section-label">Root Cause Analysis</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, marginTop: 6 }}>
                {ai.rootCause || 'No root cause identified'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 4, minHeight: 40, background: 'var(--cyan)', borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div className="section-label">Error Summary</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, marginTop: 6 }}>
                {ai.errorSummary || 'No summary available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical issues */}
      {ai.criticalIssues?.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(255,71,87,0.3)', background: 'rgba(255,71,87,0.03)' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>⚠ Critical Issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ai.criticalIssues.map((issue, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: 8 }}>
                <span style={{ color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>!</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested fixes */}
      {ai.suggestedFixes?.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.02)' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Suggested Fixes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ai.suggestedFixes.map((fix, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 8 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700, minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fix}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Repeated errors */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-label">Repeated Errors</div>
            <span className="badge badge-red">{result.repeatedErrors?.length || 0}</span>
          </div>
          {result.repeatedErrors?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {result.repeatedErrors.map((e, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: `3px solid ${SEV_COLOR[e.severity] || 'var(--border)'}` }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: SEV_COLOR[e.severity], fontWeight: 700 }}>{e.severity}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>[{e.category}]</span>
                    <span style={{ fontSize: 10, color: 'var(--amber)', marginLeft: 'auto' }}>×{e.count}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                    {e.content?.substring(0, 100)}{e.content?.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No repeated errors found</p>
          )}
        </div>

        {/* Unique errors */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-label">Unique Errors</div>
            <span className="badge badge-amber">{result.nonRepeatedErrors?.length || 0}</span>
          </div>
          {result.nonRepeatedErrors?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {result.nonRepeatedErrors.map((e, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: `3px solid ${SEV_COLOR[e.severity] || 'var(--border)'}` }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: SEV_COLOR[e.severity], fontWeight: 700 }}>{e.severity}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>[{e.category}]</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>L{e.lineNumber}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                    {e.content?.substring(0, 100)}{e.content?.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No unique errors found</p>
          )}
        </div>
      </div>

      {/* Masked content preview */}
      {result.maskedContent && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Masked Log Preview</div>
          <div className="code-block">{result.maskedContent.substring(0, 2000)}{result.maskedContent.length > 2000 ? '\n...[truncated]' : ''}</div>
        </div>
      )}

      {/* Technical details */}
      {ai.technicalDetails && (
        <div className="card" style={{ background: 'var(--bg-elevated)' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Technical Details</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>{ai.technicalDetails}</p>
        </div>
      )}
    </div>
  )
}