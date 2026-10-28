"use strict";
/* Shorts Tracker. Plain JavaScript, no build step.
   Data lives in localStorage first (instant, works offline) and syncs to Supabase when configured. */

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const p2=n=>n<10?"0"+n:""+n;
const key=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
const fk=k=>{const a=k.split("-");return new Date(+a[0],a[1]-1,+a[2])};
const ad=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const addk=(k,n)=>key(ad(fk(k),n));
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fd=k=>{const d=fk(k);return MON[d.getMonth()]+" "+d.getDate()};
const fdl=k=>{const d=fk(k);return DOW[d.getDay()].slice(0,3)+" "+d.getDate()+" "+MON[d.getMonth()]};
const fmt=n=>Math.round(n).toLocaleString("en-US");
const mondayOf=d=>ad(d,-((d.getDay()+6)%7));
const avg=(a,f)=>a.length?a.reduce((s,l)=>s+(+l[f]||0),0)/a.length:0;
const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const newId=()=>"n"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const KEEP=3; /* tasks needed to keep the streak alive */
const isCollege=w=>w>=3&&w<=5;
const mmss=s=>Math.floor(s/60)+":"+p2(s%60);
const hhmm=ms=>{const d=new Date(ms);return p2(d.getHours())+":"+p2(d.getMinutes())};
function fmtDur(sec){sec=Math.round(sec);if(sec<60)return sec>0?"<1m":"0m";const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?h+"h"+(m?" "+m+"m":""):m+"m"}
function fmtClock(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?h+":"+p2(m)+":"+p2(s):p2(m)+":"+p2(s)}
const hrs1=sec=>(Math.round(sec/360)/10).toString();

/* ---------- content ---------- */
const PH=[{n:"Fix your channel",g:"Get your own Shorts above your 1,000-view floor. Build data, not guesses."},{n:"Build proof + outreach",g:"Free samples, warm messages, first paying clip client and coaching student."},{n:"Sell with proof",g:"Deliver clips, run coaching calls, collect testimonials, raise prices slowly."}];
const STUDY=["Weekly analytics review: your top 3 vs bottom 3 Shorts this week. What was different?","Teardown: pick 3 Shorts from channels bigger than you. Write each hook, how many cuts, and the ending.","Retention hunt: open your lowest-retention Short and find the exact second people leave. Why?","Hook bank: collect 5 strong opening lines from Shorts you watched today.","Editing skill: learn ONE CapCut technique (captions, zoom cut, sound-effect timing). Use it once.","Sales/coaching skill: watch or read one lesson on selling a service or running a call. Write 3 notes.","Niche radar: what topics are blowing up right now in your niche? Write 5 ideas."];
const TESTS=["Hook style (question vs bold claim vs visual shock)","Video length (under 20s vs 30–40s)","On-screen text (big captions vs minimal)","Pacing (a cut every 1–2s vs slower)","Ending (loop back to the start vs plain end)"];
const TESTV=[["question hook","bold claim","visual shock"],["under 20s","30-40s"],["big captions","minimal text"],["fast cuts","slower pacing"],["loop ending","plain ending"]];
const tname=i=>TESTS[i].split(" (")[0];
const CORE_T=["Post 1 Short","Study block","Hook / next clip","Save 1 clip","Numbers"];
const SUGS_ALL=[[["Edit a backup Short",10],["Rewatch and fix your worst Short idea",10],["Read 1 YouTube help article",5]],[["Make a free sample clip",20],["Send 5 warm messages",10],["Follow up on messages",10],["Walk into 2–3 local businesses",20]],[["Deliver a client clip",20],["Run a coaching call or audit",20],["Ask a client for a testimonial",10]]];
const LEVELS=[[1,"Starter"],[3,"Warming up"],[5,"Rhythm"],[7,"Locked in"],[10,"Sharp"],[13,"Dialed"],[17,"Relentless"],[21,"Veteran"]];
const lvName=L=>{let n=LEVELS[0][1];LEVELS.forEach(x=>{if(L>=x[0])n=x[1]});return n};
const DEFAULT_WHY="To see how far I can go, measured against who I was last month. Not against anyone else.";
const DEFAULT_CATS=[["mk","Making Shorts"],["ed","Editing"],["ch","Clip hunting"],["st","Studying"],["ou","Outreach"],["pb","Personal brand"],["ot","Other"]];
const HAB_SUG=["Gym","Reading","Journal","Walk","Meditate"];
const WD=[["M",1],["T",2],["W",3],["T",4],["F",5],["S",6],["S",0]];

/* ---------- state ---------- */
const CFG=window.APP_CONFIG||{};
const SYNC_ON=!!(CFG.supabaseUrl&&CFG.supabaseKey);
const LS="sp5",AUTH_LS="sp5auth";
function blank(){return{start:key(new Date()),days:{},logs:[],clips:[],ses:[],habits:[],cats:DEFAULT_CATS.map(c=>({id:c[0],n:c[1]})),goal:{h:3},tm:null,lastCat:"mk",rv:{},why:DEFAULT_WHY,base:{s:"",n:"",t:""},test:null,u:{}}}
function norm(d){
  d=Object.assign(blank(),d||{});
  d.days=d.days||{};d.logs=d.logs||[];d.clips=d.clips||[];d.ses=d.ses||[];d.habits=d.habits||[];d.rv=d.rv||{};d.u=d.u||{};d.base=Object.assign({s:"",n:"",t:""},d.base||{});
  if(!d.cats||!d.cats.length)d.cats=DEFAULT_CATS.map(c=>({id:c[0],n:c[1]}));
  d.goal=Object.assign({h:3},d.goal||{});
  Object.keys(d.days).forEach(k=>{const r=d.days[k];if(!r.c||r.c.length!==5)r.c=[0,0,0,0,0];if(!r.x)r.x=[]});
  d.logs.forEach((l,i)=>{if(!l.id)l.id="o"+i;if(l.tr==null){l.tr=Math.floor(i/5);l.ti=l.tr%5}if(l.lg==null){l.lg=l.v!=null?1:0;if(l.lg)l.c7={skip:1}}});
  if(!d.test){const n=d.logs.length;d.test={i:Math.floor(n/5)%5,r:Math.floor(n/5)}}
  return d;
}
function load(){try{const s=localStorage.getItem(LS);if(s)return norm(JSON.parse(s))}catch(e){}return norm(null)}
let D=load();
let NOW=new Date(),T=key(NOW),dow=NOW.getDay();
let VIEW="today",progSeg="stats",selDay=T,selPt=null,selSes=T,editShort=null,numId=null,c7Id=null,editClip=null,editSes=null,clipIdx=0,pendingRender=false,finEnd=null;
const persist=()=>{try{localStorage.setItem(LS,JSON.stringify(D))}catch(e){}};

/* ---------- derived: streak, shorts, clips ---------- */
const dayN=()=>Math.max(1,Math.round((new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate())-fk(D.start))/864e5)+1);
const phase=()=>{const n=dayN();return n<=14?0:n<=30?1:2};
const cnt=k=>{const d=D.days[k];return d?d.c.reduce((a,b)=>a+(b?1:0),0):0};
const isRest=k=>!!(D.days[k]&&D.days[k].r);
const kept=k=>isRest(k)||cnt(k)>=KEEP;
const xpOf=k=>{const d=D.days[k];if(!d)return 0;const n=cnt(k);let x=n*10+(n===5?10:0);d.x.forEach(e=>x+=e.v);return x};
const allXp=()=>Object.keys(D.days).reduce((s,k)=>s+xpOf(k),0);
const levelOf=xp=>Math.floor(Math.sqrt(xp/50))+1;
function curStreak(){let d=fk(T),n=0;if(!kept(T))d=ad(d,-1);for(;;){const k=key(d);if(isRest(k)){d=ad(d,-1);continue}if(cnt(k)>=KEEP){n++;d=ad(d,-1)}else break}return n}
function bestStreak(){const ks=Object.keys(D.days).sort();if(!ks.length)return{n:0,end:null};let c=0,b=0,be=null;for(let d=fk(ks[0]);key(d)<=T;d=ad(d,1)){const k=key(d);if(isRest(k))continue;if(cnt(k)>=KEEP){c++;if(c>b){b=c;be=k}}else if(k!==T)c=0}return{n:b,end:be}}
const weekKeys=k=>{const m=mondayOf(fk(k));return[0,1,2,3,4,5,6].map(i=>key(ad(m,i)))};
const ld=l=>l.pd||l.d;                       /* publish date */
const done=()=>D.logs.filter(l=>l.lg);        /* Shorts that have their 48-hour numbers */
const logsSorted=()=>done().sort((a,b)=>ld(a)<ld(b)?-1:ld(a)>ld(b)?1:0);
const ret=l=>l.len>0&&l.a>0?Math.round(l.a/l.len*100):null;
const shortsOn=k=>D.logs.filter(l=>ld(l)===k);
const dueNums=()=>{const cut=addk(T,-2);return D.logs.filter(l=>!l.lg&&ld(l)<=cut).sort((a,b)=>ld(a)<ld(b)?-1:1)};
const due7=()=>{const cut=addk(T,-7),old=addk(T,-21);return D.logs.filter(l=>l.lg&&!l.c7&&ld(l)<=cut&&ld(l)>=old).sort((a,b)=>ld(a)<ld(b)?-1:1)};
const unused=()=>D.clips.filter(c=>!c.used);
const clipById=id=>D.clips.find(c=>c.id===id);
function wkSum(off){const m=ad(mondayOf(NOW),-7*off),ks=[0,1,2,3,4,5,6].map(i=>key(ad(m,i)));return{xp:ks.reduce((s,k)=>s+xpOf(k),0),kept:ks.filter(kept).length,full:ks.filter(k=>cnt(k)===5).length,ks,logs:done().filter(l=>ld(l)>=ks[0]&&ld(l)<=ks[6])}}
function activeProg(){return D.logs.filter(l=>l.tr===D.test.r).length}
function ruleText(){const i=D.test.i;return"<b>Rule for this Short: "+esc(tname(i))+".</b> Use one of: "+TESTV[i].map(esc).join(", ")+". Short "+Math.min(activeProg()+1,5)+" of 5 on this test. Change nothing else."}
function collegeBlock(){let r=[];for(let i=0;i<8;i++){const x=ad(fk(T),i);if(isCollege(x.getDay())){const mon=mondayOf(x);r=[2,3,4].map(o=>key(ad(mon,o))).filter(k=>k>=T);break}}return r}
function coreFor(){
  const col=isCollege(dow),tt=shortsOn(T),n=dueNums().length,n7=due7().length;
  return[
   tt.length?{t:"Today's Short goes live",s:"“"+tt[0].t+"” is set for today. Tick it once it is out."}
     :{t:"Post 1 Short",s:col?"Nothing is scheduled for today. Post one if you can, or schedule ahead on your next make day.":"Pick a clip, make it in CapCut (max 20 min), then save it in the Shorts tab."},
   {t:"Study block · "+(col?20:45)+" min",s:STUDY[dow]},
   col?{t:"Pick your next clip",s:"Choose which saved clip you will make next. Jot a hook idea in its note."}
      :{t:"Write today's hook",s:"Write it in CapCut once you know the clip, then save it with the Short. First 2 seconds."},
   {t:"Save 1 good clip",s:"Paste a YouTube link in Clips when you find one. 7 a week covers every Short."},
   n||n7?{t:"Fill in numbers · "+(n+n7)+" due",s:"Shorts that are 48 hours old have full stats now. Open the Shorts tab."}
        :{t:"Numbers: nothing due today",s:"No Short is 48 hours old yet. Tick this to count it."}];
}

/* ---------- derived: work time ---------- */
const catById=id=>D.cats.find(c=>c.id===id);
const catName=id=>{const c=catById(id);return c?c.n:"Other"};
const catColor=id=>{const i=D.cats.findIndex(c=>c.id===id);return"var(--k"+((i<0?6:i)%7+1)+")"};
const dayStartMs=k=>fk(k).getTime(),dayEndMs=k=>ad(fk(k),1).getTime();
function segSecOn(segs,k,now){const a=dayStartMs(k),b=dayEndMs(k);let t=0;segs.forEach(g=>{const e=g[1]==null?now:g[1],lo=Math.max(g[0],a),hi=Math.min(e,b);if(hi>lo)t+=hi-lo});return t/1000}
function secByCat(k,onlyHand){
  const now=Date.now(),o={},add=(segs,cat)=>{const t=segSecOn(segs,k,now);if(t>0)o[cat]=(o[cat]||0)+t};
  const p=addk(k,-1);
  D.ses.forEach(x=>{if((x.d===k||x.d===p)&&(!onlyHand||x.src==="manual"))add(x.segs,x.cat)});
  if(D.tm&&!onlyHand)add(D.tm.segs,D.tm.cat);
  return o;
}
const sumVals=o=>Object.keys(o).reduce((s,k)=>s+o[k],0);
const secOn=k=>sumVals(secByCat(k));
const tmSec=(tm,now)=>tm.segs.reduce((s,g)=>s+((g[1]==null?now:g[1])-g[0]),0)/1000;
const tmRunning=tm=>!!(tm&&tm.segs.length&&tm.segs[tm.segs.length-1][1]==null);
const sesSec=x=>x.segs.reduce((s,g)=>s+(g[1]-g[0]),0)/1000;
function weekWork(off){
  const m=ad(mondayOf(NOW),-7*off),ks=[0,1,2,3,4,5,6].map(i=>key(ad(m,i))),per=ks.map(k=>secByCat(k)),tot=per.map(sumVals),hand=ks.reduce((s,k)=>s+sumVals(secByCat(k,true)),0);
  return{ks,per,tot,sum:tot.reduce((a,b)=>a+b,0),hand};
}

