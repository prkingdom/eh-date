"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
const links=[["/discover","Discover","♡"],["/likes","Likes","♥"],["/matches","Matches","✦"],["/messages","Chat","✉"],["/profile","Profile","◉"]];
export default function SiteNav({onFiltersClick,filtersOpen}:{onFiltersClick?:()=>void;filtersOpen?:boolean}={}){
 const path=usePathname();
 const [likes,setLikes]=useState<number|null>(null),[unread,setUnread]=useState<number>(0),[newMatches,setNewMatches]=useState(0),[notifications,setNotifications]=useState(0);
 useEffect(()=>{let active=true;let cleanup=()=>{};async function load(){
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const refresh=async()=>{const [likesResult,unreadResult,matchesResult,notificationsResult]=await Promise.all([supabase!.rpc("my_pending_likes_count"),supabase!.rpc("my_unread_message_count"),supabase!.rpc("my_unseen_matches_count"),supabase!.from("member_notifications").select("id",{count:"exact",head:true}).is("read_at",null)]);if(active){if(!likesResult.error&&typeof likesResult.data==="number")setLikes(likesResult.data);if(!unreadResult.error&&typeof unreadResult.data==="number")setUnread(unreadResult.data);if(!matchesResult.error&&typeof matchesResult.data==="number")setNewMatches(matchesResult.data);if(!notificationsResult.error)setNotifications(notificationsResult.count??0);}};
  await refresh();
  const interval=setInterval(()=>{void refresh();},12000);
  window.addEventListener("ehdate-unread-changed",refresh);
  cleanup=()=>{clearInterval(interval);window.removeEventListener("ehdate-unread-changed",refresh);};
 }void load();return()=>{active=false;cleanup();};},[path]);
 return <><header style={{background:"#d80621",padding:"15px max(18px,5vw)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
  <a href="/" style={{fontSize:28,fontWeight:800,color:"white",textDecoration:"none"}}>♥ ehdate.</a>
  <a href="/notifications" aria-label={"Notifications"+(notifications?" ("+notifications+" unread)":"")} aria-current={path==="/notifications"?"page":undefined} style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:5,color:"white",fontWeight:800,textDecoration:"none",border:"1px solid #ffffff77",borderRadius:22,padding:"9px 12px",fontSize:17}}><span style={{fontSize:18}}>🔔</span>{notifications>0&&<span style={{background:"white",color:"#d80621",borderRadius:12,padding:"1px 6px",fontSize:12}}>{notifications>99?"99+":notifications}</span>}</a>
  {onFiltersClick&&<button type="button" className="eh-header-filters" onClick={onFiltersClick} aria-expanded={!!filtersOpen} aria-controls="discovery-filters" style={{display:"none",alignItems:"center",gap:7,border:"1px solid #ffffff88",borderRadius:22,padding:"9px 13px",background:"#ffffff19",color:"white",fontSize:14,fontWeight:800,cursor:"pointer"}}>☷ Filters</button>}
  <nav aria-label="Main navigation" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
   {links.map(([href,label])=><a key={href} href={href} aria-current={path===href?"page":undefined} style={{color:"white",fontWeight:path===href?900:600,textDecoration:"none",borderBottom:path===href?"2px solid white":"2px solid transparent",paddingBottom:3}}>{label}{((href==="/likes"&&likes!==null&&likes>0)||(href==="/messages"&&unread>0)||(href==="/matches"&&newMatches>0))?<span style={{marginLeft:5,background:"white",color:"#d80621",padding:"2px 7px",borderRadius:20,fontSize:12}}>{(href==="/likes"?likes??0:href==="/matches"?newMatches:unread)>99?"99+":(href==="/likes"?likes:href==="/matches"?newMatches:unread)}</span>:null}</a>)}
  </nav>
 </header><nav aria-label="Mobile navigation" className="eh-mobile-nav">{links.map(([href,label,symbol])=><a key={href} href={href} aria-current={path===href?"page":undefined}><span style={{fontSize:21}}>{symbol}</span><span>{label}{href==="/likes"&&likes!==null&&likes>0?" ("+(likes>99?"99+":likes)+")":href==="/messages"&&unread>0?" ("+(unread>99?"99+":unread)+")":href==="/matches"&&newMatches>0?" ("+(newMatches>99?"99+":newMatches)+")":""}</span></a>)}</nav></>;
}
