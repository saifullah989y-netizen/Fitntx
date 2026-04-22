// ── Load shared header & footer ────────────────────────────────────────
async function loadPartials() {
  // Header
  const headerRes = await fetch('header.html');
  const headerHTML = await headerRes.text();
  const headerEl = document.getElementById('site-header');
  if (headerEl) {
    headerEl.innerHTML = headerHTML;
    // Mark the active nav link based on the current filename
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    headerEl.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      const isStartHere =
        href === '/start' &&
        (currentFile === 'start.html' || currentFile === 'start');
      if (href === currentFile || (currentFile === '' && href === 'index.html') || isStartHere) {
        a.classList.add('active');
      }
    });
    // Init ticker now that header HTML (and images) are in the DOM
    initTicker();
    initMobileNav();
  }

  // Footer
  const footerRes = await fetch('footer.html');
  const footerHTML = await footerRes.text();
  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.innerHTML = footerHTML;
}

loadPartials();

// ── Mobile nav (hamburger) ─────────────────────────────────────────────
function initMobileNav() {
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  const backdrop = document.getElementById('navBackdrop');
  const menu = document.getElementById('navMenu');
  if (!nav || !toggle) return;

  const mq = window.matchMedia('(max-width: 1024px)');

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-menu-open', open);
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!nav.classList.contains('is-open'));
  });
  backdrop?.addEventListener('click', () => setOpen(false));
  menu?.addEventListener('click', (e) => {
    if (e.target === menu) setOpen(false);
  });
  nav.querySelectorAll('.nav-links a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false);
  });
  const onMqChange = () => {
    if (!mq.matches) setOpen(false);
  };
  if (mq.addEventListener) mq.addEventListener('change', onMqChange);
  else mq.addListener(onMqChange);
}

