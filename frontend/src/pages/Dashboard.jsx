import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analysisService } from '../services/auth.service'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'

const StatCard = ({ label, value, sub, color = 'var(--cyan)', icon }) => (
  <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="section-label">{label}</div>
        <div className="stat-number" style={{ color }}>{value ?? '—'}</div>
        {sub && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 24, opacity: 0.4 }}>{icon}</div>
    </div>
  </div>
)

const SEVERITY_COLORS = {
  CRITICAL: 'var(--red)',
  ERROR: 'var(--amber)',
  WARNING: '#ffd666',
  INFO: 'var(--cyan)',
}

const PIE_COLORS = ['var(--cyan)', 'var(--purple)', 'var(--green)', 'var(--amber)', 'var(--red)', '#f472b6', '#34d399']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentHistory, setRecentHistory] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          analysisService.getStats(),
          analysisService.getHistory({ limit: 5 })
        ])
        setStats(statsRes.data.stats)
        setRecentHistory(histRes.data.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading dashboard...</p>
      </div>
    </div>
  )

  const trendData = stats?.recentTrend?.map(t => ({ date: t._id.slice(5), count: t.count })) || []
  const categoryData = stats?.categoryTotals?.map(c => ({ name: c._id, value: c.total })) || []
  const providerData = stats?.providerBreakdown?.map(p => ({ name: p._id, count: p.count })) || []

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">AI Analysis Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}  here's your analysis overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/analyze')}>
          <span>⬡</span> New Analysis
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Total Analyses" value={stats?.totalAnalyses ?? 0} icon="◈" color="var(--cyan)" sub="all time" />
        <StatCard label="Cache Hit Rate" value={`${stats?.cacheHitRate ?? 0}%`} icon="⚡" color="var(--green)" sub={`${stats?.cacheHits ?? 0} cached results`} />
        <StatCard label="Providers Used" value={providerData.length} icon="◉" color="var(--purple)" sub="AI providers" />
        <StatCard label="API Keys Saved" value={user?.apiKeys?.length ?? 0} icon="◎" color="var(--amber)" sub="encrypted" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Activity trend */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div className="section-label">Activity</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Last 30 Days</h3>
            </div>
            <span className="badge badge-cyan">{stats?.totalAnalyses} total</span>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--cyan)' }}
                />
                <Bar dataKey="count" fill="var(--cyan)" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>◈</div>
              <p>No activity yet</p>
            </div>
          )}
        </div>

        {/* Error categories */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <div className="section-label">Breakdown</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Error Categories</h3>
          </div>
          {categoryData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={categoryData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryData.slice(0, 6).map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>No error data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Severity breakdown + Provider usage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 16 }}>Severity Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stats?.severityTotals || []).map(s => {
              const max = Math.max(...(stats?.severityTotals || []).map(x => x.total))
              const pct = max ? (s.total / max) * 100 : 0
              return (
                <div key={s._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: SEVERITY_COLORS[s._id] || 'var(--text-secondary)' }}>{s._id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.total}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: SEVERITY_COLORS[s._id] || 'var(--cyan)', borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
            {!stats?.severityTotals?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 16 }}>AI Provider Usage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {providerData.map((p, i) => {
              const total = providerData.reduce((s, x) => s + x.count, 0)
              const pct = total ? (p.count / total) * 100 : 0
              return (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p.count} ({Math.round(pct)}%)</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
            {!providerData.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No provider data yet</p>}
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="section-label">Recent</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Latest Analyses</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>View all →</button>
        </div>

        {recentHistory.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Errors</th>
                  <th>Health</th>
                  <th>Cache</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map(a => (
                  <tr key={a._id} style={{ cursor: 'pointer' }} onClick={() => navigate('/history')}>
                    <td>
                      <span className="badge badge-cyan">{a.inputType}</span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 1 }}>{a.provider}</td>
                    <td style={{ color: a.totalErrors > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{a.totalErrors}</td>
                    <td>
                      <span className={`badge badge-${a.aiAnalysis?.overallHealth === 'healthy' ? 'green' : a.aiAnalysis?.overallHealth === 'warning' ? 'amber' : 'red'}`}>
                        {a.aiAnalysis?.overallHealth || 'unknown'}
                      </span>
                    </td>
                    <td>
                      {a.cacheHit
                        ? <span className="badge badge-green">⚡ cached</span>
                        : <span className="badge" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>fresh</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {format(new Date(a.createdAt), 'MMM d, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">◈</div>
            <h3>No analyses yet</h3>
            <p>Upload a log file or paste text to run your first AI analysis</p>
            <button className="btn btn-primary" onClick={() => navigate('/analyze')}>Start Analyzing</button>
          </div>
        )}
      </div>
    </div>
  )
}