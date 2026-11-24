import { useEffect, useRef, useState } from 'react'

export default function GoogleAuthButton({
  onSuccess,
  onError,
  text = 'Continue with Google',
  disabled = false,
}) {
  const containerRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const successRef = useRef(onSuccess)
  const errorRef = useRef(onError)

  useEffect(() => {
    successRef.current = onSuccess
    errorRef.current = onError
  })

  useEffect(() => {
    let timer = null
    let attempts = 0

    const initAndRender = () => {
      attempts++

      if (!clientId) {
        setErrorMsg('VITE_GOOGLE_CLIENT_ID is missing in client/.env')
        return true
      }

      if (window.google?.accounts?.id && containerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.credential) {
                successRef.current?.(response.credential)
              } else {
                errorRef.current?.('No credential returned from Google')
              }
            },
          })

          containerRef.current.innerHTML = ''
          const btnWidth = Math.min(350, Math.max(260, window.innerWidth - 64))
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: btnWidth,
          })

          setRendered(true)
          return true
        } catch (err) {
          console.error('Google button render error:', err)
          setErrorMsg(err.message || 'Error initializing Google button')
          return false
        }
      }

      if (attempts > 30) {
        setErrorMsg('Google Sign-In script took too long to load. Please check your internet connection.')
        return true
      }

      return false
    }

    const success = initAndRender()
    if (!success) {
      timer = setInterval(() => {
        if (initAndRender()) {
          clearInterval(timer)
        }
      }, 500)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [clientId])

  return (
    <div className={`w-full flex flex-col items-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Google Identity Services renders official button directly here */}
      <div
        ref={containerRef}
        className="w-full flex justify-center min-h-[44px]"
      />

      {/* Placeholder spinner while Google GSI iframe loads */}
      {!rendered && !errorMsg && (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-sand bg-cream py-3 text-sm text-ink/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sage/40 border-t-sage" />
          <span>{text}...</span>
        </div>
      )}

      {/* Warning message if origin or ID has an issue */}
      {errorMsg && (
        <p className="mt-2 text-xs text-clay text-center">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
