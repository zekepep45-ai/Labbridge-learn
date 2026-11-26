const courses = [
  { code: "MLS 201", title: "Clinical Biochemistry", detail: "Explore how biochemical investigations support clinical decisions.", progress: 68, lessons: "12 lessons", tone: "mint", icon: "◈" },
  { code: "MLS 204", title: "Hematology", detail: "Build your understanding of blood cells, disorders, and testing.", progress: 42, lessons: "10 lessons", tone: "blue", icon: "◉" },
  { code: "MLS 206", title: "Medical Microbiology", detail: "Study microorganisms, diagnosis, and laboratory practice.", progress: 18, lessons: "14 lessons", tone: "peach", icon: "✳" }
];

const topics = [
  { label: "Cell structure & function", course: "Cell Biology", time: "8 min read", mark: "01" },
  { label: "Introduction to blood cells", course: "Hematology", time: "12 min read", mark: "02" },
  { label: "Specimen collection principles", course: "Laboratory Practice", time: "10 min read", mark: "03" }
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="LabBridge Learn home">
          <span className="brand-mark">L<span>+</span></span>
          <span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span>
        </a>
        <div className="workspace-label">LEARNING SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#"><span className="nav-icon">▦</span> Overview</a>
          <a className="nav-item" href="#courses"><span className="nav-icon">▤</span> My courses</a>
          <a className="nav-item" href="#resources"><span className="nav-icon">▧</span> Study resources</a>
          <a className="nav-item" href="#practice"><span className="nav-icon">◎</span> Practice & quizzes</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-symbol">✦</div>
            <strong>Keep your momentum</strong>
            <p>Small study sessions add up. Make today count.</p>
            <a href="#courses">Explore learning <Arrow /></a>
          </div>
          <div className="sidebar-footer"><span className="status-dot" /> Your learning space <span>Ghana</span></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">LabBridge <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            <span className="welcome-label">Welcome back</span>
            <div className="avatar" aria-label="Profile placeholder">EA</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR MLS LEARNING JOURNEY</div>
              <h1>Learn with purpose.<br /><em>Grow with confidence.</em></h1>
              <p className="intro">A focused space to strengthen your Medical Laboratory Science knowledge, one concept at a time.</p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-cross">+</div>
              <div className="art-core"><span>LAB</span><strong>✳</strong><span>LEARN</span></div>
              <div className="art-dot dot-one" /><div className="art-dot dot-two" /><div className="art-dot dot-three" />
            </div>
          </section>

          <section className="stats-grid" aria-label="Learning summary">
            <div className="stat-card"><span className="stat-icon green">▤</span><div><strong>03</strong><span>Courses in progress</span></div><small>↗</small></div>
            <div className="stat-card"><span className="stat-icon violet">◷</span><div><strong>2.5h</strong><span>Time spent learning</span></div><small>THIS WEEK</small></div>
            <div className="stat-card"><span className="stat-icon amber">✧</span><div><strong>08</strong><span>Lessons completed</span></div><small>↗</small></div>
          </section>

          <section className="section-block" id="courses">
            <div className="section-heading"><div><div className="eyebrow">KEEP BUILDING</div><h2>Your learning paths</h2></div><a className="text-link" href="#resources">View all courses <Arrow /></a></div>
            <div className="course-grid">
              {courses.map((course) => (
                <article className="course-card" key={course.code}>
                  <div className="course-top"><span className={"course-icon " + course.tone}>{course.icon}</span><span className="course-code">{course.code}</span></div>
                  <h3>{course.title}</h3><p>{course.detail}</p>
                  <div className="course-meta"><span>{course.lessons}</span><strong>{course.progress}% complete</strong></div>
                  <div className="progress-track"><span style={{ width: course.progress + "%" }} /></div>
                  <a className="course-link" href="#resources">Continue learning <Arrow /></a>
                </article>
              ))}
            </div>
          </section>

          <section className="lower-grid" id="resources">
            <div className="resource-panel">
              <div className="section-heading compact"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Recommended for you</h2></div><a className="text-link" href="#practice">See library <Arrow /></a></div>
              <div className="topic-list">
                {topics.map((topic) => <a className="topic-row" href="#practice" key={topic.mark}><span className="topic-number">{topic.mark}</span><span className="topic-copy"><strong>{topic.label}</strong><small>{topic.course}</small></span><span className="topic-time">{topic.time}</span><span className="topic-arrow">→</span></a>)}
              </div>
            </div>
            <aside className="quote-panel" id="practice">
              <div className="quote-mark">“</div>
              <p>Every accurate result begins with a curious mind and a careful process.</p>
              <div className="quote-rule" />
              <span>THE LABBRIDGE MINDSET</span>
              <div className="quote-decoration">✳</div>
            </aside>
          </section>
          <footer className="page-footer"><span>© 2026 LabBridge Learn</span><span>Built for the next generation of laboratory professionals <b>✦</b></span></footer>
        </div>
      </section>
    </main>
  );
}
