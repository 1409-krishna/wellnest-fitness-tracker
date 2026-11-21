import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sage p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-leaf/40" />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-moss/30" />
        <p className="font-display relative text-4xl">Wellnest</p>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl leading-tight">A calmer way to keep fitness habits.</h1>
          <p className="mt-5 text-paper/85">
            Track movement, rest, hydration, and sleep — without restrictive or appearance-based goals.
          </p>
        </div>
        <p className="relative text-sm text-paper/70">Project 41 · Krishna Sharma</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-paper p-8 shadow-sm">
          <p className="font-display text-3xl text-sage">Welcome back</p>
          <p className="mt-2 text-sm text-ink/60">Log in to your wellness space.</p>
          {error ? <p className="mt-4 rounded-xl bg-clay/10 px-3 py-2 text-sm text-clay-dark">{error}</p> : null}
          <label className="mt-6 block text-sm">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
            />
          </label>
          <label className="mt-4 block text-sm">
            Password
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-sage py-3 font-medium text-paper disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-4 text-center text-sm text-ink/60">
            New here?{' '}
            <Link to="/register" className="text-clay">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}
