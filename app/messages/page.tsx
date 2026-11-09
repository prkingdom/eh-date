"use client";
import {Suspense,useCallback,useEffect,useRef,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {useSearchParams} from "next/navigation";
import SiteNav from "../components/SiteNav";
import SafetyActions from "../components/SafetyActions";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
type Match={user_id:string;display_name:string;age:number;city:string|null;matched_at:string;photos_shared:boolean};
type Summary={other_user_id:string;last_body:string|null;last_sender_id:string|null;last_message_at:string|null;unread_count:number};
type Message={id:number;user_a:string;user_b:string;sender_id:string;body:string;created_at:string;read_at?:string|null};
function MatchAvatar({match,size=46}:{match:Match;size?:number}){
 const [photo,setPhoto]=useState("");
 useEffect(()=>{let active=true;async function load(){
  setPhoto("");
  if(!supabase||!match.photos_shared)return;
  const {data:files,error}=await supabase.storage.from("profile-photos").list(match.user_id,{limit:6,sortBy:{column:"created_at",order:"asc"}});
  if(error||!active)return;
  const first=(files??[]).find(f=>f.name&&!f.name.startsWith("."));
  if(!first)return;
  const {data:link,error:linkError}=await supabase.storage.from("profile-photos").createSignedUrl(match.user_id+"/"+first.name,120);
  if(active&&!linkError&&link?.signedUrl)setPhoto(link.signedUrl);
 }void load();return()=>{active=false};},[match.user_id,match.photos_shared]);
 return <span aria-label={match.display_name+" profile photo"} style={{width:size,height:size,minWidth:size,borderRadius:"50%",background:"linear-gradient(145deg,#ffc7d0,#d80621)",color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:size*.48,fontWeight:800,overflow:"hidden",flexShrink:0}}>{photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:match.display_name.slice(0,1).toUpperCase()}</span>;
}
function MessagesContent(){
 const params=useSearchParams(),requested=params.get("with");
 const [userId,setUserId]=useState(""),[matches,setMatches]=useState<Match[]>([]),[selected,setSelected]=useState("");
 const [summaries,setSummaries]=useState<Summary[]>([]);
 const [clearances,setClearances]=useState<Record<string,string>>({}),[clearancesLoaded,setClearancesLoaded]=useState(false),[clearing,setClearing]=useState(false);
 const [mobileChat,setMobileChat]=useState(Boolean(requested)),[messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [search,setSearch]=useState("");
 const [readReceipts,setReadReceipts]=useState(false),[otherReceipts,setOtherReceipts]=useState(false),[typing,setTyping]=useState(false);
 const typingChannel=useRef<any>(null),typingLast=useRef(0),typingReset=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [reportingMessage,setReportingMessage]=useState<number|null>(null),[reportReason,setReportReason]=useState("Harassment or bullying"),[reportDetails,setReportDetails]=useState(""),[reportBusy,setReportBusy]=useState(false),[reportStatus,setReportStatus]=useState("");
 const bottom=useRef<HTMLDivElement>(null),active=useRef("");
 const current=matches.find(m=>m.user_id===selected);
 const sortedMatches=[...matches].filter(m=>{const cleared=clearances[m.user_id];if(!cleared)return true;const last=summaries.find(s=>s.other_user_id===m.user_id)?.last_message_at;return !!last&&new Date(last).getTime()>new Date(cleared).getTime();}).sort((a,b)=>{const x=summaries.find(s=>s.other_user_id===a.user_id)?.last_message_at||a.matched_at;const y=summaries.find(s=>s.other_user_id===b.user_id)?.last_message_at||b.matched_at;return new Date(y).getTime()-new Date(x).getTime();});
 const refreshClearances=useCallback(async()=>{if(!supabase)return;const {data}=await supabase.rpc("my_chat_clearances");if(data){setClearances(Object.fromEntries((data as {other_user_id:string;cleared_at:string}[]).map(x=>[x.other_user_id,x.cleared_at])));setClearancesLoaded(true);}},[]);
 async function clearChat(otherId:string){
  if(!supabase||clearing||!otherId)return;
  if(!window.confirm("Are you sure you want to delete this chat? Your conversation history will be hidden, but you will remain matched and can message this person again. The other person's messages will not be deleted."))return;
  setClearing(true);setError("");
  const {data,error:clearError}=await supabase.rpc("clear_my_chat",{p_other_user_id:otherId});
  if(clearError||data!==true)setError("Could not delete chat: "+(clearError?.message||"Please try again."));
  else{setMessages([]);setClearances(old=>({...old,[otherId]:new Date().toISOString()}));setMobileChat(false);setSelected("");await refreshClearances();await refreshSummaries();}
  setClearing(false);
 }
 const refreshSummaries=useCallback(async()=>{if(!supabase)return;const {data,error:summaryError}=await supabase.rpc("my_conversation_summaries");if(summaryError)setError("Could not update conversations: "+summaryError.message);else if(data)setSummaries(data as Summary[]);},[]);
 useEffect(()=>{if(!userId)return;void refreshSummaries();const inboxTimer=setInterval(()=>{void refreshSummaries();},5000);const onVisible=()=>{if(document.visibilityState==="visible")void refreshSummaries();};document.addEventListener("visibilitychange",onVisible);return()=>{clearInterval(inboxTimer);document.removeEventListener("visibilitychange",onVisible);};},[userId,refreshSummaries]);
 const markRead=useCallback(async(me:string,other:string)=>{
  if(!supabase||!me||!other)return;
  const [a,b]=[me,other].sort();
  const {error}=await supabase.from("match_messages").update({read_at:new Date().toISOString()}).eq("user_a",a).eq("user_b",b).neq("sender_id",me).is("read_at",null);
  if(!error){await refreshSummaries();window.dispatchEvent(new Event("ehdate-unread-changed"));}
 },[refreshSummaries]);
 const fetchMessages=useCallback(async(me:string,other:string)=>{
  if(!supabase||!me||!other||!clearancesLoaded)return;
  const [a,b]=[me,other].sort();
  const {data,error:readError}=await supabase.from("match_messages").select("id,user_a,user_b,sender_id,body,created_at,read_at").eq("user_a",a).eq("user_b",b).order("created_at",{ascending:false}).limit(100);
  if(active.current!==other)return;
  if(readError)setError("Couldn't load messages: "+readError.message);
  else setMessages((data??[]).filter(m=>new Date(m.created_at).getTime()>new Date(clearances[other]||0).getTime()).reverse());
 },[clearances,clearancesLoaded]);
 useEffect(()=>{let live=true;async function init(){
  if(!supabase){setError("Messaging connection unavailable.");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!live)return;
  if(!user){setLoading(false);return;}
  setUserId(user.id);
  void supabase.from("profiles").select("show_read_receipts").eq("user_id",user.id).maybeSingle().then(({data})=>setReadReceipts(Boolean(data?.show_read_receipts)));
  const {data,error:matchError}=await supabase.rpc("my_match_profiles");
  if(!live)return;
  if(matchError)setError("Couldn't load matches: "+matchError.message);
  else {const list=(data??[]) as Match[];setMatches(list);setSelected(list.find(m=>m.user_id===requested)?.user_id||"");setMobileChat(Boolean(list.find(m=>m.user_id===requested)));void refreshSummaries();void refreshClearances();}
  setLoading(false);
 }void init();return()=>{live=false};},[requested,refreshSummaries,refreshClearances]);
 useEffect(()=>{active.current=selected;setMessages([]);setError("");
  if(!userId||!selected||!supabase||!clearancesLoaded)return;
  setTyping(false);
  void supabase.rpc("match_read_receipts_enabled",{p_other_user_id:selected}).then(({data})=>setOtherReceipts(Boolean(data)));
  void fetchMessages(userId,selected);
  const [a,b]=[userId,selected].sort();
  const channel=supabase.channel("ehdate-chat-"+a+"-"+b)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"match_messages",filter:"user_a=eq."+a},payload=>{
    const row=payload.new as Message;
    if(row.user_b===b&&active.current===selected&&new Date(row.created_at).getTime()>new Date(clearances[selected]||0).getTime())setMessages(prev=>prev.some(m=>m.id===row.id)?prev:[...prev,row].sort((x,y)=>x.id-y.id));
   }).subscribe();
  const typingRoom=supabase.channel("ehdate-typing-"+a+"-"+b,{config:{broadcast:{self:false}}}).on("broadcast",{event:"typing"},({payload})=>{if(active.current===selected&&payload?.sender===selected){setTyping(Boolean(payload?.active));if(typingReset.current)clearTimeout(typingReset.current);if(payload?.active)typingReset.current=setTimeout(()=>setTyping(false),3500);}}).subscribe();
  typingChannel.current=typingRoom;
  const interval=setInterval(()=>{void fetchMessages(userId,selected);},5000);
  return()=>{clearInterval(interval);typingChannel.current=null;if(typingReset.current)clearTimeout(typingReset.current);void supabase?.removeChannel(typingRoom);void supabase?.removeChannel(channel);};
 },[selected,userId,fetchMessages,refreshSummaries,clearances,clearancesLoaded]);
 useEffect(()=>{if(!userId||!selected)return;if(mobileChat||window.matchMedia("(min-width:651px)").matches)void markRead(userId,selected);},[userId,selected,mobileChat,messages.length,markRead]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages.length,selected]);
 async function reportMessage(){
  if(!supabase||!userId||!selected||reportingMessage===null||reportBusy)return;
  setReportBusy(true);setReportStatus("");
  const {error:reportError}=await supabase.from("message_reports").insert({reporter_id:userId,reported_id:selected,message_id:reportingMessage,reason:reportReason,details:reportDetails.trim()||null});
  if(reportError)setReportStatus("Could not submit report: "+reportError.message);
  else{setReportStatus("Message reported privately. Thank you.");setReportingMessage(null);setReportDetails("");}
  setReportBusy(false);
 }
 function updateDraft(value:string){setDraft(value);if(!typingChannel.current||!userId)return;const now=Date.now();if(now-typingLast.current>1300){typingLast.current=now;void typingChannel.current.send({type:"broadcast",event:"typing",payload:{sender:userId,active:Boolean(value.trim())}});}}
 async function toggleReceipts(){if(!supabase||!userId)return;const next=!readReceipts;const {error}=await supabase.from("profiles").update({show_read_receipts:next}).eq("user_id",userId);if(error)setError("Could not save read receipt preference: "+error.message);else setReadReceipts(next);}
 async function send(){
  if(!supabase||!userId||!selected||sending)return;
  const body=draft.trim();if(!body||body.length>2000)return;
  setSending(true);setError("");
  const [a,b]=[userId,selected].sort();
  const {error:sendError}=await supabase.from("match_messages").insert({user_a:a,user_b:b,sender_id:userId,body});
  if(sendError){setError("Message not sent: "+sendError.message);if(/foreign key|row-level security|permission/i.test(sendError.message)){const {data}=await supabase.rpc("my_match_profiles");setMatches(data??[]);}}
  else{setDraft("");await fetchMessages(userId,selected);await refreshSummaries();}
  setSending(false);
 }
 return <main className={mobileChat&&current?"eh-chat-open":"eh-chat-inbox"} style={{minHeight:"100vh",background:"#fff5f5",fontFamily:"Arial,sans-serif",color:"#30252b",paddingBottom:85}}>
  <style>{`@media(max-width:650px){
.eh-chat-open{padding-bottom:0!important}
.eh-chat-open .eh-chat-section{padding:0 8px!important}
.eh-chat-open .eh-chat-layout{border-radius:16px!important}
.eh-chat-open .eh-chat-panel{height:calc(100dvh - 160px)!important;min-height:300px!important}
.eh-chat-open .eh-chat-messages{padding:16px 12px!important;gap:10px!important;overscroll-behavior:contain}
.eh-chat-open .eh-chat-form{padding:10px 10px max(12px,env(safe-area-inset-bottom))!important;background:#fff;position:sticky;bottom:0;z-index:2}
.eh-chat-open .eh-chat-header{display:flex;align-items:center;flex-wrap:wrap;gap:4px;background:#fff}
.eh-chat-open .eh-chat-back{margin-right:5px!important}
.eh-chat-open .eh-chat-header details{width:100%}
.eh-chat-open .eh-chat-messages>div:not(:last-child){max-width:88%!important}
.eh-chat-open .eh-chat-form input{background:#fff9fa;outline-color:#d80621}

.eh-chat-open .eh-chat-heading,.eh-chat-open .eh-chat-intro{display:none}
.eh-chat-layout{display:flex!important;flex-direction:column;min-height:0!important;border-radius:18px!important}
.eh-chat-inbox .eh-chat-panel{display:none!important}
.eh-chat-open .eh-chat-sidebar{display:none!important}
.eh-chat-inbox .eh-chat-sidebar{width:100%;min-height:55vh;border-right:0!important}
.eh-chat-sidebar button{font-size:17px!important;padding:19px 16px!important;border-bottom:1px solid #f6e8ec!important}
.eh-chat-open .eh-chat-panel{display:flex!important;min-height:calc(100dvh - 235px)}
.eh-chat-open .eh-chat-section{margin:10px auto!important}
.eh-chat-open .eh-chat-messages{min-height:0!important;max-height:none!important;flex:1}
.eh-chat-open .eh-chat-header{padding:14px!important}
.eh-chat-open .eh-chat-form{padding:10px!important}
.eh-chat-back{display:inline-flex!important}
.eh-chat-open .eh-chat-panel{height:calc(100dvh - 225px);min-height:350px}
}`}</style>
  <SiteNav/>
  <section className="eh-chat-section" style={{maxWidth:1050,margin:"30px auto",padding:"0 16px"}}>
   <h1 className="eh-chat-heading" style={{fontSize:34,margin:"0 0 8px"}}>Messages <span style={{color:"#d80621"}}>♥</span></h1>
   <p className="eh-chat-intro" style={{color:"#76646d",marginBottom:22}}>Say hello to someone you've matched with.</p>
   {loading?<p>Loading conversations…</p>:!userId?<p><a href="/account">Sign in</a> to message your matches.</p>:matches.length===0?<div style={{background:"white",borderRadius:20,padding:28}}><h2>No conversations yet</h2><p>When you and someone both choose YEH, you can chat here for free.</p><a href="/discover" style={{color:"#d80621",fontWeight:800}}>Discover members</a></div>:
   <div className="eh-chat-layout" style={{display:"grid",gridTemplateColumns:"minmax(145px,260px) minmax(0,1fr)",background:"white",borderRadius:22,overflow:"hidden",minHeight:520,boxShadow:"0 10px 35px #4a15210d"}}>
    <aside className="eh-chat-sidebar" aria-label="Conversations" style={{borderRight:"1px solid #f0e1e5",padding:"16px 8px"}}>
     <h2 style={{fontSize:17,margin:"4px 12px 14px"}}>Conversations</h2><input aria-label="Search conversations" placeholder="Search matches…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:"calc(100% - 16px)",margin:"0 8px 14px",padding:"11px 12px",border:"1px solid #efdce2",borderRadius:14,fontSize:14,outlineColor:"#d80621"}}/>{sortedMatches.length===0&&<p style={{padding:"8px 12px",fontSize:14,color:"#78636c"}}>No active chats. Start a conversation from Matches.</p>}
     {sortedMatches.filter(m=>m.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(m=><button key={m.user_id} onClick={()=>{setSelected(m.user_id);setMobileChat(true);}} style={{display:"block",width:"100%",textAlign:"left",padding:"14px 10px",marginBottom:5,border:0,borderRadius:12,background:selected===m.user_id?"#ffe7eb":"transparent",color:selected===m.user_id?"#b31836":"#4d4147",fontSize:15,fontWeight:selected===m.user_id?800:600,cursor:"pointer",overflow:"hidden"}}><span style={{display:"flex",alignItems:"center",gap:12}}><MatchAvatar match={m} size={48}/><span style={{flex:"1 1 0",minWidth:0,display:"block",overflow:"hidden"}}><span style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"center"}}><strong>{m.display_name}</strong>{Boolean(summaries.find(s=>s.other_user_id===m.user_id)?.unread_count)&&<span style={{background:"#d80621",color:"white",borderRadius:30,fontSize:12,padding:"3px 8px"}}>{summaries.find(s=>s.other_user_id===m.user_id)?.unread_count}</span>}</span><span style={{display:"block",width:"100%",fontSize:13,color:summaries.find(s=>s.other_user_id===m.user_id)?.unread_count?"#30252b":"#897981",fontWeight:summaries.find(s=>s.other_user_id===m.user_id)?.unread_count?800:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",marginTop:4}}>{(()=>{const s=summaries.find(s=>s.other_user_id===m.user_id);return s?.last_body?(s.last_sender_id===userId?"You: ":"")+s.last_body:"Say hello ♥";})()}</span><span style={{fontSize:11,color:"#a08d95",fontWeight:400}}>{(()=>{const s=summaries.find(s=>s.other_user_id===m.user_id);return s?.last_message_at?new Date(s.last_message_at).toLocaleDateString("en-CA",{month:"short",day:"numeric"}):"";})()}</span></span></span></button>)}
    </aside>
    {current?<div className="eh-chat-panel" style={{display:"flex",flexDirection:"column",minWidth:0}}>
     <div className="eh-chat-header" style={{padding:"18px 20px",borderBottom:"1px solid #f0e1e5",fontWeight:800,fontSize:19}}><button className="eh-chat-back" type="button" aria-label="Back to conversations" onClick={()=>setMobileChat(false)} style={{display:"none",alignItems:"center",justifyContent:"center",border:0,background:"#fff0f2",color:"#d80621",borderRadius:30,padding:"8px 13px",marginRight:12,fontWeight:800,cursor:"pointer"}}>← Back</button><span style={{display:"inline-flex",alignItems:"center",gap:10,verticalAlign:"middle"}}>{current&&<MatchAvatar match={current} size={42}/>}<span>{current?.display_name||"Select a match"} <span style={{fontSize:12,color:"#a66575",fontWeight:500}}>♥ Matched</span></span></span>{current&&<details style={{fontSize:12,fontWeight:400,marginTop:8}}><summary style={{cursor:"pointer",color:"#a72b43"}}>Safety · Report or block member</summary><button type="button" disabled={clearing} onClick={()=>void clearChat(current.user_id)} style={{display:"block",margin:"10px 0",border:"1px solid #e6c4cc",background:"#fff",color:"#a72b43",borderRadius:10,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>{clearing?"Deleting…":"Delete chat (keep match)"}</button><SafetyActions targetId={current.user_id} onBlocked={()=>{setMatches(prev=>prev.filter(m=>m.user_id!==current.user_id));setSelected("");setMobileChat(false);setMessages([]);}}/></details>}</div>
     <div className="eh-chat-messages" aria-label="Chat messages" style={{flex:1,minHeight:340,maxHeight:"min(65vh,600px)",overflowY:"auto",padding:"20px 14px",display:"flex",flexDirection:"column",gap:12}}>
      {clearancesLoaded&&messages.length===0&&<div style={{textAlign:"center",color:"#897981",margin:"auto 0",padding:"30px 10px"}}><div style={{fontSize:42,color:"#d80621"}}>♥</div><h3 style={{color:"#34252c",marginBottom:6}}>You and {current?.display_name} matched!</h3><p style={{fontSize:14,lineHeight:1.6}}>Break the ice with a message, or try a conversation starter.</p><div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:18}}>{["Hey! How’s your week going? 😊","What’s your ideal weekend?","Coffee or a walk for a first date? ☕"].map(text=><button key={text} type="button" onClick={()=>setDraft(text)} style={{border:"1px solid #efc8d2",background:"white",borderRadius:22,padding:"10px 13px",color:"#a52640",fontWeight:700,cursor:"pointer",fontSize:13}}>{text}</button>)}</div></div>}
      {(clearancesLoaded?messages.filter(m=>new Date(m.created_at).getTime()>new Date(clearances[selected]||0).getTime()):[]).map(m=><div key={m.id} style={{alignSelf:m.sender_id===userId?"flex-end":"flex-start",maxWidth:"85%"}}>
       <div style={{background:m.sender_id===userId?"#d80621":"#f4edef",color:m.sender_id===userId?"white":"#30252b",padding:"11px 15px",borderRadius:m.sender_id===userId?"18px 18px 5px 18px":"18px 18px 18px 5px",boxShadow:"0 2px 7px #4a15210a",overflowWrap:"anywhere",whiteSpace:"pre-wrap",lineHeight:1.5}}>{m.body}</div>
       <div style={{fontSize:11,color:"#96858d",marginTop:4,textAlign:m.sender_id===userId?"right":"left"}}>{new Date(m.created_at).toLocaleTimeString("en-CA",{hour:"numeric",minute:"2-digit"})}{m.sender_id===userId&&otherReceipts&&m.read_at&&<span style={{marginLeft:6,color:"#b51e3e",fontWeight:700}}>✓ Read</span>}{m.sender_id!==userId&&<button type="button" onClick={()=>{setReportingMessage(m.id);setReportStatus("");}} style={{border:0,background:"transparent",color:"#a72b43",marginLeft:10,textDecoration:"underline",cursor:"pointer",fontSize:11}}>Report message</button>}</div>
      </div>)}
      {typing&&<p role="status" style={{fontSize:12,color:"#a62b45",margin:"0 0 3px 8px"}}>{current?.display_name} is typing …</p>}
      <div ref={bottom}/>
     </div>
     {reportingMessage!==null&&<div style={{padding:14,background:"#fff1f3",borderTop:"1px solid #f0d5dc"}}>
      <strong>Report this message</strong>
      <select aria-label="Report reason" value={reportReason} onChange={e=>setReportReason(e.target.value)} style={{display:"block",width:"100%",padding:10,marginTop:8,borderRadius:10,border:"1px solid #e6c4cc"}}>{["Harassment or bullying","Threats or violence","Sexual harassment","Hate speech","Spam or scam","Other"].map(r=><option key={r}>{r}</option>)}</select>
      <textarea aria-label="Report details" placeholder="Additional details (optional)" maxLength={1000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} style={{width:"100%",boxSizing:"border-box",marginTop:8,padding:10,borderRadius:10,border:"1px solid #e6c4cc"}}/>
      <div style={{display:"flex",gap:12,marginTop:8}}><button type="button" disabled={reportBusy} onClick={()=>void reportMessage()} style={{background:"#d80621",color:"white",border:0,borderRadius:20,padding:"9px 14px",fontWeight:700}}>{reportBusy?"Submitting…":"Submit report"}</button><button type="button" onClick={()=>setReportingMessage(null)} style={{border:0,background:"transparent"}}>Cancel</button></div>
     </div>}
     {reportStatus&&<p role="status" style={{padding:"0 14px",color:"#9b1c39"}}>{reportStatus}</p>}
     <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 15px",fontSize:12,color:"#806a75"}}><input type="checkbox" checked={readReceipts} onChange={()=>void toggleReceipts()}/> Share my read receipts (off by default)</label>
     <form className="eh-chat-form" onSubmit={e=>{e.preventDefault();void send();}} style={{display:"flex",gap:9,padding:14,borderTop:"1px solid #f0e1e5"}}>
      <input aria-label="Write a message" value={draft} onChange={e=>updateDraft(e.target.value)} maxLength={2000} placeholder="Write a message…" style={{flex:1,minWidth:0,border:"1px solid #e8d5dc",borderRadius:25,padding:"13px 15px",fontSize:16}}/>
      <button type="submit" disabled={sending||!draft.trim()} style={{background:"#d80621",color:"white",border:0,borderRadius:25,padding:"12px 17px",fontWeight:800,cursor:"pointer",opacity:(sending||!draft.trim())?0.6:1}}>{sending?"…":"Send"}</button>
     </form><div style={{textAlign:"right",padding:"0 17px 9px",fontSize:11,color:"#a18d96"}}>{draft.length} / 2000 characters</div>
    </div>:<div className="eh-chat-panel" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:28,color:"#897981",textAlign:"center"}}>Select a conversation to read or send messages.</div>}
   </div>}
   {error&&<p role="alert" style={{color:"#a60020",marginTop:15}}>{error}</p>}
  </section>
 </main>;
}
export default function MessagesPage(){return <Suspense fallback={<main style={{padding:30}}>Loading messages…</main>}><MessagesContent/></Suspense>;}
