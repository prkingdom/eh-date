"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import SiteNav from "../components/SiteNav";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;

export default function LikesPage(){
 const [loading,setLoading]=useState(true);
 const [signedIn,setSignedIn]=useState(false);
 const [count,setCount]=useState(0);
 const [error,setError]=useState("");
 const [premiumOpen,setPremiumOpen]=useState(false);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Account connection unavailable.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(!active)return;
  if(authError){setError("Could not check your account.");setLoading(false);return;}
  if(!user){setLoading(false);return;}
  setSignedIn(true);
  const {data,error:likesError}=await supabase.rpc("my_pending_likes_count");
  if(!active)return;
  if(likesError)setError("Could not load likes: "+likesError.message);
  else setCount(typeof data==="number"?data:0);
  setLoading(false);
 }void load();return()=>{active=false;};},[]);
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#292126"}}>
  <SiteNav/>
  <section style={{maxWidth:920,margin:"0 auto",padding:"38px 18px 80px"}}>
   <h1 style={{fontSize:36,margin:"0 0 8px"}}>Likes You <span style={{color:"#d80621"}}>♥</span></h1>
   <p style={{color:"#766a70",lineHeight:1.6,marginTop:0}}>Someone interested in you? Find out how many YEHs are waiting.</p>
   {loading?<p>Loading your likes…</p>:!signedIn?<div style={{background:"white",padding:28,borderRadius:22}}><p>Sign in to see your likes.</p><a href="/account" style={{color:"#d80621",fontWeight:800}}>Sign in</a></div>:error?<p role="alert" style={{color:"#aa1530"}}>{error}</p>:<>
    <div style={{background:"white",borderRadius:22,padding:"22px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,boxShadow:"0 10px 30px #7810200b"}}>
     <div><div style={{fontSize:14,color:"#75656e",fontWeight:700}}>People who like you</div><div style={{fontSize:14,color:"#75656e",marginTop:5}}>New YEHs waiting to be discovered</div></div>
     <strong aria-label={count+" pending likes"} style={{fontSize:40,color:"#d80621"}}>{count}</strong>
    </div>
    {count===0?<div style={{background:"white",padding:30,borderRadius:22,marginTop:22,textAlign:"center"}}><div style={{fontSize:42,color:"#d80621"}}>♡</div><h2 style={{marginBottom:8}}>No new likes yet</h2><p style={{color:"#766a70",lineHeight:1.6}}>When someone sends you a YEH, your count will appear here. Keep discovering Canadians!</p><a href="/discover" style={{color:"#d80621",fontWeight:800}}>Explore Discovery</a></div>:<>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:16,marginTop:22}}>
      {Array.from({length:Math.min(count,8)},(_,i)=><div key={i} aria-label="Hidden like" style={{height:240,borderRadius:20,overflow:"hidden",position:"relative",background:"linear-gradient(145deg,#ed9dab,#b94766 55%,#702842)",boxShadow:"0 8px 25px #701a2b16",display:"grid",placeItems:"center"}}>
       <div aria-hidden="true" style={{position:"absolute",width:94,height:94,borderRadius:"50%",background:"#ffffff44",top:28,filter:"blur(12px)"}}/>
       <div aria-hidden="true" style={{position:"absolute",width:170,height:145,borderRadius:"55% 55% 0 0",background:"#ffffff33",bottom:0,filter:"blur(14px)"}}/>
       <div style={{position:"relative",background:"#ffffffdf",borderRadius:50,padding:15,fontSize:28,color:"#a5203b"}}>♥</div>
       <div style={{position:"absolute",bottom:15,left:0,right:0,textAlign:"center",color:"white",fontSize:13,fontWeight:800}}>Hidden like · Premium</div>
      </div>)}
     </div>
     {count>8&&<p style={{color:"#776b72",textAlign:"center"}}>+ {count-8} more hidden likes</p>}
    </>}
    <div style={{marginTop:26,background:"white",borderRadius:22,padding:28,textAlign:"center"}}>
     <div style={{fontSize:34,color:"#d80621"}}>♥</div><h2 style={{margin:"10px 0"}}>See who likes you</h2>
     <p style={{color:"#766a70",lineHeight:1.6}}>Your likes are private for now. Once ehdate Premium launches, you'll be able to unlock them here. You can still discover people and match for free.</p>
     <button type="button" onClick={()=>setPremiumOpen(true)} style={{border:0,background:"#d80621",color:"white",padding:"14px 28px",borderRadius:28,fontWeight:800,fontSize:16,cursor:"pointer"}}>See Who Likes You ♥</button>
     {premiumOpen&&<p role="status" style={{color:"#a5213c",fontWeight:700}}>ehdate Premium — Coming Soon ♥</p>}
    </div>
   </>}
  </section>
 </main>;
}