/* ---------- derived: habits ---------- */
const habDone=(h,k)=>!!(D.days[k]&&D.days[k].h&&D.days[k].h[h.id]);
const habSched=(h,k)=>h.dw.indexOf(fk(k).getDay())>=0;
function habStreak(h){let d=fk(T),n=0;for(let i=0;i<800;i++){const k=key(d);if(k<h.added)break;if(habSched(h,k)){if(habDone(h,k))n++;else if(k!==T)break}d=ad(d,-1)}return n}
function habRate(h){let s=0,dn=0;for(let i=0;i<30;i++){const k=key(ad(fk(T),-i));if(k<h.added)break;if(habSched(h,k)){s++;if(habDone(h,k))dn++}}return s?Math.round(dn/s*100):null}

/* ---------- sync ---------- */
const SPECIAL=["meta","clips"];
const validId=id=>SPECIAL.indexOf(id)>=0||/^m-\d{4}-\d{2}$/.test(id);
const ukeyOf=id=>SPECIAL.indexOf(id)>=0?id:id.slice(2);
const idOfU=k=>SPECIAL.indexOf(k)>=0?k:"m-"+k;
const META_F=["start","why","base","rv","test","habits","cats","goal","tm","lastCat"];
const dirty=new Set();let REMOTE=new Set(),syncing=false,syncT=null,lastSync=0,syncMode=SYNC_ON?"signedout":"local";
let AUTH=null;try{AUTH=JSON.parse(localStorage.getItem(AUTH_LS))}catch(e){}
const saveAuth=()=>{try{if(AUTH)localStorage.setItem(AUTH_LS,JSON.stringify(AUTH));else localStorage.removeItem(AUTH_LS)}catch(e){}};
function setSync(s){
  syncMode=s;const e=$("sync");e.className="sync "+s;
  const m={local:"Saved on this phone only",signedout:"Not signed in. Open More to sign in",syncing:"Syncing…",saving:"Saving…",synced:"Synced",error:"Offline or sync problem. Saved on this phone."}[s]||"";
  e.title=m;e.setAttribute("aria-label",m);
  const st=$("syncst");if(st)st.textContent=m+(s==="synced"&&lastSync?" · "+hhmm(lastSync):"");
}
async function sb(path,opt){
  opt=opt||{};const h=Object.assign({apikey:CFG.supabaseKey,"Content-Type":"application/json"},opt.headers||{});
  if(opt.auth!==false)h.Authorization="Bearer "+((AUTH&&AUTH.access_token)||CFG.supabaseKey);
  const r=await fetch(CFG.supabaseUrl.replace(/\/$/,"")+path,{method:opt.method||"GET",headers:h,body:opt.body?JSON.stringify(opt.body):undefined});
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok){const er=new Error((j&&(j.msg||j.message||j.error_description||j.error))||"Request failed ("+r.status+")");er.status=r.status;throw er}
  return j;
}
function setAuth(j){AUTH={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,uid:j.user.id,email:j.user.email};saveAuth()}
async function authCall(kind,email,pw){
  const j=await sb(kind==="up"?"/auth/v1/signup":"/auth/v1/token?grant_type=password",{method:"POST",body:{email,password:pw},auth:false});
  if(!j||!j.access_token)return"confirm";
  setAuth(j);return"ok";
}
async function ensureAuth(){
  if(!AUTH)return false;if(AUTH.expires_at-Date.now()>60000)return true;
  try{const j=await sb("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:AUTH.refresh_token},auth:false});setAuth(j);return true}
  catch(e){if(e.status===400||e.status===401||e.status===403){AUTH=null;saveAuth();setSync("signedout");renderSync()}return false}
}
function docFor(id){
  const u=D.u[ukeyOf(id)]||0;
  if(id==="meta"){const o={u};META_F.forEach(f=>{o[f]=D[f]});return o}
  if(id==="clips")return{items:D.clips,u};
  const m=id.slice(2),days={};Object.keys(D.days).forEach(k=>{if(k.slice(0,7)===m)days[k]=D.days[k]});
  return{days,logs:D.logs.filter(l=>l.d.slice(0,7)===m),ses:D.ses.filter(x=>x.d.slice(0,7)===m),u};
}
function adopt(id,data,u){
  if(id==="meta"){META_F.forEach(f=>{if(data[f]!==undefined)D[f]=data[f]})}
  else if(id==="clips"){D.clips=data.items||[]}
  else{const m=id.slice(2);Object.keys(D.days).forEach(k=>{if(k.slice(0,7)===m)delete D.days[k]});Object.assign(D.days,data.days||{});
    D.logs=D.logs.filter(l=>l.d.slice(0,7)!==m).concat(data.logs||[]);D.logs.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
    D.ses=D.ses.filter(x=>x.d.slice(0,7)!==m).concat(data.ses||[]);D.ses.sort((a,b)=>a.segs[0][0]-b.segs[0][0])}
  D.u[ukeyOf(id)]=u||0;
}
async function pushDirty(){
  for(const id of Array.from(dirty)){
    const body=docFor(id);
    await sb("/rest/v1/docs?on_conflict=user_id,id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:{user_id:AUTH.uid,id,data:body,u:body.u}});
    if((D.u[ukeyOf(id)]||0)===body.u)dirty.delete(id);
  }
}
async function syncNow(){
  if(!SYNC_ON||syncing)return;
  if(!await ensureAuth()){if(!AUTH)setSync("signedout");else setSync("error");return}
  syncing=true;setSync(dirty.size?"saving":"syncing");
  try{
    const rows=await sb("/rest/v1/docs?select=id,u");
    REMOTE=new Set(rows.map(r=>r.id));const seen=new Set();let changed=false;
    for(const r of rows){
      if(!validId(r.id))continue;seen.add(r.id);
      if(dirty.has(r.id))continue;
      const lu=D.u[ukeyOf(r.id)]||0;
      if(r.u>lu){const full=await sb("/rest/v1/docs?select=data,u&id=eq."+encodeURIComponent(r.id));if(full[0]){adopt(r.id,full[0].data,full[0].u);changed=true}}
      else if(r.u<lu)dirty.add(r.id);
    }
    Object.keys(D.u).forEach(k=>{const id=idOfU(k);if(D.u[k]&&!seen.has(id))dirty.add(id)});
    await pushDirty();
    if(changed){D=norm(D);persist();softRender()}
    lastSync=Date.now();setSync(dirty.size?"error":"synced");
  }catch(e){setSync("error")}
  syncing=false;
}
function schedSync(){if(!SYNC_ON||!AUTH)return;setSync("saving");clearTimeout(syncT);syncT=setTimeout(syncNow,1200)}
function queue(id){dirty.add(id);schedSync()}
const touchDay=k=>{D.u[k.slice(0,7)]=Date.now();queue("m-"+k.slice(0,7))};
const touchMeta=()=>{D.u.meta=Date.now();queue("meta")};
const touchClips=()=>{D.u.clips=Date.now();queue("clips")};

/* ---------- ui helpers ---------- */
let toastT=null;
function toast(m){const e=$("toast");e.textContent=m;e.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove("on"),2600)}
function confirmTap(t,txt,fn){
  if(t.dataset.armed==="1"){fn();return}
  const old=t.textContent;t.dataset.armed="1";t.textContent=txt;
  setTimeout(()=>{if(t.isConnected){t.dataset.armed="";t.textContent=old}},3200);
}
function softRender(){const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))pendingRender=true;else render()}
document.addEventListener("focusout",()=>{if(pendingRender){pendingRender=false;setTimeout(render,0)}});
function taskRow(k,i,title,sub,compact){
  const dn=D.days[k]&&D.days[k].c[i];
  return'<label class="task'+(dn?" done":"")+(compact?" c":"")+'"><input type="checkbox" data-a="task" data-k="'+k+'" data-i="'+i+'"'+(dn?" checked":"")+'><span class="tx"><b>'+esc(title)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':"")+'</span></label>';
}
function setVal(id,v){const e=$(id);if(document.activeElement!==e)e.value=v==null?"":v}
function rec(k){const r=D.days[k]||(D.days[k]={c:[0,0,0,0,0],x:[]});return r}
function tick(k,i){const r=rec(k);if(!r.c[i]){r.c[i]=1;touchDay(k);return true}return false}
function setTask(k,i,on){
  const before=cnt(k),kb=kept(T);rec(k).c[i]=on?1:0;touchDay(k);persist();
  if(k===T&&cnt(k)===5&&before<5)celebrate();
  if(k===T)streakCheck(kb);
}
function celebrate(){toast("All 5 done. +10 bonus XP.");const r=$("ringw");if(r){r.classList.remove("pop");void r.offsetWidth;r.classList.add("pop")}}
function weekHasOtherRest(k){return weekKeys(k).some(x=>x!==k&&isRest(x))}
function toggleRest(k){
  if(isRest(k)){delete D.days[k].r;toast("Rest day removed")}
  else if(weekHasOtherRest(k)){toast("You already used this week's rest day");return}
  else{rec(k).r=1;toast("Rest day. Your streak is paused, not broken.")}
  touchDay(k);persist();render();
}

/* ---------- streak ---------- */
const MS=[3,7,14,21,30,50,75,100,150,200,300,365];
const CELT={1:["Streak started","Day one is done. Come back tomorrow to make it two."],3:["3 days in a row","The habit is forming."],7:["One full week","Seven days of showing up."],14:["Two weeks strong","This is turning into who you are."],21:["21 days","Three weeks. Most people quit long before this."],30:["One month","30 days in a row."],50:["50 days","Halfway to 100."],75:["75 days","Almost at 100."],100:["100 days","Triple digits. You against you, and you are winning."],150:["150 days","Still here."],200:["200 days","Two hundred days of showing up."],300:["300 days","Nearly a full year."],365:["A full year","365 days. Look how far you came."]};
function renderStreak(){
  const s=curStreak(),k=kept(T),rest=isRest(T),need=Math.max(0,KEEP-cnt(T)),late=new Date().getHours()>=18,nm=MS.find(x=>x>s)||s+1;
  $("sfl").className="sflame "+(k?"lit":"off");
  $("sfl").innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-flame"/></svg>';
  $("snum").textContent=s;
  $("sbest").textContent=Math.max(bestStreak().n,s)+" days";
  $("scard").classList.toggle("risk",!k&&s>0&&late);
  $("ssub").textContent=rest?"Resting today. Your streak is paused, not broken.":k?(s===1?"Streak started. Come back tomorrow to make it 2.":"Extended for today. Come back tomorrow."):s>0?(late?"Your "+s+" day streak ends tonight. ":"")+need+" more task"+(need>1?"s":"")+" to "+(late?"save it.":"keep it alive."):"Finish "+need+" task"+(need>1?"s":"")+" today to start a streak.";
  $("smf").style.width=Math.min(100,s/nm*100)+"%";
  $("smt").textContent=s+" of "+nm+" days to your next milestone";
}
const celShown={};
function streakCheck(kb){
  if(kb||!kept(T)||isRest(T)||celShown[T])return;
  const s=curStreak();celShown[T]=1;
  if(CELT[s]&&(s===1||MS.indexOf(s)>=0))showCel(s);else toast("Streak extended: "+s+" days");
}
function showCel(n){
  const t=CELT[n]||[n+" days","Keep going."];
  $("celc").innerHTML='<div class="sflame lit" style="width:96px;height:96px;margin:0 auto"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-flame"/></svg></div><div class="snum" style="font-size:72px;margin-top:6px">'+n+'</div><div class="slab">day streak</div><h2 class="sec" style="margin-top:14px">'+esc(t[0])+'</h2><p class="mu" style="margin:6px 0 20px">'+esc(t[1])+'</p><button class="btn" data-a="celclose" id="celb">Keep going</button>';
  const cel=$("cel");cel.querySelectorAll(".cf").forEach(x=>x.remove());
  if(!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){const cols=["var(--warm)","var(--ac)","var(--good)","var(--bad)"];for(let i=0;i<36;i++){const d=document.createElement("i");d.className="cf";d.style.cssText="left:"+(Math.random()*100).toFixed(1)+"%;background:"+cols[i%4]+";animation-delay:"+(Math.random()*.8).toFixed(2)+"s;animation-duration:"+(2.2+Math.random()*1.6).toFixed(2)+"s";cel.appendChild(d)}}
  cel.hidden=false;$("celb").focus();
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("cel").hidden=true});

