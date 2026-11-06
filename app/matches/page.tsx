"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Match={user_id:string;display_name:string;age:number;city:string|null;province:string|null;bio:string|null;matched_at:string;photos_shared:boolean};
function MatchCard({match}:{match:Match}){
 const [photos,setPhotos]=useState<string[]>([]);
 const [photoIndex,setPhotoIndex]=useState(0);
 const [photoError,setPhotoError]=useState("");
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
 return <article style={{background:"white",borderRadius:22,overflow:"hidden",boxShadow:"0 10px 32px #78102013"}}>
  <div style={{height:260,position:"relative",background:"linear-gradient(140deg,#ffc2c5,#d80621)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:84,color:"white"}}>
   {photos.length?<><img src={photos[photoIndex]} alt={match.display_name+" profile photo "+(photoIndex+1)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
    {photos.length>1&&<div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",display:"flex",gap:12,alignItems:"center",background:"#0009",borderRadius:22,padding:"5px 12px",fontSize:14,whiteSpace:"nowrap"}}>
     <button aria-label="Previous photo" onClick={()=>setPhotoIndex(i=>(i+photos.length-1)%photos.length)} style={{background:"transparent",border:0,color:"white",fontSize:24,cursor:"pointer"}}>‹</button>
     {photoIndex+1} / {photos.length}
     <button aria-label="Next photo" onClick={()=>setPhotoIndex(i=>(i+1)%photos.length)} style={{background:"transparent",border:0,color:"white",fontSize:24,cursor:"pointer"}}>›</button>
    </div>}</>:<span aria-label="No shared photo">♥</span>}
  </div>
  <div style={{padding:22}}>
   <h2 style={{margin:"0 0 8px",fontSize:25}}>{match.display_name}, {match.age}</h2>
   <p style={{color:"#a52b42",fontWeight:700,margin:"0 0 12px"}}>📍 {[match.city,match.province].filter(Boolean).join(", ")||"Canada"}</p>
   <p style={{lineHeight:1.6,color:"#655d63"}}>{match.bio||"A new connection on ehdate."}</p>
   {photoError&&<p role="status" style={{color:"#a40020",fontSize:13}}>{photoError}</p>}
   <p style={{fontSize:13,color:"#82747b",marginTop:16}}>Matched {new Date(match.matched_at).toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"})}</p>
  </div>
 </article>;
}
export default function MatchesPage(){
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false);
 const [matches,setMatches]=useState<Match[]>([]),[error,setError]=useState("");
 useEffect(()=>{async function load(){
  if(!supabase){setError("Account connection unavailable.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setLoading(false);return;}
  setSignedIn(true);
  const {data,error:queryError}=await supabase.rpc("my_match_profiles");
  if(queryError)setError(queryError.message);else setMatches(data??[]);
  setLoading(false);
 }void load();},[]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#292126"}}>
  <header style={{background:"#d80621",padding:"20px max(20px,6vw)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
   <a href="/" style={{fontWeight:800,fontSize:28,color:"white",textDecoration:"none"}}>♥ ehdate.</a>
   <nav style={{display:"flex",gap:16,flexWrap:"wrap"}}><a href="/discover" style={{color:"white",fontWeight:700}}>Discover</a><a href="/likes" style={{color:"white",fontWeight:700}}>Likes ♥</a><a href="/profile" style={{color:"white",fontWeight:700}}>My profile</a></nav>
  </header>
  <section style={{maxWidth:1000,margin:"45px auto",padding:"0 20px"}}>
   <h1 style={{fontSize:38,marginBottom:8}}>Your matches ♥</h1>
   {loading?<p>Loading your matches…</p>:!signedIn?<p><a href="/account" style={{color:"#c6001d",fontWeight:700}}>Sign in</a> to see your matches.</p>:<>
    <p style={{color:"#b31832",fontWeight:700,fontSize:19}}>{matches.length} {matches.length===1?"match":"matches"}</p>
    {matches.length===0&&!error&&<div style={{background:"white",borderRadius:18,padding:26}}><h2>No matches yet</h2><p>When you and another member both choose YEH, they'll appear here.</p><a href="/discover" style={{color:"#c6001d"}}>Discover members</a></div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:24,marginTop:24}}>
     {matches.map(match=><MatchCard key={match.user_id} match={match}/>)}
    </div>
   </>}
   {error&&<p role="alert" style={{color:"#a0001c"}}>{error}</p>}
  </section>
 </main>;
}
