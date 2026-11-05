import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Receipt, Soup, Coffee, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo, MealImage, PhotoCreditsDialog } from '../components/Shared';
import { HERO_IMAGE, menuImageFor } from '../lib/menuImages';
import { isOrderable } from '../lib/cart';

const STEPS = [
  { title: 'Browse today’s menu', text: 'See what the kitchen has right now — prices and remaining portions come straight from the mess.' },
  { title: 'Pick a pickup slot', text: 'Choose a 15-minute window. Each slot has a fixed number of places, so the counter never gets swamped.' },
  { title: 'Confirm your order', text: 'Pay when you order, or choose cash at pickup. You get an order number and a QR ticket instantly.' },
  { title: 'Collect and go', text: 'Show your QR ticket at the counter during your slot. No billing queue, no guessing.' },
];

const COUNTERS = [
  { icon: Receipt, title: 'Billing counter', text: 'Skip it. Orders are billed when you place them in MealSync; cash orders are settled when you collect.' },
  { icon: Soup, title: 'Thali counter', text: 'Collect every thali here during your pickup slot by showing your QR ticket.' },
  { icon: Coffee, title: 'Other dishes counter', text: 'Soups, Chinese starters, curries, chapatis, rice and noodles are handed over at this counter.' },
];

/** Public landing page. Every call to action leads to a real screen (sign in / create account). */
export default function LandingPage({ onSignIn, onRegister }) {
  const { liveMenu: menuItems, menuStatus, fetchMeals, theme, toggleTheme } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const rootRef = useRef(null);

  // Header border once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Restrained scroll reveal: an element fades in once its top is inside the viewport (checked on
  // scroll and resize, which anchor jumps also trigger). Printing reveals everything.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.classList.add('js-reveal');
    let frame = 0;
    const reveal = () => {
      frame = 0;
      const limit = window.innerHeight * 0.92;
      root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach(el => {
        if (el.getBoundingClientRect().top < limit) el.classList.add('is-visible');
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(reveal); };
    const revealAll = () => root.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'));
    reveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('beforeprint', revealAll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('beforeprint', revealAll);
    };
  }, [menuStatus]);

  // Featured dishes: in stock and with a photo, thalis first
  // Featured dishes: in stock and with a photo — two thalis, then one dish from each other section
  const withPhoto = menuItems.filter(i => isOrderable(i) && menuImageFor(i));
  const sections = [...new Set(withPhoto.map(i => i.category))].filter(c => c !== 'thali');
  const featured = [
    ...withPhoto.filter(i => i.category === 'thali').slice(0, 2),
    ...sections.map(c => withPhoto.find(i => i.category === c)),
  ].slice(0, 8);

  return (
    <div className="landing" ref={rootRef}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`landing-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container">
          <a href="#top" className="logo" aria-label="MealSync home"><Logo /></a>
          <nav className="landing-nav" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#menu">Today’s menu</a>
            <a href="#counters">Counters</a>
          </nav>
          <div className="landing-actions">
            <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSignIn}>Sign in</button>
            <button type="button" className="btn btn-primary" onClick={onRegister}>Order your meal</button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow" data-reveal>Campus mess ordering</span>
              <h1 id="hero-title" className="display-xl" data-reveal data-delay="1">Good food.<br /><em>Less waiting.</em></h1>
              <p className="hero-lede" data-reveal data-delay="2">
                Order ahead from the live mess menu, choose a 15-minute pickup slot and spend your lunch break eating — not standing in two queues.
              </p>
              <div className="hero-cta" data-reveal data-delay="3">
                <button type="button" className="btn btn-primary btn-lg" onClick={onRegister}>
                  Order your meal <ArrowRight size={18} aria-hidden="true" />
                </button>
                <a href="#menu" className="btn btn-outline btn-lg">See today’s menu</a>
              </div>
              <dl className="hero-facts" data-reveal data-delay="3">
                <div><dt>Pickup</dt><dd>15-minute slots</dd></div>
                <div><dt>Stock</dt><dd>Live from the kitchen</dd></div>
                <div><dt>Collection</dt><dd>One QR ticket per order</dd></div>
              </dl>
            </div>
            <figure className="hero-media" data-reveal data-delay="1">
              <picture>
                <source media="(max-width: 700px)" srcSet={HERO_IMAGE.small} />
                <img src={HERO_IMAGE.src} width={1440} height={1200} fetchPriority="high"
                  alt="Overhead view of a Maharashtrian thali on a steel plate with chapatis, potato bhaji, chutney and small bowls of curry." />
              </picture>
              <figcaption className="hero-media-note">Maharashtrian thali</figcaption>
            </figure>
          </div>
        </section>

        <section className="landing-section" id="how" aria-labelledby="how-title">
          <div className="container">
            <div className="landing-section-head">
              <h2 id="how-title" className="display-lg" data-reveal>From menu to plate in four steps</h2>
              <p className="body-lg" data-reveal data-delay="1">MealSync replaces the billing line and spreads pickups across the meal, so each counter only serves the students whose slot it is.</p>
            </div>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="step" data-reveal data-delay={String(i % 4)}>
                  <span className="step-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="heading-lg">{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section" id="menu" aria-labelledby="menu-title">
          <div className="container">
            <div className="landing-section-head">
              <h2 id="menu-title" className="display-lg" data-reveal>On the menu today</h2>
              <p className="body-lg" data-reveal data-delay="1">A live look at what is in stock right now. Sign in to see the full menu and place an order.</p>
            </div>
            {menuStatus === 'loading' && (
              <div className="menu-grid" aria-busy="true" aria-label="Loading today’s menu">
                {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4 / 3.6' }} />)}
              </div>
            )}
            {menuStatus === 'error' && (
              <div className="alert alert-warning">
                <span>Today’s menu could not be loaded right now. The rest of MealSync still works — try again in a moment.</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={fetchMeals}>Retry</button>
              </div>
            )}
            {menuStatus === 'ready' && featured.length === 0 && (
              <p className="body-md text-secondary">Nothing is in stock at the moment. Check back closer to the next meal.</p>
            )}
            {featured.length > 0 && (
              <div className="menu-grid">
                {featured.map((item, i) => (
                  <article key={item.id} className="dish-tile" data-reveal data-delay={String(i % 4)}>
                    <MealImage item={item} alt={item.name} />
                    <div className="flex justify-between items-baseline gap-sm">
                      <h3 className="heading-md">{item.name}</h3>
                      <span className="price">₹{item.price}</span>
                    </div>
                    <span className="caption text-muted">{item.category === 'thali' ? 'Thali counter' : 'Other dishes counter'}</span>
                  </article>
                ))}
              </div>
            )}
            {featured.length > 0 && (
              <div className="mt-lg"><button type="button" className="btn btn-outline" onClick={onSignIn}>Sign in to order <ArrowRight size={16} aria-hidden="true" /></button></div>
            )}
          </div>
        </section>

        <section className="landing-section" id="counters" aria-labelledby="counters-title">
          <div className="container">
            <div className="landing-section-head">
              <h2 id="counters-title" className="display-lg" data-reveal>Three counters, one plan</h2>
              <p className="body-lg" data-reveal data-delay="1">The mess has one billing counter, one thali counter and one counter for everything else. MealSync tells you where to go.</p>
            </div>
            <div className="counters">
              {COUNTERS.map((c, i) => (
                <div key={c.title} className="counter-card" data-reveal data-delay={String(i)}>
                  <span className="counter-icon" aria-hidden="true"><c.icon size={20} /></span>
                  <h3 className="heading-lg">{c.title}</h3>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta-band" data-reveal>
              <div className="flex flex-col gap-sm">
                <h2 id="cta-title" className="display-md">Lunch without the line.</h2>
                <p className="body-md text-secondary">Create a free student account with your campus email.</p>
              </div>
              <div className="hero-cta">
                <button type="button" className="btn btn-primary btn-lg" onClick={onRegister}>Create account</button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={onSignIn}>I already have one</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <span>MealSync · Campus mess ordering and pickup</span>
          <div className="footer-links">
            <button type="button" onClick={onSignIn}>Sign in</button>
            <button type="button" onClick={onRegister}>Create account</button>
            <button type="button" onClick={() => setShowCredits(true)}>Photo credits</button>
          </div>
        </div>
      </footer>
      {showCredits && <PhotoCreditsDialog onClose={() => setShowCredits(false)} />}
    </div>
  );
}