/* ---------- clips ---------- */
function parseYT(s){
  let u;try{u=new URL(/^https?:\/\//i.test(s)?s:"https://"+s)}catch(e){return null}
  const h=u.hostname.replace(/^(www\.|m\.|music\.)/,"");let id=null;
  if(h==="youtu.be")id=u.pathname.slice(1).split("/")[0];
  else if(h==="youtube.com"||h==="youtube-nocookie.com"){
    if(u.pathname==="/watch")id=u.searchParams.get("v");
    else{const m=u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?]+)/);if(m)id=m[2]}}
  if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
  const t=u.searchParams.get("t")||u.searchParams.get("start")||(u.hash.match(/t=([^&]+)/)||[])[1];let t0=null;
  if(t){const m=String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);if(m&&(m[1]||m[2]||m[3]))t0=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)}
  return{vid:id,t0:t0||null};
}
const clipUrl=c=>"https://www.youtube.com/watch?v="+c.vid+(c.t0?"&t="+c.t0+"s":"");
const clipName=c=>c.label||"Untitled clip";
function addClip(lid,nid,oid,wid,force){
  const w=$(wid),raw=$(lid).value.trim();w.innerHTML="";
  const p=parseYT(raw);
  if(!p){w.innerHTML='<p class="err" style="margin-top:8px">That does not look like a YouTube link. Copy it from the YouTube share button and paste it again.</p>';return}
  const dups=D.clips.filter(c=>c.vid===p.vid);
  if(dups.length&&!force){
    const lines=dups.map(c=>{const s=D.logs.find(x=>x.id===c.used);return"“"+esc(clipName(c))+"”: "+(c.used?"you already made a Short from it"+(s?" ("+esc(s.t)+", "+fd(c.usedOn||s.d)+")":""):"saved "+fd(c.added)+", not used yet")+(p.t0!==c.t0?" · different start time":" · same moment")});
    w.innerHTML='<div class="warnbox"><b>You already have this video.</b><div>'+lines.join("<br>")+'</div><div class="sm">A different moment from the same movie is fine. The same moment would repeat a Short.</div><div class="row"><button class="btn2 pri" data-a="clipforce" data-l="'+lid+'" data-n="'+nid+'" data-o="'+(oid||"")+'" data-w="'+wid+'">Add anyway</button><button class="btn2" data-a="clipno" data-w="'+wid+'">Cancel</button></div></div>';
    return;
  }
  D.clips.push({id:newId(),vid:p.vid,t0:p.t0,label:$(nid).value.trim(),note:oid?$(oid).value.trim():"",added:T,used:null,usedOn:null});
  $(lid).value="";$(nid).value="";if(oid)$(oid).value="";
  const kb=kept(T);touchClips();const first=tick(T,3);persist();render();streakCheck(kb);
  toast(first&&cnt(T)===5?"Clip saved. All 5 done!":"Clip saved"+(first?" and ticked off":""));
  if(first&&cnt(T)===5)celebrate();
}
function renderClips(){
  const un=unused(),us=D.clips.filter(c=>c.used);
  $("cuh").textContent="Unused clips ("+un.length+")";
  const card=c=>{
    if(editClip===c.id)return'<div class="lg"><label class="fld"><span>What is it?</span><input id="ce1" value="'+esc(c.label)+'"></label><label class="fld"><span>Note</span><input id="ce2" value="'+esc(c.note||"")+'"></label><div class="lga"><button class="btn2 pri" data-a="csave" data-id="'+c.id+'">Save</button><button class="btn2" data-a="ccancel">Cancel</button></div></div>';
    return'<div class="lg"><div class="lgt"><div><b>'+esc(clipName(c))+'</b><div class="mu sm">Saved '+fd(c.added)+(c.t0?" · starts at "+mmss(c.t0):"")+'</div>'+(c.note?'<div class="sm" style="margin-top:3px">'+esc(c.note)+'</div>':"")+'</div></div><div class="lga"><a class="btn2" href="'+esc(clipUrl(c))+'" target="_blank" rel="noopener noreferrer">Open on YouTube</a><button class="btn2 pri" data-a="mkclip" data-id="'+c.id+'">Make a Short</button><button class="btn2" data-a="cedit" data-id="'+c.id+'">Edit</button><button class="btn2" data-a="cdel" data-id="'+c.id+'">Delete</button></div></div>'};
  $("cun").innerHTML=un.length?un.map(card).join(""):'<span class="mu">No unused clips. Paste a YouTube link above and it lands here, ready for your next Short.</span>';
  $("cus").innerHTML=us.length?us.slice().sort((a,b)=>(b.usedOn||"")>(a.usedOn||"")?1:-1).map(c=>{const s=D.logs.find(x=>x.id===c.used);
    return'<div class="lg"><div class="lgt"><div><b>'+esc(clipName(c))+'</b><div class="mu sm">Used '+fd(c.usedOn||T)+(s?" · "+esc(s.t):"")+'</div></div></div><div class="lga"><a class="btn2" href="'+esc(clipUrl(c))+'" target="_blank" rel="noopener noreferrer">Open</a><button class="btn2" data-a="cunuse" data-id="'+c.id+'">Mark unused</button></div></div>'}).join(""):'<span class="mu">Clips you turn into Shorts move here automatically.</span>';
}

/* ---------- work timer ---------- */
function startTimer(cat){D.tm={cat,segs:[[Date.now(),null]],ack:0};D.lastCat=cat;touchMeta();persist();render();toast("Timer started")}
function pauseTimer(){if(!tmRunning(D.tm))return;D.tm.segs[D.tm.segs.length-1][1]=Date.now();touchMeta();persist();render()}
function resumeTimer(){if(!D.tm||tmRunning(D.tm))return;D.tm.segs.push([Date.now(),null]);touchMeta();persist();render()}
function openFin(){
  if(!D.tm)return;
  if(tmRunning(D.tm))D.tm.segs[D.tm.segs.length-1][1]=Date.now();
  touchMeta();persist();finEnd=D.tm.segs[D.tm.segs.length-1][1];
  go("time");
  catOptions("f1",D.tm.cat);$("fint").textContent=fmtDur(tmSec(D.tm,Date.now()))+" worked";
  $("f2").value=D.tm.note||"";$("f3").value=hhmm(finEnd);$("ferr").textContent="";$("fin").hidden=false;
  try{$("fin").scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}
}
function saveFin(e){
  e.preventDefault();if(!D.tm)return;
  const segs=D.tm.segs.map(g=>g.slice()),last=segs[segs.length-1],v=$("f3").value;
  let end=finEnd;
  if(v&&v!==hhmm(finEnd)){const p=v.split(":"),b=new Date(finEnd);b.setHours(+p[0],+p[1],0,0);end=b.getTime();if(end>finEnd)end-=864e5}
  if(end<=last[0]){$("ferr").textContent="The stop time must be after the last start ("+hhmm(last[0])+").";return}
  last[1]=end;
  const x={id:newId(),d:key(new Date(segs[0][0])),segs,cat:$("f1").value,note:$("f2").value.trim(),src:"timer"};
  D.ses.push(x);D.lastCat=x.cat;D.tm=null;touchDay(x.d);touchMeta();persist();
  $("fin").hidden=true;finEnd=null;render();toast("Saved "+fmtDur(sesSec(x))+" of work");
}
function catOptions(id,sel){$(id).innerHTML=D.cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.n)+'</option>').join("");if(sel&&catById(sel))$(id).value=sel}
function timerCard(){
  const tm=D.tm,now=Date.now(),goal=(D.goal.h||0)*3600,today=secOn(T);
  const bar='<div><div class="tbar"><i style="width:'+Math.min(100,goal?today/goal*100:0)+'%"></i></div><div class="mu sm num" style="margin-top:6px">Today: '+fmtDur(today)+(goal?" of "+fmtDur(goal)+" target":"")+'</div></div>';
  if(!tm){
    return'<div class="card tcard"><div class="eyebrow">Work timer</div><div class="chips">'+D.cats.map(c=>'<button class="chip'+(c.id===D.lastCat?" on":"")+'" data-a="tcat" data-id="'+esc(c.id)+'">'+esc(c.n)+'</button>').join("")+'</div><button class="btn big" data-a="tstart">Start working</button>'+bar+'</div>';
  }
  const run=tmRunning(tm),el=tmSec(tm,now),lastStart=tm.segs[tm.segs.length-1][0];
  const long=run&&now-lastStart>3*36e5&&now-(tm.ack||0)>3*36e5;
  return'<div class="card tcard run"><div class="eyebrow">'+(run?"Working now":"Paused")+'</div><div class="tclock num" data-live="1">'+fmtClock(el)+'</div><div class="tcat"><i class="dot" style="background:'+catColor(tm.cat)+'"></i>'+esc(catName(tm.cat))+'</div>'
   +(long?'<div class="warnbox"><b>Still working?</b><div>The timer has been running for '+fmtDur((now-lastStart)/1000)+' without a break.</div><div class="row"><button class="btn2 pri" data-a="tkeep">Yes, keep going</button><button class="btn2" data-a="tfin">Stop and set end time</button></div></div>':"")
   +'<div class="tbtn">'+(run?'<button class="btn2 big" style="padding:16px" data-a="tpause">Pause</button>':'<button class="btn2 pri" style="padding:16px" data-a="tresume">Resume</button>')+'<button class="btn big" style="padding:16px;background:var(--good);color:#fff" data-a="tfin">Finish</button></div>'+bar+'</div>';
}
function renderTimerCards(){const h=timerCard();$("tm1").innerHTML=h;$("tm2").innerHTML=h}
function tickTimer(){
  if(document.hidden||!D.tm)return;
  const now=Date.now();
  if(tmRunning(D.tm)){const s=fmtClock(tmSec(D.tm,now));document.querySelectorAll(".tclock").forEach(e=>{e.textContent=s})}
}
let tmSlow=0;
setInterval(()=>{tickTimer();if(D.tm&&tmRunning(D.tm)&&++tmSlow%30===0&&(VIEW==="today"||VIEW==="time")&&!(document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))){renderTimerCards();if(VIEW==="time")renderWeekWork()}},1000);

