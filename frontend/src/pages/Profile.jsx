import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authService, apiKeyService } from '../services/auth.service'
import toast from 'react-hot-toast'
import ApiKeyManager from '../components/ApiKeyManager'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', preferences: { ...user?.preferences } })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const { data } = await authService.updateProfile({
        name: profileForm.name,
        preferences: profileForm.preferences
      })
      updateUser(data.user)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setProfileLoading(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setPwLoading(true)
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password changed')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed')
    } finally { setPwLoading(false) }
  }

  const TABS = [
    { id: 'profile', label: '◎ Profile' },
    { id: 'apikeys', label: '◈ API Keys' },
    { id: 'security', label: '⬡ Security' },
  ]

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="section-label">Account</div>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account, API keys, and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* User card */}
          <div className="card" style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--cyan-dim), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'white', boxShadow: '0 0 20px var(--cyan-glow)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{user?.email}</div>
            <span className={`badge ${user?.role === 'admin' ? 'badge-cyan' : 'badge-purple'}`}>{user?.role}</span>
          </div>

          {/* Stats */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Your Stats</div>
            {[
              ['Total Analyses', user?.stats?.totalAnalyses ?? 0, 'var(--cyan)'],
              ['Cache Hits', user?.stats?.cacheHits ?? 0, 'var(--green)'],
              ['API Keys', user?.apiKeys?.length ?? 0, 'var(--amber)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="btn" style={{
                justifyContent: 'flex-start',
                background: tab === t.id ? 'var(--cyan-glow)' : 'transparent',
                color: tab === t.id ? 'var(--cyan)' : 'var(--text-secondary)',
                border: `1px solid ${tab === t.id ? 'var(--border-cyan)' : 'transparent'}`,
                borderRadius: 8,
                padding: '10px 14px',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div>
          {tab === 'profile' && (
            <div className="card animate-fade">
              <div className="section-label" style={{ marginBottom: 20 }}>Profile Information</div>
              <form onSubmit={handleProfileSave}>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input value={user?.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  <div className="form-hint">Email cannot be changed</div>
                </div>

                <div className="divider" />
                <div className="section-label" style={{ marginBottom: 16 }}>Preferences</div>

                <div className="form-group">
                  <label className="form-label">Default AI Provider</label>
                  <select
                    value={profileForm.preferences?.defaultProvider || 'openai'}
                    onChange={e => setProfileForm(p => ({ ...p, preferences: { ...p.preferences, defaultProvider: e.target.value } }))}
                  >
                    {['openai', 'gemini', 'anthropic', 'openrouter'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['enableCaching', 'Enable Result Caching', 'Reuse AI results for identical logs'],
                    ['maskingEnabled', 'Auto-mask Sensitive Data', 'Automatically mask passwords, emails, IPs before sending to AI'],
                  ].map(([key, label, desc]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                      </div>
                      <button type="button" onClick={() => setProfileForm(p => ({ ...p, preferences: { ...p.preferences, [key]: !p.preferences?.[key] } }))}
                        style={{ width: 44, height: 24, borderRadius: 12, background: profileForm.preferences?.[key] !== false ? 'var(--cyan)' : 'var(--border-bright)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 3, left: profileForm.preferences?.[key] !== false ? 22 : 3, width: 18, height: 18, borderRadius: 9, background: profileForm.preferences?.[key] !== false ? 'var(--bg-base)' : 'var(--text-muted)', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 24 }} disabled={profileLoading}>
                  {profileLoading ? <><span className="loading-spinner" /> Saving...</> : '✓ Save Changes'}
                </button>
              </form>
            </div>
          )}

          {tab === 'apikeys' && (
            <div className="animate-fade">
              <ApiKeyManager />
            </div>
          )}

                    {tab === 'security' && (
            <div className="card animate-fade">
              <div className="section-label" style={{ marginBottom: 20 }}>Change Password</div>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Current password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min 8 chars with upper + lower + number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? (
                    <>
                      <span className="loading-spinner" /> Updating...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </form>

              <div className="divider" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}