// ── Logo ticker — rAF-driven, pixel-perfect seamless loop ────────────
function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;

  // Remove the duplicate set from HTML — JS will clone instead
  const origLogos = Array.from(track.querySelectorAll('.tick-logo'));
  // Clear any existing clones (safe to re-init)
  track.querySelectorAll('.tick-clone').forEach(el => el.remove());

  // Wait until every original image has a real rendered width
  let loaded = 0;
  function onLoad() {
    loaded++;
    if (loaded === origLogos.length) startLoop();
  }

  origLogos.forEach(img => {
    if (img.complete && img.naturalWidth > 0) { onLoad(); }
    else {
      img.onload  = onLoad;
      img.onerror = onLoad; // count errors too so we never hang
    }
  });

  // Safety fallback
  setTimeout(() => { if (!track._tickerRunning) startLoop(); }, 800);

  function startLoop() {
    if (track._tickerRunning) return;
    track._tickerRunning = true;

    // Measure the pixel width of one full set
    let setWidth = 0;
    origLogos.forEach(img => {
      const s = window.getComputedStyle(img);
      const mL = parseFloat(s.marginLeft)  || 0;
      const mR = parseFloat(s.marginRight) || 0;
      setWidth += img.offsetWidth + mL + mR;
    });

    // Clone the set 3 times so the track is always full — no gap risk
    for (let i = 0; i < 3; i++) {
      origLogos.forEach(img => {
        const clone = img.cloneNode(true);
        clone.classList.add('tick-clone');
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
    }

    // Speed: pixels per second
    const speed = 80;
    let x = 0;
    let last = null;

    function tick(ts) {
      if (last === null) last = ts;
      const dt = ts - last;
      last = ts;

      x -= speed * (dt / 1000);

      // Reset when we've scrolled exactly one set width — perfectly seamless
      if (x <= -setWidth) x += setWidth;

      track.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }
}


// ── Hero cycling — image + word, every 3s ─────────────────────────────
function initHeroCycle() {
  const slides   = document.querySelectorAll('.hero-slide');
  const wordEl   = document.getElementById('heroCycleWord');
  if (!slides.length || !wordEl) return;

  const words = ['athletes', 'students', 'professionals', 'organizations'];
  let current = 0;

  function next() {
    // Fade out current slide
    slides[current].classList.remove('active');

    // Fade out word
    wordEl.classList.add('fade-out');

    current = (current + 1) % words.length;

    // Fade in new slide
    slides[current].classList.add('active');

    // Swap word after fade-out completes
    setTimeout(() => {
      wordEl.textContent = words[current];
      wordEl.classList.remove('fade-out');
      wordEl.classList.add('fade-in');
      setTimeout(() => wordEl.classList.remove('fade-in'), 350);
    }, 350);
  }

  setInterval(next, 3000);
}

initHeroCycle();

// ── Stories carousel (auto + arrow controls) ──────────────────────────
function initStoriesCarousel() {
  const shell = document.querySelector('.stories-shell');
  const track = shell?.querySelector('.stories-track');
  if (!shell || !track) return;

  const prevBtn = shell.querySelector('.stories-edge-arrow.left');
  const nextBtn = shell.querySelector('.stories-edge-arrow.right');

  let x = 0;
  let last = null;
  let pauseUntil = 0;
  const speed = 26; // px/s
  const step = 340; // px per click

  function getSetWidth() {
    return track.scrollWidth / 2;
  }

  function clampLoop(setWidth) {
    if (!setWidth) return;
    while (x <= -setWidth) x += setWidth;
    while (x > 0) x -= setWidth;
  }

  function moveBy(delta) {
    x += delta;
    clampLoop(getSetWidth());
    pauseUntil = performance.now() + 1800; // pause auto briefly after click
    track.style.transform = `translateX(${x}px)`;
  }

  prevBtn?.addEventListener('click', () => moveBy(step));
  nextBtn?.addEventListener('click', () => moveBy(-step));

  function tick(ts) {
    if (last === null) last = ts;
    const dt = ts - last;
    last = ts;

    if (ts > pauseUntil) {
      x -= speed * (dt / 1000);
      clampLoop(getSetWidth());
      track.style.transform = `translateX(${x}px)`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

initStoriesCarousel();

// ── Nav scroll effect ──────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  triggerScrollAnim();
});

// ── Scroll animations ──────────────────────────────────────────────────
function triggerScrollAnim() {
  document.querySelectorAll('.sf:not(.vis)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 60) el.classList.add('vis');
  });
}
setTimeout(triggerScrollAnim, 200);

// ── Guided flow (start.html only) ─────────────────────────────────────
let flowStep1Choice = null;

const step2Options = {
  student: {
    q: "What are you looking for?",
    opts: [
      { icon:'🎓', title:'Career Guidance', desc:'Map your sports career path and next steps', val:'guidance' },
      { icon:'🌐', title:'Internships & Opportunities', desc:'Find internships, programs, and placements', val:'internships' },
      { icon:'🤝', title:'Mentorship & Network', desc:'Connect with people further along in sport', val:'network' },
      { icon:'🏟️', title:'Events & Showcases', desc:'Get exposure through FITNTX events', val:'events' }
    ]
  },
  athlete: {
    q: "What are you looking for?",
    opts: [
      { icon:'🗺️', title:'Career Strategy', desc:'Build a clear roadmap for your playing career', val:'strategy' },
      { icon:'🚀', title:'Placement & Opportunities', desc:'Active placement into clubs, trials, or roles', val:'placement' },
      { icon:'🤝', title:'Network & Exposure', desc:'Build your professional network in sport', val:'network' },
      { icon:'🏟️', title:'Events & Showcases', desc:'Get seen at FITNTX-run showcases and events', val:'events' }
    ]
  },
  professional: {
    q: "What are you looking for?",
    opts: [
      { icon:'📈', title:'Career Advancement', desc:'Move to the next level in your sport career', val:'advancement' },
      { icon:'🔄', title:'Career Transition', desc:'Move from playing to coaching, management, or consulting', val:'transition' },
      { icon:'🌐', title:'Global Network', desc:'Build connections across the global sports market', val:'network' },
      { icon:'💼', title:'Join the Rep Network', desc:'Become a FITNTX Representative and build with us', val:'rep' }
    ]
  },
  organization: {
    q: "What does your organization need?",
    opts: [
      { icon:'🔍', title:'Talent Recruitment', desc:'Find and place athletes, coaches, or staff', val:'talent' },
      { icon:'🤝', title:'Partnerships & Sponsorships', desc:'Secure commercial deals and partners', val:'partnerships' },
      { icon:'📅', title:'Events Management', desc:'Plan and run events of any scale', val:'events' },
      { icon:'📈', title:'Strategic Growth', desc:'Consulting, media, or full annual package', val:'growth' }
    ]
  }
};

const results = {
  student_guidance:       { h:'Your Path: Career Advisory',          p:'You\'ll be matched with a FITNTX Advisory Representative who will run a structured Career Strategy Consultation — mapping your goals, timeline, and the concrete steps to get there.', cta:'Book a Student Discovery Call', page:'contact.html', paths:[{icon:'📋',t:'Career Strategy Session',d:'Map your career path'},{icon:'🌱',t:'Student Membership',d:'Hub access + community'},{icon:'🤝',t:'Rep Mentorship',d:'Direct Rep support'}] },
  student_internships:    { h:'Your Path: Opportunity Placement',    p:'Your Representative will actively work your opportunity pipeline — matching you to internships, programs, and entry-level roles in sport that fit your profile and stage.', cta:'Find My Opportunities', page:'opportunities.html', paths:[{icon:'🔍',t:'Opportunity Database',d:'Browse open roles'},{icon:'🚀',t:'Rep-Led Placement',d:'Active pipeline for you'},{icon:'🎓',t:'Student Membership',d:'Full access + support'}] },
  student_network:        { h:'Your Path: Network & Community',      p:'Join the FITNTX Hub, get matched to Growth Centres aligned to your sport, and access events where the people you need to know actually show up.', cta:'Explore the Hub', page:'hub.html', paths:[{icon:'🌐',t:'FITNTX Hub Access',d:'Community spaces'},{icon:'📅',t:'Events & Networking',d:'Real-world connection'},{icon:'🎓',t:'Student Membership',d:'Full Hub access'}] },
  student_events:         { h:'Your Path: Events & Showcases',       p:'FITNTX runs showcases, workshops, and networking events globally. Get registered, get seen, and use events as a launchpad for your career in sport.', cta:'View Upcoming Events', page:'events.html', paths:[{icon:'📅',t:'Upcoming Events',d:'Register for showcases'},{icon:'🌐',t:'Hub Event Access',d:'Members-only events'},{icon:'🎓',t:'Student Membership',d:'Event discounts + access'}] },
  athlete_strategy:       { h:'Your Path: Career Strategy',          p:'Your Senior Representative will run a structured Initial Career Strategy Consultation — covering your current stage, goals, timeline, constraints, and a clear roadmap for the next 6–18 months.', cta:'Book My Strategy Call', page:'contact.html', paths:[{icon:'🗺️',t:'Career Roadmap Session',d:'Goals + next steps'},{icon:'🏃',t:'Athlete Membership',d:'Ongoing Rep support'},{icon:'📈',t:'Placement Pipeline',d:'Active opportunity search'}] },
  athlete_placement:      { h:'Your Path: Opportunity Placement',    p:'Your Representative will actively work your placement — matching you to clubs, trials, contracts, and roles that fit your level, sport, and ambitions globally.', cta:'Start My Placement', page:'contact.html', paths:[{icon:'🚀',t:'Active Placement',d:'Rep works your pipeline'},{icon:'🌍',t:'Global Network',d:'Opportunities worldwide'},{icon:'🏃',t:'Pro Membership',d:'Priority Rep support'}] },
  athlete_network:        { h:'Your Path: Network & Hub',            p:'Get connected to the FITNTX Hub — the spaces, events, and people that drive real relationships in sport. Your Rep will introduce you to the right people in your discipline and region.', cta:'Explore the Hub', page:'hub.html', paths:[{icon:'🌐',t:'Hub Spaces',d:'Sport-specific communities'},{icon:'📅',t:'Networking Events',d:'Real-world connection'},{icon:'🤝',t:'Rep Introductions',d:'Warm connections'}] },
  athlete_events:         { h:'Your Path: Events & Showcases',       p:'FITNTX showcases are where talent gets seen by the organizations that matter. Get registered, show up, and let the network do the rest.', cta:'View Events', page:'events.html', paths:[{icon:'📅',t:'Showcase Events',d:'Get seen by orgs'},{icon:'🌐',t:'Hub Events',d:'Members-only sessions'},{icon:'🤝',t:'Rep-Led Intros',d:'On-the-day connections'}] },
  professional_advancement:{ h:'Your Path: Career Advancement',      p:'A Professional Membership connects you to a Senior Representative who will map your next career move in sport — and actively work your placement pipeline for senior roles globally.', cta:'Book My Professional Call', page:'contact.html', paths:[{icon:'📈',t:'Career Roadmap',d:'Next level strategy'},{icon:'💼',t:'Pro Membership',d:'Priority Rep + placement'},{icon:'🌍',t:'Global Opportunities',d:'Roles worldwide'}] },
  professional_transition:{ h:'Your Path: Career Transition',        p:'Your Representative will help you package your experience, identify the right next role or business direction, and support every step of the move — from playing to the next chapter.', cta:'Book My Transition Call', page:'contact.html', paths:[{icon:'🔄',t:'Transition Strategy',d:'Map your next chapter'},{icon:'💼',t:'Pro Membership',d:'Full advisory support'},{icon:'🤝',t:'Rep Network Access',d:'Introductions that matter'}] },
  professional_network:   { h:'Your Path: Professional Network',     p:'The FITNTX Hub connects you to decision-makers, organizations, and opportunities across the global sports market. Professional membership unlocks premium spaces and priority Rep connections.', cta:'Explore the Hub', page:'hub.html', paths:[{icon:'🌐',t:'Pro Hub Spaces',d:'Premium community access'},{icon:'📅',t:'Network Events',d:'Industry connection'},{icon:'💼',t:'Pro Membership',d:'Priority + placement'}] },
  professional_rep:       { h:'Your Path: Join the Rep Network',     p:'If you have deep expertise in a sport, discipline, or region — FITNTX wants to talk. Senior Representatives are the engine of the network. Let\'s see if there\'s a fit.', cta:'View Rep Openings', page:'careers.html', paths:[{icon:'⭐',t:'Senior Representative',d:'Own a service territory'},{icon:'📈',t:'Junior Representative',d:'Support and develop'},{icon:'🌐',t:'All Open Roles',d:'See full listings'}] },
  organization_talent:    { h:'Your Path: Talent Acquisition',       p:'A Senior Recruitment Representative will scope your talent needs, design your recruitment campaign, and manage the full pipeline — from sourcing to placement.', cta:'Book an Org Discovery Call', page:'contact.html', paths:[{icon:'🔍',t:'Talent Acquisition',d:'Full recruitment service'},{icon:'📋',t:'Scoping & Pricing',d:'Confirmed at discovery'},{icon:'🏢',t:'Org Package Option',d:'Bundle + save'}] },
  organization_partnerships:{ h:'Your Path: Partnerships & Sponsorships', p:'Your Representative will package your assets, identify the right partners, build the pitch, and close deals — structured around your commercial objectives and sport context.', cta:'Book an Org Discovery Call', page:'contact.html', paths:[{icon:'🤝',t:'Partnerships Service',d:'Strategy to close'},{icon:'💰',t:'Retainer + Success Fee',d:'Aligned incentives'},{icon:'🏢',t:'Org Package Option',d:'Bundle + save'}] },
  organization_events:    { h:'Your Path: Events Management',        p:'FITNTX plans and delivers events of any scale — from local clinics to international showcases. Your Rep will scope the brief, coordinate logistics, and deliver the outcome.', cta:'Book an Events Call', page:'contact.html', paths:[{icon:'📅',t:'Events Management',d:'End-to-end delivery'},{icon:'📋',t:'Get a Quote',d:'Scoped at discovery'},{icon:'🏢',t:'Org Package Option',d:'Events + more, bundled'}] },
  organization_growth:    { h:'Your Path: Strategic Growth',         p:'Start with an Organizational Growth Strategy Consultation. Your Rep will map your priorities, challenges, and constraints — and recommend whether a full annual package or specific service fits best.', cta:'Book an Org Strategy Call', page:'contact.html', paths:[{icon:'⚡',t:'Org Growth Consultation',d:'Your starting point'},{icon:'🏢',t:'Annual Packages',d:'Custom / yr'},{icon:'📋',t:'Custom Solutions',d:'Scoped to your org'}] }
};

function selectStep1(choice) {
  if (!document.getElementById('flowStep1')) return;
  flowStep1Choice = choice;
  document.getElementById('si1').classList.add('done');
  document.getElementById('si1').textContent = '✓';
  document.getElementById('sl1').classList.add('done');
  document.getElementById('si2').classList.add('on');
  const opts = step2Options[choice];
  document.getElementById('flowStep2Q').textContent = opts.q;
  const container = document.getElementById('flowStep2Options');
  container.innerHTML = opts.opts.map(o => `
    <button class="fopt" onclick="selectStep2('${o.val}')">
      <div class="fopt-left">
        <div class="fopt-icon">${o.icon}</div>
        <div><div class="fopt-title">${o.title}</div><div class="fopt-desc">${o.desc}</div></div>
      </div>
      <span class="fopt-arrow">→</span>
    </button>
  `).join('');
  document.getElementById('flowStep1').style.display = 'none';
  document.getElementById('flowStep2').style.display = 'block';
}

function selectStep2(choice) {
  if (!document.getElementById('flowResultInner')) return;
  const key = flowStep1Choice + '_' + choice;
  const result = results[key];
  if (!result) return;
  document.getElementById('si2').classList.add('done');
  document.getElementById('si2').textContent = '✓';
  document.getElementById('sl2').classList.add('done');
  document.getElementById('si3').classList.add('on');
  const pathsHTML = result.paths ? result.paths.map(p => `
    <a class="rpath" href="${result.page}">
      <div class="rpath-icon">${p.icon}</div>
      <div class="rpath-title">${p.t}</div>
      <div class="rpath-desc">${p.d}</div>
    </a>
  `).join('') : '';
  document.getElementById('flowResultInner').innerHTML = `
    <div class="result-badge">✓ Your path is ready</div>
    <div class="result-h">${result.h}</div>
    <p class="result-p">${result.p}</p>
    <div class="result-actions">
      <a class="btn btn-red" href="${result.page}">${result.cta} <span class="arr">→</span></a>
      <a class="btn btn-out" href="contact.html">Book a Discovery Call</a>
    </div>
    ${pathsHTML ? `<div class="result-paths">${pathsHTML}</div>` : ''}
  `;
  document.getElementById('flowStep2').style.display = 'none';
  document.getElementById('flowResult').style.display = 'block';
}

function resetFlow() {
  flowStep1Choice = null;
  ['si1','si2','si3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('on','done');
  });
  const si1 = document.getElementById('si1');
  const si2 = document.getElementById('si2');
  const si3 = document.getElementById('si3');
  if (si1) { si1.textContent = '1'; si1.classList.add('on'); }
  if (si2) si2.textContent = '2';
  if (si3) si3.textContent = '✓';
  ['sl1','sl2'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('done'); });
  const s1 = document.getElementById('flowStep1');
  const s2 = document.getElementById('flowStep2');
  const sr = document.getElementById('flowResult');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  if (sr) sr.style.display = 'none';
}

// ── Contact form ───────────────────────────────────────────────────────
function handleContact(btn) {
  btn.textContent = 'Redirecting to booking calendar...';
  btn.disabled = true;
  setTimeout(() => {
    btn.style.background = '#27AE60';
    btn.textContent = '✓ Redirecting... (replace with YOUR_GHL_BOOKING_URL)';
  }, 1200);
}

// ── Init ───────────────────────────────────────────────────────────────
triggerScrollAnim();