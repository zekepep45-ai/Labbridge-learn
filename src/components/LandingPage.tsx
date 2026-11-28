"use client";

import type { ReactNode } from "react";

type LandingPageProps = {
  language: string;
  languageControls: ReactNode;
  children: ReactNode;
};

const pillars = [
  { number: "01", title: "MLS curriculum", description: "Structured learning pathways designed around Medical Laboratory Science." },
  { number: "02", title: "AI study tutor", description: "Ask questions, unpack difficult concepts and practise explaining the science." },
  { number: "03", title: "Virtual laboratory", description: "Explore laboratory workflows and build practical judgement through simulations." },
  { number: "04", title: "Exam preparation", description: "Prepare with question banks, practice assessments and feedback." },
  { number: "05", title: "Visual learning", description: "Make complex concepts clearer through diagrams, animations and demonstrations." },
  { number: "06", title: "Study resources", description: "Keep notes, revision materials and learning tools close at hand." },
  { number: "07", title: "Professional growth", description: "Explore research, career development and professional skills." },
  { number: "08", title: "Progress & awards", description: "Follow your learning journey and celebrate verified achievements." },
  { number: "09", title: "Flexible access", description: "Learn with low-data experiences and supported offline resources." }
];

const levels = [
  { level: "100", title: "Build your foundations", subjects: "Anatomy · Physiology · Chemistry · Cell biology" },
  { level: "200", title: "Understand disease", subjects: "Biochemistry · Haematology · Microbiology · Immunology" },
  { level: "300", title: "Connect theory to practice", subjects: "Clinical chemistry · Histopathology · Parasitology · Blood banking" },
  { level: "400", title: "Prepare for professional practice", subjects: "Advanced diagnostics · Research · Quality systems · Clinical practice" }
];

