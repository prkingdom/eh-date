"use client";
import {Suspense,useCallback,useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {useSearchParams} from "next/navigation";
import SiteNav from "../components/SiteNav";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Match={user_id:string;display_name:string;age:number;city:string|null;matched_at:string};
type Message={id:number;user_a:string;user_b:string;sender_id:string;body:string;created_at:string};
function MessagesContent(){
 const params=useSearchParams(),requested=params.get("with");
 const [userId,setUserId]=useState(""),[matches,setMatches]=useState<Match[]>([]),[selected,setSelected]=useState("");
 const [messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const bottom=useRef<HTMLDivElement>(null),active=useRef("");
 const current=matches.find(m=>m.user_id===selected);
 const fetchMessages=useCallback(async(me:string,other:string)=>{
  if(!supabase||!me||!other)return;
  const [a,b]=[me,other].sort();
  const {data,error:readError}=await supabase.from("match_messages").select("id,user_a,user_b,sender_id,body,created_at").eq("user_a",a).eq("user_b",b).order("created_at",{ascending:false}).limit(100);
  if(active.current!==other)return;
  if(readError)setError("Couldn't load messages: "+readError.message);
  else setMessages((data??[]).reverse());
 },[]);
 useEffect(()=>{let live=true;async function init(){
  if(!supabase){setError("Messaging connection unavailable.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!live)return;
  if(!user){setLoading(false);return;}
  setUserId(user.id);
  const {data,error:matchError}=await supabase.rpc("my_match_profiles");
  if(!live)return;
  if(matchError)setError("Couldn't load matches: "+matchError.message);
  else {const list=(data??[]) as Match[];setMatches(list);setSelected(list.find(m=>m.user_id===requested)?.user_id||list[0]?.user_id||"");}
  setLoading(false);
 }void init();return()=>{live=false};},[requested]);
 useEffect(()=>{active.current=selected;setMessages([]);setError("");
  if(!userId||!selected||!supabase)return;
  void fetchMessages(userId,selected);
  const [a,b]=[userId,selected].sort();
  const channel=supabase.channel("ehdate-chat-"+a+"-"+b)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"match_messages",filter:"user_a=eq."+a},payload=>{
    const row=payload.new as Message;
    if(row.user_b===b&&active.current===selected)setMessages(prev=>prev.some(m=>m.id===row.id)?prev:[...prev,row].sort((x,y)=>x.id-y.id));
   }).subscribe();
  const interval=setInterval(()=>{void fetchMessages(userId,selected);},5000);
  return()=>{clearInterval(interval);void supabase?.removeChannel(channel);};
 },[selected,userId,fetchMessages]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages.length,selected]);
 async function send(){
  if(!supabase||!userId||!selected||sending)return;
  const body=draft.trim();if(!body||body.length>2000)return;
  setSending(true);setError("");
  const [a,b]=[userId,selected].sort();
  const {error:sendError}=await supabase.from("match_messages").insert({user_a:a,user_b:b,sender_id:userId,body});
  if(sendError){setError("Message not sent: "+sendError.message);if(/foreign key|row-level security|permission/i.test(sendError.message)){const {data}=await supabase.rpc("my_match_profiles");setMatches(data??[]);}}
  else{setDraft("");await fetchMessages(userId,selected);}
  setSending(false);
 }
 return <main style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#30252b",paddingBottom:85}}>
  <SiteNav/>
  <section style={{maxWidth:1050,margin:"30px auto",padding:"0 16px"}}>
   <h1 style={{fontSize:34,margin:"0 0 8px"}}>Messages <span style={{color:"#d80621"}}>♥</span></h1>
   <p style={{color:"#76646d",marginBottom:22}}>Say hello to someone you've matched with.</p>
   {loading?<p>Loading conversations…</p>:!userId?<p><a href="/account">Sign in</a> to message your matches.</p>:matches.length===0?<div style={{background:"white",borderRadius:20,padding:28}}><h2>No conversations yet</h2><p>When you and someone both choose YEH, you can chat here for free.</p><a href="/discover" style={{color:"#d80621",fontWeight:800}}>Discover members</a></div>:
   <div style={{display:"grid",gridTemplateColumns:"minmax(145px,260px) minmax(0,1fr)",background:"white",borderRadius:22,overflow:"hidden",minHeight:520,boxShadow:"0 10px 35px #4a15210d"}}>
    <aside aria-label="Conversations" style={{borderRight:"1px solid #f0e1e5",padding:"16px 8px"}}>
     <h2 style={{fontSize:17,margin:"4px 12px 14px"}}>Your matches</h2>
     {matches.map(m=><button key={m.user_id} onClick={()=>setSelected(m.user_id)} style={{display:"block",width:"100%",textAlign:"left",padding:"14px 10px",marginBottom:5,border:0,borderRadius:12,background:selected===m.user_id?"#ffe7eb":"transparent",color:selected===m.user_id?"#b31836":"#4d4147",fontSize:15,fontWeight:selected===m.user_id?800:600,cursor:"pointer",overflowWrap:"anywhere"}}>♥ {m.display_name}</button>)}
    </aside>
    <div style={{display:"flex",flexDirection:"column",minWidth:0}}>
     <div style={{padding:"18px 20px",borderBottom:"1px solid #f0e1e5",fontWeight:800,fontSize:19}}>{current?.display_name||"Select a match"} <span style={{fontSize:12,color:"#a66575",fontWeight:500}}>♥ Matched</span></div>
     <div aria-label="Chat messages" style={{flex:1,minHeight:340,maxHeight:"min(65vh,600px)",overflowY:"auto",padding:"20px 14px",display:"flex",flexDirection:"column",gap:12}}>
      {messages.length===0&&<p style={{textAlign:"center",color:"#897981",marginTop:75}}>It's a match! Say hello to {current?.display_name} ♥</p>}
      {messages.map(m=><div key={m.id} style={{alignSelf:m.sender_id===userId?"flex-end":"flex-start",maxWidth:"85%"}}>
       <div style={{background:m.sender_id===userId?"#d80621":"#f4edef",color:m.sender_id===userId?"white":"#30252b",padding:"11px 15px",borderRadius:17,overflowWrap:"anywhere",whiteSpace:"pre-wrap",lineHeight:1.5}}>{m.body}</div>
       <div style={{fontSize:11,color:"#96858d",marginTop:4,textAlign:m.sender_id===userId?"right":"left"}}>{new Date(m.created_at).toLocaleTimeString("en-CA",{hour:"numeric",minute:"2-digit"})}</div>
      </div>)}
      <div ref={bottom}/>
     </div>
     <form onSubmit={e=>{e.preventDefault();void send();}} style={{display:"flex",gap:9,padding:14,borderTop:"1px solid #f0e1e5"}}>
      <input aria-label="Write a message" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} placeholder="Write a message…" style={{flex:1,minWidth:0,border:"1px solid #e8d5dc",borderRadius:25,padding:"13px 15px",fontSize:16}}/>
      <button type="submit" disabled={sending||!draft.trim()} style={{background:"#d80621",color:"white",border:0,borderRadius:25,padding:"12px 17px",fontWeight:800,cursor:"pointer",opacity:(sending||!draft.trim())?0.6:1}}>{sending?"…":"Send"}</button>
     </form>
    </div>
   </div>}
   {error&&<p role="alert" style={{color:"#a60020",marginTop:15}}>{error}</p>}
  </section>
 </main>;
}
export default function MessagesPage(){return <Suspense fallback={<main style={{padding:30}}>Loading messages…</main>}><MessagesContent/></Suspense>;}
