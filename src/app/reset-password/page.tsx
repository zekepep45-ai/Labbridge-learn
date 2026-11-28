"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [recoverySession, setRecoverySession] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setRecoverySession(true);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=recovery")) setRecoverySession(true);
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { setMessage("Choose a password with at least 8 characters."); return; }
    if (password !== confirmPassword) { setMessage("The passwords do not match. Please try again."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Your password has been updated. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
      await supabase.auth.signOut();
    }
    setSaving(false);
  }

  return <main className="lb-reset-page">
    <Link className="lb-reset-brand" href="/"><span>L<sup>+</sup></span><strong>LabBridge <small>LEARN</small></strong></Link>
    <section className="lb-reset-card">
      <div className="lb-reset-kicker">ACCOUNT SECURITY</div>
      <h1>Choose a new password.</h1>
      <p>Set a new password for your LabBridge Learn account.</p>
      {!ready ? <div className="lb-reset-message">Checking your secure reset link…</div> : recoverySession ? <form onSubmit={updatePassword}>
        <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="At least 8 characters"/></label>
        <label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="Enter your new password again"/></label>
        <button disabled={saving}>{saving ? "Updating password…" : "Update password →"}</button>
      </form> : <div className="lb-reset-message">This password-reset link is invalid or has expired. Return to LabBridge and request a new one.</div>}
      {message && <p className="lb-reset-message" role="status">{message}</p>}
      <Link href="/">Return to LabBridge sign in</Link>
    </section>
  </main>;
}
