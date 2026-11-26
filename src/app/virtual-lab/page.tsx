"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Station = {
  title: string;
  bench: string;
  specimen: string;
  observation: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  principle: string;
};

const stations: Station[] = [
  {
    title: "The unidentified tube",
    bench: "Reception desk · Station 01",
    specimen: "EDTA whole blood · Purple-top tube",
    observation: "A tube arrives with a request form. The tube has no patient label. The form contains a patient's name and date of birth.",
    question: "What is the safest action?",
    options: ["Write the patient's name on the tube using the request form", "Ask the ward to confirm the identity and relabel it yourself", "Reject or quarantine the specimen and request recollection using the approved identification procedure", "Process the sample because the request form is complete"],
    answer: 2,
    explanation: "An unlabelled specimen cannot be reliably linked to a patient. Do not guess, relabel from memory, or process it. Follow the laboratory's rejection and recollection procedure and document the event.",
    principle: "Positive patient identification must be established at collection. An unlabelled specimen presents an unacceptable identification risk."
  },
  {
    title: "The mismatched identifiers",
    bench: "Reception desk · Station 02",
    specimen: "Serum · Gold-top tube",
    observation: "The tube label shows patient ID 48271. The accompanying request form shows patient ID 48217. The names appear similar.",
    question: "How should you handle this discrepancy?",
    options: ["Choose the ID that appears most often in the records", "Stop processing and resolve the mismatch with the responsible collection team under policy", "Change the request form to match the tube", "Process the sample and add a note later"],
    answer: 1,
    explanation: "The identifiers do not match. Similar names are not sufficient evidence of identity. Keep the specimen out of routine processing while the discrepancy is investigated according to local policy.",
    principle: "Specimen identity must match the request and the patient using the required identifiers; never make an unsupported correction."
  },
  {
    title: "The clotted EDTA sample",
    bench: "Haematology reception · Station 03",
    specimen: "EDTA whole blood · Purple-top tube",
    observation: "A sample intended for a full blood count contains visible clots when gently inspected. The tube was transported within the expected time.",
    question: "What is the most appropriate next step?",
    options: ["Remove the clot and run the remaining blood", "Mix vigorously until the clot disappears", "Reject the unsuitable specimen and request a fresh collection", "Report results with a warning that a clot was present"],
    answer: 2,
    explanation: "Clotting can trap cells and make haematology results unreliable. Do not remove clots or attempt to restore the sample. Follow the rejection policy and request recollection.",
    principle: "Specimen integrity is essential. EDTA specimens for cell counts should be appropriately mixed and free of clots."
  },
  {
    title: "The leaking container",
    bench: "Specimen receiving · Station 04",
    specimen: "Urine container · Primary specimen",
    observation: "The container is wet on the outside and urine is visible around the lid. The accompanying request asks for routine urinalysis.",
    question: "What should you do first?",
    options: ["Open the container and transfer the urine immediately", "Handle it using the laboratory spill and exposure procedure, isolate it safely, and follow rejection policy", "Wipe the container and place it on the analyser", "Ask another staff member to smell it to identify the leak"],
    answer: 1,
    explanation: "A leaking specimen can expose staff and contaminate surfaces. Do not open or process it routinely. Use appropriate PPE and the established spill/exposure and specimen rejection procedures.",
    principle: "Treat all specimens as potentially infectious. Safe containment and exposure prevention come before processing."
  },
  {
    title: "The insufficient volume",
    bench: "Chemistry reception · Station 05",
    specimen: "Serum · Gold-top tube",
    observation: "The tube is correctly labelled and intact, but the collected volume is below the analyser's validated minimum for the requested tests.",
    question: "Which response is best?",
    options: ["Run the tests anyway and assume the analyser will manage", "Top up the tube with saline", "Check test-specific minimum volume and laboratory policy; contact the requesting team or request recollection if required", "Combine it with another patient's specimen"],
    answer: 2,
    explanation: "Minimum volume depends on the test, analyser dead volume, and any repeat requirements. Never dilute or combine patient specimens to make volume. Check validated requirements and follow the laboratory's communication and recollection process.",
    principle: "Specimen suitability includes sufficient volume for the requested examination and the validated analytical system."
  }
];

