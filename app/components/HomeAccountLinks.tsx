"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
export default function HomeAccountLinks({placement="header"}:{placement?:"header"|"hero"|"bottom"}){
 const [signedIn,setSignedIn]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{if(!supabase){setReady(true);return;}let mounted=true;void supabase.auth.getUser().then(({data})=>{if(mounted){setSignedIn(Boolean(data.user));setReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(mounted){setSignedIn(Boolean(session?.user));setReady(true);}});return()=>{mounted=false;subscription.unsubscribe();};},[]);
 if(placement==="header")return <nav aria-label="Homepage navigation">{signedIn?<><Link className="eh-home-signin" href="/matches">Matches</Link><Link className="eh-home-nav-cta" href="/discover">Go to Discovery ↗</Link></>:<><Link className="eh-home-signin" href="/account">Sign in</Link><Link className="eh-home-nav-cta" href="/account">Join free ↗</Link></>}</nav>;
 if(placement==="hero")return <div className="eh-home-actions">{signedIn?<><Link href="/discover" className="eh-home-primary">Go to Discovery ↗</Link><Link href="/messages" className="eh-home-secondary">My messages ♥</Link></>:<><Link href="/account" className="eh-home-primary">Join ehdate — It’s free ↗</Link><Link href="/account" className="eh-home-secondary">Already a member? Sign in</Link></>}</div>;
 return <Link href={signedIn?"/discover":"/account"} className="eh-home-bottom-cta">{signedIn?"Go to Discovery":"Create your free profile"} ↗</Link>;
}
