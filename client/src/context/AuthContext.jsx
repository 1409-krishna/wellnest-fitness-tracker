import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('wellnest_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('wellnest_token')))

  useEffect(() => {
    const token = localStorage.getItem('wellnest_token')
    if (!token) {
      return
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user)
        localStorage.setItem('wellnest_user', JSON.stringify(res.data.user))
      })
      .catch(() => {
        setUser(null)
        localStorage.removeItem('wellnest_token')
        localStorage.removeItem('wellnest_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('wellnest_token', data.token)
    localStorage.setItem('wellnest_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('wellnest_token', data.token)
    localStorage.setItem('wellnest_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential })
    localStorage.setItem('wellnest_token', data.token)
    localStorage.setItem('wellnest_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('wellnest_token')
    localStorage.removeItem('wellnest_user')
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('wellnest_user', JSON.stringify(updatedUser))
  }

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout, updateUser }),
    [user, loading]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
