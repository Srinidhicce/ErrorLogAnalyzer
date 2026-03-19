import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Signup() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { signup } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.password || form.password.length < 8) e.password = 'Minimum 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = 'Must include uppercase, lowercase and number'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signup({ name:form.name, email:form.email, password:form.password })
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const strength = (() => {
    const p = form.password; if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()
  const strColors = ['#e5e7eb','#ef4444','#f59e0b','#3b82f6','#16a34a']
  const strLabels = ['','Weak','Fair','Good','Strong']

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }} className="animate-fade">

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:44, height:44, background:'var(--cyan)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16, margin:'0 auto 14px' }}>AI</div>
          <h1 style={{ fontSize:22, marginBottom:4 }}>Create Your Account</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>AI ERROR LOG ANALYZER</p>
        </div>

        <div className="card" style={{ padding:28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Name" style={errors.name?{borderColor:'var(--red)'}:{}} />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="E-Mail" style={errors.email?{borderColor:'var(--red)'}:{}} />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="Create Password" style={errors.password?{borderColor:'var(--red)'}:{}} />
              {form.password && (
                <div style={{ marginTop:6 }}>
                  <div style={{ display:'flex', gap:3, marginBottom:3 }}>
                    {[1,2,3,4].map(i=>(
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i<=strength ? strColors[strength] : '#e5e7eb', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11, color:strColors[strength] }}>{strLabels[strength]}</span>
                </div>
              )}
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p=>({...p,confirm:e.target.value}))} placeholder="Confirm password" style={errors.confirm?{borderColor:'var(--red)'}:{}} />
              {errors.confirm && <div className="form-error">{errors.confirm}</div>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', marginTop:4 }} disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)', fontSize:13, color:'var(--text-muted)' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}