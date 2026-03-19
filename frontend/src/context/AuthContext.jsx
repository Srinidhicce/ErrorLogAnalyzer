import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth.service'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authService.getMe()
      setUser(data.user)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (credentials) => {
    const { data } = await authService.login(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const signup = async (userData) => {
    const { data } = await authService.signup(userData)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updatedUser) => setUser(updatedUser)

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}