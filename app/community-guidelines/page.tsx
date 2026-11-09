import Link from "next/link";

export const metadata = {title:"Community Guidelines | ehdate",description:"Rules for respectful and safe connections on ehdate."};

export default function CommunityGuidelines(){
 const sections=[
  ["Be respectful","Treat other members with respect. Harassment, threats, hate speech, bullying, unwanted sexual messages, and repeated contact after a rejection are not allowed."],
  ["Be yourself","Use your own identity and current photos. Impersonation, misleading profiles, scams, spam, and attempts to obtain money or sensitive information through deception are prohibited."],
  ["Adults only","You must be at least 18 years old to use ehdate. Report accounts you believe belong to minors."],
  ["Keep content appropriate","Do not post sexual exploitation material, non-consensual intimate images, graphic violence, or illegal content. Only upload photos and other content you have permission to share."],
  ["Respect boundaries and privacy","Do not share another person's private information, images, or conversations without permission. Never pressure someone to meet, disclose information, or continue chatting."],
  ["Stay safe when meeting","Keep early conversations on the app, protect your personal and financial information, and choose a public place if you decide to meet. Tell someone you trust about your plans."],
  ["Report problems","Use Report on a profile or message to flag concerning behaviour. Use Block to stop interacting with someone. Reports are reviewed, and violations may lead to content removal, suspension, or account termination."],
 ];
 return <main style={{maxWidth:800,margin:"30px auto",padding:"20px 22px 80px",lineHeight:1.7,color:"#35272e"}}>
  <Link href="/" style={{color:"#d80621",fontWeight:800,textDecoration:"none"}}>♥ ehdate.</Link>
  <h1 style={{fontSize:36,marginBottom:8}}>Community Guidelines</h1>
  <p>ehdate is for Canadian adults looking to connect. These guidelines apply to profiles, photos, messages, and other activity on the service.</p>
  {sections.map(([heading,body])=><section key={heading} style={{marginTop:25}}><h2 style={{fontSize:21,marginBottom:5}}>{heading}</h2><p style={{marginTop:0}}>{body}</p></section>)}
  <p style={{marginTop:30,fontSize:14,color:"#786b72"}}>These guidelines may be updated as the service evolves. Serious or repeated violations can result in restrictions or removal from ehdate.</p>
 </main>;
}
