"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import SiteNav from "../components/SiteNav";
import SafetyActions from "../components/SafetyActions";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Member={user_id:string;display_name:string;age:number;city:string|null;province:string|null;bio:string|null;relationship_goal:string|null;interests:string[]|null;personality_prompts:{question:string;answer:string}[]|null;sexual_orientation:string|null;interested_in:string[]|null};
// Deployment sync: Discovery now shows complete profiles and top-positioned swipe controls.
export default function Discover(){
 const [userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [min,setMin]=useState(18),[max,setMax]=useState(99),[visible,setVisible]=useState(false);
 const [radius,setRadius]=useState<number|null>(null),[hasLocation,setHasLocation]=useState(false),[locating,setLocating]=useState(false);
 const [approvedIds,setApprovedIds]=useState<string[]>([]);\n const [members,setMembers]=useState<Member[]>([]),[message,setMessage]=useState(""),[hasProfile,setHasProfile]=useState(false);
 const [photoUrls,setPhotoUrls]=useState<string[]>([]),[photoIndex,setPhotoIndex]=useState(0),[settingsOpen,setSettingsOpen]=useState(false);
 const [lastNeh,setLastNeh]=useState(""),[undoBusy,setUndoBusy]=useState(false);
 const [dragX,setDragX]=useState(0),[dragging,setDragging]=useState(false),[flying,setFlying]=useState(false),[matchName,setMatchName]=useState("");
 const touchStart=useRef<{x:number;y:number}|null>(null);
 const swipeLock=useRef(false);
 async function refresh(){if(!supabase)return;const {data,error}=await supabase.rpc("discover_members_nearby",{max_results:20});if(error)setMessage(error.message);else {setMembers(data??[]);const ids=(data??[]).map((m:Member)=>m.user_id);if(ids.length){const {data:verified}=await supabase.rpc("approved_photo_review_ids",{member_ids:ids});setApprovedIds((verified??[]).map((v:{user_id:string})=>v.user_id));}else setApprovedIds([]);}}
 useEffect(()=>{async function load(){
  if(!supabase){setMessage("Account connection unavailable.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setLoading(false);return;}
  setUserId(user.id);
  const [pref,profile]=await Promise.all([
   supabase.from("discovery_preferences").select("minimum_age,maximum_age,is_discoverable,share_photos,radius_km,latitude,longitude").eq("user_id",user.id).maybeSingle(),
   supabase.from("profiles").select("user_id").eq("user_id",user.id).maybeSingle()
  ]);
  setHasProfile(Boolean(profile.data));
  if(pref.data){setMin(pref.data.minimum_age);setMax(pref.data.maximum_age);setVisible(pref.data.is_discoverable);setRadius(pref.data.radius_km);setHasLocation(pref.data.latitude!==null&&pref.data.longitude!==null);}
  if(pref.data?.is_discoverable)await refresh();
  setLoading(false);
 }void load();},[]);
 async function save(){
  if(!supabase||!userId)return;
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>100||min>max){setMessage("Choose a valid age range between 18 and 100.");return;}

  setBusy(true);setMessage("");
  const {error}=await supabase.from("discovery_preferences").upsert({user_id:userId,minimum_age:min,maximum_age:max,preferred_province:null,radius_km:radius,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)setMessage(error.message);
  else{setMessage("Filters saved.");await refresh();setSettingsOpen(false);}
  setBusy(false);
 }
 async function shareApproxLocation(){
  if(!supabase||!userId)return;
  if(!navigator.geolocation){setMessage("Location is not supported by this browser.");return;}
  setLocating(true);
  navigator.geolocation.getCurrentPosition(async position=>{
   const latitude=Math.round(position.coords.latitude*100)/100,longitude=Math.round(position.coords.longitude*100)/100;
   const {error}=await supabase!.from("discovery_preferences").update({latitude,longitude,updated_at:new Date().toISOString()}).eq("user_id",userId);
   setLocating(false);if(error)setMessage("Could not save location: "+error.message);else{setHasLocation(true);setMessage("Approximate location saved (about 1 km precision).");await refresh();}
  },()=>{setLocating(false);setMessage("Location permission was denied or unavailable.");},{enableHighAccuracy:false,timeout:10000});
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
 return <><style>{`
 .eh-range{position:absolute;left:0;top:0;width:100%;height:44px;margin:0;background:transparent;appearance:none;-webkit-appearance:none;pointer-events:none;outline-offset:3px}
 .eh-range::-webkit-slider-runnable-track{height:7px;background:transparent}
 .eh-range::-moz-range-track{height:7px;background:transparent}
 .eh-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #d80621;box-shadow:0 2px 7px #6c122c35;pointer-events:auto;cursor:grab;margin-top:-9px}
 .eh-range::-moz-range-thumb{width:19px;height:19px;border-radius:50%;background:#fff;border:3px solid #d80621;box-shadow:0 2px 7px #6c122c35;pointer-events:auto;cursor:grab}
 `}</style><main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#272126"}}>
  <SiteNav onFiltersClick={()=>setSettingsOpen(v=>!v)} filtersOpen={settingsOpen}/>
  <div className="eh-discovery-content" style={{maxWidth:1000,margin:"auto",padding:"12px 12px 100px"}}>
   <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginTop:4,alignItems:"start"}}>
    <div className="eh-discovery-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"0 2px"}}>
      <h1 style={{margin:0,fontSize:24,fontWeight:900,color:"#272126"}}>Discover</h1>
      <button type="button" aria-expanded={settingsOpen} aria-controls="discovery-filters" onClick={()=>setSettingsOpen(v=>!v)} style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid #eed0d7",borderRadius:24,background:"white",color:"#b31c39",fontWeight:800,fontSize:14,padding:"11px 17px",cursor:"pointer",boxShadow:"0 3px 10px #7013230d"}}>☷ Filters {settingsOpen?"▲":"▼"}</button>
     </div>
     {settingsOpen&&<section id="discovery-filters" style={{background:"white",borderRadius:20,padding:"18px 20px",boxShadow:"0 6px 24px #7013230d"}}><div style={{marginTop:0}}>
     {loading?<p>Loading…</p>:!userId?<p><a href="/account" style={{color:"#c6001d"}}>Sign in</a> to continue.</p>:<>
      {!hasProfile&&<p>First <a href="/profile" style={{color:"#c6001d"}}>complete your profile</a>.</p>}
      <div style={{marginTop:14}}>
       <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:800}}><span>Age range</span><span style={{color:"#d80621"}}>{min} – {max===100?"100+":max} years</span></div>
       <div style={{position:"relative",height:44,margin:"12px 9px 0"}}>
        <div style={{position:"absolute",top:18,left:0,right:0,height:7,borderRadius:10,background:"#f0d5dc"}}/>
        <div style={{position:"absolute",top:18,left:`${((min-18)/82)*100}%`,width:`${((max-min)/82)*100}%`,height:7,borderRadius:10,background:"#d80621",pointerEvents:"none"}}/>
        <input aria-label="Minimum age" type="range" min={18} max={100} step={1} value={min} onChange={e=>setMin(Math.min(Number(e.target.value),max))} className="eh-range eh-range-min" style={{zIndex:min>=max-1?4:2}}/>
        <input aria-label="Maximum age" type="range" min={18} max={100} step={1} value={max} onChange={e=>setMax(Math.max(Number(e.target.value),min))} className="eh-range eh-range-max" style={{zIndex:3}}/>
       </div>
       <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8b7780"}}><span>18</span><span>100+</span></div>
      </div>
      
      <div style={{marginTop:20}}>
       <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><strong>Distance</strong><strong style={{color:"#d80621"}}>{radius===null?"Anywhere in Canada":radius+" km"}</strong></div>
       <input aria-label="Maximum distance" type="range" min={5} max={505} step={5} value={radius??505} onChange={e=>setRadius(Number(e.target.value)===505?null:Number(e.target.value))} style={{width:"100%",marginTop:14,accentColor:"#d80621",height:24,cursor:"pointer"}}/>
       <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8b7780"}}><span>5 km</span><span>Anywhere in Canada</span></div>
      </div>
      <button type="button" disabled={locating} onClick={()=>void shareApproxLocation()} style={{marginTop:10,padding:"10px 14px",borderRadius:12,border:"1px solid #d80621",background:"white",color:"#d80621"}}>{locating?"Getting location…":hasLocation?"Update approximate location":"Share approximate location"}</button><p style={{fontSize:12,color:"#76646d"}}>Optional. Your coordinates are rounded to roughly 1 km and kept private. Distance results require both members to share a location; Anywhere in Canada does not.</p>
      <button disabled={busy} onClick={()=>void save()} style={{marginTop:20,padding:"14px 24px",border:0,borderRadius:28,background:"#d80621",color:"white",fontWeight:800,cursor:"pointer"}}>{busy?"Please wait…":"Save settings"}</button>
     </>}
     </div>
</section>}
          {message&&<p role="status" style={{color:"#a60020",lineHeight:1.5}}>{message}</p>}

     {lastNeh&&<button type="button" disabled={undoBusy||busy} onClick={()=>void undoNeh()} style={{alignSelf:"flex-start",border:"1px solid #d80621",borderRadius:20,background:"white",color:"#d80621",fontWeight:800,padding:12,cursor:"pointer"}}>↶ Undo last NEH</button>}
    <section onTouchStart={e=>{if(busy||!member||e.touches.length!==1)return;touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchMove={e=>{if(!touchStart.current||busy||!member)return;const dx=e.touches[0].clientX-touchStart.current.x;const dy=e.touches[0].clientY-touchStart.current.y;if(Math.abs(dy)>Math.abs(dx)*1.2){setDragging(false);setDragX(0);return;}if(Math.abs(dx)>15){setDragging(true);setDragX(dx);}}} onTouchEnd={()=>{const dx=dragX;touchStart.current=null;setDragging(false);if(Math.abs(dx)>95&&member&&!busy)void swipe(member.user_id,dx>0?"YEH":"NEH");else setDragX(0);}}>
     {!userId?<div style={{background:"white",borderRadius:22,padding:30}}>Sign in to discover members.</div>:!visible?<div style={{background:"white",borderRadius:22,padding:30}}><h2>Discovery is off</h2><p>Make your profile public in My Profile → Privacy settings to see other members.</p></div>:member?<div style={{position:"relative",isolation:"isolate"}}>
     {members[1]&&<div aria-hidden="true" style={{position:"absolute",inset:"10px 12px 0",background:"white",borderRadius:24,boxShadow:"0 8px 30px #70132314",transform:flying?"scale(1)":"scale(.97)",transition:"transform .32s ease",padding:24,overflow:"hidden",zIndex:0}}><div style={{height:60,background:"#fff1f3",borderRadius:30}}/><div style={{height:"min(65vh,560px)",minHeight:340,background:"linear-gradient(145deg,#ffb4b9,#d80621)",display:"grid",placeItems:"center",marginTop:16,borderRadius:12,color:"white",fontSize:70}}>♥</div><h2>{members[1].display_name}, {members[1].age}</h2></div>}
     <div style={{position:"relative",zIndex:1,background:"white",borderRadius:24,overflow:"hidden",boxShadow:"0 10px 36px #70132316",transform:`translateX(${dragX}px) rotate(${Math.max(-16,Math.min(16,dragX/35))}deg)`,opacity:flying?0.7:1,transition:dragging?"none":flying?"transform .32s cubic-bezier(.2,.8,.2,1),opacity .32s ease":"transform .3s cubic-bezier(.2,.8,.2,1)",touchAction:"pan-y",willChange:"transform"}}>
      {(dragging||flying)&&<div style={{textAlign:"center",fontWeight:900,paddingTop:10,color:dragX>0?"#15803d":"#a52640"}}>{dragX>0?"♥ YEH":"✕ NEH"}</div>}
      <div style={{padding:"17px 20px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,minWidth:0,background:"#fff"}}>
        <h2 style={{margin:0,fontSize:"clamp(25px,5.4vw,32px)",letterSpacing:"-0.8px",lineHeight:1.12,fontWeight:850,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"capitalize"}}>{member.display_name}, {member.age}{approvedIds.includes(member.user_id)&&<span title="Profile photos reviewed" aria-label="Profile photos reviewed" style={{color:"#1687e8",fontSize:22,marginLeft:7}}>●✓</span>}</h2>
        <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:650,lineHeight:1.3,color:"#8b5260",minWidth:0,maxWidth:"46%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:1}}>📍 {[member.city,member.province].filter(Boolean).join(", ")||"Canada"}</span>
       </div>
      <div className="eh-desktop-swipe-actions" style={{display:"flex",gap:12,justifyContent:"center",padding:"12px 20px 16px"}}>
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
       {member.relationship_goal&&<p style={{fontWeight:800,color:"#a52640",margin:"14px 0"}}>♥ {member.relationship_goal}</p>}
       {member.sexual_orientation&&<p style={{color:"#a52640"}}>Orientation: {member.sexual_orientation}</p>}
       {!!member.interested_in?.length&&<p style={{color:"#a52640"}}>Interested in: {member.interested_in.map(v=>v==="Man"?"Men":v==="Woman"?"Women":"Non-binary people").join(", ")}</p>}
       {!!member.interests?.length&&<div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0"}}>{member.interests.map(interest=><span key={interest} style={{padding:"8px 12px",borderRadius:22,background:"#fff0f2",color:"#8e2338",fontWeight:700,fontSize:13}}>{interest}</span>)}</div>}
       {!!member.personality_prompts?.length&&<div style={{display:"grid",gap:10,margin:"18px 0"}}>{member.personality_prompts.filter(p=>p.question&&p.answer).map((p,i)=><div key={i} style={{background:"#fff5f5",borderRadius:14,padding:15}}><strong style={{color:"#a52640"}}>{p.question}</strong><p style={{lineHeight:1.6,margin:"8px 0 0",whiteSpace:"pre-wrap"}}>{p.answer}</p></div>)}</div>}
       {member.bio&&<div style={{margin:"18px 0"}}><strong style={{color:"#a52640"}}>About me</strong><p style={{lineHeight:1.6,whiteSpace:"pre-wrap",margin:"8px 0 0"}}>{member.bio}</p></div>}
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
 </main></>;
}
