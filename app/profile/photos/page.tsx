"use client";
import { useEffect, useState, Suspense } from "react";
import {useSearchParams} from "next/navigation";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const bucket = "profile-photos";
type Photo = { path: string; preview: string };
function PhotosContent() {
 const fromOnboarding=useSearchParams().get("from")==="onboarding";
 const [userId,setUserId]=useState<string|null>(null);
 const [photos,setPhotos]=useState<Photo[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;let urls:string[]=[];
  async function load(){
   if(!supabase){setMessage("Storage is not configured.");setLoading(false);return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!active)return;
   if(!user){setLoading(false);return;}
   setUserId(user.id);
   const {data,error}=await supabase.storage.from(bucket).list(user.id,{limit:100,sortBy:{column:"created_at",order:"asc"}});
   if(error){setMessage(error.message);setLoading(false);return;}
   const paths=(data??[]).filter(item=>item.name && !item.name.startsWith(".")).slice(0,6);
   const previews:Photo[]=[];
   for(const item of paths){
    const path=user.id+"/"+item.name;
    const {data:blob,error:downloadError}=await supabase.storage.from(bucket).download(path);
    if(!downloadError&&blob){const preview=URL.createObjectURL(blob);urls.push(preview);previews.push({path,preview});}
   }
   if(active){setPhotos(previews);setLoading(false);}
  }
  void load();
  return ()=>{active=false;urls.forEach(URL.revokeObjectURL);};
 },[]);
 async function upload(file:File|null){
  if(!file||!supabase||!userId)return;
  if(photos.length>=6){setMessage("You can add up to six photos.");return;}
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Choose a JPG, PNG, or WebP photo.");return;}
  if(file.size>5*1024*1024){setMessage("Each photo must be under 5 MB.");return;}
  setBusy(true);setMessage("");
  const extension=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
  const path=userId+"/"+crypto.randomUUID()+"."+extension;
  const {error}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
  if(error)setMessage("Upload failed: "+error.message);
  else {setPhotos(current=>[...current,{path,preview:URL.createObjectURL(file)}]);setMessage("Photo uploaded!");}
  setBusy(false);
 }
 async function remove(photo:Photo){
  if(!supabase||!userId)return;
  setBusy(true);setMessage("");
  const {error}=await supabase.storage.from(bucket).remove([photo.path]);
  if(error)setMessage("Could not remove photo: "+error.message);
  else {setPhotos(current=>current.filter(p=>p.path!==photo.path));URL.revokeObjectURL(photo.preview);setMessage("Photo removed.");}
  setBusy(false);
 }
 return <main style={{minHeight:"100vh",background:"#fff5f5",padding:"32px 18px",fontFamily:"Arial,sans-serif",color:"#272327"}}>
  <div style={{maxWidth:720,margin:"0 auto"}}>
   <a href="/" style={{color:"#d80621",textDecoration:"none",fontSize:30,fontWeight:800}}>♥ ehdate.</a>
   <section style={{background:"#fff",borderRadius:24,padding:28,marginTop:32,boxShadow:"0 10px 36px #70001512"}}>
    <h1 style={{fontSize:32,marginTop:0}}>Your profile photos</h1>
    <p style={{color:"#71666b",lineHeight:1.5}}>Upload up to six photos. Your photos can appear to eligible members when your profile and photo sharing are enabled.</p>
    {loading?<p>Loading photos…</p>:!userId?<p>Please <a href="/account" style={{color:"#d80621"}}>sign in</a> first.</p>:<>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,margin:"24px 0"}}>
      {photos.map((photo,i)=><div key={photo.path} style={{borderRadius:14,overflow:"hidden",border:"1px solid #f1d5d9"}}>
       <img src={photo.preview} alt={"Your profile photo "+(i+1)} style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",display:"block"}}/>
       <button disabled={busy} onClick={()=>void remove(photo)} style={{width:"100%",padding:12,border:0,background:"#fff0f1",color:"#bf0020",fontWeight:700,cursor:"pointer"}}>Remove</button>
      </div>)}
     </div>
     {photos.length<6&&<label style={{display:"inline-block",padding:"15px 22px",background:"#d80621",color:"white",borderRadius:30,fontWeight:700,cursor:busy?"wait":"pointer"}}>
      {busy?"Please wait…":"Add a photo"}<input aria-label="Choose profile photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]??null);e.target.value="";}} style={{display:"none"}}/>
     </label>}
     <p style={{fontSize:13,color:"#786e73"}}>{photos.length} of 6 photos · JPG, PNG or WebP · 5 MB maximum each</p>
    </>}
    {message&&<p role="status" style={{color:"#a60020"}}>{message}</p>}
    <p style={{marginTop:25}}><a href={fromOnboarding?"/onboarding":"/profile"} style={{color:"#d80621",fontWeight:700}}>{fromOnboarding?"← Continue onboarding":"← Back to profile details"}</a></p>
   </section>
  </div>
 </main>;
}

export default function PhotosPage(){return <Suspense fallback={<p>Loading photos…</p>}><PhotosContent/></Suspense>}