export default function LandingPage({ language, languageControls, children }: LandingPageProps) {
  return (
    <main className="lb-landing" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="lb-header">
        <a className="lb-brand" href="#top" aria-label="LabBridge Learn home">
          <span className="lb-brand-symbol">L<span>+</span></span>
          <span className="lb-brand-name"><strong>LabBridge</strong><small>LEARN</small></span>
        </a>
        <nav className="lb-nav" aria-label="Main navigation">
          <a href="#approach">Our approach</a>
          <a href="#pillars">Learning experience</a>
          <a href="#curriculum">MLS curriculum</a>
        </nav>
        <div className="lb-header-actions">
          {languageControls}
          <a className="lb-login-link" href="#get-started">Sign in</a>
          <a className="lb-header-cta" href="#get-started">Get started <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className="lb-hero" id="top">
        <div className="lb-hero-copy">
          <div className="lb-kicker"><span /> A learning platform for medical laboratory science</div>
          <h1>Understand the science.<br /><em>Master the laboratory.</em></h1>
          <p className="lb-hero-description">Build scientific knowledge, strengthen practical understanding and prepare for a meaningful career in laboratory medicine — one clear learning step at a time.</p>
          <div className="lb-hero-actions">
            <a className="lb-button-primary" href="#get-started">Start learning <span aria-hidden="true">↗</span></a>
            <a className="lb-button-secondary" href="#approach">Explore the platform <span aria-hidden="true">↓</span></a>
          </div>
          <div className="lb-hero-note"><span className="lb-note-mark">✳</span><span>Designed for MLS learners in Ghana and the wider scientific community.</span></div>
        </div>

        <div className="lb-hero-visual" aria-label="Illustration of a scientific microscopy field and laboratory learning interface" role="img">
          <div className="lb-visual-topline"><span>LABBRIDGE / FIELD NOTES</span><span>MLS • LEARNING</span></div>
          <div className="lb-microscopy">
            <svg viewBox="0 0 520 390" role="presentation" aria-hidden="true">
              <defs>
                <radialGradient id="lb-cell-fill" cx="42%" cy="38%" r="65%"><stop offset="0%" stopColor="#d9f0e9" /><stop offset="55%" stopColor="#8ec5b5" /><stop offset="100%" stopColor="#377f79" /></radialGradient>
                <radialGradient id="lb-nucleus" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#b4a6d4" /><stop offset="100%" stopColor="#625c91" /></radialGradient>
                <filter id="lb-soft-shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9" /></filter>
              </defs>
              <circle cx="255" cy="190" r="151" fill="#d9eee7" opacity=".08" />
              <circle cx="255" cy="190" r="130" fill="none" stroke="#d4eee5" strokeOpacity=".32" strokeDasharray="2 9" />
              <circle cx="255" cy="190" r="106" fill="none" stroke="#d4eee5" strokeOpacity=".22" />
              <g opacity=".9">
                <circle cx="210" cy="144" r="55" fill="url(#lb-cell-fill)" stroke="#d8f1e9" strokeWidth="3" />
                <circle cx="210" cy="144" r="20" fill="url(#lb-nucleus)" opacity=".9" />
                <circle cx="306" cy="145" r="42" fill="url(#lb-cell-fill)" stroke="#d8f1e9" strokeWidth="3" />
                <circle cx="306" cy="145" r="15" fill="url(#lb-nucleus)" opacity=".88" />
                <circle cx="263" cy="236" r="60" fill="url(#lb-cell-fill)" stroke="#d8f1e9" strokeWidth="3" />
                <circle cx="263" cy="236" r="23" fill="url(#lb-nucleus)" opacity=".88" />
                <circle cx="154" cy="235" r="24" fill="#85bdb0" stroke="#d8f1e9" strokeWidth="2" />
                <circle cx="357" cy="230" r="27" fill="#85bdb0" stroke="#d8f1e9" strokeWidth="2" />
              </g>
              <g fill="#e7f7f0" opacity=".72"><circle cx="188" cy="128" r="4"/><circle cx="225" cy="161" r="3"/><circle cx="295" cy="130" r="3"/><circle cx="322" cy="159" r="4"/><circle cx="245" cy="215" r="4"/><circle cx="281" cy="256" r="3"/><circle cx="158" cy="230" r="3"/><circle cx="365" cy="219" r="3"/></g>
              <g stroke="#c4e9dc" strokeWidth="1.5" fill="none" opacity=".65"><path d="M85 80h65l24 24"/><path d="M380 88h54l-26 27"/><path d="M365 302h68l20-20"/></g>
              <g fill="#e4f5ed" fontSize="10" fontFamily="Arial, sans-serif" letterSpacing="2"><text x="55" y="72">CELL MORPHOLOGY</text><text x="390" y="77">40×</text><text x="390" y="320">SPECIMEN 01</text></g>
              <g fill="#a5d5c6"><circle cx="176" cy="104" r="3"/><circle cx="410" cy="115" r="3"/><circle cx="452" cy="282" r="3"/></g>
            </svg>
          </div>
          <div className="lb-visual-caption"><span className="lb-caption-dot" /><span>SEE THE DETAIL. UNDERSTAND THE SCIENCE.</span></div>
          <div className="lb-float-card lb-float-top"><span className="lb-float-icon">◎</span><span><small>LEARN WITH CLARITY</small><strong>Concepts made visual</strong></span></div>
          <div className="lb-float-card lb-float-bottom"><span className="lb-float-icon">⌁</span><span><small>CONNECT THEORY & PRACTICE</small><strong>Think like a scientist</strong></span></div>
        </div>
      </section>

      <section className="lb-trust-strip" aria-label="Platform principles">
        <span>BUILT AROUND THE SCIENCE</span><i /><span>LEARNING THAT CONNECTS TO PRACTICE</span><i /><span>MADE FOR THE NEXT GENERATION</span>
      </section>

      <section className="lb-intro-section" id="approach">
        <div className="lb-section-label">01 / THE LABBRIDGE APPROACH</div>
        <div className="lb-intro-grid">
          <h2>More than notes.<br /><em>A deeper way to learn.</em></h2>
          <div><p>Medical Laboratory Science asks you to understand what happens at a microscopic level — and why it matters to patient care. LabBridge brings your learning resources, practical exploration and study support into one connected space.</p><a className="lb-text-link" href="#pillars">Discover the learning experience <span>↗</span></a></div>
        </div>
        <div className="lb-principle-grid">
          <article><span>01</span><h3>Understand</h3><p>Build strong foundations with clear explanations and structured academic content.</p></article>
          <article><span>02</span><h3>Explore</h3><p>Use visual lessons and virtual practical activities to make concepts more tangible.</p></article>
          <article><span>03</span><h3>Apply</h3><p>Test your understanding, reflect on feedback and keep developing your skills.</p></article>
        </div>
      </section>

      <section className="lb-pillars-section" id="pillars">
        <div className="lb-section-heading">
          <div><div className="lb-section-label">02 / ONE CONNECTED LEARNING SPACE</div><h2>Everything you need to<br /><em>move your learning forward.</em></h2></div>
          <p>Nine connected areas designed to support your academic journey, practical understanding and professional growth.</p>
        </div>
        <div className="lb-pillar-grid">
          {pillars.map((pillar) => <article className="lb-pillar-card" key={pillar.number}><span className="lb-pillar-number">{pillar.number}</span><span className="lb-pillar-symbol" aria-hidden="true">{["⌘","✳","⚗","▤","◉","▧","↗","◇","⌁"][Number(pillar.number)-1]}</span><h3>{pillar.title}</h3><p>{pillar.description}</p><span className="lb-pillar-rule" /></article>)}
        </div>
      </section>

      <section className="lb-lab-section">
        <div className="lb-lab-visual" aria-hidden="true"><div className="lb-lab-ring ring-a" /><div className="lb-lab-ring ring-b" /><div className="lb-lab-glass"><span /><i /><b /></div><div className="lb-lab-label">PRACTICAL EXPLORATION / 01</div></div>
        <div className="lb-lab-copy"><div className="lb-section-label">03 / LEARNING BEYOND THE TEXTBOOK</div><h2>Bring laboratory<br /><em>concepts to life.</em></h2><p>Explore guided virtual laboratory activities that help you connect scientific principles with laboratory processes. Learn the purpose behind each step, interpret what you observe and build confidence in your understanding.</p><a className="lb-button-dark" href="/virtual-lab">Explore the virtual laboratory <span>↗</span></a><small>Simulations support learning and do not replace supervised laboratory training.</small></div>
      </section>

      <section className="lb-curriculum-section" id="curriculum">
        <div className="lb-section-heading"><div><div className="lb-section-label">04 / YOUR ACADEMIC PATHWAY</div><h2>A clearer path through<br /><em>Medical Laboratory Science.</em></h2></div><p>Explore a structured learning journey that follows key stages of MLS study. Subject coverage can be adapted to your institution&apos;s approved curriculum.</p></div>
        <div className="lb-level-grid">{levels.map((item) => <article key={item.level}><span>LEVEL</span><strong>{item.level}</strong><h3>{item.title}</h3><p>{item.subjects}</p></article>)}</div>
      </section>

      <section className="lb-tutor-section">
        <div className="lb-tutor-copy"><div className="lb-section-label">05 / YOUR STUDY COMPANION</div><h2>Curiosity deserves<br /><em>good answers.</em></h2><p>Meet LabBridge AI Tutor: a study companion to help you unpack complex topics, ask better questions and practise your scientific reasoning.</p><a className="lb-button-primary" href="/ai-tutor">Meet the AI Tutor <span>↗</span></a><small>AI-generated explanations should be checked against approved academic sources and teaching guidance.</small></div>
        <div className="lb-chat-preview" aria-label="Example AI tutor conversation"><div className="lb-chat-head"><span className="lb-chat-avatar">L+</span><span><strong>LabBridge AI Tutor</strong><small>LEARNING SUPPORT</small></span><i>●</i></div><div className="lb-chat-question">Why are red blood cells biconcave?</div><div className="lb-chat-answer"><span>LABBRIDGE TUTOR</span><p>The biconcave shape increases surface area relative to volume and supports efficient gas exchange. It also helps the cell deform as it moves through narrow capillaries.</p><small>Explore this concept further in your haematology lessons.</small></div><div className="lb-chat-input">Ask a follow-up question… <span>↗</span></div></div>
      </section>

      <section className="lb-final-cta" id="get-started">
        <div className="lb-final-copy"><div className="lb-section-label">06 / TAKE YOUR NEXT STEP</div><h2>Build knowledge.<br /><em>Grow with purpose.</em></h2><p>Start exploring a more connected way to study Medical Laboratory Science.</p><div className="lb-cta-footnote">LEARN WITH PURPOSE · PRACTISE WITH INTENTION · KEEP ADVANCING</div></div>
        <div className="lb-auth-wrap">{children}</div>
      </section>

      <footer className="lb-footer"><a className="lb-brand" href="#top"><span className="lb-brand-symbol">L<span>+</span></span><span className="lb-brand-name"><strong>LabBridge</strong><small>LEARN</small></span></a><p>Supporting the next generation of medical laboratory professionals.</p><span>© 2026 LabBridge Learn</span></footer>
    </main>
  );
}