function weekChart(w,goalH){
  const W=340,H=176,L=8,R=8,Tp=18,B=22,mxh=Math.max(1,goalH*1.25,Math.max.apply(null,w.tot)/3600*1.1),n=7,bw=30,gap=(W-L-R-n*bw)/(n-1);
  const Y=h=>Tp+(1-h/mxh)*(H-Tp-B);
  let s='<svg class="ch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Hours worked each day this week"><line x1="0" x2="'+W+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--ln)"/>';
  if(goalH>0)s+='<line x1="0" x2="'+W+'" y1="'+Y(goalH)+'" y2="'+Y(goalH)+'" stroke="var(--warm)" stroke-dasharray="4 4"/><text x="'+(W-2)+'" y="'+(Y(goalH)-4)+'" text-anchor="end" style="fill:var(--warm)">target '+goalH+'h</text>';
  w.ks.forEach((k,i)=>{
    const x=L+i*(bw+gap);let acc=0;
    D.cats.forEach(c=>{const v=w.per[i][c.id]||0;if(v<=0)return;const h0=acc/3600,h1=(acc+v)/3600;s+='<rect x="'+x+'" y="'+Y(h1)+'" width="'+bw+'" height="'+Math.max(1,Y(h0)-Y(h1))+'" fill="'+catColor(c.id)+'"/>';acc+=v});
    const known={};D.cats.forEach(c=>known[c.id]=1);Object.keys(w.per[i]).forEach(id=>{if(!known[id]){const v=w.per[i][id];s+='<rect x="'+x+'" y="'+Y((acc+v)/3600)+'" width="'+bw+'" height="'+Math.max(1,Y(acc/3600)-Y((acc+v)/3600))+'" fill="var(--k7)"/>';acc+=v}});
    if(acc>=180)s+='<text x="'+(x+bw/2)+'" y="'+(Y(acc/3600)-4)+'" text-anchor="middle">'+hrs1(acc)+'</text>';
    s+='<text x="'+(x+bw/2)+'" y="'+(H-6)+'" text-anchor="middle"'+(k===T?' style="fill:var(--ink);font-weight:700"':"")+'>'+"MTWTFSS"[i]+'</text>';
  });
  return s+'</svg>';
}
function renderWeekWork(){
  const a=weekWork(0),b=weekWork(1),gh=+D.goal.h||0,atT=gh>0?a.ks.filter((k,i)=>k<=T&&a.tot[i]>=gh*3600).length:0;
  const d=a.sum-b.sum;
  const past=a.ks.map((k,i)=>({k,s:a.tot[i]})).filter(x=>x.k<=T);
  let ins="Start the timer on your first work session and your week fills in here.";
  if(past.some(x=>x.s>0)){
    const best=past.reduce((m,x)=>x.s>m.s?x:m),done1=past.filter(x=>x.k<T&&x.k>=D.start),low=done1.length?done1.reduce((m,x)=>x.s<m.s?x:m):null,l=[];
    l.push("Best day so far: "+fdl(best.k)+", "+fmtDur(best.s)+".");
    if(low&&gh>0&&low.s<gh*1800)l.push("Lowest: "+fdl(low.k)+", "+fmtDur(low.s)+", under half your "+gh+"h target. Adding 30 minutes on days like that lifts the whole week.");
    ins=l.join(" ");
  }
  $("wkw").innerHTML='<div class="tiles" style="margin-bottom:12px"><div class="tile"><b>'+fmtDur(a.sum)+'</b><div class="l">This week</div><span class="d '+(d>=0?"up":"dn")+'">'+(b.sum?(d>=0?"▲ ":"▼ ")+fmtDur(Math.abs(d))+" vs last week":"no time last week")+'</span></div><div class="tile"><b>'+atT+'/'+a.ks.filter(k=>k<=T).length+'</b><div class="l">Days at target</div><span class="d">'+(gh>0?"target "+gh+"h a day":"set a target in More")+'</span></div></div>'+weekChart(a,gh)
   +'<div class="insight">'+esc(ins)+'</div>'+(a.sum>0?'<div class="mu sm" style="margin-top:8px">'+Math.round((a.sum-a.hand)/a.sum*100)+'% tracked with the timer, '+Math.round(a.hand/a.sum*100)+'% added by hand.</div>':"");
  const tot={};a.per.forEach(o=>Object.keys(o).forEach(id=>tot[id]=(tot[id]||0)+o[id]));
  const ids=Object.keys(tot).sort((x,y)=>tot[y]-tot[x]),mx=Math.max(1,...ids.map(id=>tot[id]));
  $("wcat").innerHTML=ids.length?ids.map(id=>'<div class="cbar"><span class="nm"><i class="dot" style="background:'+catColor(id)+'"></i>'+esc(catName(id))+'</span><span class="trk"><i style="width:'+Math.round(tot[id]/mx*100)+'%;background:'+catColor(id)+'"></i></span><span class="v num">'+fmtDur(tot[id])+'</span></div>').join(""):'<span class="mu">Nothing tracked this week yet.</span>';
}
function sesRow(x){
  const first=x.segs[0][0],last=x.segs[x.segs.length-1][1],br=x.segs.length-1;
  return'<div class="srow"><div><div class="tcat"><i class="dot" style="background:'+catColor(x.cat)+'"></i>'+esc(catName(x.cat))+'</div><div class="mu sm num">'+hhmm(first)+"–"+hhmm(last)+(br?" · "+br+" pause"+(br>1?"s":""):"")+'</div>'+(x.note?'<div class="sm">'+esc(x.note)+'</div>':"")+'<div class="lgm" style="margin-top:6px">'+(x.src==="manual"?'<span class="tag">added by hand</span>':"")+(x.edited?'<span class="tag">edited</span>':"")+'</div><div class="lga" style="margin-top:8px"><button class="btn2" data-a="sesedit" data-id="'+esc(x.id)+'">Edit</button><button class="btn2" data-a="sesdel" data-id="'+esc(x.id)+'">Delete</button></div></div><b class="num" style="flex:none">'+fmtDur(sesSec(x))+'</b></div>';
}
function renderTime(){
  renderTimerCards();renderWeekWork();
  $("dlab").textContent=selSes===T?"Today":fdl(selSes);
  const list=D.ses.filter(x=>x.d===selSes).sort((a,b)=>a.segs[0][0]-b.segs[0][0]);
  let h=list.map(sesRow).join("");
  if(D.tm&&key(new Date(D.tm.segs[0][0]))===selSes)h='<div class="srow"><div><div class="tcat"><i class="dot" style="background:'+catColor(D.tm.cat)+'"></i>'+esc(catName(D.tm.cat))+'</div><div class="mu sm">Running now. Finish it above to save.</div></div><b class="num">'+fmtDur(tmSec(D.tm,Date.now()))+'</b></div>'+h;
  $("sesl").innerHTML=(h||'<span class="mu">No sessions on this day.</span>')+(list.length?'<div class="kv"><span>Total for the day</span><b class="num">'+fmtDur(secOn(selSes))+'</b></div>':"");
  catOptions("s1",$("s1").value||D.lastCat);
  if(!editSes&&!$("s2").value)$("s2").value=selSes;
}
function clearSes(){editSes=null;$("s3").value="";$("s4").value="";$("s5").value="";$("s2").value=selSes;$("serr").textContent="";$("ssub").textContent="Add session";$("scan").hidden=true;$("sdets").textContent="Add a session by hand"}
function saveSes(e){
  e.preventDefault();
  const dk=$("s2").value,a=$("s3").value,b=$("s4").value;
  if(!dk||!a||!b){$("serr").textContent="Add the date, start time and stop time.";return}
  const mk=t=>{const p=t.split(":"),d=fk(dk);d.setHours(+p[0],+p[1],0,0);return d.getTime()},s=mk(a),en=mk(b);
  if(en<=s){$("serr").textContent="The stop time must be after the start time.";return}
  if(en-s>16*36e5){$("serr").textContent="That is over 16 hours. Check the times.";return}
  if(en>Date.now()){$("serr").textContent="The stop time is in the future.";return}
  $("serr").textContent="";
  if(editSes){const x=D.ses.find(q=>q.id===editSes);if(x){const od=x.d;x.segs=[[s,en]];x.cat=$("s1").value;x.note=$("s5").value.trim();x.d=dk;x.edited=1;touchDay(od);touchDay(dk)}toast("Session updated")}
  else{const x={id:newId(),d:dk,segs:[[s,en]],cat:$("s1").value,note:$("s5").value.trim(),src:"manual"};D.ses.push(x);touchDay(dk);toast("Session added by hand")}
  persist();selSes=dk;clearSes();render();
}

/* ---------- habits ---------- */
function renderHabitsToday(){
  const hs=D.habits.filter(h=>habSched(h,T)&&h.added<=T);
  if(!D.habits.length){$("hab").innerHTML='<h2 class="sec">Habits</h2><div class="card"><p class="sm mu">Add your own habits, like gym or reading, each with its own streak.</p><button class="btn2" style="margin-top:10px" data-a="tab" data-t="more">Add habits</button></div>';return}
  $("hab").innerHTML='<h2 class="sec">Habits</h2><div class="card tasks">'+(hs.length?hs.map(h=>{const dn=habDone(h,T),st=habStreak(h);
    return'<label class="task'+(dn?" done":"")+' c"><input type="checkbox" data-a="hab" data-id="'+esc(h.id)+'"'+(dn?" checked":"")+'><span class="tx"><b>'+esc(h.n)+'</b></span><span class="hs"><svg viewBox="0 0 24 24"><use href="#i-flame"/></svg>'+st+'</span></label>'}).join(""):'<p class="sm mu" style="padding:12px 0">No habits scheduled today.</p>')+'</div>';
}
function renderHabitStats(){
  $("hstat").innerHTML=D.habits.length?D.habits.map(h=>{
    let dots="";for(let i=13;i>=0;i--){const k=key(ad(fk(T),-i));dots+='<i class="'+(k<h.added||!habSched(h,k)?"n":habDone(h,k)?"d":"")+'"></i>'}
    const r=habRate(h);
    return'<div class="hrow"><div class="lgt"><b>'+esc(h.n)+'</b><span class="num"><b>'+habStreak(h)+'</b> <span class="mu sm">day streak</span></span></div><div class="mu sm">'+(r==null?"Not enough days yet":r+"% of scheduled days in the last 30")+'</div><div class="hdots">'+dots+'</div></div>'}).join(""):'<span class="mu">No habits yet. Add some in More.</span>';
}

/* ---------- TODAY ---------- */
function renderHead(){
  $("hdate").textContent=DOW[dow]+" "+NOW.getDate()+" "+MON[NOW.getMonth()];
  $("hphase").textContent="Phase "+(phase()+1)+" · "+PH[phase()].n;
  $("fl").textContent=curStreak();
  $("hs").classList.toggle("off",!kept(T));
  $("hs").setAttribute("aria-label","Current streak: "+curStreak()+" days");
  const n=dueNums().length+due7().length,b=$("bdgn");b.hidden=!n;b.textContent=n;
}
function dueRows(){
  const dn=dueNums(),d7=due7();if(!dn.length&&!d7.length)return"";
  const row=(l,txt,a)=>'<div class="xrow"><span><b>'+esc(l.t)+'</b><br><span class="mu sm">Live '+fd(ld(l))+'</span></span><button class="btn2 pri" data-a="'+a+'" data-id="'+esc(l.id)+'">'+txt+'</button></div>';
  return dn.map(l=>row(l,"Add numbers","opennum")).join("")+d7.map(l=>row(l,"7-day check","open7")).join("");
}
function renderToday(){
  const n=cnt(T),xp=allXp(),L=levelOf(xp),lo=50*(L-1)*(L-1),hi=50*L*L,C=2*Math.PI*49,seg=C/5-9;
  let ring='<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">';
  for(let i=0;i<5;i++)ring+='<circle class="'+(D.days[T]&&D.days[T].c[i]?"on":"tr")+'" cx="60" cy="60" r="49" stroke-dasharray="'+seg.toFixed(1)+' '+(C-seg).toFixed(1)+'" transform="rotate('+(-90+i*72+2.5)+' 60 60)"/>';
  $("ringw").innerHTML=ring+'</svg><div class="ringc"><b class="num">'+n+'</b><span>of 5</span></div>';
  $("dayn").textContent="Day "+dayN()+(dayN()<=365?" of 365":"");
  $("lvn").textContent="Level "+L+" · "+lvName(L);
  $("xpf").style.width=Math.min(100,(xp-lo)/(hi-lo)*100)+"%";
  $("xpt").textContent=fmt(xp)+" XP · "+fmt(hi-xp)+" to level "+(L+1)+" · "+xpOf(T)+" today";
  $("msg").textContent=isRest(T)?"Rest day. Nothing is required today.":n===5?"All 5 done. Anything extra is pure bonus.":n+" of 5 done. "+(5-n)+" left for a full day.";
  $("focus").textContent="Phase focus: "+PH[phase()].g;
  renderStreak();renderTimerCards();
  const dr=dueRows();
  $("due").innerHTML=dr?'<div class="card due"><div class="eyebrow" style="color:var(--ink);margin-bottom:4px">Numbers are ready</div>'+dr+'</div>':"";
  $("core").innerHTML=coreFor().map((c,i)=>taskRow(T,i,c.t,c.s)).join("");
  renderHabitsToday();

  const un=unused();
  if(!un.length)$("tclip").innerHTML='<div class="card"><div class="eyebrow">Today\'s clip</div><p style="margin-top:6px">No saved clips yet. Paste a YouTube link below the moment you find a good one.</p></div>';
  else{const c=un[clipIdx%un.length];
    $("tclip").innerHTML='<div class="card"><div class="eyebrow">Today\'s clip · '+un.length+' saved</div><div style="margin:6px 0 2px"><b style="font-size:18px">'+esc(clipName(c))+'</b></div><div class="mu sm">Saved '+fd(c.added)+(c.t0?" · starts at "+mmss(c.t0):"")+'</div>'+(c.note?'<div class="sm" style="margin-top:4px">'+esc(c.note)+'</div>':"")
     +'<div class="lga" style="margin-top:12px"><a class="btn2" href="'+esc(clipUrl(c))+'" target="_blank" rel="noopener noreferrer">Open on YouTube</a><button class="btn2 pri" data-a="mkclip" data-id="'+c.id+'">Make a Short</button>'+(un.length>1?'<button class="btn2" data-a="cnext">Pick another</button>':"")+'</div>'
     +(un.length<=2?'<p class="sm" style="margin-top:10px;color:var(--warm)">Only '+un.length+' left. Save a few more soon.</p>':"")+'<div class="rule" style="margin-top:12px">'+ruleText()+'</div></div>'}

  const blk=collegeBlock(),miss=blk.filter(k=>!shortsOn(k).length),makeDay=!isCollege(dow);
  $("coll").innerHTML='<div class="eyebrow" style="color:var(--ink)">Wed to Fri Shorts</div><div class="cds">'+blk.map(k=>'<span class="cd'+(shortsOn(k).length?" ok":"")+'">'+fdl(k)+(shortsOn(k).length?" · ready":" · empty")+'</span>').join("")+'</div><p class="sm '+(miss.length?"":"mu")+'">'+(!blk.length?"No college days ahead this week.":miss.length?(makeDay?"Make one extra Short today for "+fdl(miss[0])+" and schedule it in YouTube Studio.":"Nothing is scheduled for "+miss.map(fdl).join(" and ")+". Fix it on your next make day."):"All set. You do not need to make anything on college days.")+'</p>';

  const ws=wkSum(0),wd=["M","T","W","T","F","S","S"];
  $("wkc").textContent=ws.kept+" of 7 kept · goal 5";
  $("pips").innerHTML=ws.ks.map((k,i)=>{
    let c="fut",ic="";
    if(k<=T){const x=cnt(k);if(isRest(k)){c="rest";ic="moon"}else if(x===5){c="full";ic="chk"}else if(x>=KEEP){c="kept";ic="chk"}else c=""}
    return'<div class="pip '+c+(k===T?" td":"")+'"><i>'+(ic?'<svg viewBox="0 0 24 24"><use href="#i-'+ic+'"/></svg>':"")+'</i>'+wd[i]+'</div>'}).join("");
  const rb=$("restb");
  if(isRest(T)){rb.textContent="Undo rest day";rb.disabled=false}
  else if(weekHasOtherRest(T)){rb.textContent="Rest day already used this week";rb.disabled=true}
  else{rb.textContent="Take today as my rest day";rb.disabled=false}
  rb.dataset.k=T;
  $("sunday").innerHTML=dow===0?'<div class="card" style="background:var(--goods);border-color:transparent"><b>Sunday review</b><p class="sm" style="margin:4px 0 10px">Two minutes: what worked this week, and what you will change.</p><button class="btn2" data-a="tab" data-t="year">Open weekly review</button></div>':"";
  const d=D.days[T]||{x:[]};
  $("xl").innerHTML=d.x.map((e,i)=>'<div class="xrow"><span>'+esc(e.t)+'</span><span><b class="g">+'+e.v+'</b><button class="x" data-a="xdel" data-i="'+i+'" aria-label="Remove">×</button></span></div>').join("");
  $("sug").innerHTML=SUGS_ALL[phase()].map((a,i)=>'<button class="chip" data-a="sug" data-i="'+i+'">+ '+esc(a[0])+' ('+a[1]+')</button>').join("");
}

