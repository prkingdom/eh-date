"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;

type Profile = {
  display_name: string;
  date_of_birth: string;
  gender: string;
  city: string;
  province: string;
  bio: string;
};

const emptyProfile: Profile = { display_name: "", date_of_birth: "", gender: "", city: "", province: "", bio: "" };
const provinces = [
  ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
  ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
  ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
  ["SK","Saskatchewan"],["YT","Yukon"]
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");\n  const [isPublic,setIsPublic]=useState(false),[sharePhotos,setSharePhotos]=useState(false),[privacySaving,setPrivacySaving]=useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage("Profile service is not configured."); setLoading(false); return; }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) { setLoading(false); return; }
      setUserId(authData.user.id);
      const { data, error } = await supabase.from("profiles")
        .select("display_name,date_of_birth,gender,city,province,bio")
        .eq("user_id", authData.user.id).maybeSingle();
      if (error) setMessage(error.message);
      else if (data) setProfile({
        display_name: data.display_name ?? "",
        date_of_birth: data.date_of_birth ?? "",
        gender: data.gender ?? "",
        city: data.city ?? "",
        province: data.province ?? "",
        bio: data.bio ?? ""
      });
      setLoading(false);
    }
    void load();
  }, []);

  async function savePrivacy(nextPublic:boolean,nextPhotos:boolean){
    if(!supabase||!userId)return;
    setPrivacySaving(true);setMessage("");
    const {error}=await supabase.from("discovery_preferences").upsert({user_id:userId,is_discoverable:nextPublic,share_photos:nextPhotos,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error)setMessage("Could not update privacy: "+error.message);
    else {setIsPublic(nextPublic);setSharePhotos(nextPhotos);setMessage("Privacy settings saved.");}
    setPrivacySaving(false);
  }

  function setField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile(previous => ({ ...previous, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) return;
    const birthDate = new Date(profile.date_of_birth + "T12:00:00Z");
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    if (today.getUTCMonth() < birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())) age--;
    if (!Number.isFinite(age) || age < 18 || age > 125) { setMessage("You must be at least 18 to use ehdate."); return; }
    if (!profile.display_name.trim() || !profile.city.trim() || !profile.province) {
      setMessage("Please complete your name and location."); return;
    }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      display_name: profile.display_name.trim(),
      date_of_birth: profile.date_of_birth,
      gender: profile.gender || null,
      city: profile.city.trim(),
      province: profile.province,
      bio: profile.bio.trim() || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    setMessage(error ? "Could not save: " + error.message : "Your profile has been saved!");
    setSaving(false);
  }

  const fieldStyle = { display: "block", width: "100%", marginTop: 7, padding: 13, border: "1px solid #eadcde", borderRadius: 12, fontSize: 16, background: "#fff", color: "#29222a" } as const;
  return <main style={{ minHeight: "100vh", background: "#fff5f5", color: "#29222a", padding: "32px 18px", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <a href="/" style={{ color: "#d80621", textDecoration: "none", fontSize: 30, fontWeight: 800 }}>♥ ehdate.</a>
      <section style={{ marginTop: 35, background: "white", padding: "30px 25px", borderRadius: 24, boxShadow: "0 12px 35px #3a1d270c" }}>
        <h1 style={{ marginTop: 0, fontSize: 32 }}>Your dating profile</h1>
        <p style={{ color: "#736871", lineHeight: 1.5 }}>Tell us a little about yourself. Your profile visibility and photo sharing are controlled in Privacy settings below.</p>
        {loading ? <p>Loading your profile…</p> : !userId ? <p>Please <a href="/account">sign in</a> to create your profile.</p> :
        <form onSubmit={save} style={{ display: "grid", gap: 18, marginTop: 25 }}>
          <label>First name or display name<input style={fieldStyle} maxLength={60} required value={profile.display_name} onChange={e => setField("display_name", e.target.value)}/></label>
          <label>Date of birth<input style={fieldStyle} type="date" required value={profile.date_of_birth} onChange={e => setField("date_of_birth", e.target.value)}/></label>
          <label>Gender (optional)<select style={fieldStyle} value={profile.gender} onChange={e => setField("gender", e.target.value)}>
            <option value="">Select an option</option><option>Man</option><option>Woman</option><option>Non-binary</option><option>Prefer to self-describe</option><option>Prefer not to say</option>
          </select></label>
          <label>City<input style={fieldStyle} maxLength={100} required placeholder="e.g. Windsor" value={profile.city} onChange={e => setField("city", e.target.value)}/></label>
          <label>Province or territory<select style={fieldStyle} required value={profile.province} onChange={e => setField("province", e.target.value)}>
            <option value="">Select province or territory</option>{provinces.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
          </select></label>
          <label>About me (optional)<textarea style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }} maxLength={1000} placeholder="A little about you, your interests, and what makes you smile…" value={profile.bio} onChange={e => setField("bio", e.target.value)}/></label>
          <button disabled={saving} type="submit" style={{ border: 0, background: "#d80621", color: "white", padding: 16, borderRadius: 100, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save my profile"}</button>
        </form>}
        {message && <p role="status" style={{ color: "#a83b4b", lineHeight: 1.5 }}>{message}</p>}
      {userId&&!loading&&<div style={{marginTop:28,padding:20,borderRadius:16,background:"#fff5f5"}}>
        <h2 style={{marginTop:0,fontSize:22}}>Privacy settings</h2>
        <p style={{fontSize:14,lineHeight:1.6,color:"#62535b"}}>Choose whether other eligible signed-in members can find your profile and view your photos.</p>
        <label style={{display:"flex",alignItems:"center",gap:12,marginTop:14}}>
          <input type="checkbox" checked={isPublic} disabled={privacySaving} onChange={e=>void savePrivacy(e.target.checked,sharePhotos)} style={{width:20,height:20,accentColor:"#d80621"}}/>
          <span><strong>Public dating profile</strong> — appear in Discovery</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}>
          <input type="checkbox" checked={sharePhotos} disabled={privacySaving} onChange={e=>void savePrivacy(isPublic,e.target.checked)} style={{width:20,height:20,accentColor:"#d80621"}}/>
          <span><strong>Share my profile photos</strong> with eligible members</span>
        </label>
        <p style={{fontSize:13,color:"#786c71",lineHeight:1.5}}>Making your profile private removes it from new Discovery results. Existing matches may remain visible; temporary photo links can work for up to two minutes.</p>
      </div>}
      <p style={{marginTop:24}}><a href="/profile/photos" style={{color:"#d80621",fontWeight:700}}>Manage your profile photos →</a></p></section>
    </div>
  </main>;
}
