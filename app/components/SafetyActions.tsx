"use client";
import {useState} from "react";
import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
const reasons=[{value:"harassment",label:"Harassment or bullying"},{value:"fake_profile",label:"Fake profile or impersonation"},{value:"inappropriate_content",label:"Inappropriate photos or content"},{value:"underage",label:"Underage member"},{value:"other",label:"Spam, scam, or other"}];
export default function SafetyActions({targetId,onBlocked}:{targetId:string;onBlocked:()=>void}){
 const [open,setOpen]=useState(false);
 const [reason,setReason]=useState(reasons[0].value);
 const [details,setDetails]=useState("");
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState("");
 async function block(){
  if(!supabase||busy)return;
  if(!window.confirm("Block this member? You will no longer see each other in Discovery or Matches."))return;
  setBusy(true);setStatus("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setStatus("Sign in to block a member.");setBusy(false);return;}
  const {error}=await supabase.from("blocks").upsert({blocker_id:user.id,blocked_id:targetId},{onConflict:"blocker_id,blocked_id"});
  if(error)setStatus("Could not block: "+error.message);
  else onBlocked();
  setBusy(false);
 }
 async function report(){
  if(!supabase||busy)return;
  setBusy(true);setStatus("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setStatus("Sign in to report a member.");setBusy(false);return;}
  const {error}=await supabase.from("profile_reports").insert({reporter_id:user.id,reported_id:targetId,reason,details:details.trim()||null});
  if(error)setStatus("Could not submit report: "+error.message);
  else{setStatus("Report submitted. Thank you for helping keep ehdate safe.");setOpen(false);setDetails("");}
  setBusy(false);
 }
 return <div style={{marginTop:14}}>
  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
   <button type="button" disabled={busy} onClick={()=>setOpen(v=>!v)} style={{background:"white",border:"1px solid #e6c4cc",borderRadius:12,padding:"9px 14px",color:"#a72b43",fontWeight:700,cursor:"pointer"}}>Report</button>
   <button type="button" disabled={busy} onClick={()=>void block()} style={{background:"white",border:"1px solid #e6c4cc",borderRadius:12,padding:"9px 14px",color:"#a72b43",fontWeight:700,cursor:"pointer"}}>Block</button>
  </div>
  {open&&<div style={{marginTop:14,padding:18,borderRadius:16,background:"#fff3f5",border:"1px solid #f0d5dc"}}>
   <h3 style={{margin:"0 0 12px",fontSize:18}}>Report this member</h3>
   <label style={{display:"block",fontWeight:700}}>Reason
    <select value={reason} onChange={e=>setReason(e.target.value)} style={{display:"block",width:"100%",padding:11,borderRadius:10,border:"1px solid #d9bfc6",marginTop:6,background:"white"}}>{reasons.map((r,i)=><option key={i} value={r.value}>{r.label}</option>)}</select>
   </label>
   <label style={{display:"block",fontWeight:700,marginTop:12}}>Details (optional)
    <textarea value={details} maxLength={1000} onChange={e=>setDetails(e.target.value)} rows={3} placeholder="Tell us what happened…" style={{display:"block",width:"100%",boxSizing:"border-box",padding:11,borderRadius:10,border:"1px solid #d9bfc6",marginTop:6,fontFamily:"inherit"}}/>
   </label>
   <div style={{display:"flex",gap:10,marginTop:14}}>
    <button type="button" disabled={busy} onClick={()=>void report()} style={{border:0,borderRadius:20,background:"#d80621",color:"white",fontWeight:800,padding:"11px 17px",cursor:"pointer"}}>{busy?"Submitting…":"Submit report"}</button>
    <button type="button" onClick={()=>setOpen(false)} style={{border:0,background:"transparent",padding:10,cursor:"pointer"}}>Cancel</button>
   </div>
   <p style={{fontSize:12,color:"#786a70",lineHeight:1.5}}>Reports are private. Reporting does not automatically block this member.</p>
  </div>}
  {status&&<p role="status" style={{color:"#9b1c39",fontSize:13}}>{status}</p>}
 </div>;
}
