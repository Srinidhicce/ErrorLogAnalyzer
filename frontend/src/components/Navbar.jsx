import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/analyze',   icon: '⊕', label: 'Analyze'   },
  { path: '/history',   icon: '☰', label: 'History'   },
  { path: '/profile',   icon: '◯', label: 'Profile'   },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <nav style={s.nav}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}>AI</div>
        <div>
          <div style={s.logoText}>LogAI</div>
          <div style={s.logoSub}>Log Analyzer</div>
        </div>
      </div>

      <div style={s.divider} />

      {/* Links */}
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink key={path} to={path} style={({ isActive }) => ({
            ...s.link, ...(isActive ? s.linkActive : {})
          })}>
            <span style={{ fontSize:15 }}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div style={{ flex:1 }} />

      {/* User */}
      <div>
        <div style={s.divider} />
        <div style={s.userRow}>
          <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:11, color:'var(--cyan)' }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={s.logoutBtn}>
          ⏻ Logout
        </button>
      </div>
    </nav>
  )
}

const s = {
  nav: {
    position:'fixed', left:0, top:0, bottom:0, width:220,
    background:'#fff',
    borderRight:'1px solid var(--border)',
    display:'flex', flexDirection:'column',
    padding:'20px 12px',
    zIndex:100,
  },
  logo: { display:'flex', alignItems:'center', gap:10, padding:'0 6px', marginBottom:4 },
  logoIcon: {
    width:34, height:34, borderRadius:8,
    background:'var(--cyan)', color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:700, fontSize:13, flexShrink:0,
  },
  logoText: { fontWeight:700, fontSize:16, color:'var(--text-primary)', lineHeight:1.2 },
  logoSub:  { fontSize:10, color:'var(--text-muted)', letterSpacing:'0.5px' },
  divider:  { height:1, background:'var(--border)', margin:'12px 0' },
  link: {
    display:'flex', alignItems:'center', gap:9,
    padding:'9px 10px', borderRadius:7,
    fontSize:13, fontWeight:500,
    color:'var(--text-secondary)',
    textDecoration:'none',
    transition:'all 0.15s',
  },
  linkActive: {
    background:'var(--cyan-glow)',
    color:'var(--cyan)',
    fontWeight:600,
  },
  userRow: { display:'flex', alignItems:'center', gap:8, padding:'4px 6px', marginBottom:8 },
  avatar: {
    width:30, height:30, borderRadius:6,
    background:'var(--cyan)', color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:700, fontSize:13, flexShrink:0,
  },
  logoutBtn: {
    width:'100%', padding:'8px 10px',
    background:'transparent', border:'1px solid var(--border)',
    borderRadius:7, color:'var(--text-muted)',
    fontSize:13, cursor:'pointer', textAlign:'left',
    transition:'all 0.15s',
  },
}