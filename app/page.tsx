import Link from "next/link";
const benefits=[
 {icon:"🇨🇦",title:"Canadian connections",description:"From your neighbourhood to across the country, meet people who call Canada home."},
 {icon:"♥",title:"YEH or NEH. Your call.",description:"Find someone who catches your eye. When the feeling is mutual, it's a match."},
 {icon:"💬",title:"Good conversations start here",description:"Chat with your matches and see where a little hello takes you."}
];
export default function Home(){
 return <main className="eh-home">
  <header className="eh-home-nav"><Link href="/" className="eh-home-logo">♥ ehdate<span>.</span></Link><nav aria-label="Homepage navigation"><Link className="eh-home-signin" href="/account">Sign in</Link><Link className="eh-home-nav-cta" href="/account">Join free <span aria-hidden="true">↗</span></Link></nav></header>
  <section className="eh-home-hero"><div className="eh-home-hero-inner">
   <div className="eh-home-copy"><div className="eh-home-kicker"><span>🇨🇦</span> MADE FOR CANADIAN SINGLES</div><h1>Canadians<br/><span>Meet Here.</span><span className="eh-home-heart" aria-hidden="true">♥</span></h1><p>Great connections can start with one little <strong>YEH.</strong> Meet new people, find your kind of chemistry, and make dating feel fun again.</p><div className="eh-home-actions"><Link href="/account" className="eh-home-primary">Join ehdate — It’s free <span aria-hidden="true">↗</span></Link><Link href="/account" className="eh-home-secondary">Already a member? Sign in</Link></div><div className="eh-home-trust"><span>✓ Free to join</span><span>✓ Made for Canada</span><span>✓ 18+ only</span></div></div>
   <div className="eh-home-art" aria-label="Illustration of ehdate's dating discovery experience"><div className="eh-home-orbit eh-home-orbit-one"/><div className="eh-home-orbit eh-home-orbit-two"/><div className="eh-home-float eh-home-float-like">♥ <strong>It’s a match!</strong></div><div className="eh-home-float eh-home-float-yeh">♥ YEH!</div>
    <div className="eh-home-phone"><div className="eh-home-phone-top"><span>♥ ehdate.</span><span>☷</span></div><div className="eh-home-phone-photo"><div className="eh-home-sun"/><div className="eh-home-mountain"/><div className="eh-home-person"><div className="eh-home-hair"/><div className="eh-home-face"/><div className="eh-home-body"/></div><div className="eh-home-photo-label">Meet your next connection ✨</div></div><div className="eh-home-phone-info"><strong>Discover someone new <span>♥</span></strong><p>Good vibes, great conversations, and a little adventure.</p><div className="eh-home-phone-buttons"><span>✕ <small>NEH</small></span><span>♥ <small>YEH</small></span></div></div></div>
    <div className="eh-home-float eh-home-float-canada">🍁 Coast to coast</div>
   </div>
  </div></section>
  <section className="eh-home-how" id="how-it-works"><div className="eh-home-section-heading"><span>THE EHDATE WAY</span><h2>Dating, with a little more <em>heart.</em></h2><p>No complicated rules. Just a better way to meet people and see where things go.</p></div><div className="eh-home-benefits">{benefits.map((b,i)=><article className="eh-home-benefit" key={b.title}><div className="eh-home-benefit-icon">{b.icon}</div><span className="eh-home-benefit-number">0{i+1}</span><h3>{b.title}</h3><p>{b.description}</p></article>)}</div></section>
  <section className="eh-home-bottom"><div className="eh-home-bottom-glow"/><span>YOUR NEXT CHAPTER STARTS HERE</span><h2>Your next connection<br/>could be one <em>YEH</em> away.</h2><p>Come as you are. Meet someone who gets you.</p><Link href="/account" className="eh-home-bottom-cta">Create your free profile <span aria-hidden="true">↗</span></Link></section>
  <footer className="eh-home-footer"><Link href="/" className="eh-home-logo">♥ ehdate<span>.</span></Link><p>Canadians Meet Here. 🇨🇦</p><small>© {new Date().getFullYear()} ehdate · For adults 18+</small></footer>
 </main>;
}