/* ---------- SHORTS ---------- */
function statusOf(l){
  if(ld(l)>T)return{p:'<span class="pill">Scheduled · '+fdl(ld(l))+'</span>'};
  if(l.lg)return{p:l.v>=1000?'<span class="pill g">Over 1k</span>':""};
  const nd=addk(ld(l),2);
  return nd<=T?{p:'<span class="pill w">Numbers due</span>'}:{p:'<span class="pill">Live · numbers on '+fdl(nd)+'</span>'};
}
function shortCard(l){
  const r=ret(l),cl=l.cid?clipById(l.cid):null,s=statusOf(l);
  const c7=l.c7&&!l.c7.skip?'<span class="tag">Day 7: '+fmt(l.c7.v)+' views'+(l.v>0?" ("+(l.c7.v>=l.v?"+":"")+Math.round((l.c7.v/l.v-1)*100)+"%)":"")+(l.c7.p?" · "+l.c7.p+"% viewed":"")+'</span>':"";
  return'<article class="lg"><div class="lgt"><div><b>'+esc(l.t)+'</b><div class="mu sm">'+(ld(l)>T?"Goes live "+fd(ld(l)):"Live "+fd(ld(l)))+(cl?" · from “"+esc(clipName(cl))+"”":"")+'</div></div><div class="lgv"><b>'+(l.lg?fmt(l.v):"–")+'</b><span>'+(l.lg?"views":"waiting")+'</span></div></div>'
   +(l.h?'<div class="hook">“'+esc(l.h)+'”</div>':"")
   +'<div class="lgm">'+s.p+(l.lg&&l.p?'<span class="tag">'+l.p+'% viewed</span>':"")+(l.lg&&l.a?'<span class="tag">'+l.a+'s avg</span>':"")+(r!=null?'<span class="tag">'+r+'% retention</span>':"")+(l.s?'<span class="tag">+'+l.s+' subs</span>':"")+(l.g&&l.g!=="none"?'<span class="tag">'+esc(l.g)+'</span>':"")+c7+'</div>'
   +(l.n?'<div class="sm mu">'+esc(l.n)+'</div>':"")
   +'<div class="lga">'+(ld(l)<=T?'<button class="btn2'+(!l.lg&&addk(ld(l),2)<=T?" pri":"")+'" data-a="opennum" data-id="'+esc(l.id)+'">'+(l.lg?"Edit numbers":"Add numbers")+'</button>':"")+'<button class="btn2" data-a="shedit" data-id="'+esc(l.id)+'">Edit details</button><button class="btn2" data-a="shdel" data-id="'+esc(l.id)+'">Delete</button></div></article>';
}
function renderMake(){
  const cur=$("m1").value,un=unused(),ed=editShort?D.logs.find(x=>x.id===editShort):null,lk=ed&&ed.cid?clipById(ed.cid):null;
  let o='<option value="">No clip (my own footage)</option>';
  const list=un.slice();if(lk&&list.indexOf(lk)<0)list.unshift(lk);
  list.forEach(c=>{o+='<option value="'+esc(c.id)+'">'+esc(clipName(c))+(c.t0?" ("+mmss(c.t0)+")":"")+'</option>'});
  $("m1").innerHTML=o;$("m1").value=list.some(c=>c.id===cur)?cur:"";
  $("rule").innerHTML=ruleText();
  const vs={};D.logs.forEach(l=>{if(l.g&&l.g!=="none")vs[l.g.toLowerCase()]=l.g});
  const opts=TESTV[D.test.i].slice();Object.keys(vs).forEach(q=>{if(opts.indexOf(q)<0&&opts.length<7)opts.push(vs[q])});
  $("vch").innerHTML=opts.map(q=>'<button type="button" class="chip" data-a="vch" data-v="'+esc(q)+'">'+esc(q)+'</button>').join("");
}
function renderShorts(){
  const dr=dueRows();
  $("due2").innerHTML=dr?'<div class="card due"><div class="eyebrow" style="color:var(--ink);margin-bottom:4px">Numbers are ready</div>'+dr+'</div>':"";
  renderMake();
  const up=D.logs.filter(l=>ld(l)>T).sort((a,b)=>ld(a)<ld(b)?-1:1),hist=D.logs.filter(l=>ld(l)<=T).sort((a,b)=>ld(a)<ld(b)?1:ld(a)>ld(b)?-1:0);
  $("sched").innerHTML=up.length?up.map(shortCard).join(""):'<span class="mu">Nothing scheduled ahead. Set a later publish date when you save a Short to see it here.</span>';
  $("lh").innerHTML=hist.length?hist.map(shortCard).join(""):'<span class="mu">No Shorts yet. Save your first one above.</span>';
}
function clearMake(){["m2","m3","m4","m1"].forEach(i=>$(i).value="");$("m5").value=T;editShort=null;$("mft").textContent="Make a Short";$("msub").textContent="Save Short";$("mcan").hidden=true;$("merr").textContent=""}
function saveShort(e){
  e.preventDefault();const kb=kept(T);
  const title=$("m2").value.trim();
  if(!title){$("merr").textContent="Add a title so you can recognise this Short later.";return}
  $("merr").textContent="";
  const f={t:title,h:$("m3").value.trim(),g:$("m4").value.trim()||"none",pd:$("m5").value||T,cid:$("m1").value||null};
  const relink=(old,nw,id)=>{if(old&&old!==nw){const c=clipById(old);if(c&&c.used===id){c.used=null;c.usedOn=null}}if(nw){const c=clipById(nw);if(c){c.used=id;c.usedOn=T}}touchClips()};
  if(editShort){const l=D.logs.find(x=>x.id===editShort);if(l){relink(l.cid,f.cid,l.id);Object.assign(l,f);touchDay(l.d)}toast("Changes saved")}
  else{
    const l=Object.assign({id:newId(),d:T,tr:D.test.r,ti:D.test.i,lg:0,v:null,p:0,a:0,len:0,s:0,n:""},f);D.logs.push(l);relink(null,f.cid,l.id);touchDay(T);
    if(f.pd===T)tick(T,0);if(f.h&&!isCollege(dow))tick(T,2);
    if(D.logs.filter(x=>x.tr===D.test.r).length>=5){D.test={i:(D.test.i+1)%5,r:D.test.r+1};touchMeta();toast("Test complete. Next up: "+tname(D.test.i))}
    else toast(f.pd>T?"Scheduled for "+fdl(f.pd):f.pd===T?"Saved. Today's Short is done.":"Saved");
    if(cnt(T)===5)celebrate();
  }
  persist();clearMake();render();streakCheck(kb);
}
function npv(){const a=+$("n4").value,l=+$("n5").value;$("npv").textContent=a>0&&l>0?"Retention: people watched "+Math.round(a/l*100)+"% of the video on average.":""}
function openNum(id){
  const l=D.logs.find(x=>x.id===id);if(!l)return;
  numId=id;c7Id=null;$("cf").hidden=true;$("nf").hidden=false;
  $("nfe").textContent=l.lg?"Edit 48-hour numbers":"48-hour numbers";$("nft").textContent=l.t;
  $("n2").value=l.v!=null?l.v:"";$("n3").value=l.p||"";$("n4").value=l.a||"";$("n5").value=l.len||"";$("n8").value=l.s||"";$("n7").value=l.n||"";$("nerr").textContent="";npv();
  try{$("nf").scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}
}
function saveNum(e){
  e.preventDefault();const kb=kept(T),l=D.logs.find(x=>x.id===numId);if(!l)return;
  if($("n2").value===""){$("nerr").textContent="Add the view count to save.";return}
  Object.assign(l,{v:+$("n2").value||0,p:+$("n3").value||0,a:+$("n4").value||0,len:+$("n5").value||0,s:+$("n8").value||0,n:$("n7").value.trim()});
  const was=l.lg;l.lg=1;if(!l.lat)l.lat=T;touchDay(l.d);
  if(!dueNums().length){if(tick(T,4)&&cnt(T)===5)celebrate()}
  persist();$("nf").hidden=true;numId=null;render();streakCheck(kb);
  toast(was?"Numbers updated":l.v>=1000?"Numbers saved. Over the 1,000-view floor.":"Numbers saved");
}
function open7(id){
  const l=D.logs.find(x=>x.id===id);if(!l)return;
  c7Id=id;numId=null;$("nf").hidden=true;$("cf").hidden=false;$("cft").textContent=l.t;
  $("cfn").textContent="At 48 hours it had "+fmt(l.v)+" views"+(l.p?" and "+l.p+"% viewed":"")+". Just a quick look at where it is now.";
  $("k1").value="";$("k2").value="";$("k3").value="";$("kerr").textContent="";
  try{$("cf").scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}
}
function saveC7(e){
  e.preventDefault();const kb=kept(T),l=D.logs.find(x=>x.id===c7Id);if(!l)return;
  if($("k1").value===""){$("kerr").textContent="Add the current view count, or skip this check.";return}
  l.c7={v:+$("k1").value||0,p:+$("k2").value||0,n:$("k3").value.trim(),d:T};touchDay(l.d);
  if(!dueNums().length&&!due7().length)tick(T,4);
  persist();$("cf").hidden=true;c7Id=null;render();streakCheck(kb);toast("7-day check saved");
}

