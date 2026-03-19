import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form)
      toast.success('Login successful')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }} className="animate-fade">

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:44, height:44, background:'var(--cyan)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16, margin:'0 auto 14px' }}>AI</div>
          <h1 style={{ fontSize:22, marginBottom:4 }}>Sign In To Your Account</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>WELCOME BACK</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email:e.target.value }))}
                placeholder="Your mail"
                style={errors.email ? { borderColor:'var(--red)' } : {}}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password:e.target.value }))}
                placeholder="Your Password"
                style={errors.password ? { borderColor:'var(--red)' } : {}}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', marginTop:4 }} disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)', fontSize:13, color:'var(--text-muted)' }}>
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}