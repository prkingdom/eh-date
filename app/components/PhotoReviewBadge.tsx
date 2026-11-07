"use client";
import {useState} from "react";
export default function PhotoReviewBadge(){
 const [open,setOpen]=useState(false);
 return <span style={{display:"inline-flex",position:"relative",verticalAlign:"middle",marginLeft:7}}><button type="button" aria-label="What does this blue check mean?" aria-expanded={open} onClick={e=>{e.stopPropagation();setOpen(v=>!v);}} style={{border:0,background:"transparent",padding:"0 3px",cursor:"pointer",color:"#1687e8",fontSize:21,fontWeight:900,lineHeight:1}}>●✓</button>{open&&<span role="status" style={{position:"absolute",zIndex:50,top:"100%",left:0,width:235,background:"#fff",border:"1px solid #b9d9f4",boxShadow:"0 6px 24px #1235",borderRadius:12,padding:12,color:"#273b4a",fontSize:13,fontWeight:500,lineHeight:1.4,whiteSpace:"normal"}}>Photo reviewed: a moderator compared a submitted selfie with profile photos. This does not confirm legal identity.</span>}</span>;
}
