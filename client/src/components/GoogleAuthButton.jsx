import { useEffect, useRef, useState } from 'react'

export default function GoogleAuthButton({ onSuccess, onError, text = 'Continue with Google', disabled = false }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    let interval = null

    const checkGsi = () => {
      if (window.google?.accounts?.id && clientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              setLoading(false)
              if (response.credential) {
                onSuccess(response.credential)
              } else {
                onError?.('No credential returned from Google')
              }
            },
          })

          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            window.google.accounts.id.renderButton(containerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: containerRef.current.offsetWidth || 340,
            })
          }
          setSdkReady(true)
          if (interval) clearInterval(interval)
        } catch (err) {
          console.warn('Google Identity initialization error:', err)
        }
      }
    }

    checkGsi()
    if (!window.google?.accounts?.id) {
      interval = setInterval(checkGsi, 500)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [clientId])

  const handleCustomClick = () => {
    if (!clientId) {
      onError?.('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your client/.env file.')
      return
    }

    if (window.google?.accounts?.id) {
      setLoading(true)
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setLoading(false)
          }
        })
      } catch {
        setLoading(false)
      }
    } else {
      onError?.('Google Sign-In SDK is still loading. Please check your internet connection or try again shortly.')
    }
  }

  return (
    <div className="w-full">
      {/* Container where official GIS button renders if client ID exists and SDK is loaded */}
      {clientId && sdkReady ? (
        <div className="flex justify-center w-full">
          <div ref={containerRef} className="w-full min-h-[44px] flex justify-center" />
        </div>
      ) : (
        /* Custom styled fallback button matching Wellnest's design */
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={disabled || loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-sand bg-paper py-3.5 px-4 text-sm font-semibold text-ink shadow-xs transition-all duration-300 hover:border-sage/60 hover:bg-cream hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-sage/40 border-t-sage" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{loading ? 'Connecting with Google...' : text}</span>
        </button>
      )}
    </div>
  )
}
