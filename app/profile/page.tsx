"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteNav from "../components/SiteNav";

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
  relationship_goal: string;
  interested_in: string[];
  sexual_orientation: string;
  show_sexual_orientation: boolean;
  show_interested_in: boolean;
  interests: string[];
  personality_prompts: {question:string;answer:string}[];
};

const emptyProfile: Profile = { display_name: "", date_of_birth: "", gender: "", city: "", province: "", bio: "", relationship_goal: "", interested_in: [], sexual_orientation: "", show_sexual_orientation: false, show_interested_in: false, interests: [], personality_prompts: [] };
const promptOptions=["My perfect Sunday looks like…","The way to my heart is…","A green flag I look for…","I get way too excited about…","Together, we could…","My most controversial food opinion…","The quickest way to make me laugh…","I am happiest when…","Two truths and a lie…","A fun fact about me…"];
const orientationOptions=["Straight","Gay","Lesbian","Bisexual","Pansexual","Asexual","Queer","Questioning","Prefer to self-describe"];
const interestedOptions=[["Man","Men"],["Woman","Women"],["Non-binary","Non-binary people"]];
const relationshipGoals=["Long-term relationship","Long-term, open to short","Short-term, open to long","Casual dating","New friends","Figuring it out"];
const interestOptions=["Fitness","Travel","Cooking","Music","Movies","Hiking","Camping","Dogs","Cats","Sports","Gaming","Reading","Coffee","Foodie","Art","Photography","Dancing","Beach days","Road trips","Volunteering","Gardening","Yoga","Fashion","Live music"];
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
        .select("display_name,date_of_birth,gender,city,province,bio,relationship_goal,interested_in,sexual_orientation,show_sexual_orientation,show_interested_in,interests,personality_prompts")
        .eq("user_id", authData.user.id).maybeSingle();
      if (error) setMessage(error.message);
      else if (data) setProfile({
        display_name: data.display_name ?? "",
        date_of_birth: data.date_of_birth ?? "",
        gender: data.gender ?? "",
        city: data.city ?? "",
        province: data.province ?? "",
        bio: data.bio ?? "",
        relationship_goal: data.relationship_goal ?? "",
        interested_in: data.interested_in ?? [],
        sexual_orientation: data.sexual_orientation ?? "",
        show_sexual_orientation: data.show_sexual_orientation ?? false,
        show_interested_in: data.show_interested_in ?? false,
        interests: data.interests ?? [],
        personality_prompts: Array.isArray(data.personality_prompts)?data.personality_prompts.filter((p:unknown):p is {question:string;answer:string}=>typeof p==="object"&&p!==null&&typeof (p as {question?:unknown}).question==="string"&&typeof (p as {answer?:unknown}).answer==="string").slice(0,3):[]
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
      relationship_goal: profile.relationship_goal || null,
      interested_in: profile.interested_in,
      sexual_orientation: profile.sexual_orientation || null,
      show_sexual_orientation: profile.show_sexual_orientation,
      show_interested_in: profile.show_interested_in,
      interests: profile.interests,
      personality_prompts: profile.personality_prompts.filter(p=>p.question&&p.answer.trim()).map(p=>({question:p.question,answer:p.answer.trim()})),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    setMessage(error ? "Could not save: " + error.message : "Your profile has been saved!");
    setSaving(false);
  }

  const fieldStyle = { display: "block", width: "100%", marginTop: 7, padding: 13, border: "1px solid #eadcde", borderRadius: 12, fontSize: 16, background: "#fff", color: "#29222a" } as const;
  return <><SiteNav/><main style={{ minHeight: "100vh", background: "#fff5f5", color: "#29222a", padding: "32px 18px", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 650, margin: "0 auto" }}>
      <a href="/" style={{ color: "#d80621", textDecoration: "none", fontSize: 30, fontWeight: 800 }}>♥ ehdate.</a>
      <section style={{ marginTop: 35, background: "white", padding: "30px 25px", borderRadius: 24, boxShadow: "0 12px 35px #3a1d270c" }}>
        <h1 style={{ marginTop: 0, fontSize: 32 }}>My Profile</h1>
        {!loading&&userId&&(()=>{const items=[Boolean(profile.display_name&&profile.date_of_birth&&profile.gender&&profile.city&&profile.province),hasPhoto,Boolean(profile.bio.trim()),Boolean(profile.relationship_goal),profile.personality_prompts.some(p=>p.question&&p.answer.trim()),profile.interested_in.length>0];const done=items.filter(Boolean).length;return <div style={{background:"#fff3f5",borderRadius:18,padding:18,marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",gap:10,fontWeight:800,color:"#9c1d38"}}><span>Profile completion</span><span>{Math.round(done/items.length*100)}%</span></div><div role="progressbar" aria-label="Profile completion" aria-valuenow={Math.round(done/items.length*100)} aria-valuemin={0} aria-valuemax={100} style={{height:9,background:"#eed0d6",borderRadius:20,margin:"12px 0",overflow:"hidden"}}><div style={{width:(done/items.length*100)+"%",height:"100%",background:"#d80621",borderRadius:20}}/></div><p style={{fontSize:13,lineHeight:1.5,margin:"8px 0 0",color:"#685961"}}>{done===items.length?"Your profile is looking great!":"Complete your basics, add a photo, bio, relationship goal, personality prompt, and who you want to meet."}</p>{!hasPhoto&&<a href="/profile/photos" style={{display:"inline-block",marginTop:10,color:"#b61937",fontWeight:800}}>Add a profile photo →</a>}</div>})()}
        <p style={{ color: "#736871", lineHeight: 1.5 }}>Tell us a little about yourself. Your profile visibility and photo sharing are controlled in Privacy settings below.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5,background:"#fff5f5",padding:6,borderRadius:18,margin:"24px 0"}}>{([["edit","✎ Edit profile"],["preview","♡ Preview"],["settings","⚙ Settings"]] as const).map(([value,label])=><button type="button" key={value} onClick={()=>{setTab(value);setMessage("");}} style={{padding:"13px 4px",border:0,borderRadius:13,cursor:"pointer",fontWeight:800,background:tab===value?"#d80621":"transparent",color:tab===value?"white":"#5c5057"}}>{label}</button>)}</div>
        {loading ? <p>Loading your profile…</p> : !userId ? <p>Please <a href="/account">sign in</a> to create your profile.</p> :
        tab==="edit" ? <div><section style={{background:"#fff5f5",borderRadius:18,padding:18,marginBottom:24}}><h2 style={{margin:"0 0 6px"}}>Your photos</h2><p style={{color:"#74666e",fontSize:14}}>Photos make the first impression. Your first photo is your main photo.</p><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{Array.from({length:6},(_,i)=><div key={i} style={{aspectRatio:"3/4",background:"#f6dfe3",borderRadius:12,overflow:"hidden",position:"relative",display:"grid",placeItems:"center"}}>{photos[i]?<img src={photos[i]} alt={"Profile photo "+(i+1)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:30,color:"#bf8d97"}}>+</span>}{i===0&&photos[i]&&<span style={{position:"absolute",bottom:5,left:5,background:"#d80621",color:"white",borderRadius:10,padding:"3px 6px",fontSize:11}}>Main</span>}</div>)}</div><a href="/profile/photos" style={{display:"block",textAlign:"center",padding:13,marginTop:12,borderRadius:25,background:"white",color:"#d80621",fontWeight:800,textDecoration:"none"}}>Manage photos →</a></section><h2>About you</h2><form onSubmit={save} style={{ display: "grid", gap: 18, marginTop: 25 }}>
          <label>First name or display name<input style={fieldStyle} maxLength={60} required value={profile.display_name} onChange={e => setField("display_name", e.target.value)}/></label>
          <label>Date of birth<input style={fieldStyle} type="date" required value={profile.date_of_birth} onChange={e => setField("date_of_birth", e.target.value)}/></label>
          <label>Gender (optional)<select style={fieldStyle} value={profile.gender} onChange={e => setField("gender", e.target.value)}>
            <option value="">Select an option</option><option>Man</option><option>Woman</option><option>Non-binary</option><option>Prefer to self-describe</option><option>Prefer not to say</option>
          </select></label>
          <div style={{borderTop:"1px solid #f0e1e4",paddingTop:20}}>
            <h2 style={{fontSize:21,margin:"0 0 8px"}}>Dating preferences ♥</h2>
            <p style={{fontSize:14,color:"#776b72",lineHeight:1.5}}>Choose who you would like to meet. You can select more than one. Your choices are private unless you choose to show them.</p>
            <label>Sexual orientation (optional)<select style={fieldStyle} value={profile.sexual_orientation} onChange={e=>setField("sexual_orientation",e.target.value)}>
              <option value="">Prefer not to specify</option>{orientationOptions.map(o=><option key={o} value={o}>{o}</option>)}
            </select></label>
            <label style={{display:"flex",gap:9,alignItems:"center",marginTop:10,fontSize:14}}><input type="checkbox" checked={profile.show_sexual_orientation} onChange={e=>setField("show_sexual_orientation",e.target.checked)}/> Show my orientation on my profile</label>
            <p style={{fontWeight:700,margin:"22px 0 10px"}}>Interested in</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:9}}>{interestedOptions.map(([value,label])=>{const selected=profile.interested_in.includes(value);return <button key={value} type="button" aria-pressed={selected} onClick={()=>setField("interested_in",selected?profile.interested_in.filter(v=>v!==value):[...profile.interested_in,value])} style={{border:selected?"1px solid #d80621":"1px solid #ead5da",background:selected?"#d80621":"white",color:selected?"white":"#51434c",borderRadius:22,padding:"10px 14px",cursor:"pointer",fontWeight:700}}>{selected?"✓ ":""}{label}</button>})}</div>
            <p style={{fontSize:13,color:"#776b72"}}>Leave all unselected to see everyone until you choose your preferences.</p>
            <label style={{display:"flex",gap:9,alignItems:"center",marginTop:10,fontSize:14}}><input type="checkbox" checked={profile.show_interested_in} onChange={e=>setField("show_interested_in",e.target.checked)}/> Show who I am interested in on my profile</label>
          </div>
          <label>City<input style={fieldStyle} maxLength={100} required placeholder="e.g. Windsor" value={profile.city} onChange={e => setField("city", e.target.value)}/></label>
          <label>Province or territory<select style={fieldStyle} required value={profile.province} onChange={e => setField("province", e.target.value)}>
            <option value="">Select province or territory</option>{provinces.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
          </select></label>
          <label>About me (optional)<textarea style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }} maxLength={1000} placeholder="A little about you, your interests, and what makes you smile…" value={profile.bio} onChange={e => setField("bio", e.target.value)}/></label>
          <div style={{borderTop:"1px solid #f0e1e4",paddingTop:20}}>
            <h2 style={{fontSize:21,margin:"0 0 8px"}}>What are you looking for? ♥</h2>
            <p style={{color:"#776b72",fontSize:14}}>Choose your relationship goal (optional).</p>
            <select style={fieldStyle} value={profile.relationship_goal} onChange={e=>setField("relationship_goal",e.target.value)}>
              <option value="">Select a relationship goal</option>
              {relationshipGoals.map(goal=><option key={goal} value={goal}>{goal}</option>)}
            </select>
          </div>
          <div style={{borderTop:"1px solid #f0e1e4",paddingTop:20}}>
            <h2 style={{fontSize:21,margin:"0 0 8px"}}>Your interests ✨</h2>
            <p style={{color:"#776b72",fontSize:14}}>Pick up to 8 things you love. {profile.interests.length}/8 selected.</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
              {interestOptions.map(interest=>{const selected=profile.interests.includes(interest);return <button key={interest} type="button" aria-pressed={selected} onClick={()=>setField("interests",selected?profile.interests.filter(v=>v!==interest):profile.interests.length<8?[...profile.interests,interest]:profile.interests)} style={{border:selected?"1px solid #d80621":"1px solid #ead5da",background:selected?"#d80621":"white",color:selected?"white":"#51434c",borderRadius:22,padding:"9px 13px",cursor:"pointer",fontWeight:700,fontSize:13}}>{selected?"✓ ":""}{interest}</button>})}
            </div>
          </div>
          <div style={{borderTop:"1px solid #f0e1e4",paddingTop:20}}>
            <h2 style={{fontSize:21,margin:"0 0 8px"}}>Personality prompts 💬</h2>
            <p style={{fontSize:14,color:"#776b72",lineHeight:1.5}}>Answer up to 3 fun questions to show more of your personality. Each answer can be up to 200 characters.</p>
            <div style={{display:"grid",gap:14}}>
              {profile.personality_prompts.map((prompt,i)=><div key={i} style={{padding:14,background:"#fff5f5",borderRadius:14}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <select aria-label={"Prompt "+(i+1)} style={{...fieldStyle,flex:1,minWidth:0}} value={prompt.question} onChange={e=>setField("personality_prompts",profile.personality_prompts.map((p,j)=>j===i?{...p,question:e.target.value}:p))}>
                    {promptOptions.map(option=><option key={option} value={option} disabled={profile.personality_prompts.some((p,j)=>j!==i&&p.question===option)}>{option}</option>)}
                  </select>
                  <button type="button" aria-label={"Remove prompt "+(i+1)} onClick={()=>setField("personality_prompts",profile.personality_prompts.filter((_,j)=>j!==i))} style={{border:0,background:"white",color:"#d80621",borderRadius:10,padding:12,cursor:"pointer"}}>✕</button>
                </div>
                <textarea maxLength={200} value={prompt.answer} placeholder="Your answer…" onChange={e=>setField("personality_prompts",profile.personality_prompts.map((p,j)=>j===i?{...p,answer:e.target.value}:p))} style={{...fieldStyle,minHeight:76,resize:"vertical"}}/>
                <div style={{textAlign:"right",fontSize:12,color:"#887780"}}>{prompt.answer.length}/200</div>
              </div>)}
              {profile.personality_prompts.length<3&&<button type="button" onClick={()=>{const question=promptOptions.find(q=>!profile.personality_prompts.some(p=>p.question===q));if(question)setField("personality_prompts",[...profile.personality_prompts,{question,answer:""}]);}} style={{border:"1px dashed #d80621",background:"white",color:"#d80621",padding:14,borderRadius:14,fontWeight:800,cursor:"pointer"}}>+ Add a prompt</button>}
            </div>
          </div>
          <button disabled={saving} type="submit" style={{ border: 0, background: "#d80621", color: "white", padding: 16, borderRadius: 100, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save my profile"}</button>
        </form></div> : tab==="preview" ? <div style={{borderRadius:18,overflow:"hidden",background:"#fff5f5"}}><div style={{height:"min(60vh,520px)",minHeight:300,background:"linear-gradient(135deg,#ffb9c2,#d80621)",display:"grid",placeItems:"center",position:"relative",overflow:"hidden",isolation:"isolate"}}>{photos.length?<img src={photos[photoIndex]} alt="Your profile photo" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<span style={{fontSize:80,color:"white"}}>♥</span>}{photos.length>1&&<div style={{position:"absolute",bottom:12,display:"flex",alignItems:"center",gap:14,background:"#0008",color:"white",borderRadius:25,padding:7}}><button onClick={()=>setPhotoIndex(i=>(i+photos.length-1)%photos.length)} aria-label="Previous photo">‹</button>{photoIndex+1} / {photos.length}<button onClick={()=>setPhotoIndex(i=>(i+1)%photos.length)} aria-label="Next photo">›</button></div>}</div><div style={{padding:22}}><h2 style={{fontSize:28}}>{profile.display_name||"Your name"}</h2><p style={{color:"#d80621"}}>📍 {[profile.city,profile.province].filter(Boolean).join(", ")}</p><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{profile.bio||"Your bio will appear here."}</p>{profile.relationship_goal&&<p style={{fontWeight:800,color:"#a52640"}}>♥ {profile.relationship_goal}</p>}{profile.show_sexual_orientation&&profile.sexual_orientation&&<p style={{color:"#a52640"}}>Orientation: {profile.sexual_orientation}</p>}{profile.show_interested_in&&profile.interested_in.length>0&&<p style={{color:"#a52640"}}>Interested in: {profile.interested_in.map(v=>v==="Man"?"Men":v==="Woman"?"Women":"Non-binary people").join(", ")}</p>}{profile.interests.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"18px 0"}}>{profile.interests.map(interest=><span key={interest} style={{padding:"8px 12px",background:"white",borderRadius:22,fontSize:13,fontWeight:700}}>{interest}</span>)}</div>}{profile.personality_prompts.filter(p=>p.answer.trim()).map((p,i)=><div key={i} style={{background:"white",padding:16,borderRadius:14,margin:"12px 0"}}><strong style={{color:"#b61c37"}}>{p.question}</strong><p style={{lineHeight:1.6,marginBottom:0,whiteSpace:"pre-wrap"}}>{p.answer}</p></div>)}<button onClick={()=>setTab("edit")} style={{border:0,borderRadius:25,padding:14,background:"#d80621",color:"white",fontWeight:800,cursor:"pointer"}}>Edit profile</button></div></div> : null}
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
  </main></>;
}
