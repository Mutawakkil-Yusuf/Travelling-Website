// AVIORA — interaction layer
// 1. Mobile / slide-in menu toggle
// 2. Scroll-reveal for elements marked .reveal
// 3. Route rail: fills like a traced map line as the page scrolls,
//    and highlights the waypoint for the section currently in view.

(() => {
  const container = document.querySelector(".container");
  const openBtn = document.querySelector(".open-navbar-icon");
  const closeBtn = document.querySelector(".close-navbar-icon");

  openBtn?.addEventListener("click", () => container.classList.add("change"));
  closeBtn?.addEventListener("click", () => container.classList.remove("change"));

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => container.classList.remove("change"));
  });

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  // Route rail: fill progress + active waypoint
  const railFill = document.querySelector(".route-rail-fill");
  const routeStops = document.querySelectorAll(".route-stop");
  const sections = Array.from(routeStops)
    .map((stop) => document.getElementById(stop.dataset.target))
    .filter(Boolean);

  const updateRail = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

    if (railFill) {
      railFill.setAttribute("y2", (progress * 100).toFixed(2));
    }

    let activeIndex = 0;
    sections.forEach((section, i) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.5) {
        activeIndex = i;
      }
    });

    routeStops.forEach((stop, i) => {
      stop.classList.toggle("is-active", i === activeIndex);
    });
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateRail();
        ticking = false;
      });
      ticking = true;
    }
  });

  window.addEventListener("resize", updateRail);
  updateRail();
})();
