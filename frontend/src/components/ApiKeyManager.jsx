import { useState, useEffect } from 'react'
import { apiKeyService } from '../services/auth.service'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', hint: 'sk-...', color: 'var(--green)', models: 'GPT-4o, GPT-4o-mini, GPT-3.5' },
  { id: 'gemini', name: 'Google Gemini', hint: 'AIza...', color: 'var(--cyan)', models: 'Gemini 1.5 Flash, Pro' },
  { id: 'anthropic', name: 'Anthropic', hint: 'sk-ant-...', color: 'var(--purple)', models: 'Claude 3 Haiku, Sonnet, Opus' },
  { id: 'openrouter', name: 'OpenRouter', hint: 'sk-or-...', color: 'var(--amber)', models: 'Multi-model proxy' },
]

export default function ApiKeyManager() {
  const { user, loadUser } = useAuth()
  const [apiKeys, setApiKeys] = useState([])
  const [form, setForm] = useState({ provider: 'openai', apiKey: '', label: '' })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showKey, setShowKey] = useState({})

  useEffect(() => {
    apiKeyService.getAll().then(r => setApiKeys(r.data.apiKeys)).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.apiKey.trim()) return toast.error('API key is required')
    setLoading(true)
    try {
      const { data } = await apiKeyService.save(form)
      setApiKeys(data.apiKeys)
      setForm({ provider: 'openai', apiKey: '', label: '' })
      setShowForm(false)
      toast.success(`${form.provider} API key saved`)
      loadUser()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save key')
    } finally { setLoading(false) }
  }

  const handleDelete = async (keyId, provider) => {
    if (!confirm(`Delete ${provider} API key?`)) return
    try {
      await apiKeyService.delete(keyId)
      setApiKeys(p => p.filter(k => k._id !== keyId))
      toast.success('API key deleted')
      loadUser()
    } catch { toast.error('Delete failed') }
  }

  const handleToggle = async (keyId) => {
    try {
      const { data } = await apiKeyService.toggle(keyId)
      setApiKeys(p => p.map(k => k._id === keyId ? { ...k, isActive: data.isActive } : k))
    } catch { toast.error('Toggle failed') }
  }

  const getProviderInfo = (id) => PROVIDERS.find(p => p.id === id) || PROVIDERS[0]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="section-label">Credentials</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>API Key Management</h3>
        </div>
        <button onClick={() => setShowForm(p => !p)} className="btn btn-primary btn-sm">
          {showForm ? '✕ Cancel' : '+ Add Key'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card card-glow animate-fade" style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Add / Update API Key</div>
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Label (optional)</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Production Name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
                placeholder={getProviderInfo(form.provider).hint}
              />
            
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="loading-spinner" /> Saving...</> : '✓ Save Encrypted Key'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Provider cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PROVIDERS.map(provider => {
          const key = apiKeys.find(k => k.provider === provider.id)
          return (
            <div key={provider.id} className="card" style={{
              borderColor: key ? `${provider.color}33` : 'var(--border)',
              background: key ? `${provider.color}06` : 'var(--bg-card)',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${provider.color}15`, border: `1px solid ${provider.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {key ? '🔑' : '○'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{provider.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.models}</div>
                    {key && (
                      <div style={{ fontSize: 11, color: provider.color, marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        {key.maskedKey}
                        {key.label && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({key.label})</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {key ? (
                    <>
                      <button onClick={() => handleToggle(key._id)} style={{
                        width: 40, height: 22, borderRadius: 11,
                        background: key.isActive ? provider.color : 'var(--border-bright)',
                        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}>
                        <div style={{ position: 'absolute', top: 2, left: key.isActive ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.2s' }} />
                      </button>
                      <span className={`badge ${key.isActive ? 'badge-green' : ''}`} style={!key.isActive ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}>
                        {key.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {key.usageCount > 0 && (
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {key.usageCount} uses
                        </span>
                      )}
                      <button onClick={() => setForm({ provider: provider.id, apiKey: '', label: key.label || '' }) || setShowForm(true)} className="btn btn-outline btn-sm">Update</button>
                      <button onClick={() => handleDelete(key._id, provider.name)} className="btn btn-danger btn-sm">✕</button>
                    </>
                  ) : (
                    <button onClick={() => { setForm(p => ({ ...p, provider: provider.id })); setShowForm(true) }} className="btn btn-ghost btn-sm" style={{ borderColor: `${provider.color}33`, color: provider.color }}>
                      + Add Key
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

     
    </div>
  )
}