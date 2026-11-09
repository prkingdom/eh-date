"use client";
import {Suspense,useEffect,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
import SiteNav from "../../components/SiteNav";
import PhotoReviewBadge from "../../components/PhotoReviewBadge";
import SafetyActions from "../../components/SafetyActions";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Profile={user_id:string;display_name:string;age:number;city:string|null;province:string|null;bio:string|null;gender:string|null;relationship_goal:string|null;interests:string[]|null;personality_prompts:{question:string;answer:string}[]|null;sexual_orientation:string|null;interested_in:string[]|null;occupation:string|null;education_level:string|null;photos_shared:boolean};
function MatchProfileContent(){
 const params=useParams(),search=useSearchParams(),id=String(params.id||"");
 const [profile,setProfile]=useState<Profile|null>(null),[photos,setPhotos]=useState<string[]>([]),[index,setIndex]=useState(0),[approved,setApproved]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[blocked,setBlocked]=useState(false);
 const back=search.get("from")==="messages"?"/messages?with="+encodeURIComponent(id):"/matches";
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Connection unavailable.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();if(!active)return;
  if(!user){setError("Sign in to view a match's profile.");setLoading(false);return;}
  const {data,error:err}=await supabase.rpc("my_matched_member_profile",{p_member_id:id});
  if(!active)return;
  if(err){setError("Unable to load profile: "+err.message);setLoading(false);return;}
  const p=(data??[])[0] as Profile|undefined;
  if(!p){setError("This profile is unavailable. You may no longer be matched.");setLoading(false);return;}
  setProfile(p);
  const {data:verified}=await supabase.rpc("approved_photo_review_ids",{member_ids:[id]});
  if(active)setApproved((verified??[]).some((x:{user_id:string})=>x.user_id===id));
  if(p.photos_shared){
   const {data:files,error:fileError}=await supabase.storage.from("profile-photos").list(id,{limit:6,sortBy:{column:"created_at",order:"asc"}});
   if(active&&fileError)setError("Photos are temporarily unavailable.");
   if(!fileError){const paths=(files??[]).filter(f=>f.name&&!f.name.startsWith(".")).slice(0,6).map(f=>id+"/"+f.name);if(paths.length){const {data:links}=await supabase.storage.from("profile-photos").createSignedUrls(paths,120);if(active)setPhotos((links??[]).map(x=>x.signedUrl).filter((x):x is string=>Boolean(x)));}}
  }
  if(active)setLoading(false);
 }void load();return()=>{active=false;};},[id]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",color:"#30242c",paddingBottom:100}}><SiteNav/><div className="eh-full-profile">
  <a href={back} className="eh-full-back">← Back to {search.get("from")==="messages"?"conversation":"matches"}</a>
  {loading?<p>Loading profile…</p>:!profile||blocked?<div className="eh-full-panel"><h1>Profile unavailable</h1><p>{blocked?"This member has been blocked.":error}</p><a href="/matches">Your matches</a></div>:<>
  <div className="eh-full-grid"><section className="eh-full-gallery"><div className="eh-full-image">{photos.length?<img src={photos[index]} alt={profile.display_name+" photo "+(index+1)} />:<span aria-label="No shared photos">♥</span>}
   {photos.length>1&&<><button type="button" className="eh-full-prev" aria-label="Previous photo" onClick={()=>setIndex(i=>(i+photos.length-1)%photos.length)}>‹</button><button type="button" className="eh-full-next" aria-label="Next photo" onClick={()=>setIndex(i=>(i+1)%photos.length)}>›</button><div className="eh-full-count">{index+1} / {photos.length}</div></>}</div>
   {photos.length>1&&<div className="eh-full-thumbs">{photos.map((src,i)=><button type="button" key={i} aria-label={"View photo "+(i+1)} aria-pressed={i===index} onClick={()=>setIndex(i)}><img src={src} alt="" /></button>)}</div>}
  </section><section className="eh-full-details"><div className="eh-full-kicker">♥ YOU MATCHED</div><h1>{profile.display_name}, {profile.age} {approved&&<PhotoReviewBadge/>}</h1><p className="eh-full-location">📍 {[profile.city,profile.province].filter(Boolean).join(", ")||"Canada"}</p>
   {profile.bio&&<div className="eh-full-section"><h2>About me</h2><p>{profile.bio}</p></div>}
   {profile.relationship_goal&&<div className="eh-full-section"><h2>Looking for</h2><p>{profile.relationship_goal}</p></div>}
   {profile.interests&&profile.interests.length>0&&<div className="eh-full-section"><h2>Interests</h2><div className="eh-full-tags">{profile.interests.map(x=><span key={x}>{x}</span>)}</div></div>}
   {profile.personality_prompts&&profile.personality_prompts.filter(x=>x.question&&x.answer).length>0&&<div className="eh-full-section"><h2>A little more about {profile.display_name}</h2>{profile.personality_prompts.filter(x=>x.question&&x.answer).map((x,i)=><div className="eh-full-prompt" key={i}><strong>{x.question}</strong><p>{x.answer}</p></div>)}</div>}
   {(profile.occupation||profile.education_level)&&<div className="eh-full-section"><h2>Work & education</h2>{profile.occupation&&<p>💼 {profile.occupation}</p>}{profile.education_level&&<p>🎓 {profile.education_level}</p>}</div>}
   {(profile.gender||profile.sexual_orientation||profile.interested_in?.length)&&<div className="eh-full-section"><h2>More details</h2>{profile.gender&&<p>{profile.gender}</p>}{profile.sexual_orientation&&<p>{profile.sexual_orientation}</p>}{Boolean(profile.interested_in?.length)&&<p>Interested in: {profile.interested_in?.join(", ")}</p>}</div>}
   <a className="eh-full-message" href={"/messages?with="+encodeURIComponent(id)}>💬 Message {profile.display_name}</a><div className="eh-full-safety"><SafetyActions targetId={id} onBlocked={()=>setBlocked(true)}/></div>
  </section></div>{error&&<p role="status">{error}</p>}</>}
 </div></main>;
}

export default function MatchProfile(){return <Suspense fallback={<main style={{padding:30}}>Loading profile…</main>}><MatchProfileContent/></Suspense>;}
