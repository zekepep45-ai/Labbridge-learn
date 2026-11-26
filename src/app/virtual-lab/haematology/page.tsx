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
  data?: { label: string; value: string; flag?: string }[];
};

const stations: Station[] = [
  {
    title: "Microcytic anaemia pattern",
    bench: "Haematology bench · Station 01",
    specimen: "EDTA whole blood · Full blood count",
    observation: "A fictional adult patient's CBC shows reduced haemoglobin and a low mean cell volume. The accompanying ferritin result is also below the laboratory reference interval.",
    data: [
      { label: "Haemoglobin", value: "8.9 g/dL", flag: "LOW" },
      { label: "MCV", value: "68 fL", flag: "LOW" },
      { label: "MCH", value: "21 pg", flag: "LOW" },
      { label: "Ferritin", value: "8 µg/L", flag: "LOW" }
    ],
    question: "Which pattern best describes these findings?",
    options: ["Macrocytic anaemia pattern", "Microcytic, hypochromic pattern with low iron stores", "Isolated thrombocytopenia", "Neutrophilic leukocytosis"],
    answer: 1,
    explanation: "The low haemoglobin indicates anaemia, while reduced MCV and MCH indicate small red cells with reduced haemoglobin content. A low ferritin supports depleted iron stores. Results must still be interpreted with the clinical context and local reference intervals.",
    principle: "A CBC describes cell numbers and indices; iron studies help investigate iron status. A pattern is not, by itself, a complete clinical diagnosis."
  },
  {
    title: "Raised white cell count",
    bench: "White cell analysis · Station 02",
    specimen: "EDTA whole blood · Differential count",
    observation: "The total white blood cell count is above the stated reference interval. The differential shows an increased absolute neutrophil count. No analyser flag for blasts is present.",
    data: [
      { label: "WBC", value: "15.2 × 10⁹/L", flag: "HIGH" },
      { label: "Neutrophils", value: "82%", flag: "HIGH" },
      { label: "Lymphocytes", value: "12%" },
      { label: "Platelets", value: "248 × 10⁹/L" }
    ],
    question: "What is the most accurate laboratory description?",
    options: ["Neutropenia", "Lymphocytopenia only", "Neutrophilic leukocytosis", "Pancytopenia"],
    answer: 0,
    explanation: "The total WBC is raised and neutrophils account for an increased proportion. The absolute neutrophil count should be calculated or reviewed, because percentages alone can mislead. This pattern may occur in several settings and does not establish a cause.",
    principle: "Interpret the absolute differential counts alongside the total WBC, analyser flags, blood film and clinical information."
  },
  {
    title: "Low platelet count",
    bench: "Platelet analysis · Station 03",
    specimen: "EDTA whole blood · Platelet count",
    observation: "The analyser reports a platelet count of 48 × 10⁹/L and flags possible platelet clumping. The blood film has not yet been reviewed.",
    data: [
      { label: "Platelets", value: "48 × 10⁹/L", flag: "LOW" },
      { label: "MPV", value: "Not reported", flag: "FLAG" },
      { label: "WBC", value: "6.4 × 10⁹/L" },
      { label: "Haemoglobin", value: "13.1 g/dL" }
    ],
    question: "What should happen before releasing this result?",
    options: ["Release the count immediately without comment", "Change the platelet count to the normal range", "Review the film and follow the laboratory's platelet-clump investigation and confirmation procedure", "Ignore the flag because the haemoglobin is normal"],
    answer: 2,
    explanation: "Platelet clumps can cause a falsely low automated platelet count. Review the blood film and follow the validated local procedure, which may include recollection in an alternative anticoagulant when appropriate. Do not manually alter the result without evidence.",
    principle: "An analyser flag is a prompt for review, not a diagnosis. Investigate possible analytical interference before reporting."
  },
  {
    title: "Macrocytosis and film findings",
    bench: "Red cell morphology · Station 04",
    specimen: "EDTA whole blood · CBC and blood film",
    observation: "The MCV is raised. The blood film description notes macro-ovalocytes and hypersegmented neutrophils. Vitamin B12 and folate results are not yet available.",
    data: [
      { label: "Haemoglobin", value: "8.2 g/dL", flag: "LOW" },
      { label: "MCV", value: "112 fL", flag: "HIGH" },
      { label: "RDW", value: "Raised", flag: "HIGH" },
      { label: "Film", value: "Macro-ovalocytes; hypersegmented neutrophils" }
    ],
    question: "Which interpretation is most appropriate?",
    options: ["Microcytosis due to iron deficiency is confirmed", "A megaloblastic pattern is suggested; correlate with B12/folate testing and clinical context", "The findings confirm acute leukaemia", "The CBC is normal"],
    answer: 1,
    explanation: "Macro-ovalocytes and hypersegmented neutrophils with an increased MCV suggest a megaloblastic pattern. Vitamin B12 and folate deficiency are important possibilities, but additional testing and clinical assessment are needed.",
    principle: "Morphology and indices guide further investigation; avoid making a definitive diagnosis from a single pattern."
  },
  {
    title: "An unexpected blast flag",
    bench: "Result validation · Station 05",
    specimen: "EDTA whole blood · Automated differential",
    observation: "A first-time CBC has an analyser flag indicating possible blasts or abnormal immature cells. The patient history supplied with the request is limited.",
    data: [
      { label: "WBC", value: "22.6 × 10⁹/L", flag: "HIGH" },
      { label: "Haemoglobin", value: "9.4 g/dL", flag: "LOW" },
      { label: "Platelets", value: "72 × 10⁹/L", flag: "LOW" },
      { label: "Analyser flag", value: "Possible blasts / abnormal cells", flag: "REVIEW" }
    ],
    question: "What is the safest laboratory response?",
    options: ["Release the automated differential without review", "Delete the flag and report only the total WBC", "Hold routine release and follow the urgent film-review, escalation and reporting SOP", "Tell the patient what disease they have"],
    answer: 2,
    explanation: "A possible blast flag with other abnormal counts requires prompt review according to the laboratory's validated workflow. Follow local escalation and communication procedures; do not diagnose or communicate a disease directly to the patient.",
    principle: "Critical or potentially significant findings require authorised review, documented escalation and timely communication under local policy."
  }
];

