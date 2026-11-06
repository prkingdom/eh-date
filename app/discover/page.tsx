"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import SiteNav from "../components/SiteNav";
import SafetyActions from "../components/SafetyActions";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Member={user_id:string;display_name:string;age:number;city:string|null;province:string|null;bio:string|null;relationship_goal:string|null;interests:string[]|null;personality_prompts:{question:string;answer:string}[]|null;sexual_orientation:string|null;interested_in:string[]|null};
const provinces=[["","Anywhere in Canada"],["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"]];
const inputStyle={width:"100%",padding:12,border:"1px solid #e7cbd0",borderRadius:12,background:"white",fontSize:15};
// Deployment sync: Discovery now shows complete profiles and top-positioned swipe controls.
export default function Discover(){
 const [userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [min,setMin]=useState(18),[max,setMax]=useState(99),[province,setProvince]=useState(""),[visible,setVisible]=useState(false);
 const [members,setMembers]=useState<Member[]>([]),[message,setMessage]=useState(""),[hasProfile,setHasProfile]=useState(false);
 const [photoUrls,setPhotoUrls]=useState<string[]>([]),[photoIndex,setPhotoIndex]=useState(0),[settingsOpen,setSettingsOpen]=useState(false);
 const [lastNeh,setLastNeh]=useState(""),[undoBusy,setUndoBusy]=useState(false);
 const [dragX,setDragX]=useState(0),[dragging,setDragging]=useState(false),[flying,setFlying]=useState(false),[matchName,setMatchName]=useState("");
 const touchStart=useRef<{x:number;y:number}|null>(null);
 const swipeLock=useRef(false);
 async function refresh(){if(!supabase)return;const {data,error}=await supabase.rpc("discover_members_with_preferences",{max_results:20});if(error)setMessage(error.message);else setMembers(data??[]);}
 useEffect(()=>{async function load(){
  if(!supabase){setMessage("Account connection unavailable.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setLoading(false);return;}
  setUserId(user.id);
  const [pref,profile]=await Promise.all([
   supabase.from("discovery_preferences").select("minimum_age,maximum_age,preferred_province,is_discoverable,share_photos").eq("user_id",user.id).maybeSingle(),
   supabase.from("profiles").select("user_id").eq("user_id",user.id).maybeSingle()
  ]);
  setHasProfile(Boolean(profile.data));
  if(pref.data){setMin(pref.data.minimum_age);setMax(pref.data.maximum_age);setProvince(pref.data.preferred_province??"");setVisible(pref.data.is_discoverable);}
  if(pref.data?.is_discoverable)await refresh();
  setLoading(false);
 }void load();},[]);
 async function save(){
  if(!supabase||!userId)return;
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>100||min>max){setMessage("Choose a valid age range between 18 and 100.");return;}

  setBusy(true);setMessage("");
  const {error}=await supabase.from("discovery_preferences").upsert({user_id:userId,minimum_age:min,maximum_age:max,preferred_province:province||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)setMessage(error.message);
  else{setMessage("Filters saved.");await refresh();setSettingsOpen(false);}
  setBusy(false);
 }
 async function swipe(target:string,decision:"YEH"|"NEH"){
  if(!supabase||!userId||swipeLock.current)return;
  swipeLock.current=true;setBusy(true);setMessage("");
  setDragging(false);setFlying(true);setDragX(decision==="YEH"?Math.max(window.innerWidth+260,Math.abs(dragX)+window.innerWidth): -Math.max(window.innerWidth+260,Math.abs(dragX)+window.innerWidth));
  await new Promise(resolve=>setTimeout(resolve,320));
  const {data:isMatch,error}=await supabase.rpc("submit_swipe",{p_target_id:target,p_decision:decision});
  if(error)setMessage("Could not record your choice: "+error.message);
  else{
   if(decision==="YEH"&&isMatch===true){
    setMatchName(members.find(m=>m.user_id===target)?.display_name||"your new connection");
    setMessage("");
   }else setMessage(decision==="YEH"?"YEH saved! If they YEH you too, you'll match.":"NEH saved.");
   if(decision==="NEH")setLastNeh(target);else setLastNeh("");
   setMembers(m=>m.filter(p=>p.user_id!==target));
  }
  setFlying(false);setDragX(0);setBusy(false);swipeLock.current=false;
 }
 async function undoNeh(){
  if(!supabase||!lastNeh||undoBusy)return;
  setUndoBusy(true);const {data,error}=await supabase.rpc("undo_last_neh");
  if(error)setMessage("Undo failed: "+error.message);
  else if(data){setLastNeh("");setMessage("Last NEH undone.");await refresh();}
  else{setLastNeh("");setMessage("Undo expired. You can undo your most recent NEH within 10 minutes.");}
  setUndoBusy(false);
 }
 const member=members[0];
 useEffect(()=>{let active=true;setPhotoUrls([]);setPhotoIndex(0);
  async function loadPhotos(){if(!supabase||!member||!visible)return;
   const {data,error}=await supabase.storage.from("profile-photos").list(member.user_id,{limit:6,sortBy:{column:"created_at",order:"asc"}});
   if(error||!data||!active)return;
   const paths=data.filter(p=>p.name&&!p.name.startsWith(".")).slice(0,6).map(p=>member.user_id+"/"+p.name);
   const {data:urls}=await supabase.storage.from("profile-photos").createSignedUrls(paths,120);
   if(active)setPhotoUrls((urls??[]).map(p=>p.signedUrl).filter((signedUrl): signedUrl is string => typeof signedUrl === "string"));
  }void loadPhotos();return()=>{active=false;};
 },[member?.user_id,visible]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#272126"}}>
  <SiteNav/>
  <div style={{maxWidth:1000,margin:"auto",padding:"32px 18px"}}>
   <div style={{display:"grid",gridTemplateColumns:"1fr",gap:24,marginTop:28,alignItems:"start"}}>
    <section style={{background:"white",borderRadius:22,padding:24}}>
     <button type="button" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(v=>!v)} style={{border:0,background:"transparent",fontWeight:800,fontSize:17,color:"#d80621",cursor:"pointer",padding:0}}>☷ Filters {settingsOpen?"▲":"▼"}</button>
     {settingsOpen&&<div style={{marginTop:20}}>
     {loading?<p>Loading…</p>:!userId?<p><a href="/account" style={{color:"#c6001d"}}>Sign in</a> to continue.</p>:<>
      {!hasProfile&&<p>First <a href="/profile" style={{color:"#c6001d"}}>complete your profile</a>.</p>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
       <label>Minimum age<input type="number" min={18} max={100} value={min} onChange={e=>setMin(Number(e.target.value))} style={inputStyle}/></label>
       <label>Maximum age<input type="number" min={18} max={100} value={max} onChange={e=>setMax(Number(e.target.value))} style={inputStyle}/></label>
      </div>
      <label style={{display:"block",marginTop:18}}>Province or territory<select value={province} onChange={e=>setProvince(e.target.value)} style={{...inputStyle,marginTop:8}}>{provinces.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      <button disabled={busy} onClick={()=>void save()} style={{marginTop:20,padding:"14px 24px",border:0,borderRadius:28,background:"#d80621",color:"white",fontWeight:800,cursor:"pointer"}}>{busy?"Please wait…":"Save settings"}</button>
     </>}
     </div>}
     {message&&<p role="status" style={{color:"#a60020",lineHeight:1.5}}>{message}</p>}
    </section>
    {lastNeh&&<button type="button" disabled={undoBusy||busy} onClick={()=>void undoNeh()} style={{border:"1px solid #d80621",borderRadius:20,background:"white",color:"#d80621",fontWeight:800,padding:12,cursor:"pointer"}}>↶ Undo last NEH</button>}
    <section onTouchStart={e=>{if(busy||!member||e.touches.length!==1)return;touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchMove={e=>{if(!touchStart.current||busy||!member)return;const dx=e.touches[0].clientX-touchStart.current.x;const dy=e.touches[0].clientY-touchStart.current.y;if(Math.abs(dy)>Math.abs(dx)*1.2){setDragging(false);setDragX(0);return;}if(Math.abs(dx)>15){setDragging(true);setDragX(dx);}}} onTouchEnd={()=>{const dx=dragX;touchStart.current=null;setDragging(false);if(Math.abs(dx)>95&&member&&!busy)void swipe(member.user_id,dx>0?"YEH":"NEH");else setDragX(0);}}>
     {!userId?<div style={{background:"white",borderRadius:22,padding:30}}>Sign in to discover members.</div>:!visible?<div style={{background:"white",borderRadius:22,padding:30}}><h2>Discovery is off</h2><p>Make your profile public in My Profile → Privacy settings to see other members.</p></div>:member?<div style={{position:"relative",isolation:"isolate"}}>
     {members[1]&&<div aria-hidden="true" style={{position:"absolute",inset:"10px 12px 0",background:"white",borderRadius:24,boxShadow:"0 8px 30px #70132314",transform:flying?"scale(1)":"scale(.97)",transition:"transform .32s ease",padding:24,overflow:"hidden",zIndex:0}}><div style={{height:60,background:"#fff1f3",borderRadius:30}}/><div style={{height:"min(65vh,560px)",minHeight:340,background:"linear-gradient(145deg,#ffb4b9,#d80621)",display:"grid",placeItems:"center",marginTop:16,borderRadius:12,color:"white",fontSize:70}}>♥</div><h2>{members[1].display_name}, {members[1].age}</h2></div>}
     <div style={{position:"relative",zIndex:1,background:"white",borderRadius:24,overflow:"hidden",boxShadow:"0 10px 36px #70132316",transform:`translateX(${dragX}px) rotate(${Math.max(-16,Math.min(16,dragX/35))}deg)`,opacity:flying?0.7:1,transition:dragging?"none":flying?"transform .32s cubic-bezier(.2,.8,.2,1),opacity .32s ease":"transform .3s cubic-bezier(.2,.8,.2,1)",touchAction:"pan-y",willChange:"transform"}}>
      {(dragging||flying)&&<div style={{textAlign:"center",fontWeight:900,paddingTop:10,color:dragX>0?"#15803d":"#a52640"}}>{dragX>0?"♥ YEH":"✕ NEH"}</div>}
      <div style={{display:"flex",gap:12,justifyContent:"center",padding:"18px 20px"}}>
       <button disabled={busy} onClick={()=>void swipe(member.user_id,"NEH")} style={{padding:"15px 25px",borderRadius:30,border:"2px solid #d80621",background:"white",color:"#d80621",fontWeight:800,cursor:"pointer"}}>✕ NEH</button>
       <button disabled={busy} onClick={()=>void swipe(member.user_id,"YEH")} style={{padding:"15px 25px",borderRadius:30,border:0,background:"#d80621",color:"white",fontWeight:800,cursor:"pointer"}}>♥ YEH</button>
      </div>
      <div style={{height:"min(65vh,560px)",minHeight:340,background:"linear-gradient(145deg,#ffb4b9,#d80621)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:88,position:"relative",overflow:"hidden"}}>
       {photoUrls.length?<><img src={photoUrls[photoIndex]} alt={"Profile photo "+(photoIndex+1)+" of "+photoUrls.length} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
       {photoUrls.length>1&&<div style={{position:"absolute",bottom:12,display:"flex",gap:12,alignItems:"center",background:"#0009",padding:"7px 12px",borderRadius:25,fontSize:14}}>
        <button aria-label="Previous photo" onClick={()=>setPhotoIndex(i=>(i+photoUrls.length-1)%photoUrls.length)} style={{border:0,background:"transparent",color:"white",fontSize:22,cursor:"pointer"}}>‹</button>
        {photoIndex+1} / {photoUrls.length}
        <button aria-label="Next photo" onClick={()=>setPhotoIndex(i=>(i+1)%photoUrls.length)} style={{border:0,background:"transparent",color:"white",fontSize:22,cursor:"pointer"}}>›</button>
       </div>}</>:<span aria-label="No profile photo">♥</span>}
      </div>
      <div style={{padding:24}}>
       <h2 style={{margin:"0 0 10px"}}>{member.display_name}, {member.age}</h2>
       <p style={{color:"#a2263d"}}>📍 {[member.city,member.province].filter(Boolean).join(", ")||"Canada"}</p>
       <p style={{lineHeight:1.6,whiteSpace:"pre-wrap",}}>{member.bio||"Say hello!"}</p>
       {member.relationship_goal&&<p style={{fontWeight:800,color:"#a52640",margin:"14px 0"}}>♥ {member.relationship_goal}</p>}
       {member.sexual_orientation&&<p style={{color:"#a52640"}}>Orientation: {member.sexual_orientation}</p>}
       {!!member.interested_in?.length&&<p style={{color:"#a52640"}}>Interested in: {member.interested_in.map(v=>v==="Man"?"Men":v==="Woman"?"Women":"Non-binary people").join(", ")}</p>}
       {!!member.interests?.length&&<div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0"}}>{member.interests.map(interest=><span key={interest} style={{padding:"8px 12px",borderRadius:22,background:"#fff0f2",color:"#8e2338",fontWeight:700,fontSize:13}}>{interest}</span>)}</div>}
       {!!member.personality_prompts?.length&&<div style={{display:"grid",gap:10,margin:"18px 0"}}>{member.personality_prompts.filter(p=>p.question&&p.answer).map((p,i)=><div key={i} style={{background:"#fff5f5",borderRadius:14,padding:15}}><strong style={{color:"#a52640"}}>{p.question}</strong><p style={{lineHeight:1.6,margin:"8px 0 0",whiteSpace:"pre-wrap"}}>{p.answer}</p></div>)}</div>}
       <SafetyActions key={member.user_id} targetId={member.user_id} onBlocked={()=>{setMembers(current=>current.filter(m=>m.user_id!==member.user_id));setMessage("Member blocked.");}}/>
      </div>

     </div></div>:<div style={{background:"white",borderRadius:22,padding:30,textAlign:"center"}}>
      <div style={{fontSize:52,color:"#d80621"}}>♥</div><h2>No profiles to show yet</h2>
      <p style={{lineHeight:1.6,color:"#72676d"}}>When other Canadians opt in and match your preferences, their profiles will appear here.</p>
      <button onClick={()=>void refresh()} style={{border:0,background:"#d80621",color:"white",padding:"13px 22px",borderRadius:30,cursor:"pointer"}}>Refresh profiles</button>
     </div>}
    </section>
   </div>
  </div>
  {matchName&&<div role="dialog" aria-modal="true" aria-label="New match" style={{position:"fixed",inset:0,zIndex:200,background:"#310b20c9",display:"grid",placeItems:"center",padding:20}}><div style={{background:"white",borderRadius:28,padding:"38px 24px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 80px #0005"}}><div style={{fontSize:64,color:"#d80621"}}>♥</div><h2 style={{fontSize:34,color:"#d80621",margin:"10px 0"}}>It’s a Match!</h2><p style={{lineHeight:1.6}}>You and {matchName} both said YEH! ♥</p><a href="/matches" style={{display:"block",background:"#d80621",color:"white",padding:14,borderRadius:30,fontWeight:800,marginTop:20}}>See your match</a><a href="/messages" style={{display:"block",border:"2px solid #d80621",color:"#d80621",padding:12,borderRadius:30,fontWeight:800,marginTop:10}}>Start chatting</a><button type="button" onClick={()=>setMatchName("")} style={{border:0,background:"transparent",padding:15,color:"#9b2440",cursor:"pointer"}}>Keep discovering</button></div></div>}
 </main>;
}
