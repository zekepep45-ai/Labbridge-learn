"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Card = { id: string; front: string; back: string; topic: string };
type Note = { id: string; title: string; body: string; updatedAt: string };
type Bookmark = { id: string; title: string; url: string; category: string };
type Task = { id: string; title: string; due: string; done: boolean };
type Store = { cards: Card[]; notes: Note[]; bookmarks: Bookmark[]; tasks: Task[]; studyDays: string[] };
const KEY = "labbridge-study-tools-v1";
const starterCards: Card[] = [
  { id: "starter-1", topic: "Haematology", front: "What is the primary function of haemoglobin?", back: "To bind and transport oxygen from the lungs to body tissues. It also carries a portion of carbon dioxide back to the lungs." },
  { id: "starter-2", topic: "Clinical biochemistry", front: "What does a spectrophotometer measure?", back: "It measures the amount of light absorbed or transmitted by a sample at a selected wavelength." },
  { id: "starter-3", topic: "Microbiology", front: "What is aseptic technique?", back: "A set of practices used to prevent contamination by unwanted microorganisms during handling, collection or processing." },
  { id: "starter-4", topic: "Laboratory quality", front: "What is the purpose of internal quality control (IQC)?", back: "To monitor the analytical performance of a test system and help detect errors before patient results are released." },
  { id: "starter-5", topic: "Immunology", front: "What is an antigen?", back: "A substance specifically recognised by components of the immune system, such as antibodies or lymphocyte receptors." },
  { id: "starter-6", topic: "Parasitology", front: "What is a definitive host?", back: "The host in which a parasite reaches sexual maturity or undergoes sexual reproduction." },
  { id: "starter-7", topic: "Specimen management", front: "Why is correct patient identification essential before specimen collection?", back: "It helps ensure that the specimen and resulting laboratory report are linked to the correct patient, reducing the risk of serious clinical error." },
  { id: "starter-8", topic: "Biosafety", front: "What should you do first after a suspected laboratory exposure?", back: "Follow the laboratory's exposure response procedure immediately, including appropriate first aid, prompt reporting and urgent risk assessment. Do not delay reporting." }
];
const emptyStore: Store = { cards: starterCards, notes: [], bookmarks: [], tasks: [], studyDays: [] };
const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);

