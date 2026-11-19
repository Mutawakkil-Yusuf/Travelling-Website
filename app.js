// AVIORA — interaction layer
// No dependencies. Progressive enhancement: content works without JS.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

  // Loader
  const loader = $('#loader')
  window.setTimeout(() => loader?.classList.add('is-done'), reduced ? 200 : 1400)

  // Menu
  const menuToggle = $('#menuToggle')
  const menuPanel = $('#menuPanel')
  const setMenu = (open) => {
    menuToggle?.setAttribute('aria-expanded', String(open))
    menuPanel?.classList.toggle('is-open', open)
    menuPanel?.setAttribute('aria-hidden', String(!open))
  }
  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'))
  $$('#menuPanel a').forEach((link) => link.addEventListener('click', () => setMenu(false)))

  // Scroll reveals
  const revealEls = $$('.reveal')
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    revealEls.forEach((el) => observer.observe(el))
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'))
  }

  // Route rail + progress + parallax
  const railFill = $('#railFill')
  const progressBar = $('#scrollProgress')
  const stops = $$('.route-stop')
  const sections = stops.map((stop) => document.getElementById(stop.dataset.target)).filter(Boolean)
  const parallaxEls = $$('[data-parallax]')

  let ticking = false
  const updateScroll = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
    if (railFill) railFill.setAttribute('y2', (progress * 100).toFixed(2))
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`

    let active = 0
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.5) active = i
    })
    stops.forEach((stop, i) => stop.classList.toggle('is-active', i === active))

    if (!reduced) {
      parallaxEls.forEach((el) => {
        const speed = Number(el.dataset.parallax)
        el.style.transform = `translate3d(0, ${scrollTop * speed}px, 0)`
      })
    }
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScroll); ticking = true }
  }, { passive: true })
  window.addEventListener('resize', updateScroll)
  updateScroll()

  // Filters
  const filters = $$('.filter')
  const cards = $$('.card')
  filters.forEach((button) => button.addEventListener('click', () => {
    filters.forEach((f) => f.classList.toggle('is-active', f === button))
    const value = button.dataset.filter
    cards.forEach((card) => {
      const show = value === 'all' || card.dataset.category === value
      card.classList.toggle('is-hidden', !show)
      if (show && !reduced) {
        card.animate(
          [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 450, easing: 'cubic-bezier(0.16,1,0.3,1)' },
        )
      }
    })
  }))

  // Reserve modal
  const modal = $('#reserveModal')
  const modalTitle = $('#modalTitle')
  const reserveStatus = $('#reserveStatus')
  const openModal = (route) => {
    if (modalTitle) modalTitle.textContent = route
    if (reserveStatus) reserveStatus.textContent = ''
    modal?.classList.add('is-open')
    modal?.setAttribute('aria-hidden', 'false')
    document.body.classList.add('is-locked')
    window.setTimeout(() => $('input', modal)?.focus(), 300)
  }
  const closeModal = () => {
    modal?.classList.remove('is-open')
    modal?.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('is-locked')
  }
  $$('.card__reserve').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.route)))
  $('#modalClose')?.addEventListener('click', closeModal)
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal() })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(); setMenu(false) } })

  $('#reserveForm')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = form.elements.name.value.trim()
    const email = form.elements.email.value.trim()
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      reserveStatus.textContent = 'Please add your name and a valid email.'
      reserveStatus.classList.add('is-error')
      return
    }
    reserveStatus.classList.remove('is-error')
    reserveStatus.textContent = 'Request received. We will map the details and be in touch.'
    form.reset()
  })

  // Contact form
  const contactForm = $('#contactForm')
  const formStatus = $('#formStatus')
  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = form.elements.name.value.trim()
    const email = form.elements.email.value.trim()
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      formStatus.textContent = 'Add your name and a valid email so we can reply.'
      formStatus.classList.add('is-error')
      return
    }
    formStatus.classList.remove('is-error')
    formStatus.textContent = 'Message ready. Your route begins here.'
    form.reset()
  })

  // Magnetic buttons and tiny sparks
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect()
        const x = (event.clientX - rect.left - rect.width / 2) * 0.18
        const y = (event.clientY - rect.top - rect.height / 2) * 0.18
        el.style.translate = `${x}px ${y}px`
      })
      el.addEventListener('pointerleave', () => { el.style.translate = '' })
    })
  }

  document.addEventListener('pointerdown', (event) => {
    if (reduced || !event.target.closest('[data-spark]')) return
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('span')
      const angle = (Math.PI * 2 * i) / 6
      dot.style.cssText = `position:fixed;z-index:190;pointer-events:none;width:5px;height:5px;border-radius:50%;background:#f2c787;left:${event.clientX}px;top:${event.clientY}px;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .7s;`
      document.body.appendChild(dot)
      requestAnimationFrame(() => {
        dot.style.transform = `translate(${Math.cos(angle) * 42}px, ${Math.sin(angle) * 42}px)`
        dot.style.opacity = '0'
      })
      window.setTimeout(() => dot.remove(), 800)
    }
  })
})()
