import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password should be at least 8 characters long.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to create account. Please try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen grid bg-cream lg:grid-cols-2">
      {/* LEFT BRANDING SECTION */}
      <section className="relative flex min-h-[340px] flex-col justify-between overflow-hidden bg-sage p-7 text-paper sm:p-10 lg:min-h-screen lg:p-12">
        {/* Decorative backgrounds */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-leaf/30 blur-sm transition-transform duration-1000 hover:scale-110" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-moss/30" />
        <div className="absolute right-1/4 top-1/2 h-32 w-32 rounded-full border border-paper/10" />

        {/* Logo */}
        <div className="relative z-10">
          <p className="font-display text-3xl font-semibold tracking-tight">
            Wellnest<span className="text-leaf">.</span>
          </p>
          <p className="mt-2 text-xs tracking-[0.25em] text-paper/60 uppercase">
            Your wellness journey
          </p>
        </div>

        {/* Main Content */}
        <div className="relative z-10 my-10 max-w-xl lg:my-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 text-xs text-paper/80">
            <span className="h-2 w-2 rounded-full bg-leaf" />
            No guilt · No crash goals · Just balance
          </span>

          <h1 className="mt-7 font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Begin your mindful
            <br />
            wellness routine.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-7 text-paper/80 sm:text-base">
            Create an account to track your 4 wellness pillars — movement, rest, hydration, and sleep — at your own gentle pace.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 flex flex-wrap gap-3">
            {['Flexible Habits', 'Rule-Based AI', 'Zero Calorie Counting', 'Private & Secure'].map((item) => (
              <span
                key={item}
                className="rounded-full bg-paper/10 px-4 py-2 text-xs tracking-wide text-paper/90 transition-all duration-300 hover:bg-paper/20 hover:-translate-y-1"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-paper/60">
          Small consistent steps change everything.
        </div>
      </section>

      {/* RIGHT REGISTER SECTION */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:min-h-screen">
        <div className="w-full max-w-md">
          {/* Welcome header */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">
              Create your account
            </p>
            <h2 className="mt-3 font-display text-4xl text-sage sm:text-5xl">
              Join Wellnest<span className="text-clay">.</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Start building sustainable wellness habits today. Free and private forever.
            </p>
          </div>

          {/* Register Form */}
          <form
            onSubmit={submit}
            className="rounded-3xl border border-sand bg-paper p-6 shadow-[0_15px_50px_rgba(40,60,45,0.07)] transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(40,60,45,0.12)] sm:p-9"
          >
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-clay/20 bg-clay/10 px-4 py-3 text-sm text-clay-dark"
              >
                {error}
              </div>
            )}

            {/* Name */}
            <label className="block text-sm font-medium text-ink">
              Full name
              <input
                type="text"
                name="name"
                placeholder="Krishna Sharma"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-sand bg-cream px-4 py-3.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-ink/35 hover:border-sage/50 focus:border-sage focus:ring-4 focus:ring-sage/10"
              />
            </label>

            {/* Email */}
            <label className="mt-5 block text-sm font-medium text-ink">
              Email address
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-sand bg-cream px-4 py-3.5 text-sm text-ink outline-none transition-all duration-300 placeholder:text-ink/35 hover:border-sage/50 focus:border-sage focus:ring-4 focus:ring-sage/10"
              />
            </label>

            {/* Password */}
            <label className="mt-5 block text-sm font-medium text-ink">
              Password
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-sand bg-cream px-4 py-3.5 pr-20 text-sm text-ink outline-none transition-all duration-300 placeholder:text-ink/35 hover:border-sage/50 focus:border-sage focus:ring-4 focus:ring-sage/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sage transition-colors hover:text-clay"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-sage py-4 text-sm font-semibold text-paper shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-moss hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            {/* Sign in link */}
            <p className="mt-7 text-center text-sm text-ink/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-clay transition-colors hover:text-sage hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>

          {/* Bottom note */}
          <p className="mt-7 text-center text-xs leading-6 text-ink/45">
            Wellnest advocates sustainable self-care.
            <br />
            No weight goals. No body shaming.
          </p>
        </div>
      </section>
    </main>
  )
}