/* ---------- PROGRESS ---------- */
const delta=(a,b,suf,ref)=>{if(!b&&!a)return'<span class="d">no data yet</span>';if(!b)return'<span class="d">nothing '+(ref||"last week")+'</span>';const x=Math.round((a-b)*10)/10;return'<span class="d '+(x>=0?"up":"dn")+'">'+(x>=0?"▲ ":"▼ ")+Math.abs(x)+(suf||"")+' vs '+(ref||"last week")+'</span>'};
function lineChart(ls){
  const W=340,H=176,L=38,R=10,Tp=14,B=24,mx=Math.max(1000,...ls.map(l=>l.v))*1.1;
  const X=i=>ls.length===1?(L+W-R)/2:L+i*(W-L-R)/(ls.length-1),Y=v=>Tp+(1-v/mx)*(H-Tp-B);
  const top=Math.round(mx/100)*100;
  let s='<svg class="ch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Views for your last '+ls.length+' Shorts"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ac);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--ac);stop-opacity:0"/></linearGradient></defs>';
  [0,top].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--ln)"/><text x="'+(L-6)+'" y="'+(Y(v)+3.5)+'" text-anchor="end">'+(v>=1000?(v/1000).toFixed(v%1000?1:0)+"k":v)+'</text>'});
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(1000)+'" y2="'+Y(1000)+'" stroke="var(--warm)" stroke-dasharray="4 4"/><text x="'+(L-6)+'" y="'+(Y(1000)+3.5)+'" text-anchor="end" style="fill:var(--warm)">1k</text>';
  const pts=ls.map((l,i)=>X(i)+","+Y(l.v)).join(" ");
  if(ls.length>1)s+='<polygon points="'+X(0)+","+Y(0)+" "+pts+" "+X(ls.length-1)+","+Y(0)+'" fill="url(#ga)"/><polyline points="'+pts+'" fill="none" stroke="var(--ac)" stroke-width="2.2" stroke-linejoin="round"/>';
  ls.forEach((l,i)=>{const last=i===ls.length-1,hit=l.v>=1000;s+='<circle cx="'+X(i)+'" cy="'+Y(l.v)+'" r="'+(last?5:3.6)+'" fill="'+(hit?"var(--good)":"var(--ac)")+'" stroke="var(--sf)" stroke-width="2"/><circle data-a="pt" data-i="'+i+'" cx="'+X(i)+'" cy="'+Y(l.v)+'" r="14" fill="transparent" style="cursor:pointer"/>'});
  s+='<text x="'+L+'" y="'+(H-6)+'">'+fd(ld(ls[0]))+'</text><text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+fd(ld(ls[ls.length-1]))+'</text>';
  return s+'</svg>';
}
function testRows(){
  const g={},all=done();
  all.forEach(l=>{const q=(l.g||"none").trim().toLowerCase()||"none";(g[q]=g[q]||{lab:l.g,a:[]}).a.push(l)});
  return Object.keys(g).map(q=>{const a=g[q].a,rest=all.filter(l=>a.indexOf(l)<0),av=avg(a,"v"),rv=avg(rest,"v");
    return{q,lab:q==="none"?"No variation tagged":g[q].lab,n:a.length,v:av,p:avg(a,"p"),delta:a.length>=3&&rest.length>=3&&rv>0?Math.round((av/rv-1)*100):null}}).sort((x,y)=>y.v-x.v);
}
function renderStats(){
  const ls=logsSorted(),last10=ls.slice(-10),over=last10.filter(l=>l.v>=1000).length,tot=last10.length||1,C=2*Math.PI*36;
  $("floor").innerHTML=ls.length?'<div class="floor"><div class="pc"><svg viewBox="0 0 90 90"><circle class="tr" cx="45" cy="45" r="36"/><circle class="fg" cx="45" cy="45" r="36" stroke-dasharray="'+(C*over/tot).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 45 45)"/></svg><b class="num">'+over+'/'+last10.length+'</b></div><div><b style="font:800 18px/1.25 var(--f-d)">'+over+' of your last '+last10.length+' Shorts cleared 1,000 views</b><div class="mu sm" style="margin-top:4px">Median '+fmt(median(last10.map(l=>l.v)))+' views. Goal for Phase 1: every Short above the floor.</div></div></div>':'<span class="mu">Add the 48-hour numbers for your first Short and this shows how many are clearing 1,000 views.</span>';
  const a=wkSum(0),b=wkSum(1),c=wkSum(2),bv=avg(b.logs,"v"),cv=avg(c.logs,"v"),bp=Math.round(avg(b.logs,"p")*10)/10,cp=Math.round(avg(c.logs,"p")*10)/10;
  $("kp").innerHTML=
   '<div class="tile"><b>'+a.xp+'</b><div class="l">XP this week</div>'+delta(a.xp,b.xp)+'</div>'+
   '<div class="tile"><b>'+a.kept+'/7</b><div class="l">Days kept this week</div>'+delta(a.kept,b.kept)+'</div>'+
   '<div class="tile"><b>'+(b.logs.length?fmt(bv):"–")+'</b><div class="l">Avg views, last week\'s Shorts</div>'+(b.logs.length?delta(Math.round(bv),Math.round(cv),"","the week before"):'<span class="d">no numbers yet</span>')+'</div>'+
   '<div class="tile"><b>'+(b.logs.length?bp+"%":"–")+'</b><div class="l">Avg viewed, last week\'s Shorts</div>'+(b.logs.length?delta(bp,cp,"","the week before"):'<span class="d">no numbers yet</span>')+'</div>';
  const lc=ls.slice(-14);
  if(lc.length<2)$("c2").innerHTML='<span class="mu">Add numbers for at least 2 Shorts to see your trend.</span>';
  else{const sp=selPt!=null&&selPt<lc.length?selPt:lc.length-1,l=lc[sp];
    $("c2").innerHTML=lineChart(lc)+'<div class="selb"><span><b>'+esc(l.t)+'</b><br><span class="mu sm">Live '+fd(ld(l))+'</span></span><span class="num"><b>'+fmt(l.v)+'</b> views</span></div><div class="mu sm" style="margin-top:8px">Tap a dot for details. Green dots cleared 1,000 views. Dashed line is the floor. Every number is the 48-hour reading.</div>'}
  if(ls.length<6)$("then").innerHTML='<span class="mu">Needs 6 Shorts with numbers. Then this compares your first few Shorts with your latest ones, so you can see yourself improve.</span>';
  else{const k=Math.min(5,Math.floor(ls.length/2)),f=ls.slice(0,k),n=ls.slice(-k);
    const row=(lab,x,y,fn,suf)=>{const d=y-x,pct=x?Math.round(d/x*100):null;return'<tr><td>'+lab+'</td><td class="num">'+fn(x)+suf+'</td><td class="num"><b>'+fn(y)+suf+'</b></td><td class="num '+(d>=0?"up":"dn")+'">'+(pct==null?"–":(d>=0?"+":"")+pct+"%")+'</td></tr>'};
    const rr=a=>{const r=a.map(ret).filter(x=>x!=null);return r.length?r.reduce((s,x)=>s+x,0)/r.length:0};
    $("then").innerHTML='<div class="tw"><table><tr><th></th><th>First '+k+'</th><th>Latest '+k+'</th><th>Change</th></tr>'+row("Avg views",avg(f,"v"),avg(n,"v"),fmt,"")+row("Viewed %",avg(f,"p"),avg(n,"p"),x=>Math.round(x*10)/10,"%")+row("Retention",rr(f),rr(n),x=>Math.round(x),"%")+'</table></div><div class="mu sm" style="margin-top:8px">You versus your earlier self. Nobody else is in this table.</div>'}
  const rows=testRows(),tagged=rows.filter(r=>r.q!=="none"),lead=tagged.find(r=>r.delta!=null&&r.delta>0);
  $("tr").innerHTML=ls.length?'<p style="margin-bottom:10px;font-weight:600">'+(lead?"Leading so far: "+esc(lead.lab)+", "+lead.delta+"% more views than your other Shorts.":"Not enough data for a winner yet. Each variation needs 3 or more Shorts.")+'</p><div class="tw"><table><tr><th>Variation</th><th>#</th><th>Avg views</th><th>Viewed</th><th>vs rest</th></tr>'+rows.map(r=>'<tr><td>'+esc(r.lab)+'</td><td class="num">'+r.n+'</td><td class="num">'+fmt(r.v)+'</td><td class="num">'+(Math.round(r.p*10)/10)+'%</td><td class="num '+(r.delta==null?"mu":r.delta>=0?"up":"dn")+'">'+(r.delta==null?"–":(r.delta>=0?"+":"")+r.delta+"%")+'</td></tr>').join("")+'</table></div>':'<span class="mu">Tag your Shorts with a variation and add their numbers to compare them here.</span>';
  renderHabitStats();
  const xs=[];let mx=60;for(let i=13;i>=0;i--){const k=key(ad(NOW,-i)),v=xpOf(k);xs.push([k,v]);if(v>mx)mx=v}
  let s='<svg class="ch" viewBox="0 0 340 120" role="img" aria-label="XP for the last 14 days"><line x1="0" x2="340" y1="94" y2="94" stroke="var(--ln)"/><text x="0" y="9">'+mx+' XP</text>';
  xs.forEach((e,i)=>{const h=e[1]/mx*78,x=i*24.2+2;s+='<rect x="'+x+'" y="'+(94-h)+'" width="19" height="'+Math.max(h,e[1]?2:0)+'" rx="4" fill="'+(e[0]===T?"var(--ac)":"var(--good)")+'"/><text x="'+(x+9.5)+'" y="110" text-anchor="middle">'+"SMTWTFS"[fk(e[0]).getDay()]+'</text>'});
  $("c1").innerHTML=s+'</svg>';
  const b1=ls.length?ls.reduce((m,l)=>l.v>m.v?l:m):null,bp1=ls.filter(l=>l.p).reduce((m,l)=>!m||l.p>m.p?l:m,null),bs=bestStreak(),f1k=ls.find(l=>l.v>=1000);
  let bx=null;Object.keys(D.days).forEach(k=>{if(!bx||xpOf(k)>xpOf(bx))bx=k});
  let bw=null,bws=0;for(let o=0;o<12;o++){const w=weekWork(o);if(w.sum>bws){bws=w.sum;bw=w.ks[0]}}
  const kv=(l,v,sub)=>'<div class="kv"><span>'+l+'</span><b>'+v+(sub?'<small>'+sub+'</small>':"")+'</b></div>';
  $("pb").innerHTML=kv("Most views",b1?fmt(b1.v):"–",b1?esc(b1.t)+" · "+fd(ld(b1)):"")+kv("Best viewed %",bp1?bp1.p+"%":"–",bp1?esc(bp1.t):"")+kv("Longest streak",bs.n?bs.n+" days":"–",bs.end?"ended "+fd(bs.end):"")+kv("Biggest XP day",bx&&xpOf(bx)?xpOf(bx)+" XP":"–",bx&&xpOf(bx)?fd(bx):"")+kv("Longest work week",bws?fmtDur(bws):"–",bw?"week of "+fd(bw):"")+kv("First Short over 1k",f1k?fd(ld(f1k)):"Not yet",f1k?esc(f1k.t):"Your first one is coming");
}
function monthList(){
  const s=fk(D.start),c=new Date(NOW.getFullYear(),NOW.getMonth(),1);let a=new Date(s.getFullYear(),s.getMonth(),1);
  const diff=(c.getFullYear()-a.getFullYear())*12+c.getMonth()-a.getMonth();if(diff>11)a=new Date(c.getFullYear(),c.getMonth()-11,1);
  return Array.from({length:12},(_,i)=>new Date(a.getFullYear(),a.getMonth()+i,1));
}
function dayClass(k){
  if(k<D.start)return"pre";if(k>T)return"fut";
  if(isRest(k))return"rs";const n=cnt(k);return n===5?"l3":n>=KEEP?"l2":n>0?"l1":"";
}
function renderYear(){
  const ms=monthList(),dn=done();
  $("ylead").textContent="Day "+dayN()+(dayN()<=365?" of your first 365":"")+". Tap any square to see or fix that day.";
  let g='<div class="ygrid"><span></span>';
  for(let d=1;d<=31;d++)g+='<span class="yh">'+([1,5,10,15,20,25,30].indexOf(d)>=0?d:"")+'</span>';
  ms.forEach(m=>{g+='<span class="ym">'+MON[m.getMonth()]+'</span>';const dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();
    for(let d=1;d<=31;d++){if(d>dim){g+='<i class="yc nx"></i>';continue}const k=key(new Date(m.getFullYear(),m.getMonth(),d)),c=dayClass(k);
      g+=(k<D.start?'<i class="yc pre"></i>':'<button class="yc '+c+(k===T?" td":"")+(k===selDay?" pk":"")+'" data-a="day" data-k="'+k+'" aria-label="'+fdl(k)+'"></button>')}});
  $("ygrid").innerHTML=g+'</div>';
  const k=selDay,n=cnt(k),logs=shortsOn(k),ws=secOn(k);
  $("dayd").innerHTML='<div class="dayh"><div><div class="eyebrow">'+(k===T?"Today":"Selected day")+'</div><b>'+fdl(k)+'</b></div><span class="pill'+(n===5?" g":"")+'">'+(isRest(k)?"Rest day":n+" of 5 · "+xpOf(k)+" XP")+'</span></div>'
   +(k>T?'<p class="mu sm">This day has not happened yet.</p>':CORE_T.map((t,i)=>taskRow(k,i,t,"",true)).join("")
   +'<button class="btn2 full" data-a="rest" data-k="'+k+'" style="margin-top:8px"'+(!isRest(k)&&weekHasOtherRest(k)?" disabled":"")+'>'+(isRest(k)?"Undo rest day":!isRest(k)&&weekHasOtherRest(k)?"Rest day already used this week":"Mark as rest day")+'</button>')
   +(ws>0?'<div class="rvh">Work time</div><div class="kv"><span>Tracked</span><b>'+fmtDur(ws)+'</b></div>':"")
   +(logs.length?'<div class="rvh">Shorts on this day</div>'+logs.map(l=>'<div class="kv"><span>'+esc(l.t)+'</span><b>'+(l.lg?fmt(l.v)+" views":"waiting")+'</b></div>').join(""):"");
  const ks=Object.keys(D.days),tv=dn.reduce((s,l)=>s+l.v,0),bs=bestStreak(),allSec=D.ses.reduce((s,x)=>s+sesSec(x),0);
  $("ytot").innerHTML=[[ks.filter(x=>cnt(x)>=KEEP).length,"Days kept"],[ks.filter(x=>cnt(x)===5).length,"Full days"],[D.logs.filter(l=>ld(l)<=T).length,"Shorts posted"],[fmt(tv),"Total views"],[bs.n,"Best streak"],[fmt(allXp()),"Total XP"],[Math.round(allSec/3600)+"h","Hours worked"],[D.clips.filter(c=>c.used).length,"Clips used"]].map(a=>'<div class="tile"><b>'+a[0]+'</b><div class="l">'+a[1]+'</div></div>').join("");
  const rows=ms.filter(m=>key(m)<=T).map(m=>{const pre=m.getFullYear()+"-"+p2(m.getMonth()+1),ls=dn.filter(l=>ld(l).slice(0,7)===pre),dk=ks.filter(x=>x.slice(0,7)===pre&&cnt(x)>=KEEP).length,hs=D.ses.filter(x=>x.d.slice(0,7)===pre).reduce((s,x)=>s+sesSec(x),0);return{pre,m,ls,dk,hs,v:avg(ls,"v"),p:avg(ls,"p")}});
  const mxv=Math.max(1,...rows.map(r=>r.v));
  $("mt").innerHTML='<table><tr><th>Month</th><th>Kept</th><th>Hours</th><th>Shorts</th><th>Avg views</th><th>Viewed</th></tr>'+rows.map(r=>'<tr'+(r.pre===T.slice(0,7)?' class="now"':"")+'><td><b>'+MON[r.m.getMonth()]+'</b></td><td class="num">'+r.dk+'</td><td class="num">'+(r.hs?Math.round(r.hs/360)/10+"h":"–")+'</td><td class="num">'+r.ls.length+'</td><td class="num">'+(r.ls.length?fmt(r.v)+'<span class="mbar" style="width:'+Math.round(r.v/mxv*100)+'%"></span>':"–")+'</td><td class="num">'+(r.ls.length?(Math.round(r.p*10)/10)+"%":"–")+'</td></tr>').join("")+'</table><div class="mu sm" style="margin-top:8px">Shorts here are the ones with 48-hour numbers.</div>';
  setVal("why",D.why);setVal("bs",D.base.s);setVal("bn",D.base.n);setVal("bt",D.base.t);baseRes();
  const wk=key(mondayOf(NOW)),cur=D.rv[wk]||{};
  $("rvwk").textContent="Week of "+fd(wk);setVal("rw",cur.w);setVal("rc",cur.c);
  const past=Object.keys(D.rv).filter(x=>x!==wk&&(D.rv[x].w||D.rv[x].c)).sort().reverse();
  $("rvh").innerHTML=past.length?past.map(x=>'<div class="rvh">Week of '+fd(x)+'</div>'+(D.rv[x].w?'<div class="rvt"><b>Worked:</b> '+esc(D.rv[x].w)+'</div>':"")+(D.rv[x].c?'<div class="rvt"><b>Change:</b> '+esc(D.rv[x].c)+'</div>':"")).join(""):"";
  const weeks={};ks.forEach(x=>{const w=key(mondayOf(fk(x)));(weeks[w]=weeks[w]||[]).push(x)});
  const perfectWk=Object.keys(weeks).some(w=>weekKeys(w).every(x=>cnt(x)===5));
  const rounds={};D.logs.forEach(l=>rounds[l.tr]=(rounds[l.tr]||0)+1);
  const goalDays=(()=>{const gs=(+D.goal.h||0)*3600;if(!gs)return 0;const days={};D.ses.forEach(x=>days[x.d]=1);return Object.keys(days).filter(k=>secOn(k)>=gs).length})();
  const B=[["First numbers in","Add numbers for your first Short",dn.length>=1],["10 Shorts with data","Ten Shorts with numbers",dn.length>=10],["Over the floor","A Short with 1,000+ views",dn.some(l=>l.v>=1000)],["10,000 views","Total views across all Shorts",tv>=10000],["7-day streak","Seven days in a row",bs.n>=7],["30-day streak","A full month in a row",bs.n>=30],["Perfect week","Seven full days in one week",perfectWk],["Test finished","Five Shorts on one test",Object.keys(rounds).some(r=>rounds[r]>=5)],["Clip stock","Save 10 clips",D.clips.length>=10],["First 10 hours","Track 10 hours of work",allSec>=36000],["100 hours","Track 100 hours of work",allSec>=360000],["Hit your target","Reach your daily work target 10 times",goalDays>=10],["100 days kept","Hundred days at 3+ tasks",ks.filter(x=>cnt(x)>=KEEP).length>=100],["Level 10","Reach level 10",levelOf(allXp())>=10],["Reviewer","Write 4 weekly reviews",Object.keys(D.rv).filter(x=>D.rv[x].w||D.rv[x].c).length>=4]];
  $("bdg").innerHTML=B.map(b=>'<div class="bd '+(b[2]?"on":"off")+'"><b>'+b[0]+'</b><span>'+b[1]+'</span></div>').join("");
}
function baseRes(){
  const b=D.base,ls=logsSorted(),last=ls.slice(-5),parts=[];
  if(b.s!==""&&b.n!==""){const d=(+b.n)-(+b.s);parts.push("Subscribers: "+(d>=0?"+":"")+fmt(d)+" since day 1.")}
  if(b.t!==""&&last.length){const now=Math.round(avg(last,"v"));parts.push("Typical views: "+fmt(+b.t)+" on day 1, "+fmt(now)+" across your last "+last.length+" Shorts.")}
  $("bres").textContent=parts.join(" ")||"Fill these in once and update them whenever you like. This is your own starting line.";
}
function renderProg(){
  document.querySelectorAll("#v-prog .seg button").forEach(b=>b.classList.toggle("on",b.dataset.s===progSeg));
  $("pstats").classList.toggle("on",progSeg==="stats");$("pyear").classList.toggle("on",progSeg==="year");
  if(progSeg==="stats")renderStats();else renderYear();
}

