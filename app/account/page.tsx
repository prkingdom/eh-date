"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export default function AccountPage() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [visibilityConsent, setVisibilityConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage("Website authentication is not configured."); return; }
    if (mode === "signup" && !ageConfirmed) { setMessage("You must confirm you are 18 or older."); return; }
    if (mode === "signup" && !visibilityConsent) { setMessage("Please agree to the profile visibility and photo-sharing disclosure to create an account."); return; }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/account", data: { discovery_visibility_consent: true } },
        });
        if (error) throw error;
        setMessage("Check your email for a verification link before signing in. If you already have an account, try signing in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("You're signed in. Your dating profile is coming next.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage("Signed out.");
  }

  return (
    <main style={{minHeight:"100vh",background:"#fff5f5",padding:"32px 20px",fontFamily:"Arial, sans-serif",color:"#24232b"}}>
      <div style={{maxWidth:440,margin:"0 auto"}}>
        <a href="/" style={{textDecoration:"none",color:"#d80621",fontSize:30,fontWeight:800}}>♥ ehdate.</a>
        <section style={{background:"white",padding:32,borderRadius:24,marginTop:50,boxShadow:"0 12px 40px #24151b0d"}}>
          {user ? (
            <>
              <h1>Welcome to ehdate!</h1>
              <p>Signed in as {user.email}</p>
              <p>Your dating profile will be available soon.</p>
              <button onClick={signOut} style={buttonStyle}>Sign out</button>
            </>
          ) : (
            <>
              <h1 style={{fontSize:32,marginBottom:8}}>{mode === "signup" ? "Join ehdate" : "Welcome back"}</h1>
              <p style={{color:"#6f6670",lineHeight:1.5}}>Canadians Meet Here. 🇨🇦</p>
              <form onSubmit={submit} style={{display:"grid",gap:16,marginTop:28}}>
                <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/></label>
                <label>Password<input required minLength={8} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/></label>
                {mode === "signup" && <>
                  <label style={{display:"flex",gap:10,fontSize:14,lineHeight:1.5}}><input type="checkbox" required checked={ageConfirmed} onChange={e=>setAgeConfirmed(e.target.checked)}/> I confirm that I am at least 18 years old.</label>
                  <label style={{display:"flex",gap:10,fontSize:14,lineHeight:1.5}}><input type="checkbox" required checked={visibilityConsent} onChange={e=>setVisibilityConsent(e.target.checked)}/> I agree that once I complete my profile, my name, age, location, bio and uploaded photos will be visible to eligible signed-in ehdate members by default. I can make my profile private or stop sharing photos at any time in My Profile settings. Temporary photo links may remain accessible for up to two minutes.</label>
                </>}
                <button type="submit" disabled={busy} style={buttonStyle}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
              </form>
              <button type="button" onClick={()=>{setMode(mode === "signup" ? "login" : "signup");setMessage("");}} style={{border:0,background:"transparent",color:"#c6001d",cursor:"pointer",marginTop:22,fontWeight:700}}>{mode === "signup" ? "Already registered? Sign in" : "New here? Create an account"}</button>
            </>
          )}
          {message && <p role="status" style={{lineHeight:1.5,color:"#a60020",marginTop:18}}>{message}</p>}
        </section>
        <p style={{textAlign:"center",fontSize:13,color:"#93898f",marginTop:24}}>ehdate is for adults 18+ · Email verification required</p>
      </div>
    </main>
  );
}
const inputStyle = {display:"block",width:"100%",marginTop:8,padding:13,border:"1px solid #e9dadd",borderRadius:10,fontSize:16} as const;
const buttonStyle = {border:0,background:"#d80621",color:"white",padding:"15px 24px",borderRadius:100,fontSize:16,fontWeight:700,cursor:"pointer"} as const;
