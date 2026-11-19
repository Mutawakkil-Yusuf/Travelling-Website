// AVIORA — interaction layer
// No dependencies. Progressive enhancement: content works without JS.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const routes = window.AVIORA_ROUTES ?? {}

  // Loader
  const loader = $('#loader')
  window.setTimeout(() => loader?.classList.add('is-done'), reduced ? 200 : 1300)

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

  // Filters — shared with map pins
  const filters = $$('.filter')
  const cards = $$('.card')
  function applyFilter(value) {
    filters.forEach((f) => f.classList.toggle('is-active', f.dataset.filter === value))
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
  }
  filters.forEach((button) => button.addEventListener('click', () => applyFilter(button.dataset.filter)))
  $$('.map__pin').forEach((pin) => pin.addEventListener('click', () => {
    applyFilter(pin.dataset.route)
    document.getElementById('offer')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }))

  // Modal helpers
  const reserveModal = $('#reserveModal')
  const routeModal = $('#routeModal')
  const syncLock = () => document.body.classList.toggle(
    'is-locked',
    Boolean(reserveModal?.classList.contains('is-open') || routeModal?.classList.contains('is-open')),
  )
  const focusables = (modal) => $$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', modal)
    .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
  const trapFocus = (modal, event) => {
    if (event.key !== 'Tab' || !modal?.classList.contains('is-open')) return
    const items = focusables(modal)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  document.addEventListener('keydown', (event) => {
    trapFocus(reserveModal, event)
    trapFocus(routeModal, event)
    if (event.key === 'Escape') { closeReserve(); closeRoute(); setMenu(false) }
  })

  // Reserve modal
  const modalTitle = $('#modalTitle')
  const reserveStatus = $('#reserveStatus')
  function openReserve(route) {
    if (modalTitle) modalTitle.textContent = route
    if (reserveStatus) { reserveStatus.textContent = ''; reserveStatus.classList.remove('is-error') }
    reserveModal?.classList.add('is-open')
    reserveModal?.setAttribute('aria-hidden', 'false')
    syncLock()
    window.setTimeout(() => $('input', reserveModal)?.focus(), 250)
  }
  function closeReserve() {
    reserveModal?.classList.remove('is-open')
    reserveModal?.setAttribute('aria-hidden', 'true')
    syncLock()
  }
  $$('.card__reserve').forEach((button) => button.addEventListener('click', () => openReserve(button.dataset.route)))
  $('#modalClose')?.addEventListener('click', closeReserve)
  reserveModal?.addEventListener('click', (event) => { if (event.target === reserveModal) closeReserve() })

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

  // Route detail views with hash support
  const routeModalImage = $('#routeModalImage')
  const routeModalEyebrow = $('#routeModalEyebrow')
  const routeModalTitle = $('#routeModalTitle')
  const routeModalDesc = $('#routeModalDesc')
  const routeModalItinerary = $('#routeModalItinerary')
  const routeModalFacts = $('#routeModalFacts')

  function fillRoute(key) {
    const data = routes[key]
    if (!data) return false
    if (routeModalImage) { routeModalImage.src = data.image; routeModalImage.alt = data.alt ?? '' }
    if (routeModalEyebrow) routeModalEyebrow.textContent = data.eyebrow
    if (routeModalTitle) routeModalTitle.textContent = data.title
    if (routeModalDesc) routeModalDesc.textContent = data.desc
    if (routeModalItinerary) routeModalItinerary.innerHTML = data.itinerary.map((item) => `<li>${item}</li>`).join('')
    if (routeModalFacts) routeModalFacts.innerHTML = data.facts.map(([label, value]) => `<div><span>${label}</span><span>${value}</span></div>`).join('')
    return true
  }
  function openRoute(key, updateHash = true) {
    if (!fillRoute(key)) return
    routeModal?.classList.add('is-open')
    routeModal?.setAttribute('aria-hidden', 'false')
    syncLock()
    window.setTimeout(() => $('#routeModalClose')?.focus(), 200)
    if (updateHash) window.history.pushState({ route: key }, '', `#route/${key}`)
  }
  function closeRoute(updateHash = true) {
    if (!routeModal?.classList.contains('is-open')) return
    routeModal.classList.remove('is-open')
    routeModal.setAttribute('aria-hidden', 'true')
    syncLock()
    if (updateHash && location.hash.startsWith('#route/')) {
      window.history.pushState(null, '', location.pathname + location.search)
    }
  }
  $$('[data-details]').forEach((button) => button.addEventListener('click', () => openRoute(button.dataset.details)))
  $('#routeModalClose')?.addEventListener('click', () => closeRoute())
  routeModal?.addEventListener('click', (event) => { if (event.target === routeModal) closeRoute() })
  $('#routeModalReserve')?.addEventListener('click', () => {
    const title = routeModalTitle?.textContent ?? 'Route'
    closeRoute()
    openReserve(title)
  })
  window.addEventListener('popstate', () => {
    const match = location.hash.match(/^#route\/(.+)$/)
    if (match && routes[match[1]]) openRoute(match[1], false)
    else closeRoute(false)
  })
  const initial = location.hash.match(/^#route\/(.+)$/)
  if (initial && routes[initial[1]]) openRoute(initial[1], false)

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
      dot.style.cssText = `position:fixed;z-index:190;pointer-events:none;width:5px;height:5px;border-radius:50%;background:#ff7a5c;left:${event.clientX}px;top:${event.clientY}px;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .7s;`
      document.body.appendChild(dot)
      requestAnimationFrame(() => {
        dot.style.transform = `translate(${Math.cos(angle) * 42}px, ${Math.sin(angle) * 42}px)`
        dot.style.opacity = '0'
      })
      window.setTimeout(() => dot.remove(), 800)
    }
  })
})()
