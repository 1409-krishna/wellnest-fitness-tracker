// Lightweight 60fps canvas confetti without external dependencies
export function triggerConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const width = (canvas.width = window.innerWidth)
  const height = (canvas.height = window.innerHeight)

  const colors = [
    '#3c6b58', // sage
    '#5b8f74', // leaf
    '#8fbc9a', // moss
    '#c45c26', // clay
    '#e5a93c', // gold
    '#2d5444', // dark forest
    '#f59e0b', // amber
  ]

  const particleCount = 80
  const particles = []

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width * 0.5 + (Math.random() - 0.5) * 200,
      y: height * 0.4 + (Math.random() - 0.5) * 100,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      gravity: 0.35,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: Math.random() * 0.015 + 0.01,
    })
  }

  let animationFrame
  const safetyTimeout = setTimeout(() => {
    cancelAnimationFrame(animationFrame)
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }
  }, 4500)

  const render = () => {
    ctx.clearRect(0, 0, width, height)
    let active = false

    for (let p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.rotation += p.vRotation
      p.opacity -= p.decay

      if (p.opacity > 0) {
        active = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
    }

    if (active) {
      animationFrame = requestAnimationFrame(render)
    } else {
      clearTimeout(safetyTimeout)
      cancelAnimationFrame(animationFrame)
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
    }
  }

  render()
}
