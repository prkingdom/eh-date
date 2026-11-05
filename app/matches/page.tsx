"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;

export default function MatchesPage(){
 const [loading,setLoading]=useState(true);
 const [signedIn,setSignedIn]=useState(false);
 const [count,setCount]=useState(0);
 const [error,setError]=useState("");
 useEffect(()=>{async function load(){
  if(!supabase){setError("Account connection unavailable.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setLoading(false);return;}
  setSignedIn(true);
  const {count:total,error:queryError}=await supabase.from("matches").select("user_a",{count:"exact",head:true});
  if(queryError)setError(queryError.message);else setCount(total??0);
  setLoading(false);
 }void load();},[]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#292126"}}>
  <header style={{background:"#d80621",color:"white",padding:"22px max(20px,6vw)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
   <a href="/" style={{fontWeight:800,fontSize:28,color:"white",textDecoration:"none"}}>♥ ehdate.</a>
   <a href="/discover" style={{color:"white",fontWeight:700,textDecoration:"none"}}>Discover</a>
  </header>
  <section style={{maxWidth:650,margin:"55px auto",padding:"0 20px"}}>
   <div style={{background:"white",padding:"34px 28px",borderRadius:24,boxShadow:"0 12px 35px #7d13200e"}}>
    <h1 style={{fontSize:36,margin:"0 0 12px"}}>Your matches ♥</h1>
    {loading?<p>Loading your matches…</p>:!signedIn?<p><a href="/account" style={{color:"#c6001d",fontWeight:700}}>Sign in</a> to see your matches.</p>:<>
     <p style={{fontSize:20,fontWeight:700,color:"#d80621"}}>{count} {count===1?"match":"matches"}</p>
     <p style={{lineHeight:1.6,color:"#70646a"}}>{count===0?"No matches yet. When real discovery launches, two people who both choose YEH will become a match.":"Your mutual YEHs are recorded securely. Profile previews and messaging are coming next."}</p>
     <p style={{lineHeight:1.5,fontSize:14,color:"#77676d"}}>Real swiping is not live yet. The sample cards on Discover are demonstrations only.</p>
    </>}
    {error&&<p role="alert" style={{color:"#a0001c"}}>{error}</p>}
    <a href="/discover" style={{display:"inline-block",background:"#d80621",color:"white",textDecoration:"none",padding:"14px 24px",borderRadius:30,fontWeight:700,marginTop:12}}>Back to discovery</a>
   </div>
  </section>
 </main>;
}