export default function StudyToolsPage() {
  const db = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"overview" | "flashcards" | "notes" | "bookmarks" | "planner">("overview");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cardForm, setCardForm] = useState({ front: "", back: "", topic: "My cards" });
  const [noteForm, setNoteForm] = useState({ title: "", body: "" });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [bookmarkForm, setBookmarkForm] = useState({ title: "", url: "", category: "Study resource" });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState(today());
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    db.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) { router.replace("/"); return; }
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Store>;
          setStore({
            cards: Array.isArray(parsed.cards) ? parsed.cards : starterCards,
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            studyDays: Array.isArray(parsed.studyDays) ? parsed.studyDays : []
          });
        }
      } catch { setMessage("Some saved study data could not be read. Your new changes can still be saved."); }
      setReady(true);
    });
    return () => { active = false; };
  }, [db, router]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch { setMessage("Device storage is full. Remove some saved items and try again."); }
  }, [store, ready]);

  const currentCard = store.cards.length ? store.cards[cardIndex % store.cards.length] : null;
  const completedTasks = store.tasks.filter(t => t.done).length;
  const streak = (() => {
    const days = new Set(store.studyDays);
    let cursor = new Date(today() + "T12:00:00");
    if (!days.has(today())) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(cursor.toISOString().slice(0, 10))) { count++; cursor.setDate(cursor.getDate() - 1); }
    return count;
  })();
  const logStudy = () => {
    const date = today();
    if (store.studyDays.includes(date)) { setMessage("Today's study session is already logged. Well done!"); return; }
    setStore(s => ({ ...s, studyDays: [...s.studyDays, date] }));
    setMessage("Today's study session has been logged.");
  };
  const addCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.front.trim() || !cardForm.back.trim()) return;
    setStore(s => ({ ...s, cards: [...s.cards, { id: makeId(), front: cardForm.front.trim(), back: cardForm.back.trim(), topic: cardForm.topic.trim() || "My cards" }] }));
    setCardForm({ front: "", back: "", topic: "My cards" }); setMessage("Flashcard added.");
  };
  const saveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.title.trim() || !noteForm.body.trim()) return;
    if (editingNote) setStore(s => ({ ...s, notes: s.notes.map(n => n.id === editingNote ? { ...n, ...noteForm, updatedAt: new Date().toISOString() } : n) }));
    else setStore(s => ({ ...s, notes: [{ id: makeId(), ...noteForm, updatedAt: new Date().toISOString() }, ...s.notes] }));
    setNoteForm({ title: "", body: "" }); setEditingNote(null); setMessage("Note saved on this device.");
  };
  const addBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkForm.title.trim() || !bookmarkForm.url.trim()) return;
    let parsed: URL;
    try { parsed = new URL(bookmarkForm.url); } catch { setMessage("Enter a complete web address beginning with https://"); return; }
    if (!["https:", "http:"].includes(parsed.protocol)) { setMessage("Only web links are supported."); return; }
    setStore(s => ({ ...s, bookmarks: [{ id: makeId(), ...bookmarkForm, url: parsed.toString() }, ...s.bookmarks] }));
    setBookmarkForm({ title: "", url: "", category: "Study resource" }); setMessage("Bookmark saved.");
  };
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setStore(s => ({ ...s, tasks: [...s.tasks, { id: makeId(), title: taskTitle.trim(), due: taskDue, done: false }] }));
    setTaskTitle(""); setMessage("Study goal added.");
  };

  if (!ready) return <main className="loading-screen">Preparing your study tools…</main>;
  return <main className="study-tools-page">
    <header className="study-tools-header"><Link href="/" className="brand"><span className="brand-mark">L+</span><span className="brand-copy"><strong>LabBridge</strong><small>STUDY TOOLS</small></span></Link><nav><Link href="/">Dashboard</Link><Link href="/study-centre">Study Centre</Link><Link href="/progress">Progress</Link></nav></header>
    <section className="study-tools-hero"><div><div className="eyebrow">YOUR PERSONAL LEARNING WORKSPACE</div><h1>Study smarter.<br/><em>Remember more.</em></h1><p>Build a steady study habit with active recall, personal notes, saved resources and clear daily goals.</p></div><div className="study-streak-card"><span>YOUR CURRENT STREAK</span><strong>{streak} <small>{streak === 1 ? "day" : "days"}</small></strong><p>{store.studyDays.length} study days logged in total</p><button onClick={logStudy}>＋ Log today's study</button></div></section>
    <div className="study-tools-stats"><article><strong>{store.cards.length}</strong><span>Flashcards</span></article><article><strong>{store.notes.length}</strong><span>Personal notes</span></article><article><strong>{store.bookmarks.length}</strong><span>Bookmarks</span></article><article><strong>{completedTasks}/{store.tasks.length}</strong><span>Goals completed</span></article></div>
    <nav className="study-tools-tabs" aria-label="Study tools">{(["overview","flashcards","notes","bookmarks","planner"] as const).map(t=><button key={t} className={tab===t?"active":""} onClick={()=>{setTab(t);setMessage("");}}>{t==="overview"?"Overview":t==="flashcards"?"Flashcards":t==="notes"?"My notes":t==="bookmarks"?"Bookmarks":"Study planner"}</button>)}</nav>
    {message&&<p className="study-tools-message" role="status">{message}</p>}
    {tab==="overview"&&<section className="study-tools-grid">
      <article className="study-tool-card"><span className="tool-number">01 / ACTIVE RECALL</span><h2>Flashcards</h2><p>Test your recall with starter Medical Laboratory Science cards or create your own topic decks.</p><button onClick={()=>setTab("flashcards")}>Review flashcards →</button></article>
      <article className="study-tool-card"><span className="tool-number">02 / PERSONAL KNOWLEDGE</span><h2>My notes</h2><p>Capture explanations, key definitions and revision summaries as you study.</p><button onClick={()=>setTab("notes")}>Open my notes →</button></article>
      <article className="study-tool-card"><span className="tool-number">03 / QUICK ACCESS</span><h2>Bookmarks</h2><p>Keep useful study links together so important resources are easy to find again.</p><button onClick={()=>setTab("bookmarks")}>Manage bookmarks →</button></article>
      <article className="study-tool-card"><span className="tool-number">04 / CONSISTENCY</span><h2>Study planner</h2><p>Turn your intentions into manageable study goals and check them off as you complete them.</p><button onClick={()=>setTab("planner")}>Plan my study →</button></article>
    </section>}
    {tab==="flashcards"&&<section className="study-tool-section"><div className="study-tool-heading"><div><div className="eyebrow">ACTIVE RECALL</div><h2>Flashcard practice</h2></div><span>{store.cards.length} cards in your deck</span></div>
      {currentCard?<><button className={"flashcard "+(flipped?"flipped":"")} onClick={()=>setFlipped(v=>!v)} aria-label="Flip flashcard"><small>{currentCard.topic} · {flipped?"ANSWER":"QUESTION"}</small><strong>{flipped?currentCard.back:currentCard.front}</strong><span>Tap to {flipped?"see question":"reveal answer"}</span></button><div className="flashcard-controls"><button onClick={()=>{setCardIndex(i=>(i-1+store.cards.length)%store.cards.length);setFlipped(false)}}>← Previous</button><span>{cardIndex%store.cards.length+1} / {store.cards.length}</span><button onClick={()=>{setCardIndex(i=>(i+1)%store.cards.length);setFlipped(false)}}>Next →</button></div></>:<p>No flashcards yet. Create your first card below.</p>}
      <form className="study-tool-form" onSubmit={addCard}><h3>Create a flashcard</h3><label>Topic<input value={cardForm.topic} onChange={e=>setCardForm(v=>({...v,topic:e.target.value}))} placeholder="e.g. Haematology"/></label><label>Question / front<textarea value={cardForm.front} onChange={e=>setCardForm(v=>({...v,front:e.target.value}))} required placeholder="Write a question…"/></label><label>Answer / back<textarea value={cardForm.back} onChange={e=>setCardForm(v=>({...v,back:e.target.value}))} required placeholder="Write the explanation…"/></label><button className="study-primary">Add flashcard</button></form>
    </section>}
    {tab==="notes"&&<section className="study-tool-section"><div className="study-tool-heading"><div><div className="eyebrow">PERSONAL KNOWLEDGE</div><h2>My study notes</h2></div><span>{store.notes.length} saved</span></div><form className="study-tool-form" onSubmit={saveNote}><h3>{editingNote?"Edit note":"Create a note"}</h3><label>Note title<input value={noteForm.title} onChange={e=>setNoteForm(v=>({...v,title:e.target.value}))} required placeholder="e.g. Key points in quality control"/></label><label>Note content<textarea rows={6} value={noteForm.body} onChange={e=>setNoteForm(v=>({...v,body:e.target.value}))} required placeholder="Write your revision notes…"/></label><div className="study-form-actions"><button className="study-primary">{editingNote?"Update note":"Save note"}</button>{editingNote&&<button type="button" onClick={()=>{setEditingNote(null);setNoteForm({title:"",body:""})}}>Cancel</button>}</div></form><div className="study-saved-list">{store.notes.map(n=><article key={n.id}><div><h3>{n.title}</h3><p>{n.body}</p><small>Updated {new Date(n.updatedAt).toLocaleString()}</small></div><div className="study-item-actions"><button onClick={()=>{setEditingNote(n.id);setNoteForm({title:n.title,body:n.body})}}>Edit</button><button onClick={()=>setStore(s=>({...s,notes:s.notes.filter(x=>x.id!==n.id)}))}>Delete</button></div></article>)}{!store.notes.length&&<p className="study-empty">Your saved notes will appear here.</p>}</div></section>}
    {tab==="bookmarks"&&<section className="study-tool-section"><div className="study-tool-heading"><div><div className="eyebrow">QUICK ACCESS</div><h2>Saved bookmarks</h2></div><span>{store.bookmarks.length} saved</span></div><form className="study-tool-form" onSubmit={addBookmark}><h3>Save a resource link</h3><label>Resource title<input value={bookmarkForm.title} onChange={e=>setBookmarkForm(v=>({...v,title:e.target.value}))} required placeholder="e.g. WHO Laboratory Biosafety Manual"/></label><label>Web address<input type="url" value={bookmarkForm.url} onChange={e=>setBookmarkForm(v=>({...v,url:e.target.value}))} required placeholder="https://…"/></label><label>Category<select value={bookmarkForm.category} onChange={e=>setBookmarkForm(v=>({...v,category:e.target.value}))}><option>Study resource</option><option>Course</option><option>Reference</option><option>Video</option><option>Other</option></select></label><button className="study-primary">Save bookmark</button></form><div className="study-saved-list">{store.bookmarks.map(b=><article key={b.id}><div><small>{b.category}</small><h3>{b.title}</h3><a href={b.url} target="_blank" rel="noreferrer">{b.url}</a></div><div className="study-item-actions"><button onClick={()=>setStore(s=>({...s,bookmarks:s.bookmarks.filter(x=>x.id!==b.id)}))}>Remove</button></div></article>)}{!store.bookmarks.length&&<p className="study-empty">No bookmarks yet. Add a useful study link above.</p>}</div></section>}
    {tab==="planner"&&<section className="study-tool-section"><div className="study-tool-heading"><div><div className="eyebrow">CONSISTENT PROGRESS</div><h2>My study planner</h2></div><span>{completedTasks} of {store.tasks.length} completed</span></div><form className="study-tool-form study-task-form" onSubmit={addTask}><h3>Add a study goal</h3><label>What will you study?<input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} required placeholder="e.g. Revise blood cell morphology"/></label><label>Target date<input type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)} required/></label><button className="study-primary">Add goal</button></form><div className="study-saved-list">{[...store.tasks].sort((a,b)=>a.due.localeCompare(b.due)).map(t=><article key={t.id} className={t.done?"task-done":""}><label className="study-task-check"><input type="checkbox" checked={t.done} onChange={e=>setStore(s=>({...s,tasks:s.tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x)}))}/><span><strong>{t.title}</strong><small>Target: {t.due}</small></span></label><div className="study-item-actions"><button onClick={()=>setStore(s=>({...s,tasks:s.tasks.filter(x=>x.id!==t.id)}))}>Delete</button></div></article>)}{!store.tasks.length&&<p className="study-empty">Your study goals will appear here. Start with one small, achievable task.</p>}</div></section>}
    <footer className="study-tools-footer"><span>LabBridge Learn · Personal study workspace</span><span>Your notes, cards, bookmarks and planner are stored on this device. They do not yet sync across devices.</span></footer>
  </main>;
}
