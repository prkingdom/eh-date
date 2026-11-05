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
  const [tab,setTab]=useState<"edit"|"preview"|"settings">("edit");
  const [photos,setPhotos]=useState<string[]>([]),[photoIndex,setPhotoIndex]=useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isPublic,setIsPublic]=useState(false),[sharePhotos,setSharePhotos]=useState(false),[privacySaving,setPrivacySaving]=useState(false),[hasPhoto,setHasPhoto]=useState(false);

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
      const {data:privacy,error:privacyError}=await supabase.from("discovery_preferences")
        .select("is_discoverable,share_photos").eq("user_id",authData.user.id).maybeSingle();
      if(privacyError)setMessage("Could not load privacy settings: "+privacyError.message);
      if(privacy){setIsPublic(privacy.is_discoverable);setSharePhotos(privacy.share_photos);}
      const {data:photos,error:photoError}=await supabase.storage.from("profile-photos").list(authData.user.id,{limit:10});
      if(photoError)setMessage("Could not check photos: "+photoError.message);
      else { const paths=(photos??[]).filter(p=>p.name&&!p.name.startsWith(".")).slice(0,6).map(p=>authData.user.id+"/"+p.name); setHasPhoto(paths.length>0); if(paths.length){const {data:links}=await supabase.storage.from("profile-photos").createSignedUrls(paths,120);setPhotos((links??[]).map(p=>p.signedUrl).filter((src):src is string=>typeof src==="string"));} }
      setLoading(false);
    }
    void load();
  }, []);

  async function savePrivacy(nextPublic:boolean,nextPhotos:boolean){
    if(!supabase||!userId)return;
    setPrivacySaving(true);setMessage("");
    const {error}=await supabase.from("discovery_preferences").upsert({user_id:userId,is_discoverable:nextPublic,share_photos:nextPhotos,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error)setMessage("Could not update privacy: "+error.message);
    else {
      const {data:confirmed,error:readError}=await supabase.from("discovery_preferences")
        .select("is_discoverable,share_photos").eq("user_id",userId).single();
      if(readError||!confirmed)setMessage("Privacy saved but could not be verified. Please refresh.");
      else {setIsPublic(confirmed.is_discoverable);setSharePhotos(confirmed.share_photos);setMessage("Privacy settings saved.");}
    }
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
    <div style={{ maxWidth: 650, margin: "0 auto" }}>
      <a href="/" style={{ color: "#d80621", textDecoration: "none", fontSize: 30, fontWeight: 800 }}>♥ ehdate.</a>
      <section style={{ marginTop: 35, background: "white", padding: "30px 25px", borderRadius: 24, boxShadow: "0 12px 35px #3a1d270c" }}>
        <h1 style={{ marginTop: 0, fontSize: 32 }}>My Profile</h1>
        <p style={{ color: "#736871", lineHeight: 1.5 }}>Tell us a little about yourself. Your profile visibility and photo sharing are controlled in Privacy settings below.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5,background:"#fff5f5",padding:6,borderRadius:18,margin:"24px 0"}}>{([["edit","✎ Edit profile"],["preview","♡ Preview"],["settings","⚙ Settings"]] as const).map(([value,label])=><button type="button" key={value} onClick={()=>{setTab(value);setMessage("");}} style={{padding:"13px 4px",border:0,borderRadius:13,cursor:"pointer",fontWeight:800,background:tab===value?"#d80621":"transparent",color:tab===value?"white":"#5c5057"}}>{label}</button>)}</div>
        {loading ? <p>Loading your profile…</p> : !userId ? <p>Please <a href="/account">sign in</a> to create your profile.</p> :
        tab==="edit" ? <div><section style={{background:"#fff5f5",borderRadius:18,padding:18,marginBottom:24}}><h2 style={{margin:"0 0 6px"}}>Your photos</h2><p style={{color:"#74666e",fontSize:14}}>Photos make the first impression. Your first photo is your main photo.</p><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{Array.from({length:6},(_,i)=><div key={i} style={{aspectRatio:"3/4",background:"#f6dfe3",borderRadius:12,overflow:"hidden",position:"relative",display:"grid",placeItems:"center"}}>{photos[i]?<img src={photos[i]} alt={"Profile photo "+(i+1)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:30,color:"#bf8d97"}}>+</span>}{i===0&&photos[i]&&<span style={{position:"absolute",bottom:5,left:5,background:"#d80621",color:"white",borderRadius:10,padding:"3px 6px",fontSize:11}}>Main</span>}</div>)}</div><a href="/profile/photos" style={{display:"block",textAlign:"center",padding:13,marginTop:12,borderRadius:25,background:"white",color:"#d80621",fontWeight:800,textDecoration:"none"}}>Manage photos →</a></section><h2>About you</h2><form onSubmit={save} style={{ display: "grid", gap: 18, marginTop: 25 }}>
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
        </form></div> : tab==="preview" ? <div style={{borderRadius:18,overflow:"hidden",background:"#fff5f5"}}><div style={{height:"min(60vh,520px)",minHeight:300,background:"linear-gradient(135deg,#ffb9c2,#d80621)",display:"grid",placeItems:"center",position:"relative",overflow:"hidden",isolation:"isolate"}}>{photos.length?<img src={photos[photoIndex]} alt="Your profile photo" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<span style={{fontSize:80,color:"white"}}>♥</span>}{photos.length>1&&<div style={{position:"absolute",bottom:12,display:"flex",alignItems:"center",gap:14,background:"#0008",color:"white",borderRadius:25,padding:7}}><button onClick={()=>setPhotoIndex(i=>(i+photos.length-1)%photos.length)} aria-label="Previous photo">‹</button>{photoIndex+1} / {photos.length}<button onClick={()=>setPhotoIndex(i=>(i+1)%photos.length)} aria-label="Next photo">›</button></div>}</div><div style={{padding:22}}><h2 style={{fontSize:28}}>{profile.display_name||"Your name"}</h2><p style={{color:"#d80621"}}>📍 {[profile.city,profile.province].filter(Boolean).join(", ")}</p><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{profile.bio||"Your bio will appear here."}</p><button onClick={()=>setTab("edit")} style={{border:0,borderRadius:25,padding:14,background:"#d80621",color:"white",fontWeight:800,cursor:"pointer"}}>Edit profile</button></div></div> : null}
        {message && <p role="status" style={{ color: "#a83b4b", lineHeight: 1.5 }}>{message}</p>}
      {tab==="settings"&&userId&&!loading&&<div style={{marginTop:28,padding:20,borderRadius:16,background:"#fff5f5"}}>
        <h2 style={{marginTop:0,fontSize:22}}>Privacy settings</h2>
        {!hasPhoto&&<p style={{fontSize:14,color:"#a60020",lineHeight:1.5}}>Upload at least one profile photo to appear in Discovery. Your privacy choices are still saved even without a photo. <a href="/profile/photos">Add photos</a>.</p>}
        <p style={{fontSize:14,lineHeight:1.6,color:"#62535b"}}>Choose whether other eligible signed-in members can find your profile and view your photos.</p>
        <label style={{display:"flex",alignItems:"center",gap:12,marginTop:14}}>
          <input type="checkbox" checked={isPublic} disabled={privacySaving} onChange={e=>void savePrivacy(e.target.checked,sharePhotos)} style={{width:20,height:20,accentColor:"#d80621"}}/>
          <span><strong>Public dating profile</strong> — appear in Discovery</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}>
          <input type="checkbox" checked={sharePhotos} disabled={privacySaving} onChange={e=>void savePrivacy(isPublic,e.target.checked)} style={{width:20,height:20,accentColor:"#d80621"}}/>
          <span><strong>Share my profile photos</strong> with eligible members</span>
        </label>
        <p style={{fontSize:13,color:"#786c71",lineHeight:1.5}}>Your selections are saved automatically when you change them. Making your profile private removes it from new Discovery results. Existing matches may remain visible; temporary photo links can work for up to two minutes.</p>
      </div>}
      {tab==="settings"&&<p style={{marginTop:24}}><a href="/profile/photos" style={{color:"#d80621",fontWeight:700}}>Manage your profile photos →</a></p>}</section>
    </div>
  </main>;
}