export default function HaematologyVirtualLabPage() {
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
      const { error } = await supabase.rpc("submit_haematology_lab_attempt", { p_responses: answers });
      setSaving(false);
      if (error) setSaveMessage("This session could not be saved right now. Your result is still visible here; please try again later.");
      else setSaveMessage("Your haematology practical result has been saved to your learning progress.");
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

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Preparing your haematology simulation…</p></main>;

  return (
    <main className="virtual-lab-page">
      <header className="vl-header">
        <Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link>
        <div className="vl-header-right"><span className="vl-mode">SIMULATION MODE</span><Link href="/virtual-lab">← All simulations</Link></div>
      </header>
      <section className="vl-hero">
        <div className="eyebrow"><span className="eyebrow-line"/> LABBRIDGE VIRTUAL LABORATORY · SIMULATION 02</div>
        <h1>Interpret the blood.<br/><em>Understand the pattern.</em></h1>
        <p>Work through a fictional full blood count case, review cell indices and analyser flags, and practise safe result interpretation.</p>
        <div className="vl-safety"><span>✳</span><div><strong>Educational simulation only</strong><small>All patient details and results are fictional. Reference intervals vary by laboratory, method, age and population. This exercise does not provide clinical diagnosis or replace validated procedures, local SOPs or supervisor guidance.</small></div></div>
      </section>

      <section className="vl-workspace">
        <aside className="vl-sidebar">
          <div className="vl-side-heading"><span>YOUR PRACTICAL SESSION</span><strong>{finished ? "5 / 5" : (stationIndex + 1) + " / 5"}</strong></div>
          <div className="vl-progress-track"><span style={{ width: ((finished ? 5 : stationIndex) / 5) * 100 + "%" }}/></div>
          <div className="vl-station-list">{stations.map((item, index) => <div className={"vl-station-item " + (index === stationIndex && !finished ? "current" : "") + (answers[index] !== undefined ? " completed" : "")} key={item.title}><span>{answers[index] !== undefined ? (answers[index] === item.answer ? "✓" : "×") : String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.bench.split("·")[0].trim()}</small></div></div>)}</div>
          <div className="vl-side-note"><strong>Learning objective</strong><p>Interpret CBC indices and differential patterns, recognise analyser flags, and apply safe result-validation principles.</p></div>
        </aside>

        <div className="vl-bench">
          {!finished ? <>
            <div className="vl-bench-top"><span>{station.bench}</span><span>CBC INTERPRETATION</span></div>
            <div className="vl-case-card">
              <div className="vl-case-label">FICTIONAL CASE</div>
              <div className="vl-tube-illustration"><div className="vl-tube-cap"/><div className="vl-tube-body"><span/></div><div className="vl-tube-label"><strong>CBC</strong><small>SIMULATED</small></div></div>
              <div className="vl-specimen-copy"><span>SPECIMEN TYPE</span><strong>{station.specimen}</strong><small>Training case · No real patient data</small></div>
            </div>
            {station.data && <div style={{ marginTop: 18, border: "1px solid #eaf0eb", borderRadius: 9, overflow: "hidden" }}>
              <div style={{ padding: "10px 13px", background: "#f7faf7", color: "#6d8577", fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>SIMULATED LABORATORY RESULTS</div>
              {station.data.map((item) => <div key={item.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, padding: "9px 13px", borderTop: "1px solid #edf1ed", alignItems: "center", fontSize: 10 }}>
                <strong style={{ color: "#52675a", fontWeight: 600 }}>{item.label}</strong><span style={{ color: "#30483a" }}>{item.value}</span>{item.flag ? <b style={{ color: item.flag === "LOW" ? "#a46d54" : item.flag === "HIGH" || item.flag === "REVIEW" ? "#9a7440" : "#74867a", fontSize: 8, letterSpacing: .5 }}>{item.flag}</b> : <span/>}
              </div>)}
            </div>}
            <div className="vl-observation"><span className="vl-section-kicker">CASE OBSERVATION</span><p>{station.observation}</p></div>
            <div className="vl-decision">
              <span className="vl-section-kicker">YOUR INTERPRETATION</span>
              <h2>{station.question}</h2>
              <div className="vl-options">{station.options.map((option, index) => <button type="button" key={option} disabled={revealed} onClick={() => setChoice(index)} className={"vl-option " + (choice === index ? "selected" : "") + (revealed && index === station.answer ? " correct" : "") + (revealed && choice === index && choice !== station.answer ? " incorrect" : "")}><span className="vl-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{revealed && index === station.answer && <b>Best answer</b>}</button>)}</div>
              {!revealed ? <button className="primary-button vl-submit" disabled={choice === null} onClick={checkDecision}>Confirm interpretation →</button> : <div className={"vl-feedback " + (choice === station.answer ? "good" : "review")}><strong>{choice === station.answer ? "Correct interpretation." : "Let's review the findings."}</strong><p>{station.explanation}</p><small><b>KEY PRINCIPLE</b> · {station.principle}</small><button className="primary-button vl-submit" onClick={nextStation} disabled={saving}>{saving ? "Saving your result…" : stationIndex === stations.length - 1 ? "View session results →" : "Continue to next case →"}</button></div>}
            </div>
          </> : <div className="vl-results">
            <div className="eyebrow"><span className="eyebrow-line"/> HAEMATOLOGY SESSION COMPLETE</div>
            <div className="vl-score-ring"><strong>{percentage}%</strong><span>{score} / 5 correct</span></div>
            <h2>{percentage >= 80 ? "Strong laboratory interpretation." : percentage >= 60 ? "Good progress. Keep practising." : "A useful first case review."}</h2>
            <p>You completed all five CBC interpretation stations. Review the principles and repeat the simulation to strengthen your understanding.</p>
            {saveMessage && <div className="vl-feedback good"><strong>{saveMessage}</strong></div>}
            <Link className="vl-back-link" href="/progress">View your learning progress →</Link>
            <div className="vl-result-list">{stations.map((item, index) => <div key={item.title}><span className={answers[index] === item.answer ? "pass" : "retry"}>{answers[index] === item.answer ? "✓" : "↻"}</span><div><strong>{item.title}</strong><small>{answers[index] === item.answer ? "Correct interpretation" : "Review: " + item.principle}</small></div></div>)}</div>
            <button className="primary-button vl-submit" onClick={restart}>Practise again ↻</button>
            <Link className="vl-back-link" href="/virtual-lab">Explore other simulations →</Link>
          </div>}
        </div>
      </section>
      <footer className="vl-footer"><span>© 2026 LabBridge Learn</span><span>Learn. Practise. Advance.</span></footer>
    </main>
  );
}
