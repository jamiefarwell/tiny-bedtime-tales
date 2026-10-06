export const metadata={title:'Privacy approach | Tiny Bedtime Tales'};

export default function Privacy(){
  return <main className="shell" style={{paddingTop:50,paddingBottom:80,maxWidth:860}}>
    <a href="/" className="ghost" style={{display:'inline-block',marginBottom:28}}>← Back to Tiny Bedtime Tales</a>
    <div className="kicker">Development privacy approach</div>
    <h1 style={{font:'700 clamp(42px,7vw,70px)/1 Georgia,serif',letterSpacing:'-.04em',margin:'12px 0 20px'}}>Stories need imagination, not identity.</h1>
    <p className="sectionText">Tiny Bedtime Tales is being designed as a parent-led service. We deliberately ask for the minimum child information needed to make a bedtime story feel personal.</p>
    <section className="section" style={{paddingBottom:20}}>
      <div className="card"><h3>What we use for stories</h3><p>First name or nickname, age band, broad interests and hobbies, optional pet or friend first names, favourite things, story preferences and things a parent would like a story to avoid.</p></div>
      <div className="card" style={{marginTop:14}}><h3>What we do not ask for</h3><p>No child photographs, surnames, exact dates of birth, home addresses, schools, clubs, phone numbers or exact live locations are required for the storytelling experience.</p></div>
      <div className="card" style={{marginTop:14}}><h3>Development preview</h3><p>The current preview stores the child profile and story library in the browser on the device being used. Cloud accounts and database storage will only be enabled after the production privacy and account controls are in place.</p></div>
      <div className="card" style={{marginTop:14}}><h3>AI story generation</h3><p>When the live story engine is available, the app removes common contact details and other unnecessary identifying information from free-text fields before constructing a story request. The product will continue to minimise the data sent to AI providers.</p></div>
    </section>
    <p style={{color:'#7f93ac',lineHeight:1.7,fontSize:13}}>This is a development-stage product statement rather than the final legal privacy notice. A full UK-facing privacy notice and parental account terms will be completed before commercial launch.</p>
  </main>;
}