/* ---------- MORE ---------- */
function renderSync(){
  const c=$("synccard");if(!c)return;
  const a=document.activeElement;if(a&&c.contains(a)&&a.tagName==="INPUT")return;
  const ev=$("ae")?$("ae").value:"",pv=$("ap")?$("ap").value:"",msg=$("amsg")?$("amsg").innerHTML:"";
  if(!SYNC_ON){c.innerHTML='<p class="sm">Sync is not set up yet, so your data is saved on this phone only. Use "Save a backup file" below now and then. Ask Claude to finish the sync setup when you are ready.</p>';return}
  if(!AUTH){c.innerHTML='<p class="sm mu">Sign in to keep your data safe in the cloud and use the tracker on more than one device. Use the same email and password everywhere.</p><label class="fld"><span>Email</span><input id="ae" type="email" autocomplete="email" autocapitalize="off" inputmode="email"></label><label class="fld"><span>Password (8+ characters)</span><input id="ap" type="password" autocomplete="current-password"></label><div id="amsg" class="sm"></div><div class="g2"><button class="btn" data-a="signin">Sign in</button><button class="btn2" data-a="signup">Create account</button></div><p class="sm mu" id="syncst"></p>';$("ae").value=ev;$("ap").value=pv;$("amsg").innerHTML=msg;setSync(syncMode);return}
  c.innerHTML='<div><div class="eyebrow">Signed in</div><b>'+esc(AUTH.email||"")+'</b></div><p class="sm" id="syncst"></p><div class="g2"><button class="btn2" data-a="syncnow">Sync now</button><button class="btn2" data-a="signout">Sign out</button></div>';
  setSync(syncMode);
}
function renderMore(){
  setVal("goalh",D.goal.h);
  $("catl").innerHTML=D.cats.map(c=>'<div class="srow" style="align-items:center"><span class="tcat" style="flex:1;min-width:0"><i class="dot" style="background:'+catColor(c.id)+'"></i><input data-f="catn" data-id="'+esc(c.id)+'" value="'+esc(c.n)+'" aria-label="Category name"></span><button class="btn2" data-a="catdel" data-id="'+esc(c.id)+'">Delete</button></div>').join("");
  $("habl").innerHTML=D.habits.length?D.habits.map(h=>'<div class="hrow"><input data-f="hn" data-id="'+esc(h.id)+'" value="'+esc(h.n)+'" aria-label="Habit name"><div class="dws">'+WD.map(w=>'<button data-a="hdw" data-id="'+esc(h.id)+'" data-d="'+w[1]+'" class="'+(h.dw.indexOf(w[1])>=0?"on":"")+'" aria-label="'+DOW[w[1]]+'">'+w[0]+'</button>').join("")+'</div><div><button class="link bad" data-a="hdel" data-id="'+esc(h.id)+'">Delete habit</button></div></div>').join(""):'<p class="sm mu">No habits yet. Tap one below or type your own.</p>';
  $("habsug").innerHTML=HAB_SUG.filter(n=>!D.habits.some(h=>h.n.toLowerCase()===n.toLowerCase())).map(n=>'<button class="chip" data-a="habsug" data-n="'+n+'">+ '+n+'</button>').join("");
  const sa=window.matchMedia&&matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  $("inst").innerHTML=sa?"":'<div class="card" style="background:var(--acs);border-color:transparent"><b>Install on your iPhone</b><p class="sm" style="margin-top:4px">Open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>. It opens full screen like an app and works offline.</p></div>';
  renderSync();renderPlan();
}
function renderPlan(){
  const W=[["Mon · off · ~2h","45m teardown study · pick a clip, write the hook · make today's Short + 1 extra for Fri · 30m outreach (Phase 2+) · save a clip · numbers if due"],["Tue · off · ~2h","45m retention hunt · pick a clip, write the hook · make today's Short · 30m sample clip (Phase 2+) or fix an old Short · save a clip · numbers if due"],["Wed · college · ~30m","20m study · your scheduled Short goes live (tick it) · pick your next clip · save a clip · numbers if due"],["Thu · college · ~30m","20m study · your scheduled Short goes live (tick it) · pick your next clip · save a clip · numbers if due"],["Fri · college · ~30m","20m sales/coaching study · your scheduled Short goes live (tick it) · pick your next clip · save a clip · numbers if due"],["Sat · off · ~2h","Make today's Short + 1 extra for Wed · batch-edit · 45m niche radar · walk-in outreach (Phase 2+) · numbers if due"],["Sun · off · ~1h","Make today's Short + 1 extra for Thu · weekly review (top 3 vs bottom 3) · plan next week's test · numbers if due"]];
  $("wk").innerHTML=W.map((r,i)=>'<tr'+(i===(dow+6)%7?' class="now"':"")+'><td style="white-space:nowrap"><b>'+r[0]+'</b></td><td>'+r[1]+'</td></tr>').join("");
  const prog=activeProg();
  $("tst").innerHTML='<p class="mu sm" style="margin-bottom:6px">Not an extra task. It is the rule for how you make your next 5 Shorts. Pick the option when you save each one.</p>'
   +TESTS.map((t,i)=>'<div class="tst'+(i===D.test.i?" cur":"")+'"><span>'+(i===D.test.i?"<b>▶ ":"")+(i+1)+". "+esc(t)+(i===D.test.i?"</b>":"")+'</span>'+(i===D.test.i?"":'<button class="link" data-a="settest" data-i="'+i+'">Switch</button>')+'</div>').join("")
   +'<div class="mu sm" style="margin-top:8px">Progress: '+Math.min(prog,5)+'/5 Shorts made on the active test.</div>';
  $("phs").innerHTML=PH.map((p,i)=>'<p style="margin-bottom:10px;'+(i===phase()?"":"color:var(--mu)")+'"><b>Phase '+(i+1)+' · '+p.n+'</b>'+(i===phase()?' <span class="pill">You are here</span>':"")+'<br>'+p.g+'</p>').join("");
}
$("gl").innerHTML=[["Hook","The first 2 seconds. If it doesn't grab people, they swipe away."],["Dead air","Any moment where nothing interesting happens: pauses, slow starts, silence. Cut it."],["On-screen text","Words on the video (captions or a title). Test big captions vs minimal."],["Viewed vs swiped away","% of people who stayed vs scrolled past. Higher viewed % = better hook."],["Avg view duration","How many seconds people watched on average. Compare to the Short's length."],["Retention","How many people are still watching at each second. Find where the line drops."],["Loop","Ending that flows back into the start so people rewatch."],["48-hour numbers","The stats YouTube has fully processed two days after a Short goes live. The tracker always uses these so every Short is judged at the same age."]].map(a=>"<p><b>"+a[0]+":</b> "+a[1]+"</p>").join("");
$("wl").innerHTML="<p class='mu'>Search these exact phrases on YouTube and pick recent uploads:</p><p><b>Shorts growth:</b> “YouTube Shorts retention explained”, “how to hook in 2 seconds Shorts”, plus the official YouTube Creators and Creator Insider channels.</p><p><b>Editing:</b> “CapCut Shorts captions tutorial” and “CapCut zoom cut sound effects”.</p><p><b>Sales and offers:</b> Alex Hormozi (offers, pricing) and Jeremy Miner (sales calls, objections). Search “handling objections” and “how to sell a service”.</p><p><b>Clipping business:</b> “how to start a clipping agency” and “short form content agency cold outreach”. Treat income claims skeptically.</p><p class='mu'>Rule: watch with a notepad and write 3 things to try. Watching without testing is procrastination.</p>";

