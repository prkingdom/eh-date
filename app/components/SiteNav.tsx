"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
const links=[["/discover","Discover","♡"],["/likes","Likes","♥"],["/matches","Matches","✦"],["/messages","Chat","✉"],["/profile","Profile","◉"]];
export default function SiteNav(){
 const path=usePathname();
 const [likes,setLikes]=useState<number|null>(null);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const {data,error}=await supabase.rpc("my_pending_likes_count");
  if(active&&!error&&typeof data==="number")setLikes(data);
 }void load();return()=>{active=false};},[path]);
 return <><header style={{background:"#d80621",padding:"15px max(18px,5vw)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
  <a href="/" style={{fontSize:28,fontWeight:800,color:"white",textDecoration:"none"}}>♥ ehdate.</a>
  <nav aria-label="Main navigation" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
   {links.map(([href,label])=><a key={href} href={href} aria-current={path===href?"page":undefined} style={{color:"white",fontWeight:path===href?900:600,textDecoration:"none",borderBottom:path===href?"2px solid white":"2px solid transparent",paddingBottom:3}}>{label}{href==="/likes"&&likes!==null&&likes>0?<span style={{marginLeft:5,background:"white",color:"#d80621",padding:"2px 7px",borderRadius:20,fontSize:12}}>{likes>99?"99+":likes}</span>:null}</a>)}
  </nav>
 </header><nav aria-label="Mobile navigation" className="eh-mobile-nav">{links.map(([href,label,symbol])=><a key={href} href={href} aria-current={path===href?"page":undefined}><span style={{fontSize:21}}>{symbol}</span><span>{label}{href==="/likes"&&likes!==null&&likes>0?" ("+(likes>99?"99+":likes)+")":""}</span></a>)}</nav></>;
}
