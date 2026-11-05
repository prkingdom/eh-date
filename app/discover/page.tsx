"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const provinces = [["","Anywhere in Canada"],["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"]];
const examples = [
 {name:"Your next connection",age:"25",city:"Toronto, ON",bio:"Good conversations, weekend adventures, and discovering new places.",initials:"♥",gradient:"linear-gradient(145deg,#ff9b9f,#d80621)"},
 {name:"Someone nearby",age:"29",city:"Windsor, ON",bio:"Coffee, concerts, and enjoying the little things.",initials:"✦",gradient:"linear-gradient(145deg,#ffb7a2,#b92045)"},
 {name:"A new possibility",age:"27",city:"Vancouver, BC",bio:"Hikes, good food, and making memories.",initials:"✿",gradient:"linear-gradient(145deg,#f9a9b6,#df2645)"}
];
export default function DiscoverPage() {
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const [minimumAge,setMinimumAge]=useState(18);
 const [maximumAge,setMaximumAge]=useState(99);
 const [province,setProvince]=useState("");
 const [index,setIndex]=useState(0);
 const [yes,setYes]=useState(0);
 const [no,setNo]=useState(0);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{async function load(){
  if(!supabase){setSignedIn(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  setSignedIn(Boolean(user));
  if(!user)return;
  const {data}=await supabase.from("discovery_preferences").select("minimum_age,maximum_age,preferred_province").eq("user_id",user.id).maybeSingle();
  if(data){setMinimumAge(data.minimum_age);setMaximumAge(data.maximum_age);setProvince(data.preferred_province??"");}
 }void load();},[]);
 async function savePreferences(){
  if(!supabase)return;
  if(minimumAge>maximumAge){setMessage("Minimum age cannot be higher than maximum age.");return;}
  setSaving(true);setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("Please sign in first.");setSaving(false);return;}
  const {error}=await supabase.from("discovery_preferences").upsert({
   user_id:user.id,minimum_age:minimumAge,maximum_age:maximumAge,preferred_province:province||null,
   is_discoverable:false,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  setMessage(error?"Could not save preferences: "+error.message:"Your preferences have been saved. Discovery remains off until safety features are ready.");
  setSaving(false);
 }
 function choose(decision:"YEH"|"NEH"){
  if(decision==="YEH")setYes(n=>n+1);else setNo(n=>n+1);
  setIndex(i=>i+1);
 }
 const current=examples[index%examples.length];
 const finished=index>=3;
 const selectStyle={width:"100%",padding:12,border:"1px solid #e9cfd3",borderRadius:12,background:"white",fontSize:15,color:"#262026"} as const;
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#272126"}}>
  <header style={{background:"#d80621",color:"white",padding:"20px max(20px,6vw)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
   <a href="/" style={{fontSize:28,fontWeight:800,textDecoration:"none",color:"white"}}>♥ ehdate.</a>
   <a href="/profile" style={{color:"white",fontWeight:700,textDecoration:"none"}}>My profile</a>
  </header>
  <div style={{maxWidth:1000,margin:"0 auto",padding:"35px 20px"}}>
   <h1 style={{fontSize:"clamp(30px,5vw,44px)",margin:"0 0 8px"}}>Discover your next connection</h1>
   <p style={{color:"#75676d",lineHeight:1.5,marginBottom:24}}>Canadians Meet Here. 🇨🇦</p>
   <div style={{background:"#fff0d8",border:"1px solid #f4cf8d",padding:16,borderRadius:14,lineHeight:1.5,marginBottom:24}}>
    <strong>Preview mode:</strong> These are fictional sample cards, not real members. YEH and NEH are only demonstrations and are not saved. Real discovery will launch after privacy and safety protections are completed.
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:28,alignItems:"start"}}>
    <section style={{background:"white",borderRadius:22,padding:20,boxShadow:"0 8px 30px #5c14200d"}}>
     <h2 style={{marginTop:0}}>Your preferences</h2>
     {signedIn===false&&<p><a href="/account" style={{color:"#c6001d"}}>Sign in</a> to save your preferences.</p>}
     <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <label>Minimum age<input aria-label="Minimum age" type="number" min={18} max={100} value={minimumAge} onChange={e=>setMinimumAge(Number(e.target.value))} style={selectStyle}/></label>
      <label>Maximum age<input aria-label="Maximum age" type="number" min={18} max={100} value={maximumAge} onChange={e=>setMaximumAge(Number(e.target.value))} style={selectStyle}/></label>
     </div>
     <label style={{display:"block",marginTop:18}}>Province or territory<select value={province} onChange={e=>setProvince(e.target.value)} style={{...selectStyle,marginTop:7}}>
      {provinces.map(([code,label])=><option key={code} value={code}>{label}</option>)}
     </select></label>
     <button disabled={saving||signedIn!==true} onClick={()=>void savePreferences()} style={{background:"#d80621",color:"white",border:0,borderRadius:40,padding:"14px 22px",fontWeight:800,marginTop:20,cursor:"pointer",opacity:signedIn!==true?.5:1}}>{saving?"Saving…":"Save preferences"}</button>
     {message&&<p role="status" style={{lineHeight:1.5,color:"#a0001c"}}>{message}</p>}
     <p style={{fontSize:13,color:"#806c72",lineHeight:1.5}}>Your profile is not visible to other members yet.</p>
    </section>
    <section style={{maxWidth:440,width:"100%",margin:"0 auto"}}>
     {!finished?<div style={{background:"white",borderRadius:24,overflow:"hidden",boxShadow:"0 12px 40px #701b271b"}}>
      <div style={{height:340,background:current.gradient,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white"}}>
       <div style={{fontSize:110,fontWeight:700}}>{current.initials}</div><span style={{background:"#ffffff33",padding:"8px 14px",borderRadius:30,fontSize:13}}>SAMPLE PROFILE</span>
      </div>
      <div style={{padding:22}}>
       <h2 style={{fontSize:27,margin:"0 0 6px"}}>{current.name}, {current.age}</h2>
       <p style={{color:"#a52a3c",fontWeight:700,margin:"0 0 14px"}}>📍 {current.city}</p>
       <p style={{color:"#675e63",lineHeight:1.5}}>{current.bio}</p>
      </div>
     </div>:<div style={{background:"white",padding:32,borderRadius:24,textAlign:"center"}}>
      <div style={{fontSize:58}}>♥</div><h2>Preview complete!</h2>
      <p>You've tried {yes} YEH{yes===1?"":"s"} and {no} NEH{no===1?"":"s"}.</p>
      <button onClick={()=>{setIndex(0);setYes(0);setNo(0);}} style={{border:0,borderRadius:30,padding:"14px 20px",background:"#d80621",color:"white",fontWeight:700,cursor:"pointer"}}>Try again</button>
     </div>}
     {!finished&&<div style={{display:"flex",gap:18,justifyContent:"center",marginTop:24}}>
      <button onClick={()=>choose("NEH")} style={{background:"white",border:"2px solid #e4c7cb",color:"#c6001d",borderRadius:60,padding:"16px 30px",fontSize:19,fontWeight:800,cursor:"pointer"}}>✕ NEH</button>
      <button onClick={()=>choose("YEH")} style={{background:"#d80621",border:"2px solid #d80621",color:"white",borderRadius:60,padding:"16px 30px",fontSize:19,fontWeight:800,cursor:"pointer"}}>♥ YEH</button>
     </div>}
    </section>
   </div>
  </div>
 </main>;
}