/* ---------- render + nav ---------- */
const VIEWS={today:renderToday,time:renderTime,clips:renderClips,shorts:renderShorts,prog:renderProg,more:renderMore};
function render(){renderHead();VIEWS[VIEW]()}
function go(t,noHash){
  if(t==="year"){progSeg="year";t="prog"}else if(t==="stats"){progSeg="stats";t="prog"}
  if(t==="plan")t="more";if(t==="log")t="shorts";
  if(!VIEWS[t])t="today";VIEW=t;
  document.querySelectorAll(".app>.view").forEach(v=>v.classList.toggle("on",v.id==="v-"+t));
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
  render();if(!noHash){try{history.replaceState(null,"","#"+(t==="prog"&&progSeg==="year"?"year":t))}catch(e){}}
  window.scrollTo(0,0);
}

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-a]");if(!t||t.tagName==="INPUT")return;
  const a=t.dataset.a,id=t.dataset.id;
  if(a==="tab")go(t.dataset.t);
  else if(a==="gosync")go("more");
  else if(a==="pseg"){progSeg=t.dataset.s;renderProg();window.scrollTo(0,0)}
  else if(a==="rest")toggleRest(t.dataset.k||T);
  else if(a==="xadd"){const x=$("xt");if(!x.value.trim())return;rec(T).x.push({t:x.value.trim(),v:+$("xv").value});x.value="";touchDay(T);persist();render()}
  else if(a==="xdel"){rec(T).x.splice(+t.dataset.i,1);touchDay(T);persist();render()}
  else if(a==="sug"){const s=SUGS_ALL[phase()][+t.dataset.i];rec(T).x.push({t:s[0],v:s[1]});touchDay(T);persist();render()}
  else if(a==="clipadd")addClip(t.dataset.l,t.dataset.n,t.dataset.o,t.dataset.w,false);
  else if(a==="clipforce")addClip(t.dataset.l,t.dataset.n,t.dataset.o,t.dataset.w,true);
  else if(a==="clipno")$(t.dataset.w).innerHTML="";
  else if(a==="cnext"){clipIdx++;renderToday()}
  else if(a==="mkclip"){go("shorts");$("m1").value=id;$("m2").value=$("m2").value||clipName(clipById(id)||{});$("m2").focus()}
  else if(a==="cedit"){editClip=id;renderClips()}
  else if(a==="ccancel"){editClip=null;renderClips()}
  else if(a==="csave"){const c=clipById(id);if(c){c.label=$("ce1").value.trim();c.note=$("ce2").value.trim();touchClips();persist()}editClip=null;render()}
  else if(a==="cdel")confirmTap(t,"Tap again to delete",()=>{D.clips=D.clips.filter(c=>c.id!==id);touchClips();persist();render();toast("Clip deleted")});
  else if(a==="cunuse"){const c=clipById(id);if(c){c.used=null;c.usedOn=null;touchClips();persist();render();toast("Back in your unused clips")}}
  else if(a==="vch"){$("m4").value=t.dataset.v}
  else if(a==="opennum"){if(VIEW!=="shorts")go("shorts");openNum(id)}
  else if(a==="open7"){if(VIEW!=="shorts")go("shorts");open7(id)}
  else if(a==="numcancel"){$("nf").hidden=true;numId=null}
  else if(a==="c7cancel"){$("cf").hidden=true;c7Id=null}
  else if(a==="c7skip"){const l=D.logs.find(x=>x.id===c7Id);if(l){l.c7={skip:1,d:T};touchDay(l.d);persist()}$("cf").hidden=true;c7Id=null;render()}
  else if(a==="shedit"){const l=D.logs.find(x=>x.id===id);if(!l)return;editShort=id;renderMake();
    $("m1").value=l.cid||"";$("m2").value=l.t;$("m3").value=l.h||"";$("m4").value=l.g==="none"?"":l.g;$("m5").value=ld(l);
    $("mft").textContent="Edit this Short";$("msub").textContent="Save changes";$("mcan").hidden=false;try{$("mf").scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}}
  else if(a==="mcancel"){clearMake();renderMake()}
  else if(a==="shdel")confirmTap(t,"Tap again to delete",()=>{const i=D.logs.findIndex(x=>x.id===id);if(i<0)return;const l=D.logs[i],m=l.d;
    if(l.cid){const c=clipById(l.cid);if(c&&c.used===l.id){c.used=null;c.usedOn=null;touchClips()}}
    D.logs.splice(i,1);touchDay(m);persist();if(editShort===id)clearMake();if(numId===id){$("nf").hidden=true;numId=null}render();toast("Short deleted"+(l.cid?". Its clip is unused again.":""))});
  else if(a==="pt"){selPt=+t.dataset.i;renderStats()}
  else if(a==="day"){selDay=t.dataset.k;renderYear()}
  else if(a==="settest"){D.test={i:+t.dataset.i,r:D.test.r+1};touchMeta();persist();render();toast("Switched test")}
  else if(a==="reset")confirmTap(t,"Tap again to set Day 1 to today",()=>{D.start=T;touchMeta();persist();render();toast("Plan Day 1 is today")});
  else if(a==="export")doExport();
  else if(a==="celclose")$("cel").hidden=true;
  /* timer */
  else if(a==="tcat"){D.lastCat=id;persist();renderTimerCards()}
  else if(a==="tstart")startTimer(D.lastCat&&catById(D.lastCat)?D.lastCat:D.cats[0].id);
  else if(a==="tpause")pauseTimer();
  else if(a==="tresume")resumeTimer();
  else if(a==="tfin")openFin();
  else if(a==="tkeep"){if(D.tm){D.tm.ack=Date.now();persist();renderTimerCards()}}
  else if(a==="fresume"){if(D.tm){D.tm.segs.push([Date.now(),null]);touchMeta();persist()}$("fin").hidden=true;finEnd=null;render()}
  else if(a==="fdisc")confirmTap(t,"Tap again to discard",()=>{D.tm=null;touchMeta();persist();$("fin").hidden=true;finEnd=null;render();toast("Session discarded")});
  else if(a==="dprev"){selSes=addk(selSes,-1);renderTime()}
  else if(a==="dnext"){if(selSes<T){selSes=addk(selSes,1);renderTime()}}
  else if(a==="sesedit"){const x=D.ses.find(q=>q.id===id);if(!x)return;editSes=id;$("sdet").open=true;catOptions("s1",x.cat);$("s2").value=x.d;$("s3").value=hhmm(x.segs[0][0]);$("s4").value=hhmm(x.segs[x.segs.length-1][1]);$("s5").value=x.note||"";$("ssub").textContent="Save changes";$("scan").hidden=false;$("sdets").textContent="Edit session";try{$("sdet").scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}}
  else if(a==="scancel")clearSes();
  else if(a==="sesdel")confirmTap(t,"Tap again to delete",()=>{const i=D.ses.findIndex(q=>q.id===id);if(i<0)return;const d=D.ses[i].d;D.ses.splice(i,1);touchDay(d);persist();if(editSes===id)clearSes();render();toast("Session deleted")});
  /* categories + habits */
  else if(a==="catadd"){const n=$("catn").value.trim();if(!n)return;D.cats.push({id:newId(),n});$("catn").value="";touchMeta();persist();renderMore()}
  else if(a==="catdel"){
    if(D.ses.some(x=>x.cat===id)||(D.tm&&D.tm.cat===id)){toast("That category has sessions. Rename it instead.");return}
    if(D.cats.length<=1){toast("Keep at least one category");return}
    confirmTap(t,"Tap again to delete",()=>{D.cats=D.cats.filter(c=>c.id!==id);if(D.lastCat===id)D.lastCat=D.cats[0].id;touchMeta();persist();renderMore()})}
  else if(a==="habadd"||a==="habsug"){const n=a==="habsug"?t.dataset.n:$("habn").value.trim();if(!n)return;D.habits.push({id:newId(),n,dw:[0,1,2,3,4,5,6],added:T});if(a==="habadd")$("habn").value="";touchMeta();persist();renderMore();toast("Habit added")}
  else if(a==="hdw"){const h=D.habits.find(x=>x.id===id),d=+t.dataset.d;if(!h)return;const i=h.dw.indexOf(d);if(i>=0){if(h.dw.length>1)h.dw.splice(i,1)}else h.dw.push(d);touchMeta();persist();renderMore()}
  else if(a==="hdel")confirmTap(t,"Tap again to delete",()=>{D.habits=D.habits.filter(h=>h.id!==id);touchMeta();persist();renderMore()});
  /* account */
  else if(a==="signin"||a==="signup"){
    const em=$("ae").value.trim(),pw=$("ap").value,m=$("amsg");
    if(!em||pw.length<8){m.innerHTML='<span class="err">Enter your email and a password of 8 or more characters.</span>';return}
    m.textContent="Working…";t.disabled=true;
    authCall(a==="signup"?"up":"in",em,pw).then(r=>{
      if(r==="confirm"){m.innerHTML="Account created. Check your email and tap the confirmation link, then come back and sign in.";return}
      toast("Signed in");renderSync();syncNow();
    }).catch(er=>{m.innerHTML='<span class="err">'+esc(er.message||"Could not sign in")+'</span>'}).finally(()=>{t.disabled=false});
  }
  else if(a==="signout"){AUTH=null;saveAuth();setSync("signedout");renderSync();toast("Signed out. Your data stays on this phone.")}
  else if(a==="syncnow"){syncNow().then(()=>toast(syncMode==="synced"?"Synced":"Sync problem. Saved on this phone."))}
  /* erase */
  else if(a==="wipe")$("wipex").innerHTML='<div class="warnbox"><b>Erase everything?</b><div>This permanently deletes '+Object.keys(D.days).length+' days, '+D.logs.length+' Shorts, '+D.clips.length+' clips, '+D.ses.length+' work sessions and your reviews, on this device'+(AUTH?" and in your synced account":"")+'. Save a backup file first if you might want any of it.</div><div class="row"><button class="btn2 pri" data-a="wipeok" style="background:var(--bad);border-color:var(--bad);color:#fff">Yes, erase everything</button><button class="btn2" data-a="wipeno">Cancel</button></div></div>';
  else if(a==="wipeno")$("wipex").innerHTML="";
  else if(a==="wipeok")wipeAll();
});
function wipeAll(){
  const t=Date.now(),keys=new Set(Object.keys(D.u));REMOTE.forEach(id=>{if(validId(id))keys.add(ukeyOf(id))});
  D=norm(null);D.u={};keys.forEach(k=>D.u[k]=t);D.u.meta=t;D.u.clips=t;
  persist();Object.keys(D.u).forEach(k=>queue(idOfU(k)));
  selDay=T;selPt=null;selSes=T;editShort=null;numId=null;c7Id=null;editClip=null;editSes=null;clipIdx=0;finEnd=null;clearMake();clearSes();$("nf").hidden=true;$("cf").hidden=true;$("fin").hidden=true;$("wipex").innerHTML="";
  render();toast("Fresh start. Day 1 is today.");
}
document.addEventListener("change",e=>{
  const t=e.target;if(!t.dataset)return;
  if(t.dataset.a==="task"){setTask(t.dataset.k,+t.dataset.i,t.checked);render()}
  else if(t.dataset.a==="hab"){const r=rec(T);r.h=r.h||{};if(t.checked)r.h[t.dataset.id]=1;else delete r.h[t.dataset.id];touchDay(T);persist();render()}
});
let dbT={};
function debounce(id,fn){clearTimeout(dbT[id]);dbT[id]=setTimeout(fn,500)}
function onField(id,fn){$(id).addEventListener("input",()=>debounce(id,()=>{fn();touchMeta();persist();if(id[0]==="b")baseRes()}))}
onField("why",()=>{D.why=$("why").value});
["bs","bn","bt"].forEach(id=>onField(id,()=>{D.base={s:$("bs").value,n:$("bn").value,t:$("bt").value}}));
["rw","rc"].forEach(id=>onField(id,()=>{const wk=key(mondayOf(NOW));D.rv[wk]={w:$("rw").value,c:$("rc").value}}));
$("goalh").addEventListener("input",()=>debounce("goalh",()=>{D.goal.h=Math.max(0,+$("goalh").value||0);touchMeta();persist()}));
document.addEventListener("input",e=>{
  const t=e.target;if(!t.dataset||!t.dataset.f)return;
  debounce(t.dataset.f+t.dataset.id,()=>{
    if(t.dataset.f==="catn"){const c=catById(t.dataset.id);if(c&&t.value.trim()){c.n=t.value.trim();touchMeta();persist()}}
    else if(t.dataset.f==="hn"){const h=D.habits.find(x=>x.id===t.dataset.id);if(h&&t.value.trim()){h.n=t.value.trim();touchMeta();persist()}}
  });
});
["n4","n5"].forEach(i=>$(i).addEventListener("input",npv));
$("mf").addEventListener("submit",saveShort);
$("nf").addEventListener("submit",saveNum);
$("cf").addEventListener("submit",saveC7);
$("fin").addEventListener("submit",saveFin);
$("sf").addEventListener("submit",saveSes);
$("xt").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("xa").click()}});

/* backup */
async function doExport(){
  const text=JSON.stringify({app:"shorts-tracker",version:5,exported:new Date().toISOString(),data:D},null,1),name="shorts-tracker-backup-"+T+".json",box=$("expx");
  try{const f=new File([text],name,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Shorts Tracker backup"});toast("Backup ready. Save it to Files.");return}}
  catch(err){if(err&&err.name==="AbortError")return}
  try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast("Backup downloaded")}catch(err){}
  box.innerHTML='<p class="sm mu">Nothing downloaded? Copy this text instead and keep it somewhere safe.</p><textarea id="expt" readonly style="min-height:120px"></textarea>';
  $("expt").value=text;
}
$("imp").addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{
    const o=JSON.parse(r.result),d=o&&o.data?o.data:o;if(!d||typeof d.days!=="object"||!Array.isArray(d.logs))throw 0;
    $("impx").innerHTML='<div class="card" style="background:var(--bg)"><b>Found '+Object.keys(d.days).length+' days, '+d.logs.length+' Shorts, '+(d.clips||[]).length+' clips and '+(d.ses||[]).length+' work sessions.</b><p class="sm mu" style="margin:4px 0 10px">Restoring replaces what is in the tracker now.</p><div class="g2"><button class="btn" id="impok">Restore</button><button class="btn2" id="impno">Cancel</button></div></div>';
    $("impok").onclick=()=>{const n=norm(d),t=Date.now();n.u={meta:t,clips:t};Object.keys(n.days).forEach(k=>n.u[k.slice(0,7)]=t);n.logs.forEach(l=>n.u[l.d.slice(0,7)]=t);n.ses.forEach(x=>n.u[x.d.slice(0,7)]=t);
      Object.keys(D.u).forEach(k=>{if(!n.u[k])n.u[k]=t});D=n;persist();Object.keys(D.u).forEach(k=>queue(idOfU(k)));$("impx").innerHTML="";render();toast("Backup restored")};
    $("impno").onclick=()=>{$("impx").innerHTML=""};
  }catch(err){$("impx").innerHTML='<p class="err">That file is not a Shorts Tracker backup.</p>'}e.target.value=""};
  r.readAsText(f);
});

/* boot */
(function(){
  let h="";try{h=location.hash.slice(1)}catch(e){}
  clearMake();clearSes();
  go(h&&(VIEWS[h]||["year","plan","log","stats"].indexOf(h)>=0)?h:"today",true);
  setSync(SYNC_ON?(AUTH?"synced":"signedout"):"local");
  if(!AUTH&&SYNC_ON)setSync("signedout");
})();
window.addEventListener("hashchange",()=>{try{const h=location.hash.slice(1);if(h&&h!==VIEW)go(h,true)}catch(e){}});
function newDayCheck(){if(key(new Date())!==T){NOW=new Date();T=key(NOW);dow=NOW.getDay();selDay=T;selSes=T;clearMake();clearSes();render()}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){newDayCheck();syncNow();tickTimer()}});
window.addEventListener("online",()=>syncNow());
setInterval(()=>{if(!document.hidden)syncNow()},60000);
persist();
if(SYNC_ON&&AUTH)syncNow();
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