export default function VirtualLabPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stationIndex, setStationIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
      else if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [supabase, router]);

  const station = stations[stationIndex];
  const score = answers.reduce((total, answer, index) => total + (answer === stations[index].answer ? 1 : 0), 0);
  const percentage = Math.round((score / stations.length) * 100);

  function checkDecision() {
    if (choice === null) return;
    setAnswers((current) => [...current.slice(0, stationIndex), choice]);
    setRevealed(true);
  }

  async function nextStation() {
    if (stationIndex === stations.length - 1) {
      setSaving(true);
      setSaveMessage("");
      const { error } = await supabase.rpc("submit_virtual_lab_attempt", { p_responses: answers });
      setSaving(false);
      if (error) setSaveMessage("This session could not be saved right now. Your result is still visible here; please try again later.");
      else setSaveMessage("Your practical result has been saved to your learning progress.");
      setFinished(true);
      return;
    }
    setStationIndex((current) => current + 1);
    setChoice(null);
    setRevealed(false);
  }

  function restart() {
    setStationIndex(0);
    setChoice(null);
    setRevealed(false);
    setAnswers([]);
    setFinished(false);
    setSaveMessage("");
  }

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Preparing your virtual laboratory…</p></main>;

  return (
    <main className="virtual-lab-page">
      <header className="vl-header">
        <Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link>
        <div className="vl-header-right"><span className="vl-mode">SIMULATION MODE</span><Link href="/">← Dashboard</Link></div>
      </header>
      <section className="vl-hero">
        <div className="eyebrow"><span className="eyebrow-line"/> LABBRIDGE VIRTUAL LABORATORY</div>
        <h1>Think like a laboratory<br/><em>professional.</em></h1>
        <p>Practise specimen reception decisions in a safe, simulated environment. Inspect each sample, choose an action and learn from the outcome.</p>
        <div className="vl-safety"><span>✳</span><div><strong>Educational simulation only</strong><small>These are fictional training scenarios, not real patient samples or clinical instructions. Always follow your institution&apos;s approved SOPs and supervisor guidance.</small></div></div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        <Link href="/virtual-lab" style={{ display: "block", padding: "15px 17px", border: "1px solid #dce9df", borderRadius: 10, background: "#fff", color: "#315b45", textDecoration: "none" }}>
          <span style={{ display: "block", fontSize: 8, letterSpacing: 1, fontWeight: 800, color: "#7d9686" }}>SIMULATION 01 · SPECIMEN RECEPTION</span>
          <strong style={{ display: "block", marginTop: 6, fontSize: 12 }}>Specimen Reception &amp; Acceptance</strong>
          <small style={{ display: "block", marginTop: 4, fontSize: 9, color: "#87968c" }}>Patient identification and specimen suitability</small>
        </Link>
        <Link href="/virtual-lab/haematology" style={{ display: "block", padding: "15px 17px", border: "1px solid #cfe2d4", borderRadius: 10, background: "#edf6ef", color: "#315b45", textDecoration: "none" }}>
          <span style={{ display: "block", fontSize: 8, letterSpacing: 1, fontWeight: 800, color: "#578166" }}>SIMULATION 02 · NEW</span>
          <strong style={{ display: "block", marginTop: 6, fontSize: 12 }}>Haematology: CBC Interpretation</strong>
          <small style={{ display: "block", marginTop: 4, fontSize: 9, color: "#718b79" }}>Interpret indices, differentials and analyser flags →</small>
        </Link>
      <Link href="/virtual-lab/clinical-biochemistry" style={{display:"block",padding:"15px 17px",border:"1px solid #dce9df",borderRadius:10,background:"#fff",color:"#315b45",textDecoration:"none"}}><span style={{display:"block",fontSize:8,letterSpacing:1,fontWeight:800,color:"#7d9686"}}>SIMULATION 03</span><strong style={{display:"block",marginTop:6,fontSize:12}}>Clinical Biochemistry</strong><small style={{display:"block",marginTop:4,fontSize:9,color:"#87968c"}}>Chemistry profiles and analytical quality →</small></Link>
        <Link href="/virtual-lab/microbiology" style={{display:"block",padding:"15px 17px",border:"1px solid #dce9df",borderRadius:10,background:"#fff",color:"#315b45",textDecoration:"none"}}><span style={{display:"block",fontSize:8,letterSpacing:1,fontWeight:800,color:"#7d9686"}}>SIMULATION 04</span><strong style={{display:"block",marginTop:6,fontSize:12}}>Medical Microbiology</strong><small style={{display:"block",marginTop:4,fontSize:9,color:"#87968c"}}>Culture, microscopy and AST concepts →</small></Link>
        <Link href="/virtual-lab/parasitology" style={{display:"block",padding:"15px 17px",border:"1px solid #dce9df",borderRadius:10,background:"#fff",color:"#315b45",textDecoration:"none"}}><span style={{display:"block",fontSize:8,letterSpacing:1,fontWeight:800,color:"#7d9686"}}>SIMULATION 05</span><strong style={{display:"block",marginTop:6,fontSize:12}}>Parasitology</strong><small style={{display:"block",marginTop:4,fontSize:9,color:"#87968c"}}>Microscopy and parasite identification →</small></Link>
      </section>

      <section className="vl-workspace">
        <aside className="vl-sidebar">
          <div className="vl-side-heading"><span>YOUR PRACTICAL SESSION</span><strong>{finished ? "5 / 5" : (stationIndex + 1) + " / " + stations.length}</strong></div>
          <div className="vl-progress-track"><span style={{ width: ((finished ? stations.length : stationIndex) / stations.length) * 100 + "%" }}/></div>
          <div className="vl-station-list">{stations.map((item, index) => <div className={"vl-station-item " + (index === stationIndex && !finished ? "current" : "") + (answers[index] !== undefined ? " completed" : "")} key={item.title}><span>{answers[index] !== undefined ? (answers[index] === item.answer ? "✓" : "×") : String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.bench.split("·")[0].trim()}</small></div></div>)}</div>
          <div className="vl-side-note"><strong>Learning objective</strong><p>Apply specimen acceptance criteria, patient identification principles and safe handling practices.</p></div>
        </aside>

        <div className="vl-bench">
          {!finished ? <>
            <div className="vl-bench-top"><span>{station.bench}</span><span>SPECIMEN ASSESSMENT</span></div>
            <div className="vl-case-card">
              <div className="vl-case-label">SPECIMEN PRESENTED</div>
              <div className="vl-tube-illustration"><div className="vl-tube-cap"/><div className="vl-tube-body"><span/></div><div className="vl-tube-label"><strong>LAB</strong><small>SIMULATED</small></div></div>
              <div className="vl-specimen-copy"><span>SPECIMEN TYPE</span><strong>{station.specimen}</strong><small>Training sample · No real patient data</small></div>
            </div>
            <div className="vl-observation"><span className="vl-section-kicker">OBSERVATION</span><p>{station.observation}</p></div>
            <div className="vl-decision">
              <span className="vl-section-kicker">YOUR DECISION</span>
              <h2>{station.question}</h2>
              <div className="vl-options">{station.options.map((option, index) => <button type="button" key={option} disabled={revealed} onClick={() => setChoice(index)} className={"vl-option " + (choice === index ? "selected" : "") + (revealed && index === station.answer ? " correct" : "") + (revealed && choice === index && choice !== station.answer ? " incorrect" : "")}><span className="vl-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{revealed && index === station.answer && <b>Correct action</b>}</button>)}</div>
              {!revealed ? <button className="primary-button vl-submit" disabled={choice === null} onClick={checkDecision}>Confirm decision →</button> : <div className={"vl-feedback " + (choice === station.answer ? "good" : "review")}><strong>{choice === station.answer ? "Well done — safe decision." : "Let's review that decision."}</strong><p>{station.explanation}</p><small><b>KEY PRINCIPLE</b> · {station.principle}</small><button className="primary-button vl-submit" onClick={nextStation} disabled={saving}>{saving ? "Saving your result…" : stationIndex === stations.length - 1 ? "View session results →" : "Continue to next station →"}</button></div>}
            </div>
          </> : <div className="vl-results">
            <div className="eyebrow"><span className="eyebrow-line"/> SESSION COMPLETE</div>
            <div className="vl-score-ring"><strong>{percentage}%</strong><span>{score} / {stations.length} correct</span></div>
            <h2>{percentage >= 80 ? "Excellent laboratory judgement." : percentage >= 60 ? "Good progress. Keep practising." : "A useful first practice session."}</h2>
            <p>You completed all five specimen reception stations. Review the principles below and repeat the simulation to strengthen your decisions.</p>
            {saveMessage && <div className="vl-feedback good"><strong>{saveMessage}</strong></div>}
            <Link className="vl-back-link" href="/progress">View your learning progress →</Link>
            <div className="vl-result-list">{stations.map((item, index) => <div key={item.title}><span className={answers[index] === item.answer ? "pass" : "retry"}>{answers[index] === item.answer ? "✓" : "↻"}</span><div><strong>{item.title}</strong><small>{answers[index] === item.answer ? "Correct decision" : "Review: " + item.principle}</small></div></div>)}</div>
            <button className="primary-button vl-submit" onClick={restart}>Practise again ↻</button>
            <Link className="vl-back-link" href="/library">Explore the academic library →</Link>
          </div>}
        </div>
      </section>
      <footer className="vl-footer"><span>© 2026 LabBridge Learn</span><span>Learn. Practise. Advance.</span></footer>
    </main>
  );
}
