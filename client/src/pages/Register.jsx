import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register(form.name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-paper p-8 shadow-sm">
        <p className="font-display text-3xl text-sage">Join Wellnest</p>
        <p className="mt-2 text-sm text-ink/60">Flexible habits. No crash goals.</p>
        {error ? <p className="mt-4 rounded-xl bg-clay/10 px-3 py-2 text-sm text-clay-dark">{error}</p> : null}
        <label className="mt-6 block text-sm">
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
          />
        </label>
        <label className="mt-4 block text-sm">
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
          Password (min 8 characters)
          <input
            type="password"
            minLength={8}
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
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="mt-4 text-center text-sm text-ink/60">
          Already have an account?{' '}
          <Link to="/login" className="text-clay">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
