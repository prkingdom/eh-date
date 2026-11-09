"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import SiteNav from "../components/SiteNav";
import PhotoReviewBadge from "../components/PhotoReviewBadge";
import SafetyActions from "../components/SafetyActions";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Match={user_id:string;display_name:string;age:number;city:string|null;province:string|null;bio:string|null;matched_at:string;photos_shared:boolean};
function MatchCard({match,onUnmatch,onBlocked,busy}:{match:Match;onUnmatch:(id:string)=>void;onBlocked:(id:string)=>void;busy:boolean}){
 const [photos,setPhotos]=useState<string[]>([]);
 const [photoError,setPhotoError]=useState("");
 const [approved,setApproved]=useState(false);
 const [showBio,setShowBio]=useState(false);
 useEffect(()=>{if(!supabase)return;void supabase.rpc("approved_photo_review_ids",{member_ids:[match.user_id]}).then(({data})=>setApproved((data??[]).some((v:{user_id:string})=>v.user_id===match.user_id)));},[match.user_id]);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase||!match.photos_shared)return;
  const {data:files,error}=await supabase.storage.from("profile-photos").list(match.user_id,{limit:6,sortBy:{column:"created_at",order:"asc"}});
  if(error){if(active)setPhotoError("Photos are temporarily unavailable.");return;}
  const paths=(files??[]).filter(f=>f.name&&!f.name.startsWith(".")).slice(0,6).map(f=>match.user_id+"/"+f.name);
  if(!paths.length)return;
  const {data:links,error:linkError}=await supabase.storage.from("profile-photos").createSignedUrls(paths,120);
  if(linkError){if(active)setPhotoError("Photos are temporarily unavailable.");return;}
  if(active)setPhotos((links??[]).map(p=>p.signedUrl).filter((link):link is string=>typeof link==="string"));
 }void load();return()=>{active=false;};},[match.user_id,match.photos_shared]);
 return <article className="eh-match-card" style={{background:"white",borderRadius:22,overflow:"hidden",boxShadow:"0 10px 32px #78102013"}}>
  <div style={{display:"flex",alignItems:"center",gap:14,padding:"18px 18px 0"}}>
   <a href={"/matches/"+encodeURIComponent(match.user_id)} aria-label={"View "+match.display_name+"'s full profile"} style={{display:"inline-flex",width:64,height:64,borderRadius:"50%",overflow:"hidden",alignItems:"center",justifyContent:"center",background:"linear-gradient(140deg,#ffc2c5,#d80621)",color:"white",fontSize:34,border:"3px solid #ffe3e8",flexShrink:0}}>
    {photos.length?<img src={photos[0]} alt={match.display_name+" profile picture"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>♥</span>}
   </a>
   <div style={{minWidth:0}}><h2 className="eh-match-name" style={{margin:"0 0 5px",fontSize:22}}>{match.display_name}, {match.age}{approved&&<PhotoReviewBadge/>}</h2><p className="eh-match-location" style={{color:"#a52b42",fontWeight:700,margin:0,fontSize:13}}>📍 {[match.city,match.province].filter(Boolean).join(", ")||"Canada"}</p></div>
  </div>
  <div className="eh-match-info" style={{padding:"10px 18px 18px"}}>
   {match.bio&&<><p className="eh-match-bio" style={{fontSize:14,lineHeight:1.55,color:"#74656d",margin:"6px 0 8px",display:"-webkit-box",WebkitLineClamp:showBio?undefined:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{match.bio}</p>{match.bio.length>95&&<button type="button" onClick={()=>setShowBio(v=>!v)} style={{border:0,background:"transparent",padding:0,color:"#b41939",fontWeight:800,cursor:"pointer"}}>{showBio?"Show less":"Read more"}</button>}</>}
   {photoError&&<p role="status" style={{color:"#a40020",fontSize:13}}>{photoError}</p>}
   <a href={"/matches/"+encodeURIComponent(match.user_id)} style={{display:"inline-block",marginTop:12,marginRight:8,padding:"11px 16px",borderRadius:24,border:"1px solid #e9b9c5",background:"#fff5f7",color:"#ad1a39",fontWeight:800,textDecoration:"none"}}>View full profile</a>
   <a className="eh-match-message" href={"/messages?with="+encodeURIComponent(match.user_id)} style={{display:"inline-block",marginTop:12,marginRight:10,padding:"11px 18px",borderRadius:24,background:"#d80621",color:"white",fontWeight:800,textDecoration:"none"}}>♥ Message</a>
   <button className="eh-match-unmatch" type="button" disabled={busy} onClick={()=>onUnmatch(match.user_id)} style={{marginTop:12,padding:"9px 14px",border:"1px solid #e6c4cc",borderRadius:12,background:"white",color:"#a72b43",fontWeight:700,cursor:busy?"wait":"pointer"}}>{busy?"Please wait…":"Unmatch"}</button>
   <SafetyActions targetId={match.user_id} onBlocked={()=>onBlocked(match.user_id)}/>
   <p className="eh-match-date" style={{fontSize:13,color:"#82747b",marginTop:12,marginBottom:0}}>Matched {new Date(match.matched_at).toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"})}</p>
  </div>
 </article>;
}
export default function MatchesPage(){
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false);
 const [matches,setMatches]=useState<Match[]>([]),[error,setError]=useState("");
 const [unmatching,setUnmatching]=useState<string|null>(null);
 async function unmatch(otherId:string){
  if(!supabase||unmatching)return;
  if(!window.confirm("Are you sure you want to unmatch? This person will disappear from your matches, and this cannot be undone."))return;
  setUnmatching(otherId);setError("");
  const {data,error:unmatchError}=await supabase.rpc("unmatch_member",{p_other_user_id:otherId});
  if(unmatchError)setError("Could not unmatch: "+unmatchError.message);
  else if(data===true)setMatches(current=>current.filter(m=>m.user_id!==otherId));
  else setError("This match is no longer available. Refresh the page.");
  setUnmatching(null);
 }
 useEffect(()=>{async function load(){
  if(!supabase){setError("Account connection unavailable.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setLoading(false);return;}
  setSignedIn(true);
  await supabase.from("match_notification_seen").upsert({user_id:user.id,seen_at:new Date().toISOString()},{onConflict:"user_id"});
  window.dispatchEvent(new Event("ehdate-unread-changed"));
  const {data,error:queryError}=await supabase.rpc("my_match_profiles");
  if(queryError)setError(queryError.message);else setMatches(data??[]);
  setLoading(false);
 }void load();},[]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#292126"}}>
  <SiteNav/>
  <section className="eh-matches-section" style={{maxWidth:1000,margin:"45px auto",padding:"0 20px"}}>
   <h1 className="eh-matches-title" style={{fontSize:38,marginBottom:8}}>Your matches ♥</h1>
   <p style={{color:"#796a73",lineHeight:1.6}}>You both said YEH! Start a conversation and see where it goes.</p>
   {loading?<p>Loading your matches…</p>:!signedIn?<p><a href="/account" style={{color:"#c6001d",fontWeight:700}}>Sign in</a> to see your matches.</p>:<>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginTop:14}}><p style={{color:"#b31832",fontWeight:800,fontSize:19,margin:0}}>{matches.length} {matches.length===1?"match":"matches"}</p><a href="/messages" style={{color:"#d80621",fontWeight:800,background:"white",border:"1px solid #f1d5dd",borderRadius:22,padding:"10px 16px"}}>💬 Open messages</a></div>
    {matches.length===0&&!error&&<div style={{background:"white",borderRadius:18,padding:26}}><h2>No matches yet</h2><p>When you and another member both choose YEH, they'll appear here.</p><a href="/discover" style={{color:"#c6001d"}}>Discover members</a></div>}
    <div className="eh-matches-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:24,marginTop:24}}>
     {matches.map(match=><MatchCard key={match.user_id} match={match} onUnmatch={id=>void unmatch(id)} onBlocked={id=>setMatches(current=>current.filter(m=>m.user_id!==id))} busy={unmatching===match.user_id}/>)}
    </div>
   </>}
   {error&&<p role="alert" style={{color:"#a0001c"}}>{error}</p>}
  </section>
 </main>;
}
