import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import History from './pages/History'
import Profile from './pages/Profile'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Initializing...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

const AppLayout = ({ children }) => {
  const { user } = useAuth()
  return (
    <div className="page-layout">
      {user && <Navbar />}
      <main className={user ? 'main-content' : ''} style={!user ? { width: '100%' } : {}}>
        {children}
      </main>
    </div>
  )
}

const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </AppLayout>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-base)' } },
            error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-base)' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}