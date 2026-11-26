/* Nova Inferno — moteur. Le contenu vient de data.js (window.NI_DATA). */
(function(){
"use strict";
const D=window.NI_DATA, ICONS=window.NI_ICONS||{};
const $=id=>document.getElementById(id);
const DEBUG=/[?&]debug=1/.test(location.search);
const rnd=(a,b)=>a+Math.random()*(b-a), rndi=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.random()*a.length|0];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, dist=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const uid=()=>Math.random().toString(36).slice(2,9);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function mulberry(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
/* Nombres lisibles : 12 345 · 123,4k · 12,3 M · 1,2 Md · 3,4 T */
function fmt(n){
  if(!isFinite(n))return '∞';const s=n<0?'−':'';n=Math.abs(n);
  if(n<10000)return s+Math.round(n).toLocaleString('fr-FR');
  const u=[[1e15,' Q'],[1e12,' T'],[1e9,' Md'],[1e6,' M'],[1e3,'k']];
  for(const [v,t] of u)if(n>=v){const x=n/v;return s+(x>=100?Math.round(x):x.toFixed(1).replace('.',','))+t}
  return s+Math.round(n);
}
const pct=(v,d)=>(Math.round(v*100*(d?10:1))/(d?10:1)).toString().replace('.',',')+' %';
function icon(name,cls){const b=ICONS[name]||ICONS['crossed-swords']||'';return `<svg class="ic ${cls||''}" viewBox="0 0 512 512" aria-hidden="true">${b}</svg>`}

/* Index des données */
const CLS={};D.CLASSES.forEach(c=>CLS[c.id]=c);
const SK={};D.SKILLS.forEach(s=>{SK[s.id]=s;
  /* runes débloquées par niveau : +5, +12, +20 après la compétence (max 60) */
  s.runes.forEach((r,i)=>{r.lvl=Math.min(60,s.lvl+[5,12,20][i])})});
const LEG={};D.LEGENDARIES.forEach(l=>LEG[l.id]=l);
const SETS={};D.SETS.forEach(s=>SETS[s.id]=s);
const FUS={};D.FUSIONS.forEach(f=>FUS[f.id]=f);
const GEM={};D.GEMS.forEach(g=>GEM[g.id]=g);
const SLOT={};D.SLOTS.forEach(s=>SLOT[s.id]=s);
const DIFF=D.DIFFICULTIES;
const slotType=s=>SLOT[s]&&SLOT[s].type||s;
const ELC=D.ELEMENTS;

/* ---------------- Sauvegarde ---------------- */
const SAVE_KEY='nova-inferno-v1';
const DEFAULT_SETTINGS={music:1,sfx:1,vol:0.6,manual:0,free:0,farm:0,filter:1,quality:'moyen',fs:0};
function newShared(){return{v:1,heroes:[],cur:-1,gold:0,mats:{ferraille:0,azur:0,ambre:0,braise:0,trophee:0},keys:0,
  stash:[],paragon:{lvl:0,xp:0},cube:[],season:{kills:0,elites:0,rifts:0,bounties:0,extract:0,claimed:[],maxDiff:0,actBoss:0,equipLeg:0,fusion:0},
  codex:{},settings:Object.assign({},DEFAULT_SETTINGS),tuto:{},lastTime:Date.now(),weekly:{},board:[]}}
let G=newShared();
function load(){
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const d=JSON.parse(raw);if(d&&d.v===1){G=Object.assign(newShared(),d);G.settings=Object.assign({},DEFAULT_SETTINGS,d.settings||{});G.season=Object.assign(newShared().season,d.season||{});G.mats=Object.assign(newShared().mats,d.mats||{})}}}catch(e){}
}
function save(){
  try{G.lastTime=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(G))}catch(e){}
}
const ST=()=>G.settings;
function hero(){return G.heroes[G.cur]||null}

/* ---------------- Audio doux (WebAudio synthétisé) ---------------- */
let AC=null,master=null,musicBus=null,sfxBus=null;
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();musicBus=AC.createGain();sfxBus=AC.createGain();
    musicBus.connect(master);sfxBus.connect(master);master.connect(AC.destination);applyVolume();if(curMusic)startMusic(curMusic)}catch(e){AC=null}
}
function applyVolume(){if(!AC)return;const s=ST();master.gain.value=s.vol*0.8;musicBus.gain.value=s.music?0.35:0;sfxBus.gain.value=s.sfx?0.5:0}
const sndLast={};
function tone(f,d,type,g,slide,key,minGap){
  if(!AC||!ST().sfx)return;const t=AC.currentTime;
  if(key){if(sndLast[key]&&t-sndLast[key]<(minGap||0.08))return;sndLast[key]=t}
  const o=AC.createOscillator(),v=AC.createGain(),lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);
  v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime(g||0.05,t+0.012);v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(lp);lp.connect(v);v.connect(sfxBus);o.start(t);o.stop(t+d+0.03);
}
const SFX={
  hit:()=>tone(150,0.07,'triangle',0.025,90,'hit',0.09),
  crit:()=>tone(240,0.09,'triangle',0.035,120,'crit',0.12),
  hurt:()=>tone(110,0.12,'sine',0.04,70,'hurt',0.2),
  loot:()=>tone(880,0.12,'sine',0.03,null,'loot',0.1),
  leg:()=>{tone(523,0.5,'sine',0.05);setTimeout(()=>tone(784,0.6,'sine',0.045),140);setTimeout(()=>tone(1046,0.8,'sine',0.035),300)},
  lvl:()=>{[392,494,587,784].forEach((f,i)=>setTimeout(()=>tone(f,0.6,'sine',0.045-i*0.004),i*110));setTimeout(()=>tone(196,1.2,'triangle',0.03),0)},
  ui:()=>tone(660,0.05,'sine',0.02,null,'ui',0.05),
  cast:()=>tone(330,0.15,'sine',0.02,500,'cast',0.15),
  boom:()=>tone(70,0.35,'sine',0.05,40,'boom',0.25),
  gold:()=>tone(1200,0.06,'sine',0.015,null,'gold',0.12),
  quest:()=>{tone(440,0.2,'sine',0.04);setTimeout(()=>tone(660,0.35,'sine',0.04),120)}
};
/* Musique d'ambiance : nappe grave + cloches lentes sur une gamme mineure */
let curMusic=null,musicNodes=[],musicTimer=null;
function startMusic(m){
  curMusic=m;if(!AC)return;stopMusic(true);
  const t=AC.currentTime,pad=AC.createGain();pad.gain.setValueAtTime(0.0001,t);pad.gain.exponentialRampToValueAtTime(0.12,t+3);
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=380+m.mood*120;pad.connect(lp);lp.connect(musicBus);
  [[1,'sine'],[1.5,'triangle'],[0.5,'sine'],[1.003,'sine']].forEach(([mul,ty])=>{const o=AC.createOscillator();o.type=ty;o.frequency.value=m.root*mul;
    const g=AC.createGain();g.gain.value=ty==='triangle'?0.18:0.35;o.connect(g);g.connect(pad);o.start();musicNodes.push(o)});
  const lfo=AC.createOscillator(),lg=AC.createGain();lfo.frequency.value=0.07;lg.gain.value=120;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();musicNodes.push(lfo);
  musicNodes.push(pad);
  const bell=()=>{if(!AC||curMusic!==m)return;const tt=AC.currentTime,deg=pick(m.scale),f=m.root*4*Math.pow(2,deg/12)*(Math.random()<0.3?0.5:1);
    const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,tt);g.gain.exponentialRampToValueAtTime(0.05,tt+0.05);g.gain.exponentialRampToValueAtTime(0.0001,tt+3.5);
    o.connect(g);g.connect(musicBus);o.start(tt);o.stop(tt+3.6);musicTimer=setTimeout(bell,rnd(2200,5200))};
  musicTimer=setTimeout(bell,1500);
}
function stopMusic(){clearTimeout(musicTimer);musicNodes.forEach(n=>{try{if(n.stop)n.stop();n.disconnect()}catch(e){}});musicNodes=[]}
/* ================= Courbes, objets, statistiques ================= */
const f70=il=>0.02+0.98*Math.pow(clamp(il,1,70)/70,1.8);
const fPct=il=>0.45+0.55*Math.min(1,il/70);
const wpnAvg=il=>2+il*1.1+il*il*0.34;
const armorBase=il=>4+il*1.5+il*il*0.12;
const xpMob=L=>Math.round(6*Math.pow(L,1.6)+10);
const killsFor=L=>60+25*Math.min(L,10)+8*Math.max(0,L-10);
const xpNeed=L=>xpMob(L)*killsFor(L);
const paraNeed=p=>xpMob(70)*(420+6*p);
const refMain=L=>8+3*(L-1)+5*575*f70(L);
const refDps=L=>wpnAvg(L)*1.25*(1+refMain(L)/100)*1.1*1.5;
const mobHp=L=>refDps(L)*(1+0.7*Math.min(1,L/20))*(1+Math.min(Math.max(L-1,0),4)*0.45+L*0.03)*(L<3?0.75:1)*(1+2*Math.min(1,Math.max(0,L-1)/5));
const refHP=L=>40+10*L+(8+2*(L-1)+3*575*f70(L))*(1+0.25*L);
function refMit(L){const A=8*armorBase(L)*0.9+2*550*f70(L),R=2*L+3*100*f70(L);return(1-A/(A+50*L))*(1-R/(R+5*L))}
/* dégâts d'un coup de monstre blanc en Normal : ~3,5 % de la vie d'un héros équipé à son niveau */
const mitRef=L=>lerp(0.75,0.16,Math.pow(clamp(L,1,70)/70,0.7));
const mobDmg=L=>refHP(L)*0.035/mitRef(L)*(L<6?0.3+0.12*L:Math.min(1.8,0.9+(L-5)*0.06));
const goldDrop=L=>8+L*2.5;

/* Échelle des monstres selon difficulté et nombre de joueurs (prévu pour la coop) */
function monsterScale(diff,nbJoueurs,gr){
  const n=Math.max(1,nbJoueurs||1);let o;
  if(gr>0){const R=D.GREATER_RIFT;o={hp:R.hpBase*Math.pow(R.hpPer,gr-1),dmg:R.dmgBase*Math.pow(R.dmgPer,gr-1),xp:1.6+gr*0.25,gold:1.6+gr*0.2,leg:0.5+gr*0.03}}
  else{const d=DIFF[clamp(diff|0,0,DIFF.length-1)];o={hp:d.hp,dmg:d.dmg,xp:d.xp,gold:d.gold,leg:d.leg}}
  o.hp*=1+0.75*(n-1);return o;
}

/* ---------------- Génération d'objets ---------------- */
const CLASS_ELEMS={paladin:['sacre','feu','foudre','phys'],traqueuse:['phys','feu','froid','foudre'],shaman:['poison','feu','ombre','phys']};
function affixAllowed(k,slotT){const a=D.AFFIXES[k];return a.slots==='*'||a.slots.includes(slotT)}
function rollAffix(k,il,cls,anc,maxRoll){
  const a=D.AFFIXES[k];const r=maxRoll?1:Math.random();let v=lerp(a.v[0],a.v[1],r);
  if(a.scale==='lvl')v=Math.max(1,Math.round(v*f70(il)));else if(k==='socket')v=1;else if(k==='pickup')v=Math.round(v);else v=Math.round(v*fPct(il)*10)/10;
  if(anc&&k!=='socket'&&k!=='pickup')v=a.scale==='lvl'?Math.round(v*1.3):Math.round(v*1.3*10)/10;
  const o={k,v};
  if(k==='main')o.st=CLS[cls].main;
  if(k==='elem')o.el=pick(CLASS_ELEMS[cls]);
  if(k==='skill'){const ss=D.SKILLS.filter(s=>s.cls===cls&&s.kind!=='buff');o.sk=pick(ss).id}
  return o;
}
function pickBase(slotT,cls){
  if(slotT==='arme'){const w=CLS[cls].weapons;return pick(w)}
  if(slotT==='offhand')return CLS[cls].offhand;
  return slotT;
}
const ARMOR_SLOTS=['tete','epaules','torse','mains','poignets','taille','jambes','pieds'];
const DROP_SLOTS=['tete','epaules','torse','mains','poignets','taille','jambes','pieds','amulette','anneau','anneau','arme','arme','offhand'];
/* opts : ilvl, cls, r (rareté), slot, leg (id), set (id), anc (0/1/2) */
function makeItem(o){
  const il=clamp(o.ilvl|0,1,70),cls=o.cls;let r=o.r||'c',slotT=o.slot,leg=null,set=null;
  if(o.leg){leg=LEG[o.leg];r='l';slotT=leg.slot}
  if(o.set){set=SETS[o.set];r='s';slotT=slotT||pick(set.slots)}
  if(!slotT)slotT=pick(DROP_SLOTS);
  const base=pickBase(slotT,cls),B=D.BASES[base];
  const anc=(r==='l'||r==='s')?(o.anc||0):0,maxRoll=anc===2;
  const it={id:uid(),slot:slotT,base,r,lvl:il,aff:[],anc,ench:-1,enchN:0,up:0,lock:0};
  if(B.cls)it.cls=B.cls;
  if(B.weapon){const rm={c:0.75,m:0.85,r:1,l:1.15,s:1.15}[r]*(anc?1.3:1)*(B.dmgMul||1);const avg=wpnAvg(il)*rm*(maxRoll?1.1:rnd(0.92,1.08));it.wpn={min:Math.round(avg*0.85),max:Math.round(avg*1.15)+1,aps:B.aps}}
  if(B.armor){it.armor=Math.round(armorBase(il)*B.armor*({c:0.8,m:0.9,r:1,l:1.1,s:1.1}[r])*(anc?1.3:1))}
  const R=D.RARITIES[r];const used=new Set();
  const prims=Object.keys(D.AFFIXES).filter(k=>D.AFFIXES[k].prim&&affixAllowed(k,slotT));
  const secs=Object.keys(D.AFFIXES).filter(k=>!D.AFFIXES[k].prim&&affixAllowed(k,slotT));
  const add=k=>{used.add(k);it.aff.push(rollAffix(k,il,cls,anc,maxRoll))};
  /* les légendaires / sets / rares ont toujours la stat principale (sauf arme : dégâts d'arme) */
  if(r!=='c'&&r!=='m'){add('main');if(slotT==='arme')add('wdmg')}
  while(it.aff.filter(a=>D.AFFIXES[a.k].prim).length<R.prim){const c=prims.filter(k=>!used.has(k));if(!c.length)break;add(pick(c))}
  for(let i=0;i<R.sec;i++){const c=secs.filter(k=>!used.has(k));if(c.length)add(pick(c))}
  /* nom */
  const bn=pick(B.names);
  if(leg)it.leg=leg.id,it.name=leg.name;
  else if(set)it.set=set.id,it.name=bn+' — '+set.name;
  else if(r==='c')it.name=bn;
  else if(r==='m')it.name=bn+' '+pick(D.NAME_PARTS.magic);
  else it.name=bn+' '+pick(D.NAME_PARTS.rare);
  return it;
}
/* Tirage d'un butin : rareté, classe (butin intelligent 85 %), légendaire/set, antique/primordial */
function rollDrop(o){
  const h=hero();const L=o.ilvl,legMul=1+(o.leg||0);
  const cls=Math.random()<0.85?h.cls:pick(D.CLASSES.filter(c=>c.playable)).id;
  let r;const roll=Math.random();
  const pity=G.pity||0;let legCh=(0.012+Math.min(0.05,pity*0.00012))*legMul*(L<10?0.6:1)*(o.legBoost||1);
  /* premier légendaire d'un héros : ni trop tôt, ni trop tard (environ 20 à 40 min de jeu) */
  let forceFirst=false;if(!h.legSeen){h.drops=(h.drops||0)+1;if(h.drops<45&&!o.forceLeg)legCh=0;else if(h.drops>=100)forceFirst=true}
  if(o.forceLeg||roll<legCh||pity>=420||forceFirst)r='l';else if(roll<0.17)r='r';else if(roll<0.5)r='m';else r='c';
  if(ST().filter&&h.lvl>=60&&(r==='c'||r==='m')&&!o.keep)return null; /* filtre de butin */
  let it;
  if(r==='l'){G.pity=0;h.legSeen=1;
    const anc=h.lvl>=70?(o.primal&&Math.random()<0.04?2:Math.random()<0.1?1:0):0;
    if(Math.random()<0.28){const sets=D.SETS.filter(s=>!s.season&&(!s.cls||s.cls===cls));const s=pick(sets.length?sets:D.SETS.filter(s=>!s.season));it=makeItem({ilvl:L,cls:s.cls||cls,set:s.id,anc})}
    else{let pool=D.LEGENDARIES.filter(l=>!l.cls||l.cls===cls);
      if(o.target&&Math.random()<0.5){const t=o.target.filter(id=>LEG[id]&&(!LEG[id].cls||LEG[id].cls===cls));if(t.length)pool=t.map(id=>LEG[id])}
      const l=pick(pool);it=makeItem({ilvl:L,cls:l.cls||cls,leg:l.id,anc})}
  }else{G.pity=pity+1;it=makeItem({ilvl:L,cls,r})}
  return it;
}

/* ---------------- Textes d'objets ---------------- */
function mainName(st){return st==='str'?'Force':st==='dex'?'Dextérité':'Intelligence'}
function affixText(a,it){
  const A=D.AFFIXES[a.k];if(!A)return '?';let v=a.v*(1+0.06*((it&&it.up)||0));
  if(a.k==='socket'){if(it&&it.slot==='arme')return 'Gemme taillée : +50 % de dégâts critiques';return 'Gemme taillée : +'+fmt(sockMain(it))+' stat principale'}
  const vs=A.pct?String(Math.round(v*10)/10).replace('.',','):fmt(Math.round(v));
  return A.n.replace('{v}',vs).replace('{main}',mainName(a.st)).replace('{el}',a.el?ELC[a.el].n.toLowerCase():'').replace('{sk}',a.sk&&SK[a.sk]?SK[a.sk].name:'');
}
const sockMain=it=>Math.round(400*f70(it?it.lvl:70));
function itemPower(it){const L=LEG[it.leg],S=SETS[it.set];return L?L.text:S?S.name:''}
function rarName(it){const R=D.RARITIES[it.r].n;return (it.anc===2?'Primordial ':it.anc===1?'Antique ':'')+R}
function rarCss(it){return it.anc===2?'#ff3a3a':D.RARITIES[it.r].css}
function itemIcon(it){return D.BASES[it.base].icon}
function canEquip(it,h){if(it.cls&&it.cls!==h.cls)return false;return true}

/* ---------------- Statistiques du héros ---------------- */
function equippedSkills(h){return (h.skills||[]).filter(s=>s&&s.id&&SK[s.id]).map(s=>s.id)}
function paragonPoints(lvl,ci){return lvl>ci?Math.floor((lvl-ci-1)/4)+1:0}
/* Calcule toutes les stats d'un héros (equipOverride permet la comparaison avant/après) */
function computeStats(h,equipOverride){
  const eq=equipOverride||h.equip,c=CLS[h.cls],L=h.lvl;
  const S={main:8+3*(L-1),vit:8+2*(L-1),armor:0,res:2*L,chc:0.05,chd:0.5,ias:0,cdr:0,rcr:0,area:0,elite:0,lifeP:0,ls:0,loh:0,regen:0,gold:0,pickup:2.2,mdr:0,rdr:0,
    ms:0,thorns:0,thornsM:1,xpk:0,dr:[],wdmg:0,elem:{},skill:{},resMax:0,armorP:0,resP:0,regenP:0,dmg:0,chainPlus:0,dmgPoisoned:0,fx:[],setCount:{},legs:[],fusions:[]};
  let wpn=null;
  for(const sl in eq){const it=eq[sl];if(!it)continue;
    if(it.wpn)wpn=it.wpn;
    if(it.armor)S.armor+=it.armor*(1+0.06*it.up);
    for(const a of it.aff){const v=a.v*(1+0.06*it.up);
      switch(a.k){
        case 'main':if(a.st===c.main)S.main+=v;break;
        case 'socket':if(it.slot==='arme')S.chd+=0.5;else S.main+=sockMain(it);break;
        case 'elem':S.elem[a.el]=(S.elem[a.el]||0)+v/100;break;
        case 'skill':S.skill[a.sk]=(S.skill[a.sk]||0)+v/100;break;
        case 'allres':S.res+=v;break;
        case 'pickup':S.pickup+=v;break;
        default:{const A=D.AFFIXES[a.k];if(A.pct){if(a.k==='mdr'||a.k==='rdr')S[a.k]+=v/100;else S[a.k]=(S[a.k]||0)+v/100}else S[a.k]=(S[a.k]||0)+v}
      }}
    if(it.leg){const l=LEG[it.leg];if(!l.cls||l.cls===h.cls){S.legs.push(l.id);S.fx.push(...l.fx.map(f=>Object.assign({src:l.name},f)))}}
    if(it.set)S.setCount[it.set]=(S.setCount[it.set]||0)+1;
  }
  /* pouvoirs du Cube Nova */
  if(h.cubeEq)for(const k in h.cubeEq){const id=h.cubeEq[k];const l=LEG[id];if(l&&(!l.cls||l.cls===h.cls)&&!S.legs.includes(id)){S.legs.push(id);S.fx.push(...l.fx.map(f=>Object.assign({src:l.name+' (cube)'},f)))}}
  /* sets */
  const red=S.fx.some(f=>f.t==='setReduce')?1:0;S.setBonus=[];
  for(const sid in S.setCount){const s=SETS[sid];if(!s)continue;const n=S.setCount[sid];
    [[2,'b2'],[4,'b4'],[6,'b6']].forEach(([need,k])=>{if(n>=Math.max(2,need-red)){S.fx.push(...s[k].fx.map(f=>Object.assign({src:s.name+' ('+need+')'},f)));S.setBonus.push(sid+':'+need)}})}
  /* fusions (actives + légendaires de fusion), seulement si les deux compétences sont équipées */
  const sk=equippedSkills(h);const fz=new Set();
  (h.fus&&h.fus.active||[]).forEach(id=>fz.add(id));
  S.legs.forEach(id=>{if(LEG[id].fuse)fz.add(LEG[id].fuse)});
  fz.forEach(id=>{const f=FUS[id];if(f&&f.cls===h.cls&&sk.includes(f.a)&&sk.includes(f.b)){S.fusions.push(id);S.fx.push(...f.fx.map(x=>Object.assign({src:'Fusion '+f.name,fusion:id},x)))}});
  /* gemmes légendaires */
  if(h.gemSock)for(const sl of ['amulette','anneau1','anneau2']){const gi=h.gemSock[sl];if(gi==null||!eq[sl])continue;const g=h.gems[gi];if(!g)continue;const GD=GEM[g.id];
    let v=GD.v0+GD.vr*g.rank;if(GD.cap)v=Math.min(GD.cap,v);const f=GD.fx;
    if(f.t==='stat'){if(f.key==='dr')S.dr.push(v/100);else S[f.key]=(S[f.key]||0)+v/100;if(f.key2)S[f.key2]=(S[f.key2]||0)+v/100}
    else if(f.t==='nearDmg')S.fx.push({t:'nearDmg',r:f.r,m:1+v/100,src:GD.name});
    else if(f.t==='onHitPoison')S.fx.push({t:'onHit',on:'*',ch:0.25,do:'poison',m:v/100*5,src:GD.name});
    else if(f.t==='periodicPct')S.fx.push({t:'periodic',every:f.every,do:f.do,el:f.el,m:v/100,src:GD.name});
    if(g.rank>=25)S.fx.push(...GD.r25.fx.map(x=>Object.assign({src:GD.name},x)));
  }
  /* parangon */
  const pl=G.paragon.lvl;if(pl>0&&h.para){D.PARAGON.forEach((cat,ci)=>cat.stats.forEach(st=>{const n=h.para[st.k]||0;if(!n)return;const v=n*st.per;
    if(st.k==='main')S.main+=v;else if(st.k==='vit')S.vit+=v;else if(st.k==='resMax')S.resMax+=v;else if(st.k==='pickup')S.pickup+=v;else S[st.k]=(S[st.k]||0)+v}))}
  /* compagnon */
  if(h.comp&&h.comp.active&&tavernOpen(h)){const sk2=h.comp.sk||[0,0];const cid=h.comp.active;
    if(cid==='brann'&&sk2[1]===0)S.armorP+=0.15;if(cid==='sylene'&&sk2[1]===0)S.chc+=0.04;if(cid==='oriane'&&sk2[1]===0)S.dmg+=0.1;if(cid==='oriane'&&sk2[0]===1)S.regenP+=0.01}
  /* effets 'stat' */
  for(const f of S.fx){if(f.t==='stat')for(const k in f.s){if(k==='dr')S.dr.push(f.s[k]);else if(k==='thornsM')S.thornsM+=f.s[k];else S[k]=(S[k]||0)+f.s[k]}}
  /* dérivées */
  S.cdr=Math.min(0.6,S.cdr);S.rcr=Math.min(0.6,S.rcr);S.chc=Math.min(0.75,S.chc);S.ms=Math.min(0.6,S.ms);
  S.armor*=(1+S.armorP)*c.baseArmor;S.res*=(1+S.resP);
  S.wpn=wpn||{min:1+L,max:2+L*1.4,aps:1.2};S.wpnAvg=(S.wpn.min+S.wpn.max)/2*(1+S.wdmg);
  S.aps=S.wpn.aps*(1+S.ias);
  S.maxHp=Math.round((40+10*L+S.vit*(1+0.25*L))*(1+S.lifeP));
  S.resMaxTot=c.res?c.res.max+S.resMax:100;
  S.regenTot=S.regen+S.maxHp*S.regenP;
  S.mainMul=1+S.main/100;
  S.allMul=1;for(const f of S.fx)if(f.t==='skillDmg'&&f.skill==='*'&&!f.cond)S.allMul*=f.m;
  const bestEl=Math.max(0,...Object.values(S.elem));
  S.sheetDps=S.wpnAvg*S.aps*S.mainMul*(1+S.chc*S.chd)*(1+bestEl)*(1+S.dmg)*S.allMul;
  return S;
}
/* Réduction des dégâts contre un niveau de monstre */
function mitigation(S,mL){const aDR=S.armor/(S.armor+50*mL),rDR=S.res/(S.res+5*mL);let m=(1-aDR)*(1-rDR);for(const d of S.dr)m*=(1-d);return{aDR,rDR,mult:m}}
function toughness(S,mL){return S.maxHp/mitigation(S,mL).mult}
function recovery(S){return S.regenTot+S.loh*S.aps+S.ls*S.sheetDps*0.05}
/* ================= Rendu Three.js ================= */
const stage=$('stage'),cv=$('cv');
const QUAL={bas:{part:0.4,far:48,dpr:1},moyen:{part:0.7,far:62,dpr:1.25},haut:{part:1,far:80,dpr:1.5}};
const Q=()=>QUAL[ST().quality]||QUAL.moyen;
let R=null;
function makeRenderer(){
  R=new THREE.WebGLRenderer({canvas:cv,antialias:ST().quality==='haut',powerPreference:'low-power'});
  R.setPixelRatio(Math.min(Q().dpr,window.devicePixelRatio||1));
}
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(50,9/16,0.5,140);
const hemi=new THREE.HemisphereLight(0xdfe4ff,0x3a3020,0.85);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,0.85);sun.position.set(-20,40,15);scene.add(sun);
const heroLight=new THREE.PointLight(0xffb070,0.0,14);scene.add(heroLight);
let H=(x,z)=>0; /* hauteur du sol, remplacée par la carte */

/* --- fusion de géométries (1 draw call par monstre) --- */
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_s=new THREE.Vector3(),_c=new THREE.Color();
function P_(geo,x,y,z,color,rx,ry,rz,sx,sy,sz){return{geo,x,y,z,color,rx:rx||0,ry:ry||0,rz:rz||0,sx:sx||1,sy:sy==null?(sx||1):sy,sz:sz==null?(sx||1):sz}}
function merge(parts){
  let n=0;const gs=parts.map(p=>{const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();
    _m4.compose(_v.set(p.x,p.y,p.z),_q.setFromEuler(_e.set(p.rx,p.ry,p.rz)),_s.set(p.sx,p.sy,p.sz));g.applyMatrix4(_m4);n+=g.attributes.position.count;return[g,p.color]});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
  for(const [g,c] of gs){const a=g.attributes.position.array,b=g.attributes.normal.array;pos.set(a,o*3);nor.set(b,o*3);_c.set(c);
    for(let i=0;i<g.attributes.position.count;i++){col[(o+i)*3]=_c.r;col[(o+i)*3+1]=_c.g;col[(o+i)*3+2]=_c.b}o+=g.attributes.position.count;g.dispose()}
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.setAttribute('color',new THREE.BufferAttribute(col,3));
  out.computeBoundingSphere();return out;
}
const GB={box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(0.5,8,6),ico:new THREE.IcosahedronGeometry(0.5,0),cyl:new THREE.CylinderGeometry(0.5,0.5,1,8),
  cone:new THREE.ConeGeometry(0.5,1,6),cone4:new THREE.ConeGeometry(0.5,1,4),dode:new THREE.DodecahedronGeometry(0.5,0),oct:new THREE.OctahedronGeometry(0.5,0),tor:new THREE.TorusGeometry(0.5,0.12,5,12),prism:new THREE.CylinderGeometry(1,1,1,3)};
Object.values(GB).forEach(g=>g.userData.keep=1);
const vcMat=()=>new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
function shade(c,k){_c.set(c);_c.multiplyScalar(k);return _c.getHex()}

/* --- modèles de monstres (géométrie mise en cache par type) --- */
const monGeoCache={};
function monsterGeo(def,key){
  if(monGeoCache[key])return monGeoCache[key];
  const c=def.color,d=shade(c,0.7),e=def.eye,p=[];
  switch(def.model){
    case 'quad':p.push(P_(GB.box,0,0.65,0,c,0,0,0,0.7,0.6,1.2),P_(GB.box,0,0.85,-0.75,d,0,0,0,0.5,0.45,0.5),P_(GB.box,-0.12,0.92,-1.01,e,0,0,0,0.08,0.08,0.05),P_(GB.box,0.12,0.92,-1.01,e,0,0,0,0.08,0.08,0.05));
      for(let i=0;i<4;i++)p.push(P_(GB.box,i<2?-0.25:0.25,0.2,i%2?0.4:-0.4,d,0,0,0,0.15,0.4,0.15));
      p.push(P_(GB.cone4,0,0.95,0.6,d,-1.2,0,0,0.15,0.6,0.15));
      if(def.tusks){p.push(P_(GB.cone,-0.2,0.75,-1.05,0xeee8d0,-1.8,0,0,0.08,0.35,0.08),P_(GB.cone,0.2,0.75,-1.05,0xeee8d0,-1.8,0,0,0.08,0.35,0.08))}break;
    case 'biped':p.push(P_(GB.box,0,1.05,0,c,0,0,0,0.6,0.8,0.38),P_(GB.box,0,1.65,0,d,0,0,0,0.42,0.42,0.42),P_(GB.box,-0.1,1.7,-0.22,e,0,0,0,0.08,0.06,0.04),P_(GB.box,0.1,1.7,-0.22,e,0,0,0,0.08,0.06,0.04),
        P_(GB.box,-0.17,0.35,0,d,0,0,0,0.2,0.7,0.22),P_(GB.box,0.17,0.35,0,d,0,0,0,0.2,0.7,0.22),P_(GB.box,-0.42,1.05,-0.1,c,0.3,0,0.15,0.16,0.7,0.16),P_(GB.box,0.42,1.05,-0.1,c,0.3,0,-0.15,0.16,0.7,0.16));
      if(def.robe)p.push(P_(GB.cone,0,0.6,0,shade(c,0.85),0,0,0,0.9,1.2,0.9));
      if(def.horns)p.push(P_(GB.cone,-0.16,2.0,0,0xd8c8a0,0,0,0.4,0.1,0.4,0.1),P_(GB.cone,0.16,2.0,0,0xd8c8a0,0,0,-0.4,0.1,0.4,0.1));
      if(def.bow)p.push(P_(GB.tor,0.5,1.1,-0.3,0x6a4a2a,0,1.57,0,0.6,1,0.6));break;
    case 'brute':p.push(P_(GB.box,0,1.2,0,c,0,0,0,1.1,1.0,0.75),P_(GB.box,0,1.95,-0.15,d,0,0,0,0.6,0.5,0.55),P_(GB.box,-0.14,2.0,-0.44,e,0,0,0,0.1,0.07,0.04),P_(GB.box,0.14,2.0,-0.44,e,0,0,0,0.1,0.07,0.04),
        P_(GB.box,-0.3,0.4,0,d,0,0,0,0.34,0.8,0.36),P_(GB.box,0.3,0.4,0,d,0,0,0,0.34,0.8,0.36),P_(GB.box,-0.75,1.15,-0.1,c,0.25,0,0.2,0.32,1.1,0.32),P_(GB.box,0.75,1.15,-0.1,c,0.25,0,-0.2,0.32,1.1,0.32),
        P_(GB.box,-0.8,0.55,-0.2,d,0,0,0,0.36,0.36,0.36),P_(GB.box,0.8,0.55,-0.2,d,0,0,0,0.36,0.36,0.36));
      if(def.horns)p.push(P_(GB.cone,-0.25,2.35,-0.15,0xd8c8a0,0,0,0.5,0.14,0.6,0.14),P_(GB.cone,0.25,2.35,-0.15,0xd8c8a0,0,0,-0.5,0.14,0.6,0.14));break;
    case 'spider':p.push(P_(GB.sph,0,0.6,0.35,c,0,0,0,1.1,0.8,1.3),P_(GB.sph,0,0.6,-0.45,d,0,0,0,0.6,0.5,0.6),P_(GB.box,-0.12,0.68,-0.75,e,0,0,0,0.08,0.08,0.05),P_(GB.box,0.12,0.68,-0.75,e,0,0,0,0.08,0.08,0.05));
      for(let i=0;i<8;i++){const s=i<4?-1:1,k=i%4;p.push(P_(GB.box,s*0.65,0.45,-0.45+k*0.3,d,0,(k-1.5)*0.35*s,s*0.6,0.9,0.07,0.07))}break;
    case 'floater':p.push(P_(GB.sph,0,1.4,0,c,0,0,0,0.8,0.9,0.8),P_(GB.cone,0,0.75,0,shade(c,0.8),Math.PI,0,0,0.6,1.1,0.6),P_(GB.box,-0.13,1.5,-0.36,e,0,0,0,0.1,0.12,0.04),P_(GB.box,0.13,1.5,-0.36,e,0,0,0,0.1,0.12,0.04));break;
    case 'blob':p.push(P_(GB.ico,0,0.5,0,c,0,0,0,0.9,0.75,0.9),P_(GB.box,-0.13,0.62,-0.4,e,0,0,0,0.09,0.09,0.04),P_(GB.box,0.13,0.62,-0.4,e,0,0,0,0.09,0.09,0.04));
      for(let i=0;i<5;i++){const a=i/5*6.28;p.push(P_(GB.cone4,Math.cos(a)*0.35,0.75,Math.sin(a)*0.35,d,Math.sin(a)*0.6,0,-Math.cos(a)*0.6,0.12,0.35,0.12))}break;
    case 'insect':p.push(P_(GB.sph,0,0.6,0.3,c,0,0,0,0.7,0.55,1.1),P_(GB.sph,0,0.75,-0.35,d,0,0,0,0.45,0.45,0.5),P_(GB.box,-0.1,0.85,-0.58,e,0,0,0,0.09,0.09,0.04),P_(GB.box,0.1,0.85,-0.58,e,0,0,0,0.09,0.09,0.04),
        P_(GB.box,-0.3,0.95,-0.55,d,0.6,0,0.3,0.08,0.7,0.08),P_(GB.box,0.3,0.95,-0.55,d,0.6,0,-0.3,0.08,0.7,0.08));
      for(let i=0;i<6;i++){const s=i<3?-1:1;p.push(P_(GB.box,s*0.45,0.3,-0.1+(i%3)*0.3,d,0,0,s*0.7,0.6,0.06,0.06))}break;
    case 'bird':p.push(P_(GB.sph,0,1.2,0,c,0,0,0,0.5,0.45,0.8),P_(GB.sph,0,1.35,-0.4,d,0,0,0,0.32,0.32,0.32),P_(GB.cone4,0,1.32,-0.65,0xd8a040,-1.57,0,0,0.1,0.3,0.1),
        P_(GB.box,-0.55,1.25,0,d,0,0,0.3,0.8,0.05,0.45),P_(GB.box,0.55,1.25,0,d,0,0,-0.3,0.8,0.05,0.45),P_(GB.box,-0.1,1.42,-0.55,e,0,0,0,0.06,0.06,0.04),P_(GB.box,0.1,1.42,-0.55,e,0,0,0,0.06,0.06,0.04));break;
  }
  /* signes distinctifs par famille (lisibilité) */
  const top={quad:1.0,biped:2.0,brute:2.3,spider:0.95,floater:1.9,blob:0.95,insect:1.05,bird:1.5}[def.model]||1.5;
  const bone=0xe8dcc0;
  switch(def.fam){
    case 'morts':p.push(P_(GB.box,0,top*0.62,-0.2,bone,0,0,0,0.5,0.06,0.06),P_(GB.box,0,top*0.55,-0.2,bone,0,0,0,0.46,0.06,0.06),P_(GB.box,0,top*0.48,-0.2,bone,0,0,0,0.4,0.06,0.06));
      if(def.model==='biped')p.push(P_(GB.cone4,-0.36,1.48,0,bone,0,0,0.5,0.1,0.32,0.1),P_(GB.cone4,0.36,1.48,0,bone,0,0,-0.5,0.1,0.32,0.1));break;
    case 'betes':for(let i=0;i<4;i++)p.push(P_(GB.cone4,0,top*0.98,-0.35+i*0.22,shade(c,0.55),-0.3,0,0,0.12,0.32,0.12));break;
    case 'demons':p.push(P_(GB.box,0,top*0.6,-0.32,0xff8a2a,0,0,0,0.22,0.22,0.06),P_(GB.cone4,0,top*0.35,0.45,shade(c,0.8),1.1,0,0,0.12,0.8,0.12));
      if(!def.horns)p.push(P_(GB.cone,-0.15,top+0.05,0,0xd8c8a0,0,0,0.4,0.08,0.3,0.08),P_(GB.cone,0.15,top+0.05,0,0xd8c8a0,0,0,-0.4,0.08,0.3,0.08));break;
    case 'insectes':p.push(P_(GB.box,-0.32,top*0.85,0.15,0xcfe8ff,0.2,0,0.5,0.6,0.02,0.32),P_(GB.box,0.32,top*0.85,0.15,0xcfe8ff,0.2,0,-0.5,0.6,0.02,0.32));break;
    case 'esprits':for(let i=0;i<3;i++)p.push(P_(GB.cone,(i-1)*0.25,top*0.25,0.15,shade(c,1.2),Math.PI+0.3,0,(i-1)*0.3,0.18,0.8,0.18));break;
    case 'sables':p.push(P_(GB.box,0,top*0.7,0,0xd8b060,0,0,0,0.62,0.08,0.5),P_(GB.box,0,top*0.5,0,0xd8b060,0,0,0,0.6,0.06,0.46));break;
  }
  const mg=merge(p);mg.userData.keep=1;return monGeoCache[key]=mg;
}
/* --- héros (groupe animé) : l'équipement porté change l'apparence --- */
const RARC={c:0x9a9a9a,m:0x5a8aff,r:0xe8c040,l:0xff8a2e,s:0x3ee07a};
function gearCol(it,base,k){if(!it)return base;const c=it.anc===2?0xff3a3a:RARC[it.r]||0x9a9a9a;const t=k!=null?k*(it.r==='s'?0.6:1):(it.r==='c'?0.08:it.r==='m'?0.25:it.r==='s'?0.22:0.38);const a=new THREE.Color(base);a.lerp(new THREE.Color(c),t);return a.getHex()}
const glowOf=it=>it&&(it.r==='l'||it.r==='s')?(it.anc===2?0x661010:it.r==='s'?0x0a4a1a:0x5a2200):0;
const DEMO_EQ={paladin:{tete:{r:'r'},epaules:{r:'l'},torse:{r:'r'},mains:{r:'m'},arme:{r:'l',base:'epee'},offhand:{r:'r',base:'bouclier'},pieds:{r:'m'},jambes:{r:'r'},taille:{r:'r'}},
  traqueuse:{tete:{r:'r'},epaules:{r:'m'},torse:{r:'r'},mains:{r:'r'},arme:{r:'l',base:'arbalete'},offhand:{r:'r',base:'carquois'},pieds:{r:'r'},jambes:{r:'m'},taille:{r:'r'}},
  shaman:{tete:{r:'l'},epaules:{r:'r'},torse:{r:'m'},mains:{r:'r'},arme:{r:'r',base:'baton'},offhand:{r:'l',base:'fetiche'},pieds:{r:'m'},jambes:{r:'r'},taille:{r:'r'}}};
function weaponMesh(base,it,M){
  const g=new THREE.Group();const blade=gearCol(it,0xd8dce8,0.35),em=glowOf(it),wood=0x5a3a20,metal=gearCol(it,0x8a8a94,0.3);
  const B=(w,h,d,c,x,y,z,e)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,e));m.position.set(x,y,z);g.add(m);return m};
  const C=(rt,rb,h,c,x,y,z,e,seg)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||6),M(c,e));m.position.set(x,y,z);g.add(m);return m};
  switch(base){
    case 'epee':B(0.09,1.25,0.17,blade,0,0.85,0,em);B(0.42,0.07,0.12,metal,0,0.22,0);C(0.04,0.04,0.28,wood,0,0.05,0);C(0.07,0.07,0.07,metal,0,-0.12,0);break;
    case 'fleau':C(0.04,0.04,0.7,wood,0,0.2,0);B(0.03,0.25,0.03,metal,0,0.66,0);{const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(0.18,0),M(metal,em));ball.position.y=0.9;g.add(ball);for(let i=0;i<6;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.14,4),M(blade,em));const a=i/6*6.28;s.position.set(Math.cos(a)*0.17,0.9,Math.sin(a)*0.17);s.rotation.z=-Math.cos(a)*1.57;s.rotation.x=Math.sin(a)*1.57;g.add(s)}}break;
    case 'masse':C(0.04,0.04,0.8,wood,0,0.25,0);for(let i=0;i<6;i++){const f=B(0.05,0.3,0.16,metal,0,0.75,0,em);f.rotation.y=i/6*3.14;f.position.x=0}C(0.1,0.1,0.3,blade,0,0.75,0,em);break;
    case 'arbalete':B(0.1,0.1,0.75,wood,0,0,-0.25);{const bw=B(0.85,0.06,0.09,metal,0,0,-0.55,em);B(0.8,0.015,0.015,0xdddddd,0,0,-0.48);B(0.05,0.05,0.4,blade,0,0.07,-0.45,em)}g.rotation.x=-Math.PI/2;break;
    case 'dague':B(0.07,0.55,0.13,blade,0,0.45,0,em);B(0.26,0.05,0.1,metal,0,0.16,0);C(0.035,0.035,0.2,wood,0,0.03,0);break;
    case 'baton':C(0.045,0.05,1.9,wood,0,0.55,0);{const top=new THREE.Mesh(new THREE.SphereGeometry(0.16,7,5),M(gearCol(it,0xe8dcc0,0.3),em||0x223311));top.position.y=1.55;g.add(top);for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.4,4),M([0xc83a2a,0x2a8a5a,0xd8b040][i]));f.position.set((i-1)*0.08,1.4,0.05);f.rotation.z=(i-1)*0.5+Math.PI;g.add(f)}}break;
  }
  return g;
}
function heroModel(cls,ghost,eq){
  const g=new THREE.Group();eq=eq||DEMO_EQ[cls]||{};
  const mats={};const M=(c,em)=>{const k=c+'_'+(em||0);if(!mats[k]){mats[k]=new THREE.MeshLambertMaterial({color:c,emissive:em||0,flatShading:true});mats[k].userData.em=em||0}return mats[k]};
  const add=(...m)=>m.forEach(x=>g.add(x));
  const pal={paladin:{b:0xc8c0b0,t:0xb8a070,s:0xe8c4a0,cape:0xa8282a,leg:0x6a6058,hair:0x6a4a2a},traqueuse:{b:0x3a2e44,t:0x2e2636,s:0xd8b498,cape:0x5a1a22,leg:0x2a2228,hair:0x1a1012},
    shaman:{b:0x4a6a3a,t:0x8a7a5a,s:0x6a8a5a,cape:0x3a2a1a,leg:0x3a3a2a,hair:0x2a2a1a},moine:{b:0xd8a040,t:0xb84a2a,s:0xd8b498,cape:0xd88a2a,leg:0x6a4a2a,hair:0x2a1a0a},necro:{b:0x2a2a2a,t:0x5a5a5a,s:0xc8c8c8,cape:0x1a1a1a,leg:0x2a2a2a,hair:0xd8d8d8}}[cls]||{b:0x888888,t:0x666666,s:0xccaa88,cape:0x444444,leg:0x444444,hair:0x333333};
  const torC=gearCol(eq.torse,pal.t),legC=gearCol(eq.jambes,pal.leg),bootC=gearCol(eq.pieds,0x3a2a1e),gloveC=gearCol(eq.mains,0x4a3a2a),beltC=gearCol(eq.taille,0x3a2a18);
  /* bassin, torse, ceinture */
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.4,0.62,8),M(gearCol(eq.torse,pal.b,0.15)));body.position.y=1.0;
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.34,0.62,8),M(torC,glowOf(eq.torse)));torso.position.y=1.48;body.add(torso);torso.position.y=0.48;
  const belt=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.1,8),M(beltC));belt.position.y=0.18;body.add(belt);
  const buckle=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.1,0.05),M(eq.taille?gearCol(eq.taille,0xd8b040,0.5):0x8a7a5a,glowOf(eq.taille)));buckle.position.set(0,0.18,-0.36);body.add(buckle);
  if(eq.torse&&eq.torse.r!=='c'){const plate=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.34,0.08),M(gearCol(eq.torse,0xb0b0b8,0.5),glowOf(eq.torse)));plate.position.set(0,0.5,-0.36);body.add(plate)}
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.27,10,8),M(pal.s));head.position.y=1.0;body.add(head);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,0.14,6),M(pal.s));neck.position.y=0.82;body.add(neck);
  /* jambes avec bottes */
  const mkLeg=x=>{const l=new THREE.Group();l.position.set(x,0.72,0);const th=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.42,0.22),M(legC,glowOf(eq.jambes)));th.position.y=-0.2;const bt=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.3,0.3),M(bootC,glowOf(eq.pieds)));bt.position.set(0,-0.56,-0.03);l.add(th,bt);return l};
  const legL=mkLeg(-0.15),legR=mkLeg(0.15);
  /* bras avec gants */
  const mkArm=x=>{const a=new THREE.Group();a.position.set(x,1.62,0);const sl=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.5,0.17),M(torC));sl.position.y=-0.22;const gl=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2),M(gloveC,glowOf(eq.mains)));gl.position.y=-0.52;a.add(sl,gl);return a};
  const armR=mkArm(0.52),armL=mkArm(-0.52);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(0.8,1.25),new THREE.MeshLambertMaterial({color:cls==='paladin'&&eq.torse?gearCol(eq.torse,pal.cape,0.2):pal.cape,side:THREE.DoubleSide}));cape.position.set(0,1.25,0.38);cape.rotation.x=0.18;
  add(body,legL,legR,armR,armL,cape);
  const HY=2.0;/* hauteur de la tête dans le repère du héros */
  const hb=new THREE.Group();hb.position.y=0;body.add(hb);const hm=(m,x,y,z)=>{m.position.set(x,y-1.0,z);hb.add(m);return m};
  /* tête : casque selon l'objet, sinon cheveux */
  const T=eq.tete;
  if(!T){hm(new THREE.Mesh(new THREE.SphereGeometry(0.29,8,6,0,6.28,0,1.5),M(pal.hair)),0,HY+0.04,0.03)}
  else if(cls==='paladin'){const c=gearCol(T,0xc8c8d0,0.4);hm(new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.32,0.44,8),M(c,glowOf(T))),0,HY+0.03,0);hm(new THREE.Mesh(new THREE.BoxGeometry(0.32,0.05,0.05),M(0x111111)),0,HY+0.03,-0.31);
    hm(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.26+(T.r==='l'||T.r==='s'?0.18:0),0.5),M(T.r==='c'?0x6a6a6a:0xc83a2a,glowOf(T))),0,HY+0.34,0);
    if(T.r==='l'||T.r==='s'){for(const s of [-1,1]){const w=hm(new THREE.Mesh(new THREE.ConeGeometry(0.06,0.4,4),M(c,glowOf(T))),s*0.3,HY+0.25,0);w.rotation.z=-s*0.7}}}
  else if(cls==='traqueuse'){const c=gearCol(T,0x2a2232,0.35);hm(new THREE.Mesh(new THREE.ConeGeometry(0.37,0.72,8),M(c,glowOf(T))),0,HY+0.15,0.03);hm(new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.16,8),M(0x5a1a22)),0,HY-0.2,0);
    hm(new THREE.Mesh(new THREE.BoxGeometry(0.34,0.12,0.04),M(0x111111)),0,HY,-0.27);for(const s of [-1,1])hm(new THREE.Mesh(new THREE.BoxGeometry(0.07,0.04,0.02),new THREE.MeshBasicMaterial({color:0xff4a3a})),s*0.08,HY+0.01,-0.3)}
  else{const c=gearCol(T,0xe8dcc0,0.3);hm(new THREE.Mesh(new THREE.BoxGeometry(0.48,0.58,0.12),M(c,glowOf(T))),0,HY,-0.24);for(const s of [-1,1])hm(new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,0.02),new THREE.MeshBasicMaterial({color:0x9cff6a})),s*0.1,HY+0.05,-0.31);
    const nF={c:3,m:4,r:5,l:7,s:7}[T.r]||4;for(let i=0;i<nF;i++){const f=hm(new THREE.Mesh(new THREE.ConeGeometry(0.05,0.55,4),M([0xc83a2a,0x2a8a5a,0xd8b040][i%3])),(i-(nF-1)/2)*0.1,HY+0.42,-0.1);f.rotation.z=(i-(nF-1)/2)*0.22}}
  /* épaules */
  const E=eq.epaules;if(E){const sz={c:0.17,m:0.19,r:0.21,l:0.25,s:0.25}[E.r]||0.2;const c=gearCol(E,cls==='paladin'?0xc0b080:cls==='shaman'?0xd8ccb0:0x3a3040,0.45);
    for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.SphereGeometry(sz,7,5,0,6.28,0,1.6),M(c,glowOf(E)));p.position.set(s*0.5,0.66,0);p.scale.set(1.2,1,1.1);body.add(p);
      if(E.r==='l'||E.r==='s'||cls==='shaman'){const sp=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.3,4),M(cls==='shaman'?0xe8dcc0:c,glowOf(E)));sp.position.set(s*0.56,0.86,0);sp.rotation.z=-s*0.4;body.add(sp)}}}
  /* arme */
  const W=eq.arme,wb=W&&W.base||CLS[cls]&&CLS[cls].weapons&&CLS[cls].weapons[0]||'epee';
  const wm=weaponMesh(wb,W,M);if(wb==='arbalete'){wm.rotation.x=0;wm.position.set(0,-0.55,-0.05)}else{wm.rotation.x=-Math.PI/2;wm.position.set(0,-0.55,-0.05)}armR.add(wm);
  if(cls==='traqueuse'&&wb==='arbalete'){const w2=weaponMesh('arbalete',W,M);w2.position.set(0,-0.55,-0.05);armL.add(w2)}
  /* main gauche */
  const O=eq.offhand,ob=O&&O.base||(cls==='paladin'?'bouclier':null);
  if(ob==='bouclier'){const c=gearCol(O,0xb89a50,0.5);const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.1,O&&O.r==='c'?6:8),M(c,glowOf(O)));sh.rotation.z=Math.PI/2;sh.position.set(-0.12,-0.42,-0.1);armL.add(sh);
    const bo=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),M(0xfff0b0,glowOf(O)||0x332200));bo.position.set(-0.19,-0.42,-0.1);armL.add(bo);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.04,4,12),M(gearCol(O,0x8a6a2a,0.7)));rim.rotation.y=Math.PI/2;rim.position.set(-0.18,-0.42,-0.1);armL.add(rim)}
  else if(ob==='carquois'){const q=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,0.7,6),M(gearCol(O,0x5a3a20,0.4),glowOf(O)));q.position.set(0.18,1.55,0.3);q.rotation.z=0.4;g.add(q);
    for(let i=0;i<4;i++){const a=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.12,3),M(gearCol(O,0xd8d8d8,0.6),glowOf(O)));a.position.set(0.3+i*0.03,1.95+i*0.02,0.3+(i%2)*0.05);g.add(a)}}
  else if(ob==='fetiche'){const f=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.32,0.12),M(gearCol(O,0x8a6a3a,0.45),glowOf(O)));f.position.set(0,-0.72,-0.05);armL.add(f);
    const sk=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,4),M(0xe8dcc0,glowOf(O)));sk.position.set(0,-0.5,-0.05);armL.add(sk)}
  /* halo de set */
  let setN=0;const cnt={};for(const k in eq){const it=eq[k];if(it&&it.set){cnt[it.set]=(cnt[it.set]||0)+1;setN=Math.max(setN,cnt[it.set])}}
  if(setN>=2){const r=new THREE.Mesh(new THREE.RingGeometry(0.7,0.9,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x3ee07a,transparent:true,opacity:setN>=6?0.75:setN>=4?0.5:0.3,blending:THREE.AdditiveBlending,depthWrite:false}));r.position.y=0.09;g.add(r);g.userData.halo=r;
    if(setN>=6){const r2=r.clone();r2.scale.setScalar(1.3);r2.material=r.material.clone();r2.material.opacity=0.35;g.add(r2)}}
  const sh=blob(0.6);g.add(sh);
  g.userData=Object.assign(g.userData||{},{legL,legR,armR,armL,cape,body});
  if(ghost){g.traverse(o=>{if(o.material&&o!==sh){o.material=new THREE.MeshBasicMaterial({color:ghost,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false})}})}
  return g;
}
function heroSig(h){return h.cls+'|'+D.SLOTS.map(s=>{const it=h.equip[s.id];return it?it.id+it.r+(it.anc||0):'-'}).join(',')}
function animHero(g,t,moving,swing,dt){
  const u=g.userData;const s=moving?Math.sin(t*11)*0.55:0;u.legL.rotation.x=s;u.legR.rotation.x=-s;
  u.cape.rotation.x=0.18+(moving?0.35:0)+Math.sin(t*3)*0.05;
  u.armR.rotation.x=swing>0?-1.3*Math.sin((1-swing/0.28)*Math.PI):(moving?-s*0.5:Math.sin(t*2)*0.04);u.armL.rotation.x=moving?s*0.5:0;
  u.body.position.y=1.0+(moving?Math.abs(Math.sin(t*11))*0.05:Math.sin(t*2)*0.02);
  if(u.halo)u.halo.rotation.y+=dt*0.8;
}
function blob(r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,14),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0.3,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=0.06;return m}

/* --- invocations --- */
const unitGeoCache={};
function unitMesh(u,elColor){
  const U=D.UNITS[u];if(U.model==='hero'){return heroModel(hero().cls,U.color,hero().equip)}
  const key=u+'_'+(elColor||0);let g=unitGeoCache[key];const c=elColor||U.color;
  if(!g){const p=[];
    if(U.model==='lancier'){p.push(P_(GB.box,0,1.0,0,c,0,0,0,0.5,0.8,0.35),P_(GB.sph,0,1.6,0,0xfff6d8,0,0,0,0.4,0.4,0.4),P_(GB.cone,0,0.45,0,shade(c,0.8),0,0,0,0.7,0.9,0.7),P_(GB.cyl,0.35,1.2,-0.3,0xfff0c0,0.4,0,0,0.05,2.2,0.05),P_(GB.cone4,0.35,2.15,-0.75,0xffffff,0.4,0,0,0.12,0.4,0.12))}
    else if(U.model==='fauve'){p.push(P_(GB.box,0,0.6,0,c,0,0,0,0.6,0.55,1.1),P_(GB.box,0,0.8,-0.7,shade(c,0.8),0,0,0,0.45,0.4,0.5),P_(GB.cone4,-0.15,1.05,-0.65,shade(c,0.7),0,0,0,0.1,0.25,0.1),P_(GB.cone4,0.15,1.05,-0.65,shade(c,0.7),0,0,0,0.1,0.25,0.1));for(let i=0;i<4;i++)p.push(P_(GB.box,i<2?-0.22:0.22,0.18,i%2?0.35:-0.35,shade(c,0.7),0,0,0,0.13,0.36,0.13));p.push(P_(GB.box,-0.1,0.86,-0.96,0xffd040,0,0,0,0.07,0.07,0.04),P_(GB.box,0.1,0.86,-0.96,0xffd040,0,0,0,0.07,0.07,0.04))}
    else if(U.model==='corbeau'){p.push(P_(GB.sph,0,0,0,c,0,0,0,0.4,0.35,0.6),P_(GB.box,-0.45,0,0,shade(c,0.8),0,0,0.2,0.7,0.04,0.35),P_(GB.box,0.45,0,0,shade(c,0.8),0,0,-0.2,0.7,0.04,0.35),P_(GB.cone4,0,0.05,-0.4,0xffd040,-1.57,0,0,0.08,0.2,0.08))}
    else if(U.model==='gardien'){p.push(P_(GB.ico,0,0.45,0,c,0,0,0,0.65,0.6,0.75),P_(GB.box,0,0.55,-0.4,shade(c,0.85),0,0,0,0.35,0.3,0.35),P_(GB.box,-0.08,0.6,-0.58,0x9cff6a,0,0,0,0.06,0.06,0.03),P_(GB.box,0.08,0.6,-0.58,0x9cff6a,0,0,0,0.06,0.06,0.03));for(let i=0;i<4;i++)p.push(P_(GB.box,i<2?-0.2:0.2,0.12,i%2?0.22:-0.22,shade(c,0.7),0,0,0,0.1,0.25,0.1))}
    else if(U.model==='colosse'){const m=Object.assign({},D.MONSTERS.brute,{color:c,eye:0x9cff6a,horns:1});return new THREE.Mesh(monsterGeo(m,'colosse_'+c),vcMat())}
    else if(U.model==='esprit'){p.push(P_(GB.sph,0,0,0,c,0,0,0,0.45,0.45,0.45),P_(GB.cone,0,0,0.4,c,1.57,0,0,0.3,0.7,0.3))}
    g=unitGeoCache[key]=merge(p);g.userData.keep=1}
  const mat=U.ghost||U.model==='esprit'?new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false}):vcMat();
  if(U.model==='lancier'){mat.emissive&&mat.emissive.setHex(0x332200)}
  return new THREE.Mesh(g,mat);
}

/* --- ombres instanciées (1 draw call pour toutes les créatures) --- */
const SHADOW_MAX=160;
const shadowIM=new THREE.InstancedMesh(new THREE.CircleGeometry(0.5,12).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0.32,depthWrite:false}),SHADOW_MAX);
shadowIM.frustumCulled=false;let shadowN=0;
function shadowAt(x,z,r){if(shadowN>=SHADOW_MAX)return;_m4.makeScale(r*2,1,r*2);_m4.setPosition(x,H(x,z)+0.07,z);shadowIM.setMatrixAt(shadowN++,_m4)}

/* --- matériaux partagés --- */
const MATS={};
function addMat(c,op){const k='a'+c+'_'+(op||1);if(!MATS[k]){MATS[k]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op||1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});MATS[k].userData.keep=1}return MATS[k]}
function basicMat(c,op){const k='b'+c+'_'+(op||1);if(!MATS[k]){MATS[k]=new THREE.MeshBasicMaterial({color:c,transparent:op<1,opacity:op||1,depthWrite:op<1?false:true});MATS[k].userData.keep=1}return MATS[k]}

/* --- effets --- */
const fx=[];
function addFx(o,life,upd){scene.add(o);fx.push({o,t:0,life,upd});if(fx.length>90){const f=fx.shift();scene.remove(f.o);if(f.own)f.o.geometry.dispose()}return o}
/* réservoir unique de particules (1 appel de dessin) */
const PMAX=1400,pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*3),pBase=new Float32Array(PMAX*3),pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMax=new Float32Array(PMAX),pGrav=new Float32Array(PMAX);let pHead=0;
for(let i=0;i<PMAX;i++)pPos[i*3+1]=-999;
const dotTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.35,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c)})();
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const partPts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.42,map:dotTex,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));partPts.frustumCulled=false;scene.add(partPts);
function emit(x,y,z,vx,vy,vz,color,life,grav){const i=pHead;pHead=(pHead+1)%PMAX;pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z;pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz;_c.set(color);pBase[i*3]=_c.r;pBase[i*3+1]=_c.g;pBase[i*3+2]=_c.b;pLife[i]=pMax[i]=life;pGrav[i]=grav==null?9:grav}
function updateParticles(dt){for(let i=0;i<PMAX;i++){if(pLife[i]<=0)continue;pLife[i]-=dt;if(pLife[i]<=0){pPos[i*3+1]=-999;pCol[i*3]=pCol[i*3+1]=pCol[i*3+2]=0;continue}
  pVel[i*3+1]-=pGrav[i]*dt;pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;const k=pLife[i]/pMax[i];pCol[i*3]=pBase[i*3]*k;pCol[i*3+1]=pBase[i*3+1]*k;pCol[i*3+2]=pBase[i*3+2]*k}
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true}
function burst(x,y,z,color,n,sp,life){n=Math.max(3,Math.round(n*Q().part));life=life||0.6;for(let i=0;i<n;i++)emit(x,y,z,rnd(-1,1)*sp,rnd(0.4,1.5)*sp,rnd(-1,1)*sp,color,life*rnd(0.6,1.1))}
function sparks(x,y,z,color,n,sp){n=Math.max(2,Math.round(n*Q().part));for(let i=0;i<n;i++){const a=rnd(0,6.28);emit(x,y,z,Math.cos(a)*sp*rnd(0.5,1.2),rnd(0.2,0.9)*sp,Math.sin(a)*sp*rnd(0.5,1.2),color,rnd(0.15,0.35),4)}}
function fountain(x,z,color,n,h){n=Math.round(n*Q().part);for(let i=0;i<n;i++){const a=rnd(0,6.28),r=rnd(0,1.2);emit(x+Math.cos(a)*r,H(x,z)+0.2,z+Math.sin(a)*r,0,rnd(2,h||7),0,color,rnd(0.6,1.2),-1)}}
/* lumières ponctuelles temporaires (3 au maximum, réutilisées) */
const FLASHL=[0,1,2].map(()=>{const l=new THREE.PointLight(0xffffff,0,12);scene.add(l);return{l,t:0,life:1,i:0}});
function flashLight(x,y,z,color,inten,life,range){const f=FLASHL.reduce((a,b)=>a.t<b.t?a:b);f.l.color.setHex(color);f.l.position.set(x,y,z);f.l.distance=range||12;f.i=inten;f.life=life;f.t=life}
function updateFlashLights(dt){for(const f of FLASHL){if(f.t>0){f.t-=dt;f.l.intensity=f.i*Math.max(0,f.t/f.life)}else f.l.intensity=0}}
const ringGeo=new THREE.RingGeometry(0.8,1,40).rotateX(-Math.PI/2);ringGeo.userData.keep=1;
function ringFx(x,z,r,color,life,y){const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,H(x,z)+(y||0.25),z);addFx(m,life,(o,t)=>{const k=t/life;o.scale.setScalar(0.2+k*r);o.material.opacity=(1-k)*0.9})}
const discGeo=new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2);discGeo.userData.keep=1;
function flashDisc(x,z,r,color,life){const m=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(x,H(x,z)+0.2,z);m.scale.setScalar(r);
  addFx(m,life,(o,t)=>{o.material.opacity=0.6*(1-t/life)})}
function boltFx(pts,color,life){life=life||0.25;const g=new THREE.BufferGeometry().setFromPoints(pts);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:color||0xbfe4ff,transparent:true,blending:THREE.AdditiveBlending}));
  addFx(l,life,(o,t)=>{o.material.opacity=1-t/life});fx[fx.length-1].own=1}
function jag(a,b){const pts=[a];for(let i=1;i<6;i++){const t=i/6;pts.push(new THREE.Vector3(lerp(a.x,b.x,t)+rnd(-0.4,0.4),lerp(a.y,b.y,t)+rnd(-0.3,0.3),lerp(a.z,b.z,t)+rnd(-0.4,0.4)))}pts.push(b);return pts}
const pillarGeo=new THREE.CylinderGeometry(1,1,1,16,1,true);pillarGeo.userData.keep=1;
function pillar(x,z,r,h,color,life){const m=new THREE.Mesh(pillarGeo,new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,H(x,z)+h/2,z);m.scale.set(r,h,r);addFx(m,life,(o,t)=>{const k=t/life;o.material.opacity=0.7*(1-k);o.scale.x=o.scale.z=r*(1-k*0.6)})}
const arcGeo=new THREE.RingGeometry(1.2,2.6,20,1,-0.9,1.8).rotateX(-Math.PI/2);arcGeo.userData.keep=1;
function slashFx(x,z,ang,color,scale){const m=new THREE.Mesh(arcGeo,new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,H(x,z)+1,z);m.rotation.y=ang+Math.PI/2;m.scale.setScalar(scale||1);addFx(m,0.22,(o,t)=>{o.material.opacity=0.85*(1-t/0.22);o.rotation.y+=0.12})}
let shake=0;

/* --- télégraphes (cercles rouges) --- */
const teleRing=new THREE.RingGeometry(0.93,1,40).rotateX(-Math.PI/2);teleRing.userData.keep=1;
const teleMatR=new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:0.95,depthWrite:false});
const teleMatF=new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:0.32,depthWrite:false});teleMatR.userData.keep=1;teleMatF.userData.keep=1;
/* ================= Cartes : extérieur, donjon, ville ================= */
let MAP=null;
const worldGroup=new THREE.Group();scene.add(worldGroup);scene.add(shadowIM);
function clearWorld(){
  worldGroup.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose();if(o.material&&o.material.dispose&&!(o.material.userData&&o.material.userData.keep))o.material.dispose()});
  while(worldGroup.children.length)worldGroup.remove(worldGroup.children[0]);
}
function walkable(x,z){if(!MAP)return false;const N=MAP.N,ix=Math.floor(x+N/2),iz=Math.floor(z+N/2);if(ix<1||iz<1||ix>=N-1||iz>=N-1)return false;return MAP.walk[iz*N+ix]===1}
function makeH(N,hg){return(x,z)=>{const fx=clamp(x+N/2,0,N-0.001),fz=clamp(z+N/2,0,N-0.001),ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz,W=N+1;
  const a=hg[iz*W+ix],b=hg[iz*W+ix+1],c=hg[(iz+1)*W+ix],d=hg[(iz+1)*W+ix+1];return lerp(lerp(a,b,tx),lerp(c,d,tx),tz)}}
function noise2(x,z,s){return Math.sin(x*0.07+s)*1.2+Math.cos(z*0.06+s*1.3)*1.1+Math.sin((x+z)*0.13+s*2)*0.5+Math.cos(x*0.19-z*0.15+s)*0.3}

/* --- extérieur : un chemin sinueux du sud au nord, des clairières, des falaises boisées --- */
function genOutdoor(seed,N,themeId){
  const rr=mulberry(seed),T=D.THEMES[themeId];
  const ctrl=[];const K=7;for(let i=0;i<K;i++){const t=i/(K-1);ctrl.push(new THREE.Vector3(i===0||i===K-1?(rr()-0.5)*10:(rr()-0.5)*N*0.55,0,N/2-12-t*(N-24)))}
  const curve=new THREE.CatmullRomCurve3(ctrl);const path=curve.getSpacedPoints(160);
  /* branches latérales (clairières) */
  const blobs=[];for(let i=0;i<9;i++){const p=path[Math.floor((0.1+0.8*rr())*160)];const a=rr()*6.28,dd=8+rr()*12;blobs.push({x:clamp(p.x+Math.cos(a)*dd,-N/2+12,N/2-12),z:clamp(p.z+Math.sin(a)*dd,-N/2+12,N/2-12),r:6+rr()*6})}
  const walk=new Uint8Array(N*N),ex=new Float32Array((N+1)*(N+1));
  const W=N+1;
  for(let iz=0;iz<=N;iz++)for(let ix=0;ix<=N;ix++){const x=ix-N/2,z=iz-N/2;let d=1e9;
    for(let k=0;k<path.length;k+=2){const p=path[k];const dd=(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z);if(dd<d)d=dd}
    d=Math.sqrt(d);const w=9.5+Math.sin(z*0.08+seed)*2.5+Math.cos(x*0.05)*1.5;let e=d-w;
    for(const b of blobs){const db=Math.hypot(b.x-x,b.z-z)-b.r;if(db<e)e=db}
    if(Math.max(Math.abs(x),Math.abs(z))>N/2-6)e=Math.max(e,4);
    ex[iz*W+ix]=e}
  for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){const e=(ex[iz*W+ix]+ex[iz*W+ix+1]+ex[(iz+1)*W+ix]+ex[(iz+1)*W+ix+1])/4;walk[iz*N+ix]=e<0?1:0}
  const hg=new Float32Array(W*W);for(let i=0;i<W*W;i++){const ix=i%W,iz=(i/W)|0,x=ix-N/2,z=iz-N/2;const e=ex[i];hg[i]=noise2(x,z,seed)*0.35+(e>0?Math.pow(Math.min(e,8),1.3)*0.55:0)}
  return{N,walk,hg,ex,path,blobs,T,start:{x:path[0].x,z:path[0].z},end:{x:path[159].x,z:path[159].z},posAt:f=>{const p=path[clamp(Math.round(f*159),0,159)];return{x:p.x,z:p.z}}};
}
/* --- donjon : salles reliées par des couloirs --- */
function genDungeon(seed,N){
  const rr=mulberry(seed);const walk=new Uint8Array(N*N);const rooms=[];
  const carve=(x0,z0,x1,z1)=>{x0=Math.round(x0);z0=Math.round(z0);x1=Math.round(x1);z1=Math.round(z1);for(let z=Math.max(2,Math.min(z0,z1));z<=Math.min(N-3,Math.max(z0,z1));z++)for(let x=Math.max(2,Math.min(x0,x1));x<=Math.min(N-3,Math.max(x0,x1));x++)walk[z*N+x]=1};
  let cx=N/2,cz=N-14;const nR=10;
  for(let i=0;i<nR;i++){const w=i===nR-1?20:10+Math.floor(rr()*8),h=i===nR-1?20:10+Math.floor(rr()*8);
    const x0=clamp(Math.round(cx-w/2),3,N-w-3),z0=clamp(Math.round(cz-h/2),3,N-h-3);carve(x0,z0,x0+w,z0+h);const r={x:x0+w/2,z:z0+h/2,w,h};
    if(rooms.length){const p=rooms[rooms.length-1];const hw=2;if(rr()<0.5){carve(p.x-hw,p.z,p.x+hw,r.z);carve(Math.min(p.x,r.x),r.z-hw,Math.max(p.x,r.x),r.z+hw)}else{carve(Math.min(p.x,r.x),p.z-hw,Math.max(p.x,r.x),p.z+hw);carve(r.x-hw,Math.min(p.z,r.z),r.x+hw,Math.max(p.z,r.z))}}
    rooms.push(r);
    /* salle annexe */
    if(i>0&&i<nR-1&&rr()<0.6){const sx=clamp(Math.round(r.x+(rr()<0.5?-1:1)*(14+rr()*6)),8,N-8),sz=clamp(Math.round(r.z+(rr()-0.5)*8),8,N-8);carve(sx-5,sz-5,sx+5,sz+5);carve(Math.min(sx,r.x),sz-2,Math.max(sx,r.x),sz+2);rooms.push(Object.assign({x:sx,z:sz,w:10,h:10,side:1}))}
    const ang=-Math.PI/2+(rr()-0.5)*1.6;cx=clamp(cx+Math.cos(ang)*22,16,N-16);cz=clamp(cz+Math.sin(ang)*20,16,N-16);
    if(cz<20){cz=20+rr()*10;cx=clamp(cx+(cx<N/2?25:-25),16,N-16)}
  }
  const W=N+1,hg=new Float32Array(W*W);
  const main=rooms.filter(r=>!r.side);const toW=r=>({x:r.x-N/2,z:r.z-N/2});
  /* chemin praticable : largeur d'abord sur la grille, de la première à la dernière salle */
  const path=[];{const s0=Math.round(main[0].z)*N+Math.round(main[0].x),t0=Math.round(main[main.length-1].z)*N+Math.round(main[main.length-1].x);const prev=new Int32Array(N*N).fill(-1),q=new Int32Array(N*N);let h=0,e=0;prev[s0]=s0;q[e++]=s0;
    while(h<e){const c=q[h++];if(c===t0)break;for(const o of [1,-1,N,-N]){const n=c+o;if(n>=0&&n<N*N&&walk[n]&&prev[n]<0){prev[n]=c;q[e++]=n}}}
    const cells=[];let c=t0;if(prev[t0]>=0){while(c!==s0){cells.push(c);c=prev[c]}cells.push(s0);cells.reverse()}
    for(let i=0;i<cells.length;i+=2)path.push({x:(cells[i]%N)-N/2+0.5,z:((cells[i]/N)|0)-N/2+0.5});if(!path.length)path.push(toW(main[0]),toW(main[main.length-1]))}
  return{N,walk,hg,rooms:rooms.map(r=>Object.assign({},r,toW(r))),path,start:toW(main[0]),end:toW(main[main.length-1]),dungeon:1,
    posAt:f=>{const p=path[clamp(Math.round(f*(path.length-1)),0,path.length-1)];return{x:p.x,z:p.z}}};
}
/* --- ville --- */
const TOWN_STREAM=29;
function genTown(){
  const N=84,walk=new Uint8Array(N*N),W=N+1,hg=new Float32Array(W*W);
  for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){const x=ix-N/2+0.5,z=iz-N/2+0.5;const d=Math.hypot(x,z);
    walk[iz*N+ix]=(d<25&&d>2.4)||(Math.abs(x)<2.3&&z>20&&z<34)?1:0}
  for(let i=0;i<W*W;i++){const x=i%W-N/2,z=((i/W)|0)-N/2;const d=Math.hypot(x,z);let h=d>27?Math.min(1.2,(d-27)*0.15):0;
    if(Math.abs(z-TOWN_STREAM)<1.6)h=Math.abs(x)<2.6?0.12:-0.9;hg[i]=h}
  return{N,walk,hg,start:{x:0,z:9},end:{x:0,z:-20},path:[{x:0,z:9}],posAt:()=>({x:0,z:9}),town:1};
}

/* --- textures de sol procédurales (canvas générés une fois, en niveaux de gris : la couleur vient des sommets) --- */
const TEXC={};
function groundTex(kind){
  if(TEXC[kind])return TEXC[kind];const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const r=mulberry(kind.length*977+13);
  const g=v=>{v=clamp(v,0,255)|0;return 'rgb('+v+','+v+','+v+')'};
  const noise=(n,a,b,sz)=>{for(let i=0;i<n;i++){x.fillStyle=g(a+r()*(b-a));const s=sz*(0.4+r());x.globalAlpha=0.35+r()*0.4;x.beginPath();x.arc(r()*S,r()*S,s,0,6.28);x.fill()}x.globalAlpha=1};
  x.fillStyle=g(205);x.fillRect(0,0,S,S);
  if(kind==='grass'){noise(260,160,240,7);x.lineWidth=1.4;for(let i=0;i<1600;i++){const px=r()*S,py=r()*S;x.strokeStyle=g(150+r()*110);x.beginPath();x.moveTo(px,py);x.lineTo(px+(r()-0.5)*4,py-3-r()*6);x.stroke()}}
  else if(kind==='dirt'){noise(320,150,230,10);for(let i=0;i<500;i++){x.fillStyle=g(110+r()*80);x.fillRect(r()*S,r()*S,2,2)}}
  else if(kind==='sand'){noise(200,190,240,12);x.strokeStyle=g(170);x.lineWidth=2;for(let k=0;k<9;k++){x.beginPath();for(let i=0;i<=S;i+=8){const y=k*30+Math.sin(i*0.05+k)*6;i?x.lineTo(i,y):x.moveTo(i,y)}x.stroke()}for(let i=0;i<900;i++){x.fillStyle=g(150+r()*100);x.fillRect(r()*S,r()*S,1.5,1.5)}}
  else if(kind==='cobble'||kind==='tiles'){x.fillStyle=g(95);x.fillRect(0,0,S,S);const n=kind==='tiles'?4:8,st=S/n;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const ox=(kind==='cobble'&&j%2?st/2:0),bx=i*st+ox+2+r()*2,by=j*st+2+r()*2,w=st-5-r()*3,h=st-5-r()*3;x.fillStyle=g(170+r()*60);
      if(kind==='cobble'){x.beginPath();const rr2=6;x.moveTo(bx+rr2,by);x.arcTo(bx+w,by,bx+w,by+h,rr2);x.arcTo(bx+w,by+h,bx,by+h,rr2);x.arcTo(bx,by+h,bx,by,rr2);x.arcTo(bx,by,bx+w,by,rr2);x.fill();if(bx+w>S){x.save();x.translate(-S,0);x.fill();x.restore()}}
      else{x.fillRect(bx,by,w,h);x.strokeStyle=g(120);x.lineWidth=1.5;if(r()<0.4){x.beginPath();x.moveTo(bx+r()*w,by);x.lineTo(bx+r()*w,by+h*0.6);x.lineTo(bx+r()*w,by+h);x.stroke()}}}
    noise(120,140,220,6)}
  else if(kind==='ash'){x.fillStyle=g(150);x.fillRect(0,0,S,S);noise(300,90,200,9);x.strokeStyle=g(60);x.lineWidth=1.6;for(let k=0;k<26;k++){let px=r()*S,py=r()*S;x.beginPath();x.moveTo(px,py);for(let i=0;i<6;i++){px+=(r()-0.5)*40;py+=(r()-0.5)*40;x.lineTo(px,py)}x.stroke()}}
  else if(kind==='ice'){x.fillStyle=g(225);x.fillRect(0,0,S,S);noise(140,200,255,14);x.strokeStyle=g(170);x.lineWidth=1;for(let k=0;k<30;k++){let px=r()*S,py=r()*S;x.beginPath();x.moveTo(px,py);for(let i=0;i<4;i++){px+=(r()-0.5)*60;py+=(r()-0.5)*60;x.lineTo(px,py)}x.stroke()}}
  else noise(300,160,240,8);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;return TEXC[kind]=t;
}
const THEME_TEX={ville:'cobble',landes:'grass',sylve:'grass',marais:'dirt',crypte:'tiles',r_cendres:'ash',r_givre:'ice',r_putride:'dirt',r_astrale:'tiles',r_sang:'ash'};
const texFor=(id,T)=>T.tex||THEME_TEX[id]||'dirt';
/* --- construction de la scène 3D d'une carte --- */
const PROPGEO={};
function propGeo(k,c1,c2){
  const key=k+c1+'_'+c2;if(PROPGEO[key])return PROPGEO[key];let p=[];
  if(k==='pine')p=[P_(GB.cyl,0,0.8,0,c2,0,0,0,0.35,1.6,0.35),P_(GB.cone,0,2.4,0,c1,0,0,0,2.4,2.6,2.4),P_(GB.cone,0,3.6,0,shade(c1,1.15),0,0,0,1.7,2,1.7)];
  else if(k==='dead')p=[P_(GB.cyl,0,1.3,0,c2,0,0,0.05,0.3,2.6,0.3),P_(GB.cyl,0.45,2.2,0,c2,0,0,-0.8,0.14,1.4,0.14),P_(GB.cyl,-0.4,2.5,0.1,c2,0.2,0,0.9,0.12,1.2,0.12),P_(GB.cyl,0.1,2.9,-0.35,c2,-0.8,0,0,0.1,1,0.1)];
  else if(k==='swamp')p=[P_(GB.cyl,0,1,0,c2,0,0,0,0.4,2,0.4),P_(GB.dode,0,2.6,0,c1,0,0,0,2.8,1.8,2.8),P_(GB.cone,0.8,1.6,0,shade(c1,0.8),0,0,0,0.5,1.8,0.5),P_(GB.cone,-0.8,1.6,0.3,shade(c1,0.8),0,0,0,0.5,1.8,0.5)];
  else if(k==='crystal')p=[P_(GB.oct,0,1.2,0,c1,0,0,0.1,0.9,2.6,0.9),P_(GB.oct,0.6,0.7,0.2,shade(c1,1.2),0,0,-0.5,0.5,1.4,0.5),P_(GB.oct,-0.5,0.6,-0.2,shade(c1,0.9),0,0,0.5,0.45,1.2,0.45)];
  else if(k==='rock')p=[P_(GB.dode,0,0.3,0,c1,0,0,0,1.6,1.1,1.4)];
  else if(k==='grave')p=[P_(GB.box,0,0.45,0,c1,0,0,0,0.6,0.9,0.18),P_(GB.box,0,0.05,0.35,shade(c2,0.8),0,0,0,0.7,0.1,0.8)];
  else if(k==='pillar')p=[P_(GB.box,0,1.5,0,c1,0,0,0,1,3,1),P_(GB.box,0,0.1,0,shade(c1,0.8),0,0,0,1.3,0.2,1.3),P_(GB.box,0,2.95,0,shade(c1,0.8),0,0,0,1.3,0.2,1.3)];
  else if(k==='torch')p=[P_(GB.cyl,0,0.8,0,0x3a2a1a,0,0,0,0.12,1.6,0.12),P_(GB.cone,0,1.75,0,0xffa040,0,0,0,0.3,0.5,0.3)];
  else if(k==='house')p=[P_(GB.box,0,1.6,0,c1,0,0,0,5,3.2,4),P_(GB.cone4,0,4.2,0,c2,0,0.785,0,5.4,2.2,5.4),P_(GB.box,0,0.9,-2.01,0x2a1a10,0,0,0,1,1.8,0.05),P_(GB.box,1.5,1.9,-2.01,0xffc070,0,0,0,0.6,0.6,0.05)];
  else if(k==='cactus')p=[P_(GB.cyl,0,1.3,0,c1,0,0,0,0.5,2.6,0.5),P_(GB.cyl,0.45,1.5,0,c1,0,0,0,0.3,0.9,0.3),P_(GB.cyl,0.3,1.1,0,c1,0,0,1.57,0.25,0.5,0.25),P_(GB.cyl,-0.4,1.9,0,c1,0,0,0,0.28,0.7,0.28),P_(GB.sph,0,2.6,0,shade(c1,1.1),0,0,0,0.5,0.3,0.5)];
  else if(k==='palm')p=[P_(GB.cyl,0.15,1.4,0,0x7a5a3a,0,0,-0.1,0.26,2.8,0.26)].concat([0,1,2,3,4,5].map(i=>P_(GB.box,0.3+Math.cos(i*1.05)*0.6,2.75,Math.sin(i*1.05)*0.6,c1,0,-i*1.05,-0.4,1.3,0.06,0.35)));
  else if(k==='bones')p=[P_(GB.cyl,0,0.1,0,c1,0,0,1.57,0.08,0.9,0.08),P_(GB.cyl,0.2,0.1,0.2,c1,0,1,1.57,0.08,0.7,0.08),P_(GB.sph,-0.3,0.15,0.1,c1,0,0,0,0.3,0.25,0.3)];
  const mg=merge(p);mg.userData.keep=1;return PROPGEO[key]=mg;
}
function townGeo(k){
  const key='T_'+k;if(PROPGEO[key])return PROPGEO[key];let p=[];const tim=0x3a2414,pl=0xd8ccb0,st=0x6e665c;
  if(k==='house'){p=[P_(GB.box,0,1.6,0,pl,0,0,0,5,3.2,4),P_(GB.box,0,0.18,0,0x5a5248,0,0,0,5.2,0.36,4.2)];
    for(const x of [-2.45,-0.8,0.8,2.45])for(const z of [-2.02,2.02])p.push(P_(GB.box,x,1.6,z,tim,0,0,0,0.22,3.2,0.08));
    for(const z of [-2.02,2.02])p.push(P_(GB.box,0,1.65,z,tim,0,0,0,5,0.2,0.08),P_(GB.box,0,3.15,z,tim,0,0,0,5,0.2,0.08),P_(GB.box,-1.62,2.4,z,tim,0,0,0.75,0.16,1.9,0.08),P_(GB.box,1.62,2.4,z,tim,0,0,-0.75,0.16,1.9,0.08));
    for(const x of [-2.52,2.52])p.push(P_(GB.box,x,1.6,0,tim,0,0,0,0.08,3.2,0.22));
    p.push(P_(GB.prism,0,4.5,0,0x7a2a1a,-Math.PI/2,0,Math.PI/2,2.75,5.8,2.75),P_(GB.box,1.6,5.0,0.8,0x5a4a40,0,0,0,0.6,1.8,0.6),
      P_(GB.box,0,0.95,-2.06,0x2a1a10,0,0,0,1.1,1.9,0.06),P_(GB.box,-1.6,2.2,-2.07,0xffd890,0,0,0,0.7,0.6,0.05),P_(GB.box,1.6,2.2,-2.07,0xffd890,0,0,0,0.7,0.6,0.05),P_(GB.box,0,2.4,-2.07,0xffd890,0,0,0,0.5,0.5,0.05))}
  else if(k==='stall'){p=[P_(GB.box,0,0.5,0,0x6a4a2a,0,0,0,2.4,1,1.1)];for(const x of [-1.1,1.1])for(const z of [-0.5,0.5])p.push(P_(GB.box,x,1.2,z,0x4a3018,0,0,0,0.1,2.4,0.1));
    for(let i=0;i<5;i++)p.push(P_(GB.box,-0.96+i*0.48,2.35,0,i%2?0xe8dcc0:0xa8282a,0.25,0,0,0.48,0.06,1.6));
    for(let i=0;i<5;i++)p.push(P_(GB.sph,-0.8+i*0.4,1.1,-0.1,[0xd8a040,0x9a3a2a,0x6a9a3a][i%3],0,0,0,0.3,0.3,0.3))}
  else if(k==='wall'){p=[P_(GB.box,0,1.8,0,st,0,0,0,4.4,3.6,1.2),P_(GB.box,0,3.62,0.5,shade(st,0.9),0,0,0,4.4,0.2,0.4)];for(let i=0;i<4;i++)p.push(P_(GB.box,-1.65+i*1.1,3.95,0.5,shade(st,1.1),0,0,0,0.6,0.6,0.4))}
  else if(k==='tower'){p=[P_(GB.cyl,0,2.6,0,st,0,0,0,3.2,5.2,3.2),P_(GB.cyl,0,5.3,0,shade(st,1.1),0,0,0,3.6,0.4,3.6),P_(GB.cone,0,6.9,0,0x5a2018,0,0,0,4,2.8,4),P_(GB.box,0,2.6,-1.55,0xffc070,0,0,0,0.5,0.8,0.1)]}
  else if(k==='brazier'){p=[P_(GB.cyl,0,0.5,0,0x3a3434,0,0,0,0.18,1,0.18),P_(GB.cyl,0,1.05,0,0x4a4440,0,0,0,1.1,0.3,1.1),P_(GB.cyl,0,0.05,0,0x3a3434,0,0,0,0.8,0.1,0.8)]}
  else if(k==='flame'){p=[P_(GB.cone,0,1.55,0,0xff8a2a,0,0,0,0.8,1.1,0.8),P_(GB.cone,0,1.5,0,0xffd060,0,0,0,0.45,0.7,0.45)]}
  else if(k==='barrel'){p=[P_(GB.cyl,0,0.5,0,0x6a4424,0,0,0,0.8,1,0.8),P_(GB.cyl,0,0.25,0,0x3a3434,0,0,0,0.84,0.08,0.84),P_(GB.cyl,0,0.75,0,0x3a3434,0,0,0,0.84,0.08,0.84)]}
  else if(k==='crate'){p=[P_(GB.box,0,0.45,0,0x8a6a3a,0,0,0,0.9,0.9,0.9),P_(GB.box,0,0.45,-0.46,0x5a4020,0,0,0.78,0.12,1.2,0.04)]}
  else if(k==='lamp'){p=[P_(GB.cyl,0,1.4,0,0x2a2a2e,0,0,0,0.12,2.8,0.12),P_(GB.box,0,2.9,0,0x2a2a2e,0,0,0,0.4,0.5,0.4),P_(GB.box,0,2.9,0,0xffd890,0,0,0,0.3,0.36,0.42)]}
  else if(k==='banner'){p=[P_(GB.cyl,0,2,0,0x3a2a1a,0,0,0,0.1,4,0.1),P_(GB.box,0.45,3.1,0,0xa8282a,0,0,0,0.8,1.6,0.05),P_(GB.box,0.45,3.1,-0.03,0xd8a040,0,0,0,0.3,0.3,0.03)]}
  else if(k==='bridge'){p=[P_(GB.box,0,0.12,0,0x6a4a2a,0,0,0,5,0.3,4)];for(const x of [-2.3,2.3]){p.push(P_(GB.box,x,0.7,0,0x4a3018,0,0,0,0.18,0.18,4));for(const z of [-1.8,0,1.8])p.push(P_(GB.box,x,0.4,z,0x4a3018,0,0,0,0.18,0.7,0.18))}}
  else if(k==='well'){p=[P_(GB.cyl,0,0.45,0,st,0,0,0,1.6,0.9,1.6),P_(GB.cyl,0,0.86,0,0x2a4a60,0,0,0,1.3,0.05,1.3),P_(GB.box,-0.7,1.3,0,0x4a3018,0,0,0,0.12,1.8,0.12),P_(GB.box,0.7,1.3,0,0x4a3018,0,0,0,0.12,1.8,0.12),P_(GB.prism,0,2.35,0,0x7a2a1a,-Math.PI/2,0,Math.PI/2,0.9,1.8,0.9)]}
  else if(k==='tree')p=[P_(GB.cyl,0,1,0,0x4a3020,0,0,0,0.35,2,0.35),P_(GB.ico,0,2.8,0,0x3a5a2a,0,0,0,2.6,2.4,2.6),P_(GB.ico,0.5,3.6,0.2,0x4a6a32,0,0,0,1.7,1.6,1.7)];
  const mg=merge(p);mg.userData.keep=1;return PROPGEO[key]=mg;
}
function instT(k,list,mat){if(!list.length)return;const g=townGeo(k);const im=new THREE.InstancedMesh(g,mat||vcMat(),list.length);
  list.forEach((t,i)=>{_m4.compose(_v.set(t.x,t.y||0,t.z),_q.setFromEuler(_e.set(0,t.ry||0,0)),_s.set(t.s||1,t.s||1,t.s||1));im.setMatrixAt(i,_m4)});worldGroup.add(im)}
function buildTownDecor(M,rr){
  const ring=(n,R,off,skip)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*6.283+(off||0);if(skip&&skip(a))continue;o.push({x:Math.cos(a)*R,z:Math.sin(a)*R,ry:-a-Math.PI/2,a})}return o};
  const south=a=>{const d=Math.abs(((a-Math.PI/2)%6.283+6.283)%6.283);return Math.min(d,6.283-d)<0.2};
  const houses=ring(12,30.5,0.26,a=>{const d=Math.abs(((a-Math.PI/2)%6.283+6.283)%6.283);return Math.min(d,6.283-d)<0.3});
  houses.forEach(h=>{h.y=H(h.x,h.z)-0.1;h.s=0.95+rr()*0.15});instT('house',houses);
  const walls=ring(56,37,0,a=>south(a)&&false).filter(w=>!(Math.abs(w.x)<4&&w.z>0));walls.forEach(w=>{w.y=H(w.x,w.z)-0.3});instT('wall',walls);
  const towers=ring(8,37,Math.PI/8).concat([{x:-4.5,z:37},{x:4.5,z:37}]);towers.forEach(t=>{t.y=H(t.x,t.z)-0.3;t.s=0.9});instT('tower',towers);
  const stalls=[[-9,-7,0.5],[9,-7,-0.5],[-11,5,1.2],[11,5,-1.2]].map(([x,z,ry])=>({x,z,ry}));instT('stall',stalls);stalls.forEach(s=>M.blockers.push({x:s.x,z:s.z,r:1.2}));
  const braz=ring(8,22.5,0.2).map(b=>({x:b.x,z:b.z}));braz.push({x:-3,z:22},{x:3,z:22},{x:-3,z:26.5},{x:3,z:26.5});instT('brazier',braz);instT('flame',braz,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false}));
  braz.forEach(b=>M.blockers.push({x:b.x,z:b.z,r:0.55}));M.braziers=braz;
  const lamps=ring(10,19.5,0).map(l=>({x:l.x,z:l.z}));instT('lamp',lamps);lamps.forEach(l=>M.blockers.push({x:l.x,z:l.z,r:0.3}));
  const deco=[],cr=[];for(const h of houses){const t=-h.a;for(let k=0;k<3;k++){const a=h.a+(rr()-0.5)*0.12,R=26.3+rr()*1.2;(rr()<0.5?deco:cr).push({x:Math.cos(a)*R,z:Math.sin(a)*R,ry:rr()*6,s:0.8+rr()*0.3})}}
  instT('barrel',deco);instT('crate',cr);
  instT('banner',ring(6,24.5,0.5).map(b=>({x:b.x,z:b.z,ry:b.ry})));
  instT('well',[{x:-7,z:12}]);M.blockers.push({x:-7,z:12,r:1.1});
  instT('bridge',[{x:0,z:TOWN_STREAM,y:0}]);
  const trees=[];for(let i=0;i<40;i++){const a=rr()*6.283,R=40+rr()*3;trees.push({x:Math.cos(a)*R,z:Math.sin(a)*R,y:H(Math.cos(a)*R,Math.sin(a)*R),ry:rr()*6,s:0.8+rr()*0.5})}instT('tree',trees);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(M.N,3.2).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x2a5a78,transparent:true,opacity:0.8,emissive:0x0a1a2a}));water.position.set(0,-0.35,TOWN_STREAM);worldGroup.add(water);M.water=water;
}
function instProps(geoKey,c1,c2,list,mat){
  if(!list.length)return;const g=propGeo(geoKey,c1,c2);const im=new THREE.InstancedMesh(g,mat||vcMat(),list.length);im.userData.shared=1;
  list.forEach((t,i)=>{_m4.compose(_v.set(t.x,t.y,t.z),_q.setFromEuler(_e.set(0,t.ry||0,0)),_s.set(t.s,t.s*(t.sy||1),t.s));im.setMatrixAt(i,_m4)});worldGroup.add(im);
}
function buildTerrain(M,T){
  const N=M.N,seg=M.town?64:Math.round(N/1.25);const g=new THREE.PlaneGeometry(N,N,seg,seg);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,col=new Float32Array(p.count*3);const cA=new THREE.Color(T.ground[0]),cB=new THREE.Color(T.ground[1]),cP=new THREE.Color(T.path||T.ground[0]),cW=new THREE.Color(T.wall||0x2a2a2a),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const y=H(x,z);p.setY(i,y);
    c.copy(cA).lerp(cB,(Math.sin(x*0.21)*Math.cos(z*0.17)+1)/2);
    if(M.dungeon){const w=walkable(x,z)||walkable(x+0.6,z)||walkable(x-0.6,z)||walkable(x,z+0.6)||walkable(x,z-0.6);if(!w)c.setHex(0x050405);else if(((Math.floor(x/2)+Math.floor(z/2))&1))c.multiplyScalar(0.88)}
    else if(M.town){const d=Math.hypot(x,z);if(d>25.5&&!(Math.abs(x)<2.6&&z>20))c.set(d>27?0x4a5a32:0x5a5040);if(d<5)c.multiplyScalar(0.85);if(Math.abs(z-TOWN_STREAM)<1.7&&Math.abs(x)>2.6)c.set(0x3a3428)}
    else{let dp=1e9;for(let k=0;k<M.path.length;k+=3){const q=M.path[k];const dd=Math.hypot(q.x-x,q.z-z);if(dd<dp)dp=dd}if(dp<2.6)c.lerp(cP,0.75*(1-dp/2.6));
      if(y>0.8)c.lerp(cW,clamp((y-0.8)/3,0,0.7))}
    c.offsetHSL(0,0,rnd(-0.02,0.02));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
  const tx=groundTex(texFor(M.theme,T)).clone();tx.needsUpdate=true;const rep_=M.town?N/5:N/6;tx.repeat.set(rep_,rep_);
  for(let i=0;i<col.length;i++)col[i]=Math.min(1,col[i]*1.18);g.attributes.color.needsUpdate=true;
  worldGroup.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,map:tx})));
}
function buildMap(kind,opts){
  clearWorld();const seed=opts.seed||((Math.random()*1e9)|0);let M;
  if(kind==='town')M=genTown();else if(kind==='dungeon')M=genDungeon(seed,opts.size||120);else M=genOutdoor(seed,opts.size||150,opts.theme);
  M.kind=kind;M.theme=opts.theme;M.blockers=[];MAP=M;H=makeH(M.N,M.hg);
  const T=D.THEMES[opts.theme];M.T=T;
  scene.background=new THREE.Color(T.sky);scene.fog=new THREE.Fog(T.fog,M.dungeon?18:26,Q().far);
  hemi.color.set(T.light||0xdfe4ff);hemi.intensity=M.dungeon?0.55:0.85;sun.intensity=M.dungeon?0.25:0.8;heroLight.intensity=M.dungeon?1.3:0.35;heroLight.color.set(T.light||0xffb070);
  buildTerrain(M,T);
  const rr=mulberry(seed+7);const N=M.N;
  if(M.dungeon){
    /* murs instanciés */
    const walls=[];for(let iz=1;iz<N-1;iz++)for(let ix=1;ix<N-1;ix++){if(M.walk[iz*N+ix])continue;let adj=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(M.walk[(iz+dz)*N+ix+dx])adj=1;if(adj)walls.push([ix-N/2+0.5,iz-N/2+0.5])}
    const wg=new THREE.BoxGeometry(1,2.2,1);wg.translate(0,1.1,0);const wt=groundTex('tiles').clone();wt.needsUpdate=true;wt.repeat.set(1,2);const im=new THREE.InstancedMesh(wg,new THREE.MeshLambertMaterial({color:new THREE.Color(T.wall||0x4a4248).multiplyScalar(1.5),map:wt}),walls.length);
    walls.forEach((w,i)=>{_m4.makeScale(1,0.8+((w[0]*7+w[1]*13)%5)*0.08,1);_m4.setPosition(w[0],0,w[1]);im.setMatrixAt(i,_m4)});worldGroup.add(im);
    const pil=[],tor=[];M.rooms.forEach(r=>{if(r.w>=14){[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const x=r.x+a*(r.w/2-3),z=r.z+b*(r.h/2-3);pil.push({x,y:0,z,s:0.9});M.blockers.push({x,z,r:0.8})})}
      tor.push({x:r.x+r.w/2-1.2,y:0,z:r.z,s:1},{x:r.x-r.w/2+1.2,y:0,z:r.z,s:1});for(let i=0;i<3;i++)if(rr()<0.6){pil.length;}
    });
    instProps('pillar',T.wall||0x4a4248,0,pil);instProps('torch',0,0,tor);
    const bones=[];for(let i=0;i<120;i++){const x=(rr()-0.5)*N,z=(rr()-0.5)*N;if(walkable(x,z))bones.push({x,y:0,z,s:0.8+rr()*0.5,ry:rr()*6})}instProps('bones',0xd8ccb0,0,bones);
  }else if(M.town){
    buildTownDecor(M,rr);
  }else{
    const tk=T.trees||'pine',edge=[],inner=[],rocks=[],graves=[];const W=N+1;
    const tc={pine:[0x2a4a2a,0x4a3020],dead:[0x3a3028,0x3a3028],swamp:[0x2a3a24,0x2a2418],crystal:[T.light||0x9ab0ff,0],cactus:[0x4a7a3a,0],palm:[0x3a7a3a,0]}[tk];
    for(let i=0;i<2600&&edge.length<900;i++){const ix=1+Math.floor(rr()*(N-1)),iz=1+Math.floor(rr()*(N-1));const e=M.ex[iz*W+ix];if(e>0.3&&e<10){const x=ix-N/2,z=iz-N/2;edge.push({x,y:H(x,z)-0.2,z,s:0.8+rr()*0.6,ry:rr()*6,sy:0.9+rr()*0.5})}}
    for(let i=0;i<500&&inner.length<(tk==='pine'?70:40);i++){const x=(rr()-0.5)*N,z=(rr()-0.5)*N;if(walkable(x,z)&&Math.hypot(x-M.start.x,z-M.start.z)>10){let ok=1;for(let k=0;k<M.path.length;k+=4)if(Math.hypot(M.path[k].x-x,M.path[k].z-z)<4.5){ok=0;break}
      if(ok){const s=0.7+rr()*0.4;inner.push({x,y:H(x,z)-0.1,z,s,ry:rr()*6});M.blockers.push({x,z,r:0.55*s})}}}
    for(let i=0;i<300&&rocks.length<50;i++){const x=(rr()-0.5)*N,z=(rr()-0.5)*N;const ix=Math.floor(x+N/2),iz=Math.floor(z+N/2);const e=M.ex[iz*W+ix];if(e>-3&&e<6){const s=0.5+rr()*1.2;rocks.push({x,y:H(x,z),z,s,ry:rr()*6});if(e<0)M.blockers.push({x,z,r:Math.min(0.9,0.75*s)})}}
    if(T.props==='desert'){const bs=[];for(let i=0;i<300&&bs.length<40;i++){const x=(rr()-0.5)*N,z=(rr()-0.5)*N;if(walkable(x,z))bs.push({x,y:H(x,z),z,s:0.9+rr()*0.6,ry:rr()*6})}instProps('bones',0xe8dcc0,0,bs)}
    if(T.props==='graves'||T.props==='crypt'||T.props==='ash')for(let i=0;i<400&&graves.length<70;i++){const x=(rr()-0.5)*N,z=(rr()-0.5)*N;if(walkable(x,z)){graves.push({x,y:H(x,z),z,s:0.9+rr()*0.4,ry:rr()*0.6-0.3})}}
    instProps(tk,tc[0],tc[1],edge.concat(inner));instProps('rock',T.wall||0x6a665e,0,rocks);instProps('grave',0x7a7a80,T.ground[1],graves);
    if(T.water){const w=new THREE.Mesh(new THREE.PlaneGeometry(N,N).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:T.water,transparent:true,opacity:0.55}));w.position.y=-0.15;worldGroup.add(w);
  }
  }
  /* les obstacles du décor (arbres, rochers, piliers) bloquent aussi la navigation */
  if(!M.town){const N2=M.N;for(const b of M.blockers){const c=cellOf(b.x,b.z);if(dist(b.x,b.z,M.start.x,M.start.z)>3)M.walk[c]=0;{for(const o of [1,-1,N2,-N2,N2+1,N2-1,-N2+1,-N2-1]){const q=c+o;if(q>=0&&q<N2*N2&&dist(b.x,b.z,M.start.x,M.start.z)>4)M.walk[q]=0}}}}
  /* toute case non reliée au départ devient inaccessible (pas de clairière isolée, pas de monstre ou de butin hors d'atteinte) */
  {const N2=M.N,W2=M.walk;let s0=cellOf(M.start.x,M.start.z);if(!W2[s0]){for(const o of [1,-1,N2,-N2,N2+1,N2-1])if(W2[s0+o]){s0+=o;break}}const seen=new Uint8Array(N2*N2),q=new Int32Array(N2*N2);let h=0,e=0;seen[s0]=1;q[e++]=s0;
    while(h<e){const c=q[h++];for(const o of [1,-1,N2,-N2]){const n=c+o;if(n>=0&&n<N2*N2&&W2[n]&&!seen[n]){seen[n]=1;q[e++]=n}}}
    if(e>50)for(let i=0;i<N2*N2;i++)if(W2[i]&&!seen[i])W2[i]=0}
  M.seed=seed;buildMinimap(M);return M;
}

/* --- navigation : champ de distance (largeur d'abord) vers une cible, mis en cache par case --- */
function cellOf(x,z){const N=MAP.N;return clamp(Math.floor(z+N/2),0,N-1)*N+clamp(Math.floor(x+N/2),0,N-1)}
function losOk(x0,z0,x1,z1){if(!MAP||!MAP.dungeon)return true;const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/0.7);for(let i=1;i<n;i++){const t=i/n;if(!walkable(x0+(x1-x0)*t,z0+(z1-z0)*t))return false}return true}
function navField(t){const M=MAP;if(M.navT===t&&M.navD)return M.navD;const N=M.N,W=M.walk,d=M.navD&&M.navD.length===N*N?M.navD:new Int32Array(N*N);d.fill(-1);
  const q=new Int32Array(N*N);let h=0,e=0;d[t]=0;q[e++]=t;while(h<e){const c=q[h++],cx=c%N,cz=(c/N)|0,v=d[c]+1;
    if(cx>0&&W[c-1]&&d[c-1]<0){d[c-1]=v;q[e++]=c-1}if(cx<N-1&&W[c+1]&&d[c+1]<0){d[c+1]=v;q[e++]=c+1}if(cz>0&&W[c-N]&&d[c-N]<0){d[c-N]=v;q[e++]=c-N}if(cz<N-1&&W[c+N]&&d[c+N]<0){d[c+N]=v;q[e++]=c+N}}
  M.navT=t;M.navD=d;return d}
/* prochain point de passage pour aller de (fx,fz) vers (tx,tz) en contournant murs et falaises */
function navStep(fx,fz,tx,tz){
  if(!MAP)return{x:tx,z:tz};if(dist(fx,fz,tx,tz)<3||(losOk(fx,fz,tx,tz)&&!MAP.dungeon&&dist(fx,fz,tx,tz)<8))return{x:tx,z:tz};
  const N=MAP.N,W=MAP.walk;let t=cellOf(tx,tz);if(!W[t]){const p=nearestWalkable(tx,tz);t=cellOf(p.x,p.z)}
  const d=navField(t);let c=cellOf(fx,fz);if(d[c]<0){for(const o of [1,-1,N,-N,N+1,N-1,-N+1,-N-1])if(d[c+o]>=0){c+=o;break}}if(d[c]<0)return{x:tx,z:tz};
  for(let k=0;k<4;k++){const cx=c%N,cz=(c/N)|0;let best=c,bv=d[c];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=cx+dx,nz=cz+dz;if(nx<0||nz<0||nx>=N||nz>=N)continue;const n=nz*N+nx;if(d[n]<0||d[n]>=bv)continue;if(dx&&dz&&(!W[cz*N+nx]||!W[nz*N+cx]))continue;best=n;bv=d[n]}
    if(best===c)break;c=best}
  return{x:(c%N)-N/2+0.5,z:((c/N)|0)-N/2+0.5}}
/* --- minimap (canvas 2D, brouillard de découverte) --- */
const mm=$('minimap'),mmx=mm.getContext('2d');let mmBase=null,mmFog=null;
function buildMinimap(M){
  const N=M.N;mmBase=document.createElement('canvas');mmBase.width=mmBase.height=N;const c=mmBase.getContext('2d');const img=c.createImageData(N,N);
  const g=new THREE.Color(M.T.path||M.T.ground[0]).lerp(new THREE.Color(0xffffff),0.25);
  for(let i=0;i<N*N;i++){const w=M.walk[i];img.data[i*4]=w?g.r*255:14;img.data[i*4+1]=w?g.g*255:12;img.data[i*4+2]=w?g.b*255:16;img.data[i*4+3]=255}
  c.putImageData(img,0,0);
  mmFog=document.createElement('canvas');mmFog.width=mmFog.height=N;const f=mmFog.getContext('2d');f.fillStyle=M.town?'rgba(0,0,0,0)':'rgba(4,3,6,0.92)';f.fillRect(0,0,N,N);
}
function revealFog(x,z){if(!mmFog||!MAP)return;const f=mmFog.getContext('2d');f.globalCompositeOperation='destination-out';f.beginPath();f.arc(x+MAP.N/2,z+MAP.N/2,16,0,6.28);f.fill();f.globalCompositeOperation='source-over'}
/* ================= Combat : entités, dégâts, monstres ================= */
let NOW=0; /* temps de jeu en secondes */
/* minuteries en temps de jeu (s'arrêtent avec la pause, suivent l'horloge accélérée des tests) */
const timers=[];function later(fn,ms){timers.push({t:NOW+(ms||0)/1000,fn})}
function runTimers(){for(let i=timers.length-1;i>=0;i--){if(timers[i].t<=NOW){const f=timers[i].fn;timers.splice(i,1);try{f()}catch(e){console.error(e)}}}}
const P={x:0,z:0,hp:100,res:0,res2:0,face:0,moving:false,dead:0,buffs:[],cds:{},potion:0,shield:0,lastHurt:9,walk:0,swing:0,root:0,slowT:0,invuln:0,
  stacks:{},cheatT:0,cheatShT:0,atkT:0,dash:null,deaths:0,mobLvl:1,periodic:{},whileT:{},petCastT:0,autoT:0};
let S=null,SKC={},SLOTSK=[]; /* stats calculées, compétences résolues, compétences par emplacement */
const mobs=[],pets=[],projs=[],zones=[],traps=[],hazards=[],drops=[],globes=[];
let heroMesh=null,mountMesh=null;
const DMG={}; /* bilan de combat : dégâts par source */
let combatLog={t0:0,deaths:0,on:false};
function logDmg(label,v){if(combatLog.on)DMG[label]=(DMG[label]||0)+v;if(dummyStat.on)dummyStat.acc+=v}
const dummyStat={on:false,acc:0,hist:[]};

/* ----- mise à jour du cache de build ----- */
function matchSkill(spec,id,isPet){
  if(spec==='*')return !isPet||true;
  if(Array.isArray(spec))return spec.some(s=>matchSkill(s,id,isPet));
  if(spec==='pets')return !!isPet;
  if(typeof spec==='string'&&spec.startsWith('cat:'))return SK[id]&&SK[id].cat===spec.slice(4);
  return spec===id;
}
function resolveSkill(id,rune){
  const b=SK[id];const p=Object.assign({},b);delete p.runes;
  const h=hero();if(rune!=null&&rune>=0&&b.runes[rune]&&h&&h.lvl>=b.runes[rune].lvl)Object.assign(p,b.runes[rune].mod);
  if(S)for(const f of S.fx)if(f.t==='extra'&&f.skill===id)for(const k in f.add)p[k]=(p[k]||0)+f.add[k];
  if(p.cd)p.cd=Math.max(0.5,p.cd);if(p.cost)p.cost=Math.max(0,p.cost);if(p.arm!=null)p.arm=Math.max(0,p.arm);
  p.rune=rune==null?-1:rune;return p;
}
function rebuild(){
  const h=hero();if(!h)return;S=computeStats(h);SKC={};SLOTSK=[];
  (h.skills||[]).forEach((s,i)=>{if(s&&s.id&&SK[s.id]&&h.lvl>=SK[s.id].lvl){SKC[s.id]=resolveSkill(s.id,s.rune);SLOTSK[i]=s.id}else SLOTSK[i]=null});
  S.fxBy={};for(const f of S.fx)(S.fxBy[f.t]||(S.fxBy[f.t]=[])).push(f);
  P.hp=Math.min(P.hp,S.maxHp);
  /* invocations permanentes en trop : on retire celles d'une compétence plus équipée */
  for(let i=pets.length-1;i>=0;i--){const p=pets[i];if(p.skill&&!p.until&&!SKC[p.skill])removePet(i)}
  if(typeof renderSkillBar==='function')renderSkillBar();
  if(heroMesh&&typeof spawnHeroMesh==='function'&&heroSig(h)!==heroLook){const keep=heroMesh.position.clone(),r=heroMesh.rotation.y;spawnHeroMesh();heroMesh.position.copy(keep);heroMesh.rotation.y=r}
}
const FX=t=>(S&&S.fxBy&&S.fxBy[t])||[];
function buffSum(k){let s=0;for(const b of P.buffs)if(b.stats&&b.stats[k])s+=b.stats[k];return s}
function addBuff(id,stats,dur,extra){const ex=P.buffs.find(b=>b.id===id);if(ex){ex.until=NOW+dur;ex.stats=stats;Object.assign(ex,extra||{});return ex}const b=Object.assign({id,stats,until:NOW+dur},extra||{});P.buffs.push(b);return b}
function hasBuff(id){return P.buffs.some(b=>b.id===id)}
function moveSpeed(){return 5.4*(1+S.ms+buffSum('ms'))*(P.slowT>NOW?0.55:1)*(pylon('vitesse')?1.6:1)}
function pylon(k){return P.buffs.some(b=>b.id==='py_'+k)}

/* ----- dégâts infligés ----- */
let SIMU=false,hitStop=0;
function skillMul(id,m,isPet){
  let k=S.allMul*(1+(S.skill[id]||0));if(!SIMU)k*=(1+S.dmg+buffSum('dmg'));
  for(const f of FX('skillDmg')){if(f.skill==='*'&&!f.cond)continue;if((matchSkill(f.skill,id,isPet)||(isPet&&f.skill==='pets'))&&(!f.cond||(f.cond==='cursed'&&m&&m.curseT>NOW)))k*=f.m}
  if(!SIMU)for(const b of P.buffs)if(b.skillM&&(matchSkill(b.skillM.skill,id,isPet)||(isPet&&b.skillM.skill==='pets')))k*=b.skillM.m;
  const st=!SIMU&&P.stacks[id];if(st&&st.until>NOW)k*=1+st.m*st.n;
  if(isPet&&!SIMU){for(const b of P.buffs)if(b.petM)k*=b.petM}
  return k;
}
function elMul(el){let k=1+(S.elem[el]||0);for(const f of FX('elemDmg'))if(f.el===el)k*=f.m;return k}
function condMul(m){
  let k=1;if(m.curseT>NOW)k*=1+m.vuln;if(m.markT>NOW)k*=1.1;
  if(m.elite||m.boss)for(const f of FX('eliteDmg'))k*=f.m;if((m.elite||m.boss)&&S.elite)k*=1+S.elite;
  for(const f of FX('nearDmg'))if(dist(m.x,m.z,P.x,P.z)<f.r)k*=f.m;
  if(S.dmgPoisoned&&m.dots.length)k*=1+S.dmgPoisoned;
  if(pylon('puissance'))k*=5;return k;
}
const WD=()=>S.wpnAvg*rnd(0.85,1.15)*S.mainMul;
/* o : {id, el, src:'skill'|'pet'|'proc'|'dot'|'thorns', label, noCrit, flat, stun, slow, dot, dotDur, area} */
function hitMob(m,coef,o){
  if(!m||m.dead||m.invuln)return 0;o=o||{};
  let v=o.flat!=null?o.flat:WD()*coef;
  if(o.flat==null||o.src==='dot'){if(o.id)v*=skillMul(o.id,m,o.src==='pet');v*=elMul(o.el||'phys');}
  v*=condMul(m);if(o.area)v*=1+S.area*0.5;
  let cr=false;if(!o.noCrit&&o.src!=='dot'&&Math.random()<S.chc+buffSum('crit')){cr=true;v*=1+S.chd}
  if(cr&&o.src==='skill'&&v>m.max*0.25){hitStop=Math.max(hitStop,0.045);shake=Math.max(shake,0.06);sparks(m.x,m.y+1,m.z,0xffd080,6,6)}
  m.hp-=v;m.flash=0.1;m.aggro=true;
  logDmg(o.label||(o.id&&SK[o.id]?SK[o.id].name:'Autre'),v);
  if(o.src!=='dot'||Math.random()<0.15)floatNum(m.x,m.y+m.h,m.z,fmt(v),cr?'cr':o.src==='dot'?'dot':'',o.el);
  if(o.src!=='dot'){if(cr)SFX.crit();else SFX.hit()}
  if(o.stun)m.stunT=Math.max(m.stunT,NOW+o.stun*(m.boss?0.3:1));
  if(o.slow)m.slowT=Math.max(m.slowT,NOW+o.slow);
  if(o.dot)addDot(m,WD()*o.dot/(o.dotDur||3),o.dotDur||3,o.el,o.id,o.label);
  if(o.src==='skill'&&!m.boss&&!m.elite&&!m.named&&!m.dummy){const d=dist(m.x,m.z,P.x,P.z)||1;moveMob(m,(m.x-P.x)/d*0.12,(m.z-P.z)/d*0.12)}
  if(o.knock&&!m.boss){const d=dist(m.x,m.z,P.x,P.z)||1;moveMob(m,(m.x-P.x)/d*o.knock,(m.z-P.z)/d*o.knock)}
  /* soins */
  if(o.src==='skill'||o.src==='pet'){
    if(S.loh&&o.src==='skill')healP(S.loh*0.5);
    if(S.ls||buffSum('ls')){healP(Math.min(S.maxHp*0.03,v*(S.ls+buffSum('ls'))*0.05))}
    if(m.curseT>NOW&&m.curseLs)healP(S.maxHp*m.curseLs);
  }
  if(m.affix&&m.affix.includes('foudroyant')&&NOW>m.sparkT){m.sparkT=NOW+0.9;for(let i=0;i<2;i++){const a=rnd(0,6.28);telegraph(m.x+Math.cos(a)*rnd(1,3),m.z+Math.sin(a)*rnd(1,3),1.3,m.dmg*1.2,0.9,{color:0x9ab0ff})}}
  /* effets de proc */
  if(o.proc!==0&&(o.src==='skill'||o.src==='pet')){
    for(const f of FX('onHit'))if((f.on==='*'||matchSkill(f.on,o.id))&&Math.random()<f.ch*(o.procCoef||1))doAction(f.do,m.x,m.z,f.m,{label:f.src,el:f.el,m});
    for(const f of FX('cdrOnHit'))if(matchSkill(f.on,o.id)){if(f.skill==='*'){for(const k in P.cds)P.cds[k]-=f.s}else P.cds[f.skill]=(P.cds[f.skill]||0)-f.s}
    if(o.src==='pet'){for(const f of FX('petApply'))if(f.debuff==='curse'){m.curseT=NOW+6;m.vuln=Math.max(m.vuln,f.m||0.2)}else addDot(m,WD()*1,4,'poison','pets','Invocations')}
    if(o.gainHit)gainRes(o.gainHit);
  }
  if(m.hp<=0)killMob(m,o);
  return v;
}
function addDot(m,dps,dur,el,id,label){let mul=1;for(const f of FX('dotMult'))mul*=f.m;m.dots.push({dps:dps*mul,until:NOW+dur,el:el||'poison',id,label:label||(id&&SK[id]?SK[id].name:'Poison'),t:0});if(m.dots.length>6)m.dots.shift()}
function healP(v){if(P.dead)return;P.hp=Math.min(S.maxHp,P.hp+v)}
function gainRes(v){const c=CLS[hero().cls];P.res=Math.min(S.resMaxTot,P.res+v)}
function enemiesNear(x,z,r){const o=[];for(const m of mobs)if(!m.dead&&m.active&&dist(m.x,m.z,x,z)<r+m.r)o.push(m);return o}
function nearestMob(x,z,r,excl){let b=null,bd=r;const dun=MAP&&MAP.dungeon;for(const m of mobs){if(m.dead||!m.active||m.untarget||m.invuln||(excl&&excl.has(m)))continue;const d=dist(m.x,m.z,x,z)-m.r*0.5;if(d<bd&&(!dun||d<2.5||losOk(x,z,m.x,m.z))){bd=d;b=m}}return b}
function densest(x,z,range,r){let best=null,bc=0;for(const m of mobs){if(m.dead||!m.active||dist(m.x,m.z,x,z)>range)continue;if(MAP&&MAP.dungeon&&!losOk(x,z,m.x,m.z))continue;let c=0;for(const o of mobs)if(!o.dead&&o.active&&dist(o.x,o.z,m.x,m.z)<r)c+=o.elite||o.boss?3:1;if(c>bc){bc=c;best=m}}return best}

/* ----- dégâts subis ----- */
let curCaster=null;
function mobName(m){return (m.label||m.def.name)+(m.elite==='champion'?' (champion)':m.elite==='minion'?' (sbire)':'')}
function hurtPlayer(v,type,src,who){
  if(!P.dead)P.lastHit={who:who||(src?mobName(src):curCaster?mobName(curCaster):null),type,zone:GS.rift?(GS.rift.gr?'Faille supérieure '+GS.rift.gr:'Faille')+' · '+GS.rift.name:(D.ZONES[GS.zone]||{}).name,aff:src&&src.affix&&src.affix.length?src.affix.map(a=>D.ELITE_AFFIXES.find(x=>x.id===a).n).join(', '):''};
  if(P.dead||NOW<P.invuln||pylon('bouclier')||G.godmode)return;
  const mt=mitigation(S,P.mobLvl);let mul=mt.mult;
  const bdr=buffSum('dr');if(bdr)mul*=Math.max(0.1,1-Math.min(0.85,bdr));
  for(const f of FX('lowHpDr'))if(P.hp/S.maxHp<f.below)mul*=1-f.dr;
  if(type==='melee')mul*=1-Math.min(0.5,S.mdr);else if(type==='ranged')mul*=1-Math.min(0.5,S.rdr);
  if(compState&&compState.id==='brann'&&compState.taunt>NOW&&type==='melee')mul*=0.7;
  let d=v*mul;
  if(P.shield>0){const a=Math.min(P.shield,d);P.shield-=a;d-=a}
  if(d<=0)return;
  P.hp-=d;P.lastHurt=0;floatNum(P.x,2.3+H(P.x,P.z),P.z,'−'+fmt(d),'hurt');SFX.hurt();
  if(d>S.maxHp*0.15)shake=0.3;
  if(heroMesh)heroFlash=0.12;
  /* épines */
  if(src&&type==='melee'&&(S.thorns||buffSum('thorns'))){const th=(S.thorns+S.thorns*buffSum('thorns'))*S.thornsM*(1+buffSum('thorns'));hitMob(src,0,{flat:th,label:'Épines',noCrit:1,proc:0})}
  if(src&&src.affix&&src.affix.includes('vampirique'))src.hp=Math.min(src.max,src.hp+src.max*0.04);
  for(const f of FX('cheatShield'))if(P.hp/S.maxHp<f.below&&NOW>P.cheatShT){P.cheatShT=NOW+f.cd;P.shield+=S.maxHp*f.pct;toast('Pierre du Rempart : bouclier !')}
  if(compState&&compState.id==='oriane'&&(hero().comp.sk||[0])[0]===0&&P.hp/S.maxHp<0.5&&NOW>compState.healT){compState.healT=NOW+12;healP(S.maxHp*0.25);burst(P.x,1.5,P.z,0x9cff6a,14,2)}
  if(P.hp<=0){
    for(const f of FX('cheatDeath'))if(NOW>P.cheatT){P.cheatT=NOW+f.cd;P.hp=S.maxHp*f.heal;P.invuln=NOW+1.5;toast('<b>Dernier Souffle !</b> Tu survis.');burst(P.x,1.5,P.z,0xffd76a,30,4);return}
    playerDie();
  }
}

/* ----- monstres ----- */
const ELITE_NAMES=[['Grise','Cendre','Morne','Vile','Noire','Rouille','Sanglante','Brûle','Pâle','Ronce'],['-Os','-Croc','-Griffe','-Fiel','-Plaie','-Suie','-Crâne','-Givre','-Ombre','-Fange']];
function eliteName(){return pick(['Grimace','Faucheur','Mâchoire','Vorace','Hurlant','Rongeur','Tranche','Brise','Lamente','Charogne'])+' '+pick(ELITE_NAMES[0])+pick(ELITE_NAMES[1])}
function spawnMob(type,x,z,o){
  o=o||{};const boss=o.boss?D.BOSSES[o.boss]:null,def=boss||D.MONSTERS[type];if(!def)return null;
  const L=o.lvl||P.mobLvl,sc=o.scale||curScale;
  let hpM=def.hp*(boss?1:1),dmM=def.dmg;
  if(o.elite==='champion'){hpM*=4;dmM*=1.5}else if(o.elite==='rare'){hpM*=6;dmM*=1.6}else if(o.elite==='minion'){hpM*=1.6;dmM*=1.2}
  if(o.named){hpM*=8;dmM*=1.6}
  if(o.hpMul)hpM*=o.hpMul;
  const affix=o.affix||[];if(affix.includes('fortifie'))hpM*=1.6;
  const max=mobHp(L)*hpM*sc.hp,dmg=mobDmg(L)*dmM*sc.dmg;
  const key=(boss?'B_'+o.boss:type);const geo=monsterGeo(def,key);const mat=vcMat();mat.emissive=new THREE.Color(0);if(def.fam==='esprits'||def.ghost){mat.transparent=true;mat.opacity=0.72}
  const mesh=new THREE.Mesh(geo,mat);let s=def.s*(o.elite==='champion'||o.elite==='rare'?1.25:1)*(o.named?1.35:1);mesh.scale.setScalar(s);
  if(!walkable(x,z)){const p=nearestWalkable(x,z);x=p.x;z=p.z}
  mesh.position.set(x,H(x,z),z);worldGroup.add(mesh);
  let ring=null;if(o.elite||o.named||boss){ring=new THREE.Mesh(ringGeo,addMat(boss?0xff4a2a:o.elite==='champion'?0x5a8aff:0xffd04a,0.8));ring.scale.setScalar(s*0.9);ring.position.y=0.12;mesh.add(ring);ring.scale.set(1/1*0.9,1,0.9)}
  const m={id:uid(),type,def,boss:o.boss||null,elite:o.elite||null,named:o.named||null,affix,lvl:L,hp:max,max,dmg,x,z,hx:x,hz:z,r:0.55*s,h:1.6*s+(def.fly?0.6:0),y:H(x,z),
    speed:def.speed*(affix.includes('rapide')?1.5:1)*(o.speedMul||1),mesh,mat,flash:0,dead:false,active:true,aggro:!!o.aggro,atkT:rnd(0.5,1.5),castT:rnd(2,4),windup:0,
    slowT:0,stunT:0,curseT:0,vuln:0,markT:0,dots:[],sparkT:0,affT:{},pack:o.pack||null,label:o.label||null,progress:o.progress!=null?o.progress:(o.elite==='champion'?4:o.elite==='rare'?6:o.elite==='minion'?1.5:1),
    xp:o.xp||1,phase:0,bossT:2,bob:rnd(0,6),charge:null,fuse:0,summons:0,onDeath:o.onDeath||null,bounty:o.bounty||null,leash:o.leash||26,anim:0,legBoost:o.legBoost||1,echo:o.echo||0};
  mobs.push(m);return m;
}
function nearestWalkable(x,z){for(let r=1;r<30;r+=1)for(let a=0;a<6.28;a+=0.5){const nx=x+Math.cos(a)*r,nz=z+Math.sin(a)*r;if(walkable(nx,nz))return{x:nx,z:nz}}return{x:MAP.start.x,z:MAP.start.z}}
function moveMob(m,dx,dz){const nx=m.x+dx,nz=m.z+dz;if(walkable(nx,nz)){m.x=nx;m.z=nz}else if(walkable(nx,m.z))m.x=nx;else if(walkable(m.x,nz))m.z=nz}
function removeMob(m){worldGroup.remove(m.mesh);m.mat.dispose();if(m.hpEl){m.hpEl.remove();m.hpEl=null}}
function spawnPack(x,z,o){
  o=o||{};const fams=o.fams||['morts'];const fam=pick(fams);const ex=(D.ZONES[GS.zone]&&D.ZONES[GS.zone].exclude)||[];const pool=Object.keys(D.MONSTERS).filter(k=>D.MONSTERS[k].fam===fam&&!['larve','pilier','voleur'].includes(k)&&!ex.includes(k));
  const pack={id:uid(),alive:0};const n=o.n||rndi(3,6);const L=P.mobLvl;
  if(o.elite){const nAff=o.elite==='rare'?Math.min(4,2+(curDiffIdx()>=4?1:0)+(curDiffIdx()>=10?1:0)):Math.min(3,1+(curDiffIdx()>=3?1:0)+(curDiffIdx()>=8?1:0));
    const aff=shuffle(D.ELITE_AFFIXES.map(a=>a.id)).slice(0,nAff);const type=pick(pool);
    if(o.elite==='champion'){const c=L<5?2:rndi(3,4);const lab=D.MONSTERS[type].name+' champion';for(let i=0;i<c;i++){spawnMob(type,x+rnd(-2,2),z+rnd(-2,2),{elite:'champion',affix:aff,pack,label:lab});pack.alive++}}
    else{spawnMob(type,x,z,{elite:'rare',affix:aff,pack,label:eliteName()});pack.alive++;const mt=pick(pool);for(let i=0;i<(L<5?2:4);i++){spawnMob(mt,x+rnd(-3,3),z+rnd(-3,3),{elite:'minion',pack});pack.alive++}}
  }else{for(let i=0;i<n;i++){spawnMob(pick(pool),x+rnd(-3,3),z+rnd(-3,3),{pack});pack.alive++}}
  return pack;
}

/* ----- télégraphes et dangers ----- */
function telegraph(x,z,r,dmg,dur,o){
  o=o||{};if(!o.who)o.who=curCaster?mobName(curCaster):null;if(hazards.length>40)return;
  const ring=new THREE.Mesh(teleRing,o.color?addMat(o.color,0.95):teleMatR),fill=new THREE.Mesh(discGeo,o.color?new THREE.MeshBasicMaterial({color:o.color,transparent:true,opacity:0.3,depthWrite:false}):teleMatF);
  const y=H(x,z)+0.13;ring.position.set(x,y,z);fill.position.set(x,y+0.01,z);ring.scale.setScalar(r);fill.scale.setScalar(0.01);ring.userData.sharedMat=1;fill.userData.sharedMat=!o.color;
  worldGroup.add(ring,fill);hazards.push(Object.assign({kind:'tele',x,z,r,dmg,t:0,dur,ring,fill},o));
}
function lineTele(x,z,ang,len,w,dmg,dur,o){
  const g=new THREE.PlaneGeometry(w,len).rotateX(-Math.PI/2).translate(0,0,-len/2);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:0.35,depthWrite:false}));
  m.position.set(x,H(x,z)+0.15,z);m.rotation.y=ang;worldGroup.add(m);hazards.push(Object.assign({kind:'line',x,z,ang,len,w,dmg,t:0,dur,mesh:m},o||{}));
}
function tornado(x,z,dps,dur,src){if(hazards.length>40)return;const g=new THREE.Group();for(let i=0;i<3;i++){const c=new THREE.Mesh(GB.cone,addMat(i?0xd8b070:0xfff0c0,0.35));c.scale.set(1.6-i*0.4,3.2,1.6-i*0.4);c.rotation.x=Math.PI;c.position.y=1.6+i*0.3;g.add(c)}g.position.set(x,H(x,z),z);worldGroup.add(g);
  hazards.push({kind:'tornado',x,z,r:1.4,dps,t:0,dur,mesh:g,tick:0,who:src?mobName(src)+' (tornade)':'Tornade'})}
function pool(x,z,r,dps,dur,color,o){o=o||{};if(!o.who)o.who=curCaster?mobName(curCaster):null;
  const m=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.45,depthWrite:false}));m.position.set(x,H(x,z)+0.11,z);m.scale.setScalar(r);worldGroup.add(m);
  hazards.push(Object.assign({kind:'pool',x,z,r,dps,t:0,dur,mesh:m,tick:0},o||{}));
}
function beams(cx,cz,n,len,speed,dps,dur,src){
  const grp=new THREE.Group();grp.position.set(cx,H(cx,cz)+0.9,cz);for(let i=0;i<n;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.35,len).translate(0,0,len/2),addMat(0xc070ff,0.85));b.rotation.y=i/n*6.28;grp.add(b)}
  const core=new THREE.Mesh(GB.ico,addMat(0xe0b0ff,1));core.scale.setScalar(0.9);grp.add(core);worldGroup.add(grp);
  hazards.push({kind:'beam',x:cx,z:cz,n,len,speed,dps,t:0,dur,mesh:grp,ang:rnd(0,6),tick:0,src});
}
function hostileProj(m,tx,tz,o){
  o=o||{};const a=Math.atan2(tx-m.x,tz-m.z);const sp=o.speed||9;
  const mesh=new THREE.Mesh(GB.sph,addMat(o.color||m.def.proj||0xff6a2a,1));mesh.scale.setScalar(o.size||0.45);mesh.userData.shared=1;mesh.userData.sharedMat=1;
  mesh.position.set(m.x,H(m.x,m.z)+1.1,m.z);worldGroup.add(mesh);
  projs.push({hostile:1,x:m.x,z:m.z,dx:Math.sin(a)*sp,dz:Math.cos(a)*sp,life:(o.range||14)/sp,dmg:o.dmg||m.dmg,mesh,r:0.55,src:m});
}
function clearHazards(){for(const h of hazards){if(h.ring)worldGroup.remove(h.ring);if(h.fill)worldGroup.remove(h.fill);if(h.mesh)worldGroup.remove(h.mesh)}hazards.length=0;
  for(const q of projs)if(q.hostile)q.life=0}
function updateHazards(dt){
  for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];if(!h)continue;h.t+=dt;let done=h.t>=h.dur;
    if(h.kind==='tele'){h.fill.scale.setScalar(Math.max(0.01,h.r*Math.min(1,h.t/h.dur)));
      if(done){const inside=dist(P.x,P.z,h.x,h.z)<h.r+0.3;
        if(inside){hurtPlayer(h.dmg,'aoe',null,h.who);if(h.slow)P.slowT=NOW+h.slow;if(h.root)P.root=NOW+h.root;shake=Math.max(shake,0.25)}
        burst(h.x,H(h.x,h.z)+0.3,h.z,h.color||0xff5a1a,14,4);if(h.then)h.then(h);}
    }else if(h.kind==='line'){if(done&&h.then)h.then(h)}
    else if(h.kind==='pool'){h.tick-=dt;h.mesh.material.opacity=0.45*(1-Math.max(0,(h.t-h.dur+0.5)*2));if(h.tick<=0&&dist(P.x,P.z,h.x,h.z)<h.r){h.tick=0.5;hurtPlayer(h.dps*0.5,'aoe',null,h.who);if(h.slow)P.slowT=NOW+1}}
    else if(h.kind==='tornado'){const dd=dist(P.x,P.z,h.x,h.z)||1;h.x+=(P.x-h.x)/dd*2.4*dt;h.z+=(P.z-h.z)/dd*2.4*dt;h.mesh.position.set(h.x,H(h.x,h.z),h.z);h.mesh.rotation.y+=dt*9;if(Math.random()<dt*20)emit(h.x+rnd(-1,1),H(h.x,h.z)+rnd(0,3),h.z+rnd(-1,1),rnd(-2,2),rnd(0,2),rnd(-2,2),0xd8b070,0.5,0);h.tick-=dt;if(h.tick<=0&&dd<h.r+0.4){h.tick=0.4;hurtPlayer(h.dps*0.4,'aoe',null,h.who);P.slowT=NOW+0.6}}
    else if(h.kind==='beam'){h.ang+=h.speed*dt;h.mesh.rotation.y=h.ang;h.tick-=dt;
      if(h.tick<=0){const dx=P.x-h.x,dz=P.z-h.z,d=Math.hypot(dx,dz);if(d<h.len&&d>0.3){const pa=Math.atan2(dx,dz);for(let k=0;k<h.n;k++){let da=Math.abs(((pa-(h.ang+k/h.n*6.28))%6.28+9.42)%6.28-3.14);if(da*d<0.6){hurtPlayer(h.dps*0.3,'aoe',null,h.src?mobName(h.src)+' (rayons)':null);h.tick=0.3;break}}}}
      if(h.src&&h.src.dead)done=true}
    if(done){if(h.ring)worldGroup.remove(h.ring);if(h.fill){worldGroup.remove(h.fill);if(!h.fill.userData.sharedMat)h.fill.material.dispose()}if(h.mesh){worldGroup.remove(h.mesh);if(h.kind==='line'||h.kind==='pool'){h.mesh.geometry!==discGeo&&h.mesh.geometry.dispose();h.mesh.material.dispose()}}hazards.splice(i,1)}
  }
}

/* ----- IA des monstres ----- */
function updateMobs(dt){
  const px=P.x,pz=P.z;let bossNear=null;
  for(let i=mobs.length-1;i>=0;i--){const m=mobs[i];if(!m)continue;
    if(m.dead){m.deadT-=dt;const k=1-m.deadT/(m.deadMax||0.9);m.mesh.rotation.z=Math.min(1,k*3.5)*1.45*(m.dieSide||1);m.mesh.rotation.x=0;if(k>0.55){m.mesh.position.y-=dt*1.2;m.mesh.scale.multiplyScalar(0.97)}m.mat.emissive&&m.mat.emissive.setHex(k<0.15?0x888888:0);if(m.deadT<=0){removeMob(m);mobs.splice(i,1)}continue}
    const d=dist(px,pz,m.x,m.z);
    m.active=d<44||m.boss||m.aggro&&d<60;m.mesh.visible=d<Math.min(Q().far,GS.rift?30:36)&&!(m.invuln&&m.untarget);if(!m.active)continue;
    /* dots */
    for(let k=m.dots.length-1;k>=0;k--){const o=m.dots[k];o.t-=dt;if(o.t<=0){o.t=0.5;hitMob(m,0,{flat:o.dps*0.5,src:'dot',el:o.el,id:o.id,label:o.label})}if(m.dead)break;if(o.until<NOW)m.dots.splice(k,1)}
    if(m.dead)continue;
    curCaster=m;
    if(!m.aggro&&d<(m.boss?16:11)&&!P.dead)aggroPack(m);
    if(m.aggro&&!m.boss&&dist(m.x,m.z,m.hx,m.hz)>m.leash&&d>14){m.aggro=false;m.hp=Math.min(m.max,m.hp+m.max*0.3)}
    if(P.dead)m.aggro=false;
    const stunned=m.stunT>NOW,spd=m.speed*(m.slowT>NOW?0.5:1);
    let tx=m.hx,tz=m.hz,want=0.3;
    /* cible : le héros, ou un compagnon qui provoque */
    let target={x:px,z:pz};if(compState&&compState.taunt>NOW&&dist(compState.x,compState.z,m.x,m.z)<10)target=compState;
    if(m.aggro){tx=target.x;tz=target.z;const beh=m.boss?'boss':m.def.beh;
      want=beh==='ranged'||beh==='summoner'?(m.def.range||9)*0.75:beh==='caster'?6:0.9+m.r;
      if(!stunned){m.atkT-=dt*(m.affix.includes('rapide')?1.3:1);m.castT-=dt;
        if(m.boss)bossAI(m,dt,d);
        else if(beh==='melee'||beh==='charger'||beh==='caster'){
          if(m.windup>0){m.windup-=dt;if(m.windup<=0){if(dist(target.x,target.z,m.x,m.z)<1.6+m.r){if(target===compState)compHurt(m.dmg);else hurtPlayer(m.dmg,'melee',m)}}}
          else if(dist(target.x,target.z,m.x,m.z)<1.3+m.r&&m.atkT<=0){m.atkT=1.5;m.windup=0.38;m.anim=0.38}
          if(beh==='charger'&&!m.charge&&m.castT<=0&&d>4&&d<12){m.castT=rnd(5,7);const a=Math.atan2(px-m.x,pz-m.z);m.charge={a,t:-0.8,len:Math.min(14,d+3)};lineTele(m.x,m.z,a+Math.PI,m.charge.len,1.6,0,0.8)}
          if(beh==='caster'&&m.castT<=0&&d<12){m.castT=rnd(4,5.5);const z=m.def.zone;
            if(z==='fire')telegraph(px,pz,2.6,m.dmg*2.2,1.2,{then:h=>pool(h.x,h.z,2.2,m.dmg*0.8,3,0xff5a1a)});
            else if(z==='frost')telegraph(px,pz,2.8,m.dmg*2,1.3,{color:0x7fdcff,slow:2});
            else telegraph(px,pz,2.6,m.dmg*2.4,1.15)}
        }else if(beh==='ranged'){if(m.atkT<=0&&d<(m.def.range||9)+2){m.atkT=rnd(1.8,2.4);m.anim=0.3;hostileProj(m,px,pz,{dmg:m.dmg})}}
        else if(beh==='summoner'){if(m.castT<=0&&m.summons<6){m.castT=rnd(6,8);for(let k=0;k<2;k++){const s=spawnMob(m.def.summon,m.x+rnd(-2,2),m.z+rnd(-2,2),{aggro:true,progress:0.3,xp:0.3});if(s){s.parent=m;m.summons++}}ringFx(m.x,m.z,3,0xb36bff,0.5)}
          else if(m.atkT<=0&&d<10){m.atkT=2.6;hostileProj(m,px,pz,{dmg:m.dmg*0.7,color:0xb36bff})}}
        else if(beh==='totem'){want=99}
        else if(beh==='flee'){if(!m.fleeT){m.fleeT=NOW+25;toast("Un Voleur d'Étincelles ! Rattrape-le.",2600)}const dd=dist(px,pz,m.x,m.z)||1;if(dd<14)moveMob(m,(m.x-px)/dd*m.speed*dt*(m.slowT>NOW?0.5:1),(m.z-pz)/dd*m.speed*dt*(m.slowT>NOW?0.5:1));want=999;if(Math.random()<dt*4)emit(m.x,m.y+1,m.z,0,1,0,0xffd04a,0.6,0);if(NOW>m.fleeT){burst(m.x,1,m.z,0xffd04a,30,4);m.dead=true;m.deadT=0.1;toast('Le voleur s\'est enfui…',2000);continue}}
        else if(beh==='kamikaze'){want=0;if(m.fuse>0){m.fuse-=dt;m.flash=0.1;if(m.fuse<=0){burst(m.x,1,m.z,0xffaa3a,24,5);if(dist(px,pz,m.x,m.z)<2.6)hurtPlayer(m.dmg*1.6,'aoe');m.hp=0;killMob(m,{noReward:0,label:'Explosion'});continue}}
          else if(d<1.8){m.fuse=0.65;telegraph(m.x,m.z,2.4,0,0.65,{color:0xffaa3a})}}
        /* affixes d'élite */
        if(m.affix.length)eliteAffixes(m,dt,d);
      }
    }
    /* déplacement */
    if(!stunned&&!m.windup){
      if(m.charge){m.charge.t+=dt;if(m.charge.t>0){const sp=17*dt;moveMob(m,Math.sin(m.charge.a)*sp,Math.cos(m.charge.a)*sp);m.charge.len-=sp;
        if(dist(px,pz,m.x,m.z)<1.4+m.r&&!m.charge.hit){m.charge.hit=1;hurtPlayer(m.dmg*1.8,'melee',m)}if(m.charge.len<=0)m.charge=null}}
      else if(m.fuse<=0||m.def.beh!=='kamikaze'){const dd=dist(tx,tz,m.x,m.z);
        if(m.aggro&&(m.def.beh==='ranged'||m.def.beh==='summoner')&&dd<want*0.6){moveMob(m,-(tx-m.x)/dd*spd*dt*0.7,-(tz-m.z)/dd*spd*dt*0.7)}
        else if(dd>want){const k=m.aggro?1:0.3;moveMob(m,(tx-m.x)/dd*spd*dt*k,(tz-m.z)/dd*spd*dt*k)}
        else if(!m.aggro){m.hx+=0;}
      }}
    /* séparation */
    for(let k=i-1;k>=0&&k>i-14;k--){const o=mobs[k];if(o.dead)continue;const od=dist(o.x,o.z,m.x,m.z),rr=m.r+o.r;if(od<rr&&od>0.001){const push=(rr-od)*0.5;moveMob(m,(m.x-o.x)/od*push,(m.z-o.z)/od*push)}}
    if(d<0.5+m.r&&d>0.001){moveMob(m,(m.x-px)/d*0.05,(m.z-pz)/d*0.05)}
    /* rendu */
    m.y=H(m.x,m.z);m.bob+=dt*(m.aggro?7:3);const fly=m.def.fly?0.5+Math.sin(m.bob*0.5)*0.2:0;
    m.mesh.position.set(m.x,m.y+fly+(m.aggro&&!m.def.fly?Math.abs(Math.sin(m.bob))*0.06:0),m.z);
    m.mesh.rotation.y=Math.atan2(tx-m.x,tz-m.z)+Math.PI;
    if(m.anim>0){m.anim-=dt;m.mesh.rotation.x=-Math.sin((1-m.anim/0.38)*Math.PI)*0.35}else m.mesh.rotation.x=0;
    m.flash-=dt;m.mat.emissive.setHex(m.flash>0?0x999999:m.curseT>NOW?0x2a0a3a:m.slowT>NOW?0x0a2a3a:0);
    shadowAt(m.x,m.z,m.r*1.3);
    if(m.boss&&d<40)bossNear=m;
  }
  curCaster=null;
  return bossNear;
}
function aggroPack(m){m.aggro=true;if(m.pack)for(const o of mobs)if(o.pack===m.pack)o.aggro=true;if(m.elite&&!G.tuto.elite)tutoTip('elite')}
function eliteAffixes(m,dt,d){
  const A=m.affT,px=P.x,pz=P.z;const has=k=>m.affix.includes(k);
  const lead=!m.pack||mobs.find(o=>o.pack===m.pack&&!o.dead)===m; /* un seul membre du pack déclenche les affixes de zone */
  const cd=(k,a,b)=>{A[k]=(A[k]==null?rnd(1,a):A[k])-dt;if(A[k]<=0){A[k]=rnd(a,b);return true}return false};
  if(!lead||d>18)return;
  if(has('mortier')&&cd('mortier',4,5.5))for(let k=0;k<3;k++)later(()=>{if(!m.dead)telegraph(P.x+rnd(-1.5,1.5),P.z+rnd(-1.5,1.5),2.3,m.dmg*1.8,1.3)},k*350);
  if(has('glacial')&&cd('glacial',4.5,6))telegraph(px,pz,2.6,m.dmg*1.6,1.4,{color:0x7fdcff,slow:2.5});
  if(has('arcanique')&&cd('arcanique',8,10))beams(m.x+rnd(-3,3),m.z+rnd(-3,3),2,9,0.7,m.dmg*1.6,6,m);
  if(has('geolier')&&cd('geolier',7,9))telegraph(px,pz,1.6,m.dmg*0.5,1.1,{color:0xd8d8ff,root:1.3});
  if(has('incendiaire')&&cd('incendiaire',1.4,1.8))pool(m.x,m.z,1.6,m.dmg*0.9,4,0xff5a1a);
  if(has('teleporteur')&&cd('teleporteur',5,7)&&d>4){burst(m.x,1,m.z,0xb36bff,12,3);const a=rnd(0,6.28);const p={x:px+Math.cos(a)*2,z:pz+Math.sin(a)*2};if(walkable(p.x,p.z)){m.x=p.x;m.z=p.z}burst(m.x,1,m.z,0xb36bff,12,3)}
  if(has('pestilentiel')&&cd('pestilentiel',4,5))telegraph(px,pz,2.2,m.dmg*0.6,0.9,{color:0x8aff4a,then:h=>pool(h.x,h.z,2.2,m.dmg*0.8,4,0x6aff2a)});
}
/* ================= Compétences, effets, invocations ================= */
const elHex=el=>(ELC[el]||ELC.phys).c;
function skillCost(p){return p.cost?p.cost*(1-S.rcr-buffSum('rcr'))*(pylon('canal')?0:1):0}
function cdOf(p){return (p.cd||0)*(1-S.cdr)*(pylon('canal')?0.25:1)}
function canCast(id){const p=SKC[id];if(!p||P.dead)return false;if((P.cds[id]||0)>0)return false;const c=skillCost(p);if(p.res2)return P.res2>=c;return P.res>=c}
function castSkill(id,opts){
  opts=opts||{};const p=opts.p||SKC[id]||resolveSkill(id,-1);if(!p)return false;
  let paid=0;if(!opts.free){if(!canCast(id))return false;paid=skillCost(p);if(p.res2)P.res2-=paid;else P.res-=paid;P.cds[id]=cdOf(p)}
  const mult=opts.m||1;const ok=execSkill(id,p,mult,opts);
  if(!ok){if(!opts.free){if(p.res2)P.res2+=paid;else P.res+=paid;P.cds[id]=Math.min(P.cds[id]||0,0.5)}return false}
  if(!opts.free&&p.gen)gainRes(p.gen);
  if(!opts.free){
    flashSkill(id);if(SK[id].cat!=='primaire')SFX.cast();
    for(const f of FX('castAlso'))if(matchSkill(f.on,id)&&Math.random()<(f.ch||1)){const q=SKC[f.cast]||resolveSkill(f.cast,-1);later(()=>{if(!P.dead)castSkill(f.cast,{free:1,p:q,m:f.m,ring:f.ring,atSelf:f.at==='self',label:f.src})},SK[id].kind==='dash'?320:60)}
    for(const f of FX('buffOnCast'))if(matchSkill(f.on,id)){const b=f.buff.skill?{skillM:{skill:f.buff.skill,m:f.buff.m}}:{};addBuff('boc_'+f.src+id,f.buff.skill?{}:f.buff,f.dur,b)}
    for(const f of FX('summonOnCast'))if(matchSkill(f.on,id)&&Math.random()<(f.ch||1))for(let k=0;k<f.count;k++)spawnPet(f.unit,{skill:null,coef:f.m,until:NOW+f.dur,el:'sacre',label:f.src,x:P.x+rnd(-2,2),z:P.z+rnd(-2,2)});
    for(const f of FX('reset'))if(matchSkill(f.on,id)&&Math.random()<f.ch)P.cds[f.skill]=0;
    for(const f of FX('stackOn'))if(matchSkill(f.on,id)){const s=P.stacks[f.skill]||(P.stacks[f.skill]={n:0,m:f.m});s.n=Math.min(f.max,(s.until>NOW?s.n:0)+1);s.m=f.m;s.until=NOW+f.dur}
    if(SK[id].cat==='mobilite')for(const f of FX('cloneOnDash'))if(!f.on||f.on===id)later(()=>spawnPet('clone',{coef:1.6*f.m,until:NOW+f.dur,label:f.src,x:P.x,z:P.z}),300);
    if(SK[id].cat!=='ultime')for(const f of FX('doubleCast'))if((f.skill==='*'||f.skill===id)&&Math.random()<f.ch){later(()=>castSkill(id,{free:1,p,m:mult}),220);break}
  }
  return true;
}
function impactProcs(id,x,z){for(const f of FX('onImpact'))if(f.on===id&&Math.random()<(f.ch||1))doAction(f.do,x,z,f.m,{label:f.src,n:f.n})}
function zoneOnAt(id,x,z,at){for(const f of FX('zoneOn'))if(f.on===id&&f.at===at)makeZone(x,z,{r:f.r,dur:f.dur,dps:f.dps,el:f.el,eff:f.eff,label:f.src,id:null})}
function labelOf(id,o){return o.label||SK[id].name}
function execSkill(id,p,mult,o){
  const el=p.el||'phys',col=elHex(el);const range=p.range||(CLS[hero().cls].range+0.6);
  const base={id,el,src:'skill',label:labelOf(id,o)};
  let t=null;if(['strike','proj','chain','ground','zone','trap','cone','curse'].includes(p.kind)&&!o.ring&&!o.atSelf){
    t=(p.kind==='ground'||p.kind==='trap'||p.kind==='curse'||(p.kind==='zone'&&p.at==='target'))?densest(P.x,P.z,range,Math.max(3,p.r||3)):nearestMob(P.x,P.z,range);
    if(!t&&!o.free)return false}
  const face=t?Math.atan2(t.x-P.x,t.z-P.z):P.face;if(t)P.face=face;
  switch(p.kind){
  case 'strike':{if(!t)return false;P.swing=0.28;const hits=1+(p.hits||0);
    for(let k=0;k<hits;k++)later(()=>{if(t.dead)return;const tgts=p.r?enemiesNear(t.x,t.z,p.r):[t];
      for(const m of tgts)hitMob(m,p.dmg*mult*(m===t?1:0.8),Object.assign({stun:p.stun,area:p.r?1:0},base));
      for(const f of FX('thornsHit'))if(f.skill.includes(id))hitMob(t,0,{flat:(S.thorns||mobDmg(P.mobLvl)*2)*S.thornsM*f.m,label:'Épines ('+SK[id].name+')',el,noCrit:0,proc:0});
      if(p.jumps)chainFrom(t,p.jumps,p.dmg*0.6*mult,base,col);
      slashFx(P.x+(t.x-P.x)*0.5,P.z+(t.z-P.z)*0.5,face,col,1);if(p.r)ringFx(t.x,t.z,p.r,col,0.35);burst(t.x,1,t.z,col,6,2)},k*110);break}
  case 'proj':{const n=p.count||1,spr=(p.spread||0)*Math.PI/180;const a0=o.ring?0:face;const full=o.ring||p.spread>=360;
    for(let k=0;k<n;k++){const a=full?a0+k/n*6.283:a0+(n>1?(k/(n-1)-0.5)*spr:0);fireProj(id,p,a,mult,base,col,t)}
    P.swing=0.2;break}
  case 'chain':{if(!t)return false;chainFrom(null,(p.jumps||3)+1,p.dmg*mult,Object.assign({boom:p.boom,stun:p.stun},base),col,t);
    if(p.selfBuff)addBuff('sb_'+id,p.selfBuff,p.bdur||4);break}
  case 'nova':{const x=P.x,z=P.z;const r=p.r||5;if(p.pull)for(const m of enemiesNear(x,z,r+4))if(!m.boss){const d=dist(m.x,m.z,x,z)||1;moveMob(m,(x-m.x)/d*Math.min(d-1,4),(z-m.z)/d*Math.min(d-1,4))}
    let n=0;for(const m of enemiesNear(x,z,r)){hitMob(m,p.dmg*mult,Object.assign({stun:p.stun,dot:p.dot,dotDur:p.dotDur,area:1},base));n++}
    if(p.healPer)healP(S.maxHp*p.healPer*n);flashLight(x,H(x,z)+2,z,col,2,0.35,r*2.5);sparks(x,H(x,z)+0.8,z,col,16,9);ringFx(x,z,r,col,0.5);flashDisc(x,z,r,col,0.3);burst(x,1,z,col,20,4);break}
  case 'ground':{const tx=o.atSelf||!t?P.x:t.x,tz=o.atSelf||!t?P.z:t.z;const n=p.count||1;
    for(let k=0;k<n;k++){const ix=tx+(n>1?rnd(-1,1)*(p.spread||3):0),iz=tz+(n>1?rnd(-1,1)*(p.spread||3):0);const delay=(p.delay||0.4)+k*0.12;
      const mk=new THREE.Mesh(ringGeo,addMat(col,0.7));mk.position.set(ix,H(ix,iz)+0.2,iz);mk.scale.setScalar(p.r);addFx(mk,delay,(m,tt)=>{m.material.opacity=0.3+0.4*tt/delay});
      if(el==='sacre'||el==='foudre')pillar(ix,iz,p.r*0.35,14,col,delay+0.2);
      later(()=>{if(!MAP)return;for(const m of enemiesNear(ix,iz,p.r))hitMob(m,p.dmg*mult,Object.assign({stun:p.stun,slow:p.slow,area:1},base));
        burst(ix,0.6+H(ix,iz),iz,col,22,5);sparks(ix,H(ix,iz)+0.3,iz,0xffffff,10,7);flashLight(ix,H(ix,iz)+2,iz,col,2.2,0.35,p.r*3);ringFx(ix,iz,p.r,col,0.4);flashDisc(ix,iz,p.r,col,0.25);if(p.r>3)shake=Math.max(shake,0.15);SFX.boom();
        if(p.zdur)makeZone(ix,iz,{r:p.r,dur:p.zdur,dps:p.zdps*mult,el,id,label:base.label});
        if(p.healSelf)healP(S.maxHp*p.healSelf);
        impactProcs(id,ix,iz);zoneOnAt(id,ix,iz,'target')},delay*1000)}
    break}
  case 'zone':{const x=p.at==='self'||o.atSelf||!t?P.x:t.x,z=p.at==='self'||o.atSelf||!t?P.z:t.z;
    makeZone(x,z,{r:p.r,dur:p.zdur,dps:p.zdps*mult,el,id,label:base.label,follow:p.follow,heal:p.heal,bolts:p.bolts,slowZone:p.slowZone});
    if(p.selfBuff)addBuff('sb_'+id,p.selfBuff,p.bdur||p.zdur);impactProcs(id,x,z);break}
  case 'dash':{let tx,tz;const near=nearestMob(P.x,P.z,16);
    if(p.away){const a=near?Math.atan2(P.x-near.x,P.z-near.z):P.face+Math.PI;tx=P.x+Math.sin(a)*p.dist;tz=P.z+Math.cos(a)*p.dist}
    else if(near&&!o.free){const d=dist(near.x,near.z,P.x,P.z);const k=Math.min(p.dist,d+(p.endNova?0:2))/Math.max(d,0.1);tx=P.x+(near.x-P.x)*k;tz=P.z+(near.z-P.z)*k}
    else{tx=P.x+Math.sin(P.face)*p.dist;tz=P.z+Math.cos(P.face)*p.dist}
    /* arrête la course avant un mur */
    const dx=tx-P.x,dz=tz-P.z,L=Math.hypot(dx,dz)||1;let ok=0;for(let s=0.5;s<=L;s+=0.5){if(walkable(P.x+dx/L*s,P.z+dz/L*s))ok=s;else break}
    tx=P.x+dx/L*ok;tz=P.z+dz/L*ok;
    if(p.startNova){for(const m of enemiesNear(P.x,P.z,p.startNova))hitMob(m,p.dmg*mult,Object.assign({area:1},base));ringFx(P.x,P.z,p.startNova,col,0.4);burst(P.x,1,P.z,col,16,4)}
    P.dash={fx:P.x,fz:P.z,tx,tz,t:0,dur:0.18+ok*0.018,p,mult,base,hit:new Set(),id,col,lastTrail:0};P.face=Math.atan2(dx,dz);
    if(p.mount)showMount(true);if(p.selfBuff)addBuff('sb_'+id,p.selfBuff,p.bdur||3);if(p.healSelf)healP(S.maxHp*p.healSelf);
    break}
  case 'summon':{const U=p.unit;
    if(!p.dur){const mine=pets.filter(q=>q.skill===id);const need=p.count-mine.length;if(need<=0&&!o.free){P.cds[id]=Math.min(P.cds[id],1);return false}
      for(let k=0;k<Math.max(need,o.free?1:0);k++)spawnPet(U,{skill:id,coef:p.dmg*mult,el,label:SK[id].name,x:P.x+rnd(-2,2),z:P.z+rnd(-2,2),petHeal:p.petHeal,slam:p.petSlam,aura:p.petAura})}
    else for(let k=0;k<p.count;k++)spawnPet(U,{skill:id,coef:p.dmg*mult,el,until:NOW+p.dur,label:SK[id].name,x:P.x+rnd(-2.5,2.5),z:P.z+rnd(-2.5,2.5)});
    ringFx(P.x,P.z,3,col,0.5);burst(P.x,0.5,P.z,col,18,3);break}
  case 'buff':{const extra={};if(p.petBuff)extra.petM=1+p.petBuff;
    addBuff('sk_'+id,p.buff||{},p.dur||5,extra);
    if(p.nova){for(const m of enemiesNear(P.x,P.z,p.nova))hitMob(m,p.dmg*mult,Object.assign({area:1},base));ringFx(P.x,P.z,p.nova,col,0.5)}
    if(p.pulse)P.whileT['pulse_'+id]={until:NOW+p.dur,every:p.pulse,t:0,el,id};
    if(p.volley)P.whileT['volley_'+id]={until:NOW+p.dur,every:0.45,t:0,el,id,boom:p.volleyBoom};
    if(p.healSelf)healP(S.maxHp*p.healSelf);
    if(p.trail)P.whileT['trail_'+id]={until:NOW+p.dur,every:0.25,t:0,el,id,dps:p.trail};
    pillar(P.x,P.z,1,5,col,0.6);ringFx(P.x,P.z,4,col,0.6);burst(P.x,1.2,P.z,col,24,3);
    impactProcs(id,P.x,P.z);break}
  case 'trap':{const tx=o.atSelf||!t?P.x:t.x,tz=o.atSelf||!t?P.z:t.z;const n=p.count||3;
    for(let k=0;k<n;k++){const a=k/n*6.28+rnd(0,1),rr=n>1?rnd(1,2.6):0;placeTrap(tx+Math.cos(a)*rr,tz+Math.sin(a)*rr,p,mult,base,col)}break}
  case 'cone':{const a0=o.ring?null:face;const half=(p.angle||50)*Math.PI/360;let n=0;
    for(const m of enemiesNear(P.x,P.z,p.range||8)){const a=Math.atan2(m.x-P.x,m.z-P.z);if(a0==null||Math.abs(((a-a0)%6.283+9.42)%6.283-3.14)<half){hitMob(m,(p.dmg||0.3)*mult,Object.assign({dot:p.dot*mult,dotDur:p.dotDur,slow:p.slow,area:1},base));if(p.vuln){m.curseT=NOW+6;m.vuln=Math.max(m.vuln,p.vuln)}if(p.spread)m.spreadDot={dot:p.dot*mult,dotDur:p.dotDur,el,id};n++}}
    coneFx(P.x,P.z,a0,p.range||8,half,col);break}
  case 'curse':{const tx=t?t.x:P.x,tz=t?t.z:P.z;for(const m of enemiesNear(tx,tz,p.r||5)){m.curseT=NOW+(p.dur||8);m.vuln=Math.max(m.vuln,p.vuln||0.2);if(p.slow)m.slowT=NOW+p.dur*0.6;if(p.lsMark)m.curseLs=p.lsMark;if(p.spread)m.spreadCurse=1;if(p.dot)addDot(m,WD()*p.dot/(p.dotDur||8),p.dotDur||8,el,id);if(p.dmg)hitMob(m,p.dmg*mult,base)}
    ringFx(tx,tz,p.r||5,col,0.6);flashDisc(tx,tz,p.r||5,0x8a3aff,0.5);if(p.selfBuff)addBuff('sb_'+id,p.selfBuff,p.bdur||8);break}
  }
  return true;
}
function fireProj(id,p,a,mult,base,col,t){
  const sp=p.speed||16;const big=p.wide||(p.boom?1:0.6);
  const geo=p.homing||id==='sh_crane'?GB.sph:GB.box;const mesh=new THREE.Mesh(geo,addMat(col,1));
  if(geo===GB.box)mesh.scale.set(0.16*big,0.16*big,1.1);else mesh.scale.setScalar(0.45*big+0.1);
  mesh.userData.shared=1;mesh.userData.sharedMat=1;mesh.position.set(P.x,H(P.x,P.z)+1.2,P.z);mesh.rotation.y=a;worldGroup.add(mesh);
  projs.push({x:P.x,z:P.z,dx:Math.sin(a)*sp,dz:Math.cos(a)*sp,sp,life:(p.range||12)/sp*(p.ret?2:1),t:0,id,p,mult,base,col,mesh,hit:new Set(),r:0.5+(p.wide||0)*0.5,target:p.homing?t:null,ret:p.ret,back:false});
}
function chainFrom(start,n,coef,base,col,first){
  let cur=first||nearestMob(start.x,start.z,7,new Set([start]));const hit=new Set(start?[start]:[]);let prev=start?{x:start.x,z:start.z}:{x:P.x,z:P.z};
  for(let k=0;k<n&&cur;k++){hit.add(cur);const a=new THREE.Vector3(prev.x,H(prev.x,prev.z)+1.2,prev.z),b=new THREE.Vector3(cur.x,H(cur.x,cur.z)+1,cur.z);boltFx(jag(a,b),col,0.3);
    hitMob(cur,coef*(k===0?1:0.85),Object.assign({},base,{boom:0}));if(base.boom){for(const m of enemiesNear(cur.x,cur.z,base.boom))if(m!==cur)hitMob(m,coef*0.5,Object.assign({area:1},base,{boom:0}));ringFx(cur.x,cur.z,base.boom,col,0.3)}
    flashDisc(cur.x,cur.z,0.8,col,0.2);prev=cur;cur=nearestMob(cur.x,cur.z,7,hit)}
}
function coneFx(x,z,a0,range,half,col){const g=a0==null?new THREE.CircleGeometry(range,24):new THREE.CircleGeometry(range,16,-half,half*2);g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,H(x,z)+0.5,z);if(a0!=null)m.rotation.y=a0-Math.PI/2;addFx(m,0.45,(o,t)=>{o.material.opacity=0.45*(1-t/0.45);o.scale.setScalar(0.5+t/0.45*0.5)});fx[fx.length-1].own=1;
  burst(x+Math.sin(a0||0)*range*0.5,1,z+Math.cos(a0||0)*range*0.5,col,18,3,0.8)}
function placeTrap(x,z,p,mult,base,col){if(!walkable(x,z))return;if(traps.length>14){const o=traps.shift();worldGroup.remove(o.mesh)}
  const mesh=new THREE.Mesh(GB.oct,addMat(col,0.9));mesh.userData.shared=1;mesh.userData.sharedMat=1;mesh.scale.set(0.6,0.25,0.6);mesh.position.set(x,H(x,z)+0.2,z);worldGroup.add(mesh);
  traps.push({x,z,p,mult,base,col,mesh,arm:NOW+(p.arm||0),until:NOW+12,mini:p.mini})}
function makeZone(x,z,o){
  if(zones.length>24){const q=zones.shift();worldGroup.remove(q.mesh)}
  const col=elHex(o.el||'phys');const mesh=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.32,blending:THREE.AdditiveBlending,depthWrite:false}));
  mesh.position.set(x,H(x,z)+0.18,z);mesh.scale.setScalar(o.r);worldGroup.add(mesh);
  zones.push(Object.assign({x,z,until:NOW+o.dur,tick:0,mesh,col},o));
}
/* actions des effets (procs) */
function doAction(k,x,z,m,o){
  o=o||{};const lab=o.label||'Effet';
  switch(k){
    case 'chain':{const t=nearestMob(x,z,12);if(t)chainFrom(null,3+(S.chainPlus||0),m,{src:'proc',el:o.el||'foudre',label:lab,proc:0},elHex(o.el||'foudre'),t);break}
    case 'explode':{for(const e of enemiesNear(x,z,4))hitMob(e,m,{src:'proc',el:o.el||'feu',label:lab,proc:0,area:1});burst(x,1,z,0xff8a3a,18,5);ringFx(x,z,4,0xff8a3a,0.35);break}
    case 'poison':{if(o.m)addDot(o.m,WD()*m/5,5,'poison',null,lab);break}
    case 'curse':{for(const e of o.m?[o.m]:enemiesNear(P.x,P.z,8)){e.curseT=NOW+5;e.vuln=Math.max(e.vuln,m||0.2)}if(!o.m)flashDisc(P.x,P.z,8,0x8a3aff,0.4);break}
    case 'miniTrap':placeTrap(x+rnd(-0.5,0.5),z+rnd(-0.5,0.5),{r:2,dmg:m,arm:0.3,el:'phys',mini:1},1,{src:'proc',el:'phys',label:lab,proc:0},0xffc060);break;
    case 'bolts':{const ex=new Set();for(let i=0;i<4;i++){const t=nearestMob(x,z,9,ex);if(!t)break;ex.add(t);const a=Math.atan2(t.x-P.x,t.z-P.z);
      fireProj('tq_carreau',Object.assign({},SKC.tq_carreau||resolveSkill('tq_carreau',-1),{range:12}),a,m/1.5,{id:'tq_carreau',src:'proc',el:'phys',label:lab,proc:0},0xe8e4da,t)}break}
    case 'meteor':{const t=nearestMob(P.x,P.z,14);if(!t)break;const tx=t.x,tz=t.z;pillar(tx,tz,1.2,16,elHex(o.el||'feu'),0.7);
      later(()=>{for(const e of enemiesNear(tx,tz,3.5))hitMob(e,m,{src:'proc',el:o.el||'feu',label:lab,proc:0,area:1});burst(tx,1,tz,elHex(o.el||'feu'),30,6);ringFx(tx,tz,3.5,elHex(o.el||'feu'),0.5);shake=0.15;SFX.boom()},600);break}
    case 'spirit':{for(let i=0;i<(o.n||1);i++)spawnPet('esprit',{coef:m,until:NOW+4,label:lab,x:x+rnd(-1,1),z:z+rnd(-1,1),kamikaze:1,el:'ombre'});break}
    case 'nova':{for(const e of enemiesNear(P.x,P.z,5))hitMob(e,m,{src:'proc',el:o.el||'feu',label:lab,proc:0,area:1});ringFx(P.x,P.z,5,elHex(o.el||'feu'),0.4);break}
    case 'heal':healP(S.maxHp*m);burst(P.x,1.5,P.z,0x9cff6a,10,2);break;
    case 'resource':gainRes(m);break;
    case 'cdr':for(const id in P.cds)P.cds[id]-=m;break;
    case 'summon':spawnPet('lancier',{coef:m,until:NOW+5,label:lab,el:'sacre',x:x,z:z});break;
    case 'pull':for(const e of enemiesNear(P.x,P.z,12))if(!e.boss){const d=dist(e.x,e.z,P.x,P.z)||1;moveMob(e,(P.x-e.x)/d*Math.min(d-1.5,6),(P.z-e.z)/d*Math.min(d-1.5,6))}ringFx(P.x,P.z,12,0xb0a0ff,0.5);break;
  }
}

/* ----- invocations ----- */
function spawnPet(unit,o){
  const U=D.UNITS[unit];if(!U)return;if(pets.length>24){const i=pets.findIndex(q=>q.until);if(i>=0)removePet(i);else return}
  const mesh=unitMesh(unit,o.el&&unit==='lancier'&&o.el==='feu'?0xff9a4a:null);if(U.big)mesh.scale.setScalar(1.6);
  const x=o.x!=null?o.x:P.x,z=o.z!=null?o.z:P.z;mesh.position.set(x,H(x,z),z);worldGroup.add(mesh);
  pets.push(Object.assign({unit,U,x,z,mesh,atkT:rnd(0,0.5),t:0,slamT:5,auraT:0,castT:rnd(2,5)},o));
}
function removePet(i){const p=pets[i];worldGroup.remove(p.mesh);if(p.mesh.material&&p.mesh.material.dispose)p.mesh.material.dispose();pets.splice(i,1)}
function updatePets(dt){
  for(let i=pets.length-1;i>=0;i--){const p=pets[i];if(!p)continue;p.t+=dt;
    if(p.until&&NOW>p.until){burst(p.x,1,p.z,0xb0a0ff,8,2);removePet(i);continue}
    const tgt=nearestMob(p.x,p.z,p.U.ranged?11:9)||(dist(p.x,p.z,P.x,P.z)<12?nearestMob(P.x,P.z,10):null);
    let gx,gz;const k=pets.indexOf(p);
    if(tgt&&dist(tgt.x,tgt.z,P.x,P.z)<16){gx=tgt.x;gz=tgt.z;const d=dist(p.x,p.z,tgt.x,tgt.z);
      p.atkT-=dt;if(d<p.U.range+tgt.r&&p.atkT<=0){p.atkT=p.U.rate;
        const petMul=(p.unit==='clone'||p.unit==='esprit')?1:1;const lab=p.label||p.U.name;
        if(p.kamikaze){hitMob(tgt,p.coef,{id:p.skill,src:'proc',el:p.el||'ombre',label:lab,proc:0});burst(p.x,1,p.z,0xb36bff,12,3);removePet(i);continue}
        if(p.U.ranged){const a=Math.atan2(tgt.x-p.x,tgt.z-p.z);const col=p.el?elHex(p.el):0xffe39a;boltFx([new THREE.Vector3(p.x,H(p.x,p.z)+1.4,p.z),new THREE.Vector3(tgt.x,H(tgt.x,tgt.z)+1,tgt.z)],col,0.15)}
        hitMob(tgt,p.coef*petMul,{id:p.skill||'pets',src:p.skill?'pet':'proc',el:p.el||'phys',label:lab,proc:p.skill?1:0,procCoef:0.3});
        if(p.petHeal)healP(S.maxHp*p.petHeal);
        p.lunge=0.2;}
      if(p.slam){p.slamT-=dt;if(p.slamT<=0){p.slamT=5;for(const m of enemiesNear(p.x,p.z,4))hitMob(m,p.coef*1.5,{id:p.skill,src:'pet',el:'phys',label:p.label+' (onde)',area:1});ringFx(p.x,p.z,4,0xd8ccb0,0.4);shake=0.1}}
      if(p.aura){p.auraT-=dt;if(p.auraT<=0){p.auraT=1;for(const m of enemiesNear(p.x,p.z,4))addDot(m,WD()*p.coef*0.3,2,'poison',p.skill,p.label+' (aura)')}}
      for(const f of FX('petCast'))if(p.skill||p.unit==='lancier'){p.castT-=dt/Math.max(1,pets.length*0.5);if(p.castT<=0){p.castT=f.every;const q=SKC[f.cast]||resolveSkill(f.cast,-1);const ox=P.x,oz=P.z,of=P.face;
        const tx=tgt.x,tz=tgt.z;castFrom(p,f.cast,q,f.m,f.src)}}
    }else{const a=p.t*0.8+k*1.3;gx=P.x+Math.cos(a)*(2+k%3);gz=P.z+Math.sin(a)*(2+k%3)}
    const d=dist(p.x,p.z,gx,gz);const want=tgt?p.U.range*0.8:0.5;
    if(d>want){const sp=p.U.speed*(d>15?2:1)*dt;p.x+=(gx-p.x)/d*Math.min(sp,d-want);p.z+=(gz-p.z)/d*Math.min(sp,d-want)}
    if(dist(p.x,p.z,P.x,P.z)>26){p.x=P.x+rnd(-1,1);p.z=P.z+rnd(-1,1)}
    p.lunge=Math.max(0,(p.lunge||0)-dt);const fly=p.U.fly?1.6+Math.sin(p.t*4)*0.25:0;
    p.mesh.position.set(p.x,H(p.x,p.z)+fly+(p.lunge>0?0.15:0),p.z);p.mesh.rotation.y=Math.atan2(gx-p.x,gz-p.z)+Math.PI;
    if(p.unit==='clone')animHero(p.mesh,p.t,d>want,p.lunge>0?0.2:0,dt);
    if(!p.U.fly)shadowAt(p.x,p.z,p.U.big?1:0.5);
  }
}
/* une invocation lance une compétence depuis sa position */
function castFrom(pet,id,q,m,label){const ox=P.x,oz=P.z;P.x=pet.x;P.z=pet.z;try{castSkill(id,{free:1,p:q,m,label})}finally{P.x=ox;P.z=oz}}

/* ----- projectiles, zones, pièges ----- */
function updateProjs(dt){
  for(let i=projs.length-1;i>=0;i--){const q=projs[i];if(!q)continue;q.life-=dt;
    if(q.hostile){q.x+=q.dx*dt;q.z+=q.dz*dt;q.mesh.position.set(q.x,H(q.x,q.z)+1.1,q.z);if(Math.random()<0.6)emit(q.x,H(q.x,q.z)+1.1,q.z,0,0.3,0,0xff6a2a,0.25,0);
      if(dist(q.x,q.z,P.x,P.z)<q.r+0.4){hurtPlayer(q.dmg,'ranged',q.src);q.life=0;burst(q.x,1.1,q.z,0xff8a3a,6,2)}
      else if(MAP.dungeon&&!walkable(q.x,q.z))q.life=0;
      if(q.life<=0){worldGroup.remove(q.mesh);projs.splice(i,1)}continue}
    if(q.target&&!q.target.dead){const a=Math.atan2(q.target.x-q.x,q.target.z-q.z);const ca=Math.atan2(q.dx,q.dz);let da=((a-ca)%6.283+9.42)%6.283-3.14;const na=ca+clamp(da,-5*dt,5*dt);q.dx=Math.sin(na)*q.sp;q.dz=Math.cos(na)*q.sp}
    else if(q.p.homing&&!q.target){q.target=nearestMob(q.x,q.z,10)}
    if(q.ret&&!q.back&&q.life<(q.p.range/q.sp)){q.back=true;q.hit.clear()}
    if(q.back){const d=dist(q.x,q.z,P.x,P.z)||1;q.dx=(P.x-q.x)/d*q.sp;q.dz=(P.z-q.z)/d*q.sp;if(d<1)q.life=0}
    q.x+=q.dx*dt;q.z+=q.dz*dt;q.mesh.position.set(q.x,H(q.x,q.z)+1.2,q.z);if(Math.random()<0.8)emit(q.x+rnd(-0.1,0.1),H(q.x,q.z)+1.2,q.z+rnd(-0.1,0.1),-q.dx*0.05,rnd(0,0.4),-q.dz*0.05,q.col,0.3,0);q.mesh.rotation.y=Math.atan2(q.dx,q.dz);if(!q.p.homing)q.mesh.rotation.z+=dt*(q.id==='pal_lame'?18:0);
    if(MAP.dungeon&&!walkable(q.x,q.z)&&!q.back)q.life=0;
    if(q.p.trail&&Math.random()<dt*8)makeZone(q.x,q.z,{r:1.4,dur:2.5,dps:q.p.trail*q.mult,el:q.p.el,id:q.id,label:q.base.label});
    for(const m of mobs){if(m.dead||!m.active||q.hit.has(m))continue;if(dist(m.x,m.z,q.x,q.z)<m.r+q.r){q.hit.add(m);
      hitMob(m,q.p.dmg*q.mult,Object.assign({slow:q.p.slow,stun:q.p.stun,dot:q.p.dot,dotDur:q.p.dotDur,gainHit:q.p.gainHit},q.base));
      if(q.p.boom){for(const e of enemiesNear(q.x,q.z,q.p.boom))if(e!==m)hitMob(e,q.p.dmg*q.mult*0.7,Object.assign({area:1},q.base));ringFx(q.x,q.z,q.p.boom,q.col,0.3);burst(q.x,1,q.z,q.col,10,3);impactProcs(q.id,q.x,q.z);zoneOnAt(q.id,q.x,q.z,'target');
        if(q.p.zdur)makeZone(q.x,q.z,{r:q.p.boom,dur:q.p.zdur,dps:q.p.zdps*q.mult,el:q.p.el,id:q.id,label:q.base.label})}
      else{burst(q.x,H(q.x,q.z)+1.1,q.z,q.col,5,2);sparks(q.x,H(q.x,q.z)+1.1,q.z,0xffffff,3,5)}
      if(q.p.jumps)chainFrom(m,q.p.jumps,q.p.dmg*q.mult*0.6,q.base,q.col);
      if(!q.p.pierce&&!q.ret){q.life=0;break}}}
    if(q.life<=0){worldGroup.remove(q.mesh);projs.splice(i,1)}
  }
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];if(!z)continue;if(z.follow){z.x=P.x;z.z=P.z}z.mesh.position.set(z.x,H(z.x,z.z)+0.18,z.z);z.tick-=dt;
    const life=z.until-NOW;z.mesh.material.opacity=0.32*Math.min(1,life*2)*(0.8+Math.sin(NOW*6)*0.2);
    if(z.tick<=0){z.tick=0.5;for(const m of enemiesNear(z.x,z.z,z.r)){if(z.eff==='thorns')hitMob(m,0,{flat:(WD()*z.dps*0.5+(S.thorns*S.thornsM)*0.5),label:z.label,el:z.el,src:'proc',proc:0});else hitMob(m,z.dps*0.5,{id:z.id,el:z.el,src:z.id?'skill':'proc',label:z.label,proc:0,area:1,noCrit:0});if(z.slowZone)m.slowT=NOW+1}
      if(z.heal&&dist(P.x,P.z,z.x,z.z)<z.r)healP(S.maxHp*z.heal*0.5);
      if(z.bolts){const t=nearestMob(z.x,z.z,z.r);if(t){boltFx(jag(new THREE.Vector3(t.x,8,t.z),new THREE.Vector3(t.x,H(t.x,t.z)+0.5,t.z)),0xb6c0ff,0.25);hitMob(t,z.dps,{id:z.id,el:'foudre',src:'skill',label:z.label,proc:0})}}
      if(Math.random()<0.5)burst(z.x+rnd(-z.r,z.r)*0.6,H(z.x,z.z)+0.3,z.z+rnd(-z.r,z.r)*0.6,z.col,4,1.5,0.5)}
    if(NOW>z.until){worldGroup.remove(z.mesh);z.mesh.material.dispose();zones.splice(i,1)}}
  for(let i=traps.length-1;i>=0;i--){const t=traps[i];if(!t)continue;t.mesh.rotation.y+=dt*2;const armed=NOW>=t.arm;t.mesh.material=addMat(armed?t.col:0x666666,0.9);
    let trig=false;if(armed)for(const m of mobs)if(!m.dead&&m.active&&dist(m.x,m.z,t.x,t.z)<(t.p.r||3)*0.6+m.r){trig=true;break}
    if(trig){const r=t.p.r||3;for(const m of enemiesNear(t.x,t.z,r))hitMob(m,t.p.dmg*t.mult,Object.assign({slow:t.p.slow,dot:t.p.dot,dotDur:t.p.dotDur,area:1},t.base));
      if(t.p.jumps){const f=nearestMob(t.x,t.z,r);if(f)chainFrom(f,t.p.jumps,t.p.dmg*t.mult*0.5,t.base,t.col)}
      burst(t.x,0.6,t.z,t.col,18,5);ringFx(t.x,t.z,r,t.col,0.35);flashDisc(t.x,t.z,r,t.col,0.25);if(!t.mini)impactProcs(t.base.id,t.x,t.z);
      worldGroup.remove(t.mesh);traps.splice(i,1);continue}
    if(NOW>t.until){worldGroup.remove(t.mesh);traps.splice(i,1)}}
}
let mountTimer=0;
function showMount(on){if(on){if(!mountMesh){const m=Object.assign({},D.MONSTERS.sanglier,{color:0xfff0c0,eye:0xffffff,tusks:0});mountMesh=new THREE.Mesh(monsterGeo(m,'mount'),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false}));mountMesh.scale.set(1.3,1.5,1.6)}
  scene.add(mountMesh);mountTimer=0.5}else scene.remove(mountMesh)}
/* ================= Déroulement du jeu ================= */
const GS={mode:'title',zone:null,rift:null,portals:[],npcs:[],shrines:[],events:[],bossRef:null,farmIdx:0,farmWait:0,lastInput:0,fade:0,loading:false,checkpoint:null};
let curScale=monsterScale(0,1,0);
const curDiffIdx=()=>GS.rift&&GS.rift.gr?Math.min(19,3+Math.ceil(GS.rift.gr/4)):(hero()?hero().diff||0:0);
let heroFlash=0;

/* ----- héros ----- */
function newHero(name,cls){
  const h={id:uid(),name,cls,lvl:1,xp:0,equip:{},inv:[],skills:[],diff:0,act:0,actDone:false,act2:0,act2Done:false,wp:['landes'],fus:{known:[],active:[]},cubeEq:{},gems:[],gemSock:{},para:{},
    bestGR:0,bestGRt:0,comp:{active:null,gear:{},sk:[0,0]},bounties:null,builds:[null,null,null,null,null],kills:0,created:Date.now()};
  const sk=D.SKILLS.filter(s=>s.cls===cls);h.skills=D.CATS.map(c=>{const s=sk.find(x=>x.cat===c.id&&x.lvl<=1);return s?{id:s.id,rune:-1}:null});
  /* équipement de départ */
  h.equip.arme=makeItem({ilvl:1,cls,r:'c',slot:'arme'});h.equip.torse=makeItem({ilvl:1,cls,r:'c',slot:'torse'});
  if(cls==='paladin')h.equip.offhand=makeItem({ilvl:1,cls,r:'c',slot:'offhand'});
  return h;
}
function unlockSkillsAt(h,lvl){
  const news=D.SKILLS.filter(s=>s.cls===h.cls&&s.lvl===lvl);
  news.forEach(s=>{const ci=D.CATS.findIndex(c=>c.id===s.cat);if(!h.skills[ci]){h.skills[ci]={id:s.id,rune:-1}}toast(`<b>Nouvelle compétence :</b> ${s.name}`,3200);tutoTip('newSkill')});
  D.SKILLS.filter(s=>s.cls===h.cls).forEach(s=>s.runes.forEach(r=>{if(r.lvl===lvl){toast(`<b>Nouvelle rune :</b> ${s.name} — ${r.name}`,3000);tutoTip('rune')}}));
}
function gainXp(v){
  const h=hero();if(!h||v<=0)return;
  if(h.lvl<70){h.xp+=v;while(h.lvl<70&&h.xp>=xpNeed(h.lvl)){h.xp-=xpNeed(h.lvl);h.lvl++;onLevelUp(h)}if(h.lvl>=70){G.paragon.xp+=h.xp;h.xp=0}}
  else{G.paragon.xp+=v;while(G.paragon.xp>=paraNeed(G.paragon.lvl+1)){G.paragon.xp-=paraNeed(G.paragon.lvl+1);G.paragon.lvl++;toast(`<b>Parangon ${G.paragon.lvl}</b> — un point à placer`,2600);SFX.lvl();if(G.paragon.lvl===1)tutoTip('paragon')}}
}
function onLevelUp(h){
  rebuild();P.hp=S.maxHp;P.res=S.resMaxTot;SFX.lvl();ringFx(P.x,P.z,6,0xffd36a,0.9);later(()=>ringFx(P.x,P.z,9,0xffd36a,1.1),200);pillar(P.x,P.z,1.4,14,0xffd36a,1.3);fountain(P.x,P.z,0xffd36a,60,10);flashLight(P.x,H(P.x,P.z)+3,P.z,0xffd36a,3,1.2,18);
  {const ns=D.SKILLS.filter(s=>s.cls===h.cls&&s.lvl===h.lvl).map(s=>s.name);banner('NIVEAU '+h.lvl,ns.length?'Nouvelle compétence : '+esc(ns.join(', ')):'Vie et ressource restaurées','#ffd36a')}unlockSkillsAt(h,h.lvl);rebuild();
  if(h.lvl===D.UNLOCKS.tavern&&!h.actDone)tutoTip('tavern');if(h.lvl===D.UNLOCKS.altar)tutoTip('altar');
  if(h.lvl===70){P.mobLvl=70;tutoTip('paragon')}
  if(GS.zone&&!GS.rift)P.mobLvl=Math.max(zoneLvl(),h.lvl);
  save();
}
const zoneLvl=()=>{const z=D.ZONES[GS.zone];return z&&z.lvl||1};

/* ----- butin ----- */
/* butin : jaillit du corps (from) puis retombe ; légendaires/sets/antiques ont une fanfare et un rayon particulier */
function dropItem(x,z,it,from){
  if(MAP&&!walkable(x,z)){const q=nearestWalkable(x,z);x=q.x;z=q.z}
  const big=it.r==='l'||it.r==='s';const c=it.anc===2?0xff3a3a:it.anc===1?0xffc040:D.RARITIES[it.r].c;const R=D.RARITIES[it.r];const bh=R.beam*(it.anc?1.4:1);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(big?0.16:0.1,big?0.42:0.28,bh,10,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:big?0.65:0.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  const h=H(x,z);beam.position.set(x,h+bh/2,z);const gem=new THREE.Mesh(GB.oct,basicMat(c));gem.scale.setScalar(big?0.7:0.5);gem.position.set(x,h+0.5,z);
  worldGroup.add(beam,gem);const dr={x,z,it,beam,gem,t:0,big,c};drops.push(dr);
  if(big){const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));ring.position.set(x,h+0.15,z);ring.scale.setScalar(1.2);worldGroup.add(ring);dr.ring=ring}
  if(from&&dist(from.x,from.z,x,z)>0.2){dr.fly={fx:from.x,fz:from.z,t:0,dur:0.55};beam.visible=false;if(dr.ring)dr.ring.visible=false;gem.position.set(from.x,H(from.x,from.z)+1,from.z)}else landDrop(dr);
}
function landDrop(d){d.fly=null;d.beam.visible=true;if(d.ring)d.ring.visible=true;tutoTip('loot');
  if(d.big){const it=d.it;if(it.r==='l'||it.r==='s')d.lab=addLabel(d.x,d.z,1.8,`<span style="color:${rarCss(it)}">${esc(it.name)}</span>`,'loot');
    SFX.leg();flashLight(d.x,H(d.x,d.z)+3,d.z,d.c,3.2,0.9,18);fountain(d.x,d.z,d.c,40,9);ringFx(d.x,d.z,6,d.c,0.8);shake=Math.max(shake,0.12);
    banner(it.anc===2?'PRIMORDIAL':it.anc===1?'ANTIQUE':it.r==='s'?'OBJET DE SET':'LÉGENDAIRE',esc(it.name),rarCss(it))}}
function dropGold(x,z,v,from){if(MAP&&!walkable(x,z)){const q=nearestWalkable(x,z);x=q.x;z=q.z}const g=new THREE.Mesh(GB.ico,basicMat(0xffd04a));g.scale.setScalar(0.32);g.position.set(x,H(x,z)+0.3,z);worldGroup.add(g);const d={x,z,gold:Math.round(v),gem:g,t:0};drops.push(d);if(from){d.fly={fx:from.x,fz:from.z,t:0,dur:0.45};g.position.set(from.x,H(from.x,from.z)+1,from.z)}}
function dropGlobe(x,z){if(MAP&&!walkable(x,z)){const q=nearestWalkable(x,z);x=q.x;z=q.z}const g=new THREE.Mesh(GB.sph,addMat(0xff3a3a,0.9));g.scale.setScalar(0.5);g.position.set(x,H(x,z)+0.6,z);worldGroup.add(g);globes.push({x,z,mesh:g,t:0})}
function lootRolls(m){
  const h=hero();const L=Math.min(70,m.lvl);const sc=curScale;let rolls=0,force=false;
  if(m.boss){rolls=m.def.guardian?5:6;force=true}else if(m.named){rolls=3;force=hero().actDone&&Math.random()<0.5}else if(m.elite==='rare'){rolls=3}else if(m.elite==='champion'){rolls=1}else if(m.elite==='minion'){rolls=Math.random()<0.25?1:0}else rolls=Math.random()<0.08?1:0;
  if(GS.rift&&GS.rift.gr&&!m.boss)rolls=0;
  if(m.echo){rolls=3;force=true}
  const primal=(GS.rift&&GS.rift.gr>=D.GREATER_RIFT.primalAt)||curDiffIdx()>=19;
  for(let i=0;i<rolls;i++){const it=rollDrop({ilvl:L,leg:sc.leg,forceLeg:force&&i<(m.boss?2:1),primal,legBoost:m.legBoost});if(it){const a=rnd(0,6.28),r=rnd(1,m.boss||m.elite?3.6:2.2);dropItem(m.x+Math.cos(a)*r,m.z+Math.sin(a)*r,it,m)}}
  const gch=m.boss?1:m.elite?0.8:0.25;if(Math.random()<gch){const n=m.boss?6:m.elite?2:1;for(let i=0;i<n;i++)dropGold(m.x+rnd(-2.2,2.2),m.z+rnd(-2.2,2.2),goldDrop(L)*rnd(0.7,1.3)*(1+sc.gold)*(1+S.gold)*(m.boss?4:1),m)}
  if(Math.random()<(m.elite||m.boss?0.9:0.07))dropGlobe(m.x+rnd(-1,1),m.z+rnd(-1,1));
}
function killMob(m,o){
  if(m.dead)return;m.dead=true;m.deadT=m.boss?1.6:0.9;m.deadMax=m.deadT;m.dieSide=Math.random()<0.5?-1:1;m.hp=0;const h=hero();
  if(m.boss||m.elite==='rare'||m.named){hitStop=Math.max(hitStop,m.boss?0.12:0.06);flashLight(m.x,m.y+2,m.z,m.def.eye||0xffaa55,m.boss?4:2.5,0.6,16);sparks(m.x,m.y+1,m.z,0xffffff,20,8);if(m.boss){shake=0.6;fountain(m.x,m.z,0xffaa3a,60,10)}}
  burst(m.x,m.y+0.8,m.z,m.def.eye||0xffffff,m.boss?60:16,m.boss?7:4);if(m.hpEl){m.hpEl.remove();m.hpEl=null}
  if(m.parent)m.parent.summons--;
  if(m.pack){m.pack.alive--}
  const L=m.lvl,sc=curScale;
  const xm=m.boss?80:m.named?25:m.elite==='rare'?10:m.elite==='champion'?6:m.elite==='minion'?2:1;
  const xp=xpMob(Math.min(70,L))*xm*m.xp*(1+sc.xp)*(1+S.xpk);gainXp(xp);
  if(Math.random()<0.3||m.elite||m.boss)floatNum(m.x,m.y+m.h+0.6,m.z,'+'+fmt(xp)+' xp','xp');
  h.kills++;G.season.kills++;if(m.elite||m.named)G.season.elites++;
  lootRolls(m);
  /* effets à la mort */
  for(const f of FX('onKill'))if((!f.on||(o&&o.id===f.on))&&(!f.cond||(f.cond==='cursed'&&m.curseT>NOW))&&Math.random()<f.ch)doAction(f.do,m.x,m.z,f.m,{label:f.src});
  if(m.spreadDot)for(const e of enemiesNear(m.x,m.z,5).slice(0,4))addDot(e,WD()*m.spreadDot.dot/(m.spreadDot.dotDur||4),m.spreadDot.dotDur||4,m.spreadDot.el,m.spreadDot.id);
  if(m.spreadCurse)for(const e of enemiesNear(m.x,m.z,6)){e.curseT=NOW+6;e.vuln=Math.max(e.vuln,m.vuln);e.spreadCurse=1}
  if(m.affix.includes('moltene'))telegraph(m.x,m.z,3.4,m.dmg*3,1.4,{color:0xff3a0a});
  /* faille */
  if(GS.rift&&!GS.rift.guardianSpawned){GS.rift.progress+=m.progress*(GS.rift.gr?0.85:1);if(GS.rift.progress>=100)spawnGuardian();
    else if(GS.rift.progress>=50&&!GS.rift.echoDone&&D.SEASON.rule.id==='echos'){GS.rift.echoDone=true;spawnEcho()}}
  if(m.onDeath)m.onDeath(m);
  if(m.bounty)bountyDone(m.bounty);
  questKill(m);
  if(m.boss&&GS.bossRef===m){GS.bossRef=null}
}
/* conseil court du Conseiller NOVA après une mort */
function deathTip(){
  const L=P.mobLvl,mt=mitigation(S,L),sc=curScale,dn=GS.rift&&GS.rift.gr?'la faille supérieure '+GS.rift.gr:DIFF[hero().diff||0].n;const hit=mobDmg(L)*sc.dmg*mt.mult/S.maxHp;const lh=P.lastHit||{};
  if(hit>0.12)return `Un coup normal t'enlève ${pct(hit)} de ta vie en ${dn} : baisse la difficulté, ou monte vitalité, armure et résistances.`;
  if(lh.type==='aoe'&&P.deaths<=3)return "Tu es resté dans une zone au sol : dès qu'un cercle rouge apparaît, sors-en avant qu'il ne soit plein.";
  if(mt.rDR<mt.aDR-0.12)return `Ta résistance est faible pour ${dn} (${pct(mt.rDR)} de réduction) : cherche « Toutes les résistances » sur bijoux, poignets et ceinture.`;
  if(mt.aDR<mt.rDR-0.12)return `Ton armure est faible pour ${dn} (${pct(mt.aDR)} de réduction) : torse, épaules et bouclier en donnent beaucoup.`;
  if(!S.loh&&!S.ls&&!S.regen)return "Tu n'as aucune récupération : « vie par coup », « vol de vie » ou régénération t'aideraient beaucoup.";
  if(!SLOTSK.some(id=>id&&SK[id].cat==='defense'))return 'Équipe une compétence défensive (onglet Compétences) : elle se lance seule quand ta vie baisse.';
  if(lh.aff)return `Cet élite avait : ${lh.aff}. Lis ses pouvoirs sous son nom et garde tes distances.`;
  return 'Reste en mouvement autour des élites et des boss : leurs attaques lourdes sont annoncées au sol.';
}
function playerDie(){
  P.dead=1;P.hp=0;P.deaths++;combatLog.deaths++;const gr=GS.rift&&GS.rift.gr;
  const t=gr?D.GREATER_RIFT.respawn[Math.min(GS.rift.deaths,5)]:3;if(GS.rift)GS.rift.deaths++;
  P.deadT=t;P.deadWait=0;P.hereT=gr?1e9:6;P.dash=null;showMount(false);clearHazards();
  const L=Math.min(70,P.mobLvl);const loss=gr?0:Math.min(Math.floor(G.gold*0.03),Math.round(goldDrop(L)*40));G.gold-=loss;
  const lh=P.lastHit||{};
  $('deadCause').innerHTML=`Vaincu par <b>${esc(lh.who||'un ennemi')}</b>${lh.type==='aoe'?' (zone au sol)':lh.type==='ranged'?' (tir)':''}<br><small>${esc(lh.zone||'')}</small>`;
  $('deadTip').innerHTML=`<b>NOVA :</b> ${esc(deathTip())}`;
  $('deadPen').textContent=gr?`Faille supérieure : réapparition dans ${t} s (+5 s à chaque mort).`:(loss?`Réparations : −${fmt(loss)} or`:'');
  $('dlg').classList.remove('on');dlgQ=[];$('dead').classList.add('on');updateDeadButtons();
  for(const m of mobs)m.aggro=false;
}
function updateDeadButtons(){const gr=GS.rift&&GS.rift.gr;const a=$('respWp'),b=$('respHere');if(!a)return;
  a.disabled=P.deadT>0;a.textContent=P.deadT>0?`Point de passage (${Math.ceil(P.deadT)} s)`:'Réapparaître au point de passage';
  b.style.display=gr?'none':'';b.disabled=P.deadWait<P.hereT;b.textContent=P.deadWait<P.hereT?`Réapparaître ici (${Math.ceil(P.hereT-P.deadWait)} s)`:'Réapparaître ici'}
function respawn(here){
  P.dead=0;P.deadT=0;P.hp=S.maxHp;P.res=S.resMaxTot*0.5;P.res2=CLS[hero().cls].res2?CLS[hero().cls].res2.max:0;P.invuln=NOW+(here?3:2.5);P.root=0;P.slowT=0;P.shield=0;P.dash=null;
  if(!here||!MAP||!walkable(P.x,P.z)){const cp=GS.checkpoint||MAP.start;P.x=cp.x;P.z=cp.z}$('dead').classList.remove('on');
  for(const m of mobs){m.aggro=false;if(m.boss)m.hp=Math.min(m.max,m.hp+m.max*0.15)}
}

/* ----- objets interactifs : portails, sanctuaires, pylônes ----- */
const portalGeo=new THREE.TorusGeometry(1.4,0.18,8,24);portalGeo.userData.keep=1;
function addPortal(x,z,to,label,color,o){
  const g=new THREE.Group();const ring=new THREE.Mesh(portalGeo,addMat(color||0x5ab0ff,0.95));ring.position.y=1.6;const disc=new THREE.Mesh(new THREE.CircleGeometry(1.3,24),addMat(color||0x5ab0ff,0.35));disc.position.y=1.6;
  g.add(ring,disc);g.position.set(x,H(x,z),z);worldGroup.add(g);const p=Object.assign({x,z,to,label,mesh:g,ring},o||{});GS.portals.push(p);addLabel(x,z,3.5,label,'portal');return p;
}
const SHRINES=[{id:'puissance',n:'Sanctuaire de puissance',buff:{dmg:0.25},c:0xff6a3a},{id:'protection',n:'Sanctuaire de protection',buff:{dr:0.25},c:0x6ab0ff},{id:'celerite',n:'Sanctuaire de célérité',buff:{ms:0.25,as:0.15},c:0xffe06a},{id:'fortune',n:'Sanctuaire de fortune',buff:{},c:0x6aff9a,fortune:1}];
const PYLONS=[{id:'puissance',n:'Pylône de puissance',d:'Dégâts ×5',c:0xff3a3a},{id:'vitesse',n:'Pylône de vitesse',d:'Vitesse +60 %',c:0xffe04a},{id:'canal',n:'Pylône de canalisation',d:'Coûts nuls, recharges ×4',c:0x9a6aff},{id:'bouclier',n:'Pylône de bouclier',d:'Invulnérable',c:0x6ae0ff},{id:'conduction',n:'Pylône de conduction',d:'Éclairs autour de toi',c:0x9ab0ff},{id:'frenesie',n:'Pylône de frénésie',d:'Vitesse d\'attaque +60 %',c:0xff8a2a,buff:{as:0.6}},{id:'givre',n:'Pylône de givre',d:'Une onde gelante toutes les 2 s',c:0x7fdcff}];
function addShrine(x,z,pyl){
  const d=pyl?pick(PYLONS):pick(SHRINES);const g=new THREE.Group();const base=new THREE.Mesh(GB.cyl,basicMat(0x3a3440));base.scale.set(1.4,0.4,1.4);base.position.y=0.2;
  const cr=new THREE.Mesh(GB.oct,addMat(d.c,0.9));cr.scale.set(0.9,1.6,0.9);cr.position.y=1.8;g.add(base,cr);if(!walkable(x,z)){const p=nearestWalkable(x,z);x=p.x;z=p.z}g.position.set(x,H(x,z),z);worldGroup.add(g);
  GS.shrines.push({x,z,d,mesh:g,cr,pyl,used:false});addLabel(x,z,3.6,d.n,'shrine');
}
function useShrine(s){s.used=true;s.cr.material=basicMat(0x444444);s.label&&s.label.remove();
  if(s.pyl){addBuff('py_'+s.d.id,s.d.buff||{},s.d.id==='bouclier'?15:20);toast(`<b>${s.d.n}</b> — ${s.d.d}`,2500)}
  else{addBuff('shr_'+s.d.id,s.d.fortune?{}:s.d.buff,30,s.d.fortune?{fortune:1}:{});toast(`<b>${s.d.n}</b> (30 s)`,2400)}
  pillar(s.x,s.z,1.5,12,s.d.c,1);burst(P.x,1.5,P.z,s.d.c,30,4);SFX.quest()}

/* ----- étiquettes au-dessus des objets (DOM) ----- */
const labels=[];
function addLabel(x,z,y,txt,cls){const el=document.createElement('div');el.className='wlabel '+(cls||'');el.innerHTML=txt;$('labels').appendChild(el);const L={x,z,y,el};labels.push(L);return el}
function clearLabels(){labels.forEach(l=>l.el.remove());labels.length=0}
const _pv=new THREE.Vector3();
function project(x,y,z){_pv.set(x,y,z).project(cam);return{x:(_pv.x+1)/2*100,y:(1-_pv.y)/2*100,vis:_pv.z<1&&Math.abs(_pv.x)<1.1&&Math.abs(_pv.y)<1.1}}
function updateLabels(){for(const l of labels){const p=project(l.x,H(l.x,l.z)+l.y,l.z);const d=dist(l.x,l.z,P.x,P.z);l.el.style.display=p.vis&&d<30?'':'none';if(p.vis){l.el.style.left=p.x+'%';l.el.style.top=p.y+'%'}}}

/* ----- chargement d'une zone ----- */
function resetEntities(){
  timers.length=0;GS.sealed=null;
  mobs.forEach(removeMob);mobs.length=0;for(let i=pets.length-1;i>=0;i--)if(pets[i].until)removePet(i);
  projs.length=0;zones.length=0;traps.length=0;hazards.length=0;drops.length=0;globes.length=0;GS.portals=[];GS.npcs=[];GS.shrines=[];GS.events=[];GS.bossRef=null;clearLabels();
  document.querySelectorAll('.mhp').forEach(e=>e.remove());dummyStat.on=false;$('dummyBox').classList.remove('on');P.dash=null;showMount(false);townDummies=[];
}
function fadeTo(fn,txt){
  const f=$('fade');f.querySelector('span').textContent=txt||'';f.classList.add('on');GS.loading=true;
  setTimeout(()=>{try{fn()}catch(e){console.error(e)}setTimeout(()=>{f.classList.remove('on');GS.loading=false},250)},380);
}
function enterZone(id,o){
  o=o||{};const h=hero();const Z=D.ZONES[id];
  fadeTo(()=>{
    resetEntities();GS.zone=id;GS.rift=null;GS.checkpoint=null;GS.farmIdx=0;
    curScale=monsterScale(h.diff||0,1,0);P.mobLvl=Math.max(Z.lvl||1,h.lvl);
    for(let i=pets.length-1;i>=0;i--){/* les invocations permanentes suivent */}
    if(Z.type==='town')buildTown();
    else{buildMap(Z.type==='dungeon'?'dungeon':'outdoor',{theme:Z.theme,size:Z.size,seed:o.seed});populateZone(id)}
    P.x=MAP.start.x;P.z=MAP.start.z;P.dead=0;$('dead').classList.remove('on');
    pets.forEach(p=>{p.x=P.x+rnd(-2,2);p.z=P.z+rnd(-2,2)});if(compState){compState.x=P.x+1;compState.z=P.z+1}
    if(Z.type!=='town'&&!h.wp.includes(id))h.wp.push(id);
    startMusic(Z.music);updateTracker();renderSkillBar();
    if(Z.enter&&!G.tuto['enter_'+id]){G.tuto['enter_'+id]=1;setTimeout(()=>dialog([Z.enter]),700)}
    if(Z.type==='town'&&!G.tuto.town)setTimeout(()=>tutoTip('town'),900);
    save();
  },Z.name);
}
function populateZone(id){
  const Z=D.ZONES[id],h=hero(),M=MAP;
  const spots=[];for(let i=0;i<Z.packs;i++){const f=0.08+0.9*i/Z.packs;const p=M.posAt(f);spots.push({x:p.x+rnd(-6,6),z:p.z+rnd(-6,6),f})}
  /* clairières/salles annexes */
  if(M.blobs)M.blobs.forEach(b=>spots.push({x:b.x,z:b.z,f:0.5}));if(M.rooms)M.rooms.filter(r=>r.side).forEach(r=>spots.push({x:r.x,z:r.z,f:0.5}));
  shuffle(spots);let eN=Z.elites;
  spots.forEach((s,i)=>{if(dist(s.x,s.z,M.start.x,M.start.z)<14)return;spawnPack(s.x,s.z,{fams:Z.fams,elite:eN>0&&i%3===0&&s.f>(Z.lvl<=1?0.4:0.2)?(eN--,Math.random()<0.5?'champion':'rare'):null})});
  /* sanctuaires */
  for(let i=0;i<2;i++){const p=M.posAt(0.3+i*0.35);addShrine(p.x+rnd(-4,4),p.z+rnd(-4,4),false)}
  GS.zoneUnits=mobs.reduce((a,m)=>a+(m.dead?0:m.progress||1),0);
  /* campagne : monstre nommé de l'étape en cours */
  const qs=questState(h),step=qs&&qs.step;
  if(step&&step.zone===id){
    if(step.goal==='named'&&(!step.clear||(h.qk&&h.qk[step.id]||0)>=clearNeed(step))){const nd=Z.named.find(n=>n.id===step.named);if(nd){const p=M.posAt(nd.at);spawnNamed(nd.type,p.x,p.z,nd.name,{quest:nd.id})}}
  }
  if(Z.boss&&(!h.actDone||!h.bounties)){const p=M.end;GS.bossSpot=p}
  if(Z.boss){const p=M.end;const sealed=step&&step.goal==='boss'&&step.zone===id&&step.clear&&((h.qk&&h.qk[step.id])||0)<clearNeed(step);
    if(sealed){GS.sealed={x:p.x,z:p.z,boss:Z.boss};const ring=new THREE.Mesh(ringGeo,addMat(0xff5a2a,0.8));ring.scale.setScalar(7);ring.position.set(p.x,H(p.x,p.z)+0.2,p.z);worldGroup.add(ring);GS.sealed.ring=ring;addLabel(p.x,p.z,4,'Antre scellé — purifie le donjon','danger')}
    else{const b=spawnMob(null,p.x,p.z,{boss:Z.boss,named:null,leash:60});b.questBoss=1;GS.bossRef=b;addLabel(p.x,p.z,7,'Antre du boss','danger')}}
  /* événements */
  (Z.events||[]).forEach(ev=>{const p=M.posAt(ev.at);GS.events.push({x:p.x,z:p.z,ev,state:0,wave:0,name:ev.name});addLabel(p.x,p.z,2.5,'⚑ '+ev.name,'event')});
  /* primes (mode aventure) */
  if(h.actDone)spawnBounties(id);
  /* sortie */
  if(Z.next){addPortal(M.end.x,M.end.z,Z.next,'Passage : '+D.ZONES[Z.next].name)}
  addPortal(M.start.x+3,M.start.z+2,'ville','Havrebraise',0xffa040);
  GS.checkpoint={x:M.start.x,z:M.start.z};
}
function spawnNamed(type,x,z,name,o){const m=spawnMob(type,x,z,Object.assign({named:1,elite:null,affix:shuffle(D.ELITE_AFFIXES.map(a=>a.id)).slice(0,2),label:name,leash:40},o||{}));if(m){m.quest=o&&o.quest;m.label=name}return m}

/* ----- histoire : acte en cours (I puis II) ----- */
/* purification demandée : la valeur de data.js, plafonnée à 80 % du contenu réel de la carte */
function clearNeed(st){return Math.max(20,Math.min(st.clear,Math.floor((GS.zoneUnits||st.clear)*0.8)))}
function questState(h){if(!h.actDone)return{A:D.ACT,idx:h.act,step:D.ACT.steps[h.act],n:1};if(D.ACT2&&!h.act2Done){const i=h.act2||0;return{A:D.ACT2,idx:i,step:D.ACT2.steps[i],n:2}}return null}
function ensureBounties(h){if(!h.bounties)h.bounties={};for(const z in D.BOUNTIES)if(!h.bounties[z])h.bounties[z]={list:D.BOUNTIES[z].map(b=>Object.assign({},b,{done:false})),claimed:false}}
/* ----- histoire (Acte I) ----- */
function questKill(m){
  {const h=hero(),qs=questState(h);const st=qs&&qs.step;if(st&&st.clear&&st.zone===GS.zone&&!m.quest){h.qk=h.qk||{};const need=clearNeed(st);const before=h.qk[st.id]||0;if(before<need){h.qk[st.id]=before+(m.progress||1);
    if(h.qk[st.id]>=need&&st.goal==='boss'&&GS.sealed){const sd=GS.sealed;GS.sealed=null;worldGroup.remove(sd.ring);const b=spawnMob(null,sd.x,sd.z,{boss:sd.boss,leash:60});if(b){b.questBoss=1;GS.bossRef=b}pillar(sd.x,sd.z,3,20,0xff5a2a,1.5);SFX.quest();banner('LE SCEAU SE BRISE',esc(D.BOSSES[sd.boss].name)+' t\'attend au fond.','#ff8a4a')}
    else if(h.qk[st.id]>=need){const Z=D.ZONES[GS.zone];const nd=Z.named.find(n=>n.id===st.named);if(nd&&!mobs.some(x=>x.quest===nd.id&&!x.dead)){let p=null;for(let k=0;k<20&&!p;k++){const a=rnd(0,6.28),r=rnd(10,14);const q={x:P.x+Math.cos(a)*r,z:P.z+Math.sin(a)*r};if(walkable(q.x,q.z))p=q}p=p||nearestWalkable(P.x+8,P.z);
      spawnNamed(nd.type,p.x,p.z,nd.name,{quest:nd.id});pillar(p.x,p.z,2,16,0xff5a2a,1.2);SFX.quest();banner('ZONE PURIFIÉE',esc(nd.name)+' surgit !','#ff8a4a')}}}}}
  const h=hero();const qs=questState(h);if(!qs)return;const step=qs.step;if(!step)return;
  if((step.goal==='named'&&m.quest===step.named)||(step.goal==='boss'&&m.boss===step.named)){
    if(qs.n===1)h.act++;else h.act2=(h.act2||0)+1;const ni=qs.n===1?h.act:h.act2;SFX.quest();gainXp(xpNeed(Math.min(69,h.lvl))*0.3);toast('<b>Quête accomplie !</b> '+step.hint,3200);
    if(qs.n===2&&qs.A.steps[ni].goal==='none'){h.act2Done=true;setTimeout(()=>dialog(qs.A.outro),1500);addPortal(P.x+3,P.z,'ville','Retour à Havrebraise',0xffa040);updateTracker();save();return}
    if(qs.n===1&&D.ACT.steps[h.act].goal==='none'){h.actDone=true;G.season.actBoss=1;if(D.ACT2&&!h.wp.includes('dunes'))h.wp.push('dunes');setTimeout(()=>{dialog(D.ACT.outro.concat(D.ACT2?D.ACT2.intro:[]));tutoTip('adventure')},1500);
      h.bounties=null;genBounties(h);addPortal(P.x+3,P.z,'ville','Retour à Havrebraise',0xffa040)}
    else{const nz=qs.A.steps[ni].zone;if(nz&&!h.wp.includes(nz))h.wp.push(nz);toast('Nouvelle destination : '+D.ZONES[nz].name,3500)}
    updateTracker();save();
  }
}

/* ----- primes ----- */
function genBounties(h){h.bounties=null;ensureBounties(h)}
function spawnBounties(id){
  const h=hero();ensureBounties(h);const B=h.bounties[id];if(!B||B.claimed)return;
  B.list.forEach((b,i)=>{if(b.done)return;const p=MAP.posAt(0.25+i*0.15);const x=p.x+rnd(-5,5),z=p.z+rnd(-5,5);
    if(b.type==='named'){spawnNamed(b.mon,x,z,b.name,{bounty:{zone:id,i}})}
    else if(b.type==='boss'){if(D.BOSSES[b.mon]){if(GS.bossRef)GS.bossRef.bounty={zone:id,i}}else spawnNamed(b.mon,MAP.end.x+rnd(-3,3),MAP.end.z+rnd(-3,3),b.name,{bounty:{zone:id,i},hpMul:1.5})}
    else if(b.type==='event'){GS.events.push({x,z,ev:{name:b.name,mons:b.mons},state:0,wave:0,name:b.name,bounty:{zone:id,i}});addLabel(x,z,2.5,'⚑ '+b.name,'event')}
  });
}
function bountyDone(ref){const h=hero();const B=h.bounties&&h.bounties[ref.zone];if(!B)return;const b=B.list[ref.i];if(!b||b.done)return;b.done=true;G.season.bounties++;
  const L=Math.min(70,P.mobLvl);const gold=Math.round(goldDrop(L)*40*(1+curScale.gold));G.gold+=gold;gainXp(xpNeed(Math.min(69,h.lvl))*0.12*(1+curScale.xp));G.mats.trophee+=1;
  SFX.quest();toast(`<b>Prime accomplie :</b> ${b.name}<br>+${fmt(gold)} or · +1 trophée`,3200);
  if(B.list.every(x=>x.done))toast('<b>Toutes les primes de la zone !</b> Réclame le coffre au Panneau des primes.',4200);
  updateTracker();save()}
function updateEvents(dt){
  for(const e of GS.events){if(e.state===2)continue;
    if(e.state===0&&dist(P.x,P.z,e.x,e.z)<9){e.state=1;e.wave=0;toast('<b>Événement :</b> '+e.name+' — survis aux vagues !',2600);nextWave(e)}
    if(e.state===1){const alive=mobs.some(m=>!m.dead&&m.ev===e);if(!alive){if(e.wave>=3){e.state=2;SFX.quest();toast('<b>Événement terminé !</b>',2200);
      for(let i=0;i<4;i++)dropGold(e.x+rnd(-2,2),e.z+rnd(-2,2),goldDrop(Math.min(70,P.mobLvl))*3*(1+curScale.gold));for(let k=0;k<(e.cursed?3:1);k++){const it=rollDrop({ilvl:Math.min(70,P.mobLvl),leg:curScale.leg,legBoost:e.cursed?3:1});if(it)dropItem(e.x+rnd(-2,2),e.z+rnd(-2,2),it,e)}if(GS.rift&&!GS.rift.guardianSpawned){GS.rift.progress=Math.min(99,GS.rift.progress+8)}
      gainXp(xpNeed(Math.min(69,hero().lvl))*0.06);if(e.bounty)bountyDone(e.bounty)}else nextWave(e)}}}
}
function nextWave(e){e.wave++;const mons=e.ev.mons;const n=3+e.wave*2;for(let i=0;i<n;i++){const a=rnd(0,6.28);const m=spawnMob(pick(mons),e.x+Math.cos(a)*rnd(5,8),e.z+Math.sin(a)*rnd(5,8),{aggro:true,xp:0.6});if(m)m.ev=e}
  if(e.wave===3){const m=spawnMob(pick(mons),e.x,e.z,{elite:'champion',affix:[pick(D.ELITE_AFFIXES).id],aggro:true,label:'Gardien de l\'événement'});if(m)m.ev=e}
  ringFx(e.x,e.z,8,0xff6a3a,0.8)}

/* ----- failles ----- */
function startRift(gr){
  const h=hero();
  fadeTo(()=>{
    resetEntities();const theme=pick(D.RIFT_THEMES),T=D.THEMES[theme];const dun=Math.random()<0.45;
    buildMap(dun?'dungeon':'outdoor',{theme,size:dun?110:140});GS.zone='rift';
    GS.rift={gr:gr||0,progress:0,t0:NOW,timer:gr?D.GREATER_RIFT.timer:0,guardianSpawned:false,done:false,deaths:0,echoDone:false,name:T.name,theme};
    curScale=monsterScale(h.diff||0,1,gr||0);P.mobLvl=gr?Math.max(h.lvl,Math.min(70,h.lvl)):h.lvl;
    const fams=shuffle(['morts','betes','demons','insectes','esprits','sables']).slice(0,3);
    for(let i=0;i<36;i++){const p=MAP.posAt(0.06+0.93*i/36);const x=p.x+rnd(-7,7),z=p.z+rnd(-7,7);if(dist(x,z,MAP.start.x,MAP.start.z)<12)continue;spawnPack(x,z,{fams,n:rndi(4,6),elite:i%6===3?(Math.random()<0.5?'champion':'rare'):null})}
    if(MAP.blobs)MAP.blobs.forEach(b=>spawnPack(b.x,b.z,{fams,n:6}));if(MAP.rooms)MAP.rooms.filter(r=>r.side).forEach(r=>spawnPack(r.x,r.z,{fams,n:6}));
    for(let i=0;i<2;i++){const p=MAP.posAt(0.3+i*0.35);addShrine(p.x+rnd(-3,3),p.z+rnd(-3,3),true)}const sp=MAP.posAt(0.55);addShrine(sp.x+3,sp.z,false);
    /* événements de faille tirés au sort */
    if(Math.random()<0.5){const q=MAP.posAt(rnd(0.3,0.8));const th=spawnMob('voleur',q.x,q.z,{progress:3,xp:3,leash:200});if(th){th.label="Voleur d'Étincelles";th.thief=1;th.onDeath=m=>{for(let i=0;i<10;i++)dropGold(m.x+rnd(-3,3),m.z+rnd(-3,3),goldDrop(Math.min(70,m.lvl))*4*(1+curScale.gold),m);for(let i=0;i<2;i++){const it=rollDrop({ilvl:Math.min(70,m.lvl),leg:curScale.leg,legBoost:4,keep:1});if(it)dropItem(m.x+rnd(-2,2),m.z+rnd(-2,2),it,m)}toast("<b>Voleur d'Étincelles vaincu !</b> Son trésor se répand.",3000)}}}
    if(Math.random()<0.5){const q=MAP.posAt(rnd(0.35,0.75));GS.events.push({x:q.x,z:q.z,ev:{name:'Coffre maudit',mons:pick([['diablotin','cracheur'],['rodeur','osrampant','tireur'],['scorpion','vercendre'],['larve','mante','scarabee']])},state:0,wave:0,name:'Coffre maudit',cursed:1});addLabel(q.x,q.z,2.5,'⚑ Coffre maudit','event')}
    P.x=MAP.start.x;P.z=MAP.start.z;GS.checkpoint={x:P.x,z:P.z};P.dead=0;$('dead').classList.remove('on');
    pets.forEach(p=>{p.x=P.x;p.z=P.z});
    combatStart();
    startMusic({root:pick([65,73,82]),scale:[0,1,3,7,8],mood:0.9});updateTracker();
    if(gr&&!G.tuto.gr)tutoTip('gr');
  },gr?'Faille supérieure — palier '+gr:'Faille');
}
function spawnGuardian(){
  const r=GS.rift;r.guardianSpawned=true;r.progress=100;
  for(const m of mobs)if(!m.dead&&!m.boss&&dist(m.x,m.z,P.x,P.z)>20){m.dead=true;m.deadT=0.1}
  const id=pick(D.RIFT_GUARDIANS);const a=rnd(0,6.28);let x=P.x+Math.cos(a)*9,z=P.z+Math.sin(a)*9;
  pillar(x,z,3,20,0xb36bff,1.5);later(()=>{const b=spawnMob(null,x,z,{boss:id,aggro:true,leash:80});if(!b)return;GS.bossRef=b;b.onDeath=riftComplete;toast(`<b>${b.def.name}</b> surgit !`,3000);SFX.boom();shake=0.5},900);
  updateTracker();
}
function spawnEcho(){const a=rnd(0,6.28);const x=P.x+Math.cos(a)*8,z=P.z+Math.sin(a)*8;const b=spawnMob(null,x,z,{boss:'morgrael',aggro:true,hpMul:0.35,echo:1,progress:8});
  if(b){b.label='Écho de Morgraël';b.mat.dispose();b.mesh.material=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.7,emissive:0x3a1a6a});b.mat=b.mesh.material;toast('<b>Saison 1 :</b> un écho de boss surgit !',3000)}}
function riftComplete(){
  const r=GS.rift,h=hero();if(!r||r.done)return;r.done=true;const L=Math.min(70,P.mobLvl);const tUsed=NOW-r.t0;
  G.season.rifts++;let msg='';
  if(!r.gr){const k=1+(Math.random()<0.5?1:0);G.keys+=k;msg=`Faille terminée ! +${k} clé${k>1?'s':''} de faille supérieure`;
    const gold=goldDrop(L)*60*(1+curScale.gold);G.gold+=Math.round(gold);gainXp(xpNeed(Math.min(69,h.lvl))*0.25*(1+curScale.xp));
    G.mats.ambre+=rndi(1,3);if(h.lvl>=60)G.mats.braise+=1;}
  else{const left=r.timer-tUsed;
    if(left>0){const up=left>=D.GREATER_RIFT.timer*0.5?3:left>=D.GREATER_RIFT.timer*0.25?2:1;const old=h.bestGR;if(r.gr>h.bestGR||(r.gr===h.bestGR&&tUsed<h.bestGRt)){h.bestGR=r.gr;h.bestGRt=Math.round(tUsed)}
      G.keys+=0;msg=`Faille supérieure ${r.gr} réussie en ${mmss(tUsed)} ! Palier conseillé : ${r.gr+up}`;r.success=true;r.nextGr=r.gr+up;
      gainXp(xpNeed(Math.min(69,h.lvl))*0.4+(h.lvl>=70?paraNeed(G.paragon.lvl+1)*0.08*(1+r.gr*0.05):0));G.gold+=Math.round(goldDrop(L)*100*(1+curScale.gold));
      /* gemme : nouvelle ou montée */
      const owned=h.gems.map(g=>g.id);const missing=D.GEMS.filter(g=>!owned.includes(g.id));
      if(missing.length&&(owned.length===0||Math.random()<0.35)){const g=pick(missing);h.gems.push({id:g.id,rank:1});setTimeout(()=>{toast(`<b>Gemme légendaire :</b> ${g.name}`,3500);tutoTip('gem')},1200)}
      setTimeout(()=>openGemUpgrade(r.gr),1600);
    }else{msg=`Temps écoulé : faille supérieure ${r.gr} échouée (pas de récompense de palier).`;r.success=false}}
  toast('<b>'+msg+'</b>',5000);SFX.quest();
  addPortal(P.x+3,P.z+2,'ville','Retour à Havrebraise',0xffa040);
  combatEnd();updateTracker();save();
}
const mmss=t=>{t=Math.max(0,Math.round(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};

/* ----- bilan de combat ----- */
function combatStart(){for(const k in DMG)delete DMG[k];combatLog={t0:NOW,deaths:0,on:true}}
function combatEnd(){combatLog.on=false;combatLog.t1=NOW;if(GS.rift)setTimeout(()=>{if(!$('panel').classList.contains('on'))showCombatReport()},GS.rift.gr&&GS.rift.success?3200:2600)}

/* ----- boss ----- */
function bossAI(m,dt,d){
  const B=m.def;const frac=m.hp/m.max;let ph=0;B.phases.forEach((p,i)=>{if(frac<=p.at)ph=i});
  if(ph!==m.phase){m.phase=ph;const p=B.phases[ph];if(p.text)toast('<b>'+p.text+'</b>',3200);shake=0.4;ringFx(m.x,m.z,8,0xff4a2a,0.8);m.bossT=1.5;
    if(p.summon)for(let i=0;i<4;i++)spawnMob(p.summon,m.x+rnd(-4,4),m.z+rnd(-4,4),{aggro:true,progress:0,xp:0.3})}
  const P_=B.phases[m.phase];const en=P_.enrage||1;
  if(m.pillars&&m.invuln&&!m.mesh.visible===false&&(m.pillars.every(p=>p.dead)||NOW>m.shieldT)){m.invuln=false;m.pillars=null;toast('Le bouclier d\'Ashkara se brise !',2200);burst(m.x,2,m.z,0xffe08a,50,6);hitStop=0.08}
  if(m.invuln&&m.mesh.visible){m.mat.emissive.setHex(0x6a5010)}
  if(m.windup>0){m.windup-=dt;if(m.windup<=0&&d<3.4+m.r)hurtPlayer(m.dmg*1.2,'melee',m)}
  else if(d<2.6+m.r&&m.atkT<=0){m.atkT=1.7/en;m.windup=0.5;m.anim=0.38}
  m.bossT-=dt*en;if(m.bossT>0)return;m.bossT=rnd(2.6,3.6);
  const mv=pick(P_.moves),px=P.x,pz=P.z;
  switch(mv){
    case 'slam':telegraph(px,pz,3.6,m.dmg*2.4,1.15);break;
    case 'fireRing':for(let i=0;i<8;i++){const a=i/8*6.28+rnd(0,0.4);telegraph(m.x+Math.cos(a)*6,m.z+Math.sin(a)*6,2.3,m.dmg*1.8,1.4)}telegraph(m.x,m.z,2.5,m.dmg*1.8,1.4);break;
    case 'summon':{const t=P_.summon||'diablotin';let n=0;for(const o of mobs)if(!o.dead&&o.parent===m)n++;if(n<8)for(let i=0;i<4;i++){const s=spawnMob(t,m.x+rnd(-5,5),m.z+rnd(-5,5),{aggro:true,progress:0,xp:0.3});if(s)s.parent=m}ringFx(m.x,m.z,5,0xb36bff,0.6);break}
    case 'beams':if(!hazards.some(h=>h.kind==='beam'&&h.src===m))beams(m.x,m.z,3,11,0.55*en,m.dmg*1.5,7,m);else telegraph(px,pz,3.6,m.dmg*2.4,1.15);break;
    case 'meteorRain':for(let i=0;i<6;i++)later(()=>{if(!m.dead)telegraph(P.x+rnd(-5,5),P.z+rnd(-5,5),2.4,m.dmg*1.9,1.5)},i*220);break;
    case 'charge':{const a=Math.atan2(px-m.x,pz-m.z);m.charge={a,t:-0.9,len:Math.min(18,d+4)};lineTele(m.x,m.z,a+Math.PI,m.charge.len,2.4,0,0.9);break}
    case 'spiral':{for(let i=0;i<14;i++)later(()=>{if(m.dead)return;const a=i*0.9+NOW;hostileProj(m,m.x+Math.sin(a)*10,m.z+Math.cos(a)*10,{dmg:m.dmg*1.1,speed:7,range:16,color:0xc070ff,size:0.6})},i*90);break}
    case 'tornado':{for(let i=0;i<(m.phase>=1?3:2);i++){const a=rnd(0,6.28);tornado(m.x+Math.cos(a)*4,m.z+Math.sin(a)*4,m.dmg*1.4,7,m)}break}
    case 'burrow':{if(m.invuln)break;m.invuln=true;m.mesh.visible=false;m.untarget=true;burst(m.x,1,m.z,0xd8b070,40,5);toast('Le sol tremble…',1400);
      for(let i=0;i<3;i++)later(()=>{if(m.dead)return;telegraph(P.x,P.z,3.2,m.dmg*2.2,1.1,{color:0xd8a040,who:mobName(m)});if(i===2)later(()=>{if(m.dead)return;const p=walkable(P.x,P.z)?{x:P.x+rnd(-2,2),z:P.z+rnd(-2,2)}:{x:m.x,z:m.z};if(walkable(p.x,p.z)){m.x=p.x;m.z=p.z}m.invuln=false;m.untarget=false;m.mesh.visible=true;burst(m.x,1,m.z,0xd8b070,50,7);shake=0.4},1200)},700+i*1300);m.bossT=6;break}
    case 'pillars':{if(m.pillars&&m.pillars.some(p=>!p.dead))break;m.invuln=true;m.pillars=[];for(let i=0;i<3;i++){const a=i/3*6.28+rnd(0,1);const pl=spawnMob('pilier',m.x+Math.cos(a)*9,m.z+Math.sin(a)*9,{aggro:true,progress:0,xp:0.5,hpMul:3,label:'Pilier de sable',leash:200});if(pl)m.pillars.push(pl)}
      m.shieldT=NOW+30;toast('<b>Ashkara est protégée !</b> Détruis les 3 Piliers de sable.',3000);break}
    case 'blink':{burst(m.x,1,m.z,0xb36bff,20,4);const a=rnd(0,6.28);const p={x:px+Math.cos(a)*4,z:pz+Math.sin(a)*4};if(walkable(p.x,p.z)){m.x=p.x;m.z=p.z}burst(m.x,1,m.z,0xb36bff,20,4);telegraph(m.x,m.z,4,m.dmg*2,1.2);break}
  }
}
/* ================= Héros : déplacement, attaque, IA des compétences, farm auto ================= */
let touch=null;const keys={};
function inputDir(){
  let mx=0,mz=0;
  if(touch){const L=Math.hypot(touch.dx,touch.dy);if(L>10){mx=touch.dx/L;mz=touch.dy/L}}
  if(keys.z||keys.w||keys.arrowup)mz-=1;if(keys.s||keys.arrowdown)mz+=1;if(keys.q||keys.a||keys.arrowleft)mx-=1;if(keys.d||keys.arrowright)mx+=1;
  const l=Math.hypot(mx,mz);return l>0?{x:mx/l,z:mz/l}:null;
}
function tryMove(dx,dz){
  let nx=P.x+dx,nz=P.z+dz;
  for(const b of MAP.blockers){const d=dist(nx,nz,b.x,b.z);if(d<b.r+0.45&&d>0.001){const k=(b.r+0.45-d)/d;nx+=(nx-b.x)*k;nz+=(nz-b.z)*k}}
  if(walkable(nx,nz)){P.x=nx;P.z=nz;return true}
  if(walkable(nx,P.z)){P.x=nx;return true}if(walkable(P.x,nz)){P.z=nz;return true}return false;
}
function updatePlayer(dt){
  const h=hero(),C=CLS[h.cls];
  if(P.dead){P.deadT-=dt;P.deadWait+=dt;updateDeadButtons();
    /* jamais figé : réapparition automatique si personne ne choisit (et tout de suite en farm auto) */
    if(P.deadT<=0&&(P.deadWait>P.hereT+15||(ST().farm&&NOW-GS.lastInput>2)))respawn(false);return}
  /* ressources */
  P.res=Math.min(S.resMaxTot,P.res+C.res.regen*dt*(pylon('canal')?3:1));if(C.res2)P.res2=Math.min(C.res2.max,P.res2+C.res2.regen*dt);
  for(const k in P.cds)if(P.cds[k]>0)P.cds[k]-=dt;
  P.buffs=P.buffs.filter(b=>b.until>NOW);
  P.lastHurt+=dt;
  const regen=S.regenTot+buffSum('regen')*S.maxHp+(P.lastHurt>4&&!GS.rift?S.maxHp*0.04:0)+(GS.zone==='ville'?S.maxHp*0.5:0);healP(regen*dt);
  if(P.potion>0)P.potion-=dt;
  if(P.hp<S.maxHp*D.POTION.threshold&&P.potion<=0&&!P.dead){P.potion=D.POTION.cd;healP(S.maxHp*D.POTION.heal);burst(P.x,1.5,P.z,0xff4a4a,20,2.5);toast('Potion bue !',1200);tutoTip('potion')}
  /* course / bond */
  if(P.dash){const q=P.dash;q.t+=dt;const k=Math.min(1,q.t/q.dur);P.x=lerp(q.fx,q.tx,k);P.z=lerp(q.fz,q.tz,k);
    const p=q.p;if(p.r||p.dmg&&!p.endNova&&!p.away){for(const m of enemiesNear(P.x,P.z,p.r||2)){if(q.hit.has(m))continue;q.hit.add(m);hitMob(m,p.dmg*q.mult,Object.assign({slow:p.slow,dot:p.dot,dotDur:p.dotDur,area:1},q.base))}}
    if(p.trail&&q.t-q.lastTrail>0.05){q.lastTrail=q.t;makeZone(P.x,P.z,{r:1.6,dur:3,dps:p.trail*q.mult,el:p.el,id:q.id,label:q.base.label})}
    if(q.t-(q.lastZ||0)>0.06){q.lastZ=q.t;zoneOnAt(q.id,P.x,P.z,'path')}
    if(Math.random()<0.6)burst(P.x,0.8,P.z,q.col,4,1.5,0.4);
    if(k>=1){P.dash=null;if(p.endNova){for(const m of enemiesNear(P.x,P.z,p.endNova))hitMob(m,p.dmg*q.mult,Object.assign({stun:p.stun,slow:p.slow,dot:p.dot,dotDur:p.dotDur,area:1},q.base));ringFx(P.x,P.z,p.endNova,q.col,0.45);flashDisc(P.x,P.z,p.endNova,q.col,0.3);burst(P.x,0.6,P.z,q.col,24,5);shake=Math.max(shake,0.12)}
      impactProcs(q.id,P.x,P.z);if(p.mount)later(()=>showMount(false),150)}
  }else{
    /* déplacement : doigt / clavier, ou farm auto */
    let dir=inputDir();if(dir)GS.lastInput=NOW;
    if(!dir&&ST().farm&&GS.zone!=='ville'&&NOW-GS.lastInput>1.2)dir=farmDir(dt);
    P.moving=!!dir&&P.root<NOW;
    if(P.moving){const sp=moveSpeed()*dt;tryMove(dir.x*sp,dir.z*sp);P.face=Math.atan2(dir.x,dir.z);P.walk+=dt}
  }
  /* attaque principale (compétence primaire ou coup d'arme) */
  P.atkT-=dt;const prim=SLOTSK[0];const pp=prim?SKC[prim]:null;
  const rng=pp?(pp.range||C.range+0.6):C.range+0.6;
  if(P.atkT<=0&&!P.dash){const t=nearestMob(P.x,P.z,rng);if(t){P.atkT=1/(S.aps*(1+buffSum('as')));
    if(pp)castSkill(prim,{});else{P.swing=0.28;P.face=Math.atan2(t.x-P.x,t.z-P.z);hitMob(t,1,{src:'skill',label:'Attaque',el:'phys'});slashFx(P.x+(t.x-P.x)*0.5,P.z+(t.z-P.z)*0.5,P.face,0xffffff,0.8)}}}
  /* compétences automatiques */
  P.autoT-=dt;if(P.autoT<=0&&!P.dash){P.autoT=0.2;autoCast()}
  /* effets périodiques */
  for(const f of FX('periodic')){const k='per_'+f.src+f.do;P.periodic[k]=(P.periodic[k]||rnd(0.5,f.every))-dt;if(P.periodic[k]<=0){P.periodic[k]=f.every;if(nearestMob(P.x,P.z,14))doAction(f.do,P.x,P.z,f.m,{label:f.src,el:f.el})}}
  for(const f of FX('periodicBuff')){const k='pb_'+f.src;P.periodic[k]=(P.periodic[k]==null?f.every:P.periodic[k])-dt;if(P.periodic[k]<=0){P.periodic[k]=f.every;addBuff(k,f.buff,f.dur);ringFx(P.x,P.z,3,0xffffff,0.5)}}
  for(const f of FX('whileBuff')){if(hasBuff('sk_'+f.skill)){const k='wb_'+f.src;P.periodic[k]=(P.periodic[k]||0)-dt;if(P.periodic[k]<=0&&nearestMob(P.x,P.z,12)){P.periodic[k]=f.every;castSkill(f.cast,{free:1,p:SKC[f.cast]||resolveSkill(f.cast,-1),m:f.m,label:f.src})}}}
  for(const k in P.whileT){const w=P.whileT[k];if(NOW>w.until){delete P.whileT[k];continue}w.t-=dt;if(w.t>0)continue;w.t=w.every;
    if(k.startsWith('pulse_')){for(const m of enemiesNear(P.x,P.z,5))hitMob(m,2,{id:w.id,el:w.el,src:'skill',label:SK[w.id].name+' (onde)',area:1});ringFx(P.x,P.z,5,elHex(w.el),0.4)}
    else if(k.startsWith('volley_')){const t=nearestMob(P.x,P.z,12);if(t){const a=Math.atan2(t.x-P.x,t.z-P.z)+rnd(-0.3,0.3);fireProj(w.id,{dmg:1.2,speed:22,range:13,boom:w.boom?2:0,el:w.el},a,1,{id:w.id,el:w.el,src:'skill',label:SK[w.id].name},elHex(w.el),t)}}
    else if(k.startsWith('trail_'))makeZone(P.x,P.z,{r:1.6,dur:2.5,dps:w.dps,el:w.el,id:w.id,label:SK[w.id].name})}
  if(pylon('givre')){P.periodic.givre=(P.periodic.givre||0)-dt;if(P.periodic.givre<=0){P.periodic.givre=2;for(const m of enemiesNear(P.x,P.z,7))hitMob(m,3,{src:'proc',el:'froid',label:'Pylône de givre',proc:0,slow:2,area:1});ringFx(P.x,P.z,7,0x7fdcff,0.5);sparks(P.x,H(P.x,P.z)+1,P.z,0xcff0ff,16,8)}}
  if(pylon('conduction')){P.periodic.cond=(P.periodic.cond||0)-dt;if(P.periodic.cond<=0){P.periodic.cond=0.5;const ex=new Set();for(let i=0;i<3;i++){const t=nearestMob(P.x,P.z,10,ex);if(!t)break;ex.add(t);boltFx(jag(new THREE.Vector3(P.x,1.5+H(P.x,P.z),P.z),new THREE.Vector3(t.x,1+H(t.x,t.z),t.z)),0x9ab0ff,0.2);hitMob(t,4,{src:'proc',el:'foudre',label:'Pylône de conduction',proc:0})}}}
  /* ramassage */
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.t+=dt;d.gem.rotation.y+=dt*2;
    if(d.fly){const f=d.fly;f.t+=dt;const k=Math.min(1,f.t/f.dur);d.gem.position.set(lerp(f.fx,d.x,k),H(d.x,d.z)+(d.gold?0.3:0.5)+Math.sin(k*Math.PI)*2.6+(1-k)*0.5,lerp(f.fz,d.z,k));if(k>=1){if(d.gold){d.fly=null;d.gem.position.y=H(d.x,d.z)+0.3}else landDrop(d)}continue}
    if(d.big){d.ring.rotation.y+=dt*1.5;d.ring.scale.setScalar(1.1+Math.sin(d.t*4)*0.15);d.beam.material.opacity=0.5+Math.sin(d.t*5)*0.2;if(Math.random()<dt*14)emit(d.x+rnd(-0.4,0.4),H(d.x,d.z)+0.3,d.z+rnd(-0.4,0.4),0,rnd(1.5,3),0,d.c,0.9,-0.5)}
    const dd=dist(P.x,P.z,d.x,d.z);
    if(d.gold){if(dd<S.pickup){G.gold+=d.gold;floatNum(d.x,1.5+H(d.x,d.z),d.z,'+'+fmt(d.gold)+' or','gold');SFX.gold();worldGroup.remove(d.gem);drops.splice(i,1)}continue}
    if(dd<Math.max(1.6,S.pickup*0.8)){if(h.inv.length>=INV_MAX){if(!d.full){d.full=1;toast('Inventaire plein ! Recycle ou vends des objets (MENU).',2600)}continue}
      h.inv.unshift(d.it);if(d.lab){d.lab.remove();const li=labels.findIndex(l=>l.el===d.lab);if(li>=0)labels.splice(li,1)}worldGroup.remove(d.beam,d.gem);if(d.ring){worldGroup.remove(d.ring);d.ring.material.dispose()}d.beam.geometry.dispose();d.beam.material.dispose();drops.splice(i,1);codexSee(d.it);
      toast(`<b style="color:${rarCss(d.it)}">${esc(d.it.name)}</b>${d.it.r==='l'||d.it.r==='s'?'<br><small>'+rarName(d.it)+'</small>':''}`,2000);SFX.loot();$('btnMenu').classList.add('new');tutoTip('menu');save()}}
  for(let i=globes.length-1;i>=0;i--){const g=globes[i];g.t+=dt;g.mesh.position.y=H(g.x,g.z)+0.6+Math.sin(g.t*4)*0.1;if(dist(P.x,P.z,g.x,g.z)<S.pickup*0.8){healP(S.maxHp*0.2);burst(g.x,1,g.z,0xff4a4a,10,2);worldGroup.remove(g.mesh);globes.splice(i,1)}else if(g.t>40){worldGroup.remove(g.mesh);globes.splice(i,1)}}
  /* portails, sanctuaires, PNJ */
  for(const p of GS.portals){p.ring.rotation.z+=dt;if(dist(P.x,P.z,p.x,p.z)<1.6&&!GS.loading){usePortal(p);break}}
  for(const s of GS.shrines)if(!s.used){s.cr.rotation.y+=dt;if(dist(P.x,P.z,s.x,s.z)<2)useShrine(s)}
  if(GS.zone==='ville')updateTown(dt);
  /* rendu du héros */
  heroMesh.position.set(P.x,H(P.x,P.z)+(P.dash&&P.dash.p.leap?Math.sin(Math.min(1,P.dash.t/P.dash.dur)*Math.PI)*2.5:0)+(mountMesh&&mountMesh.parent?0.7:0),P.z);heroMesh.rotation.y=P.face+Math.PI;
  P.swing=Math.max(0,P.swing-dt);animHero(heroMesh,P.walk,P.moving||!!P.dash,P.swing,dt);
  const ghost=hasBuff('sk_sh_marche')||hasBuff('sk_tq_voile');heroMesh.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(heroFlash>0?0x882222:ghost?0x223355:(o.material.userData.em||0))});heroFlash-=dt;
  if(mountMesh&&mountMesh.parent){mountMesh.position.set(P.x,H(P.x,P.z),P.z);mountMesh.rotation.y=P.face+Math.PI}
  heroLight.position.set(P.x,H(P.x,P.z)+4,P.z);
}
const INV_MAX=40;
function usePortal(p){
  if(p.to==='ville')enterZone('ville');
  else if(p.to==='rift')startRift(0);
  else if(D.ZONES[p.to])enterZone(p.to);
}

/* IA simple des compétences (mode automatique) */
function autoCast(){
  const h=hero(),manual=ST().manual;const hp=P.hp/S.maxHp;
  const near5=enemiesNear(P.x,P.z,5),near12=enemiesNear(P.x,P.z,12);if(!near12.length&&!ST().farm)return;
  const elite=near12.some(m=>m.elite||m.boss||m.named);
  for(let i=1;i<6;i++){const id=SLOTSK[i];if(!id||!canCast(id))continue;if(manual&&!(ST().farm&&GS.zone!=='ville'))continue;
    const p=SKC[id],cat=SK[id].cat;let go=false;
    switch(p.kind){
      case 'buff':go=cat==='ultime'?(elite||near12.length>=5):cat==='defense'?(hp<0.65||near5.length>=4||elite&&near12.length>0):near12.length>0;break;
      case 'nova':go=near5.filter(m=>dist(m.x,m.z,P.x,P.z)<(p.r||5)).length>=2||elite&&near5.length>0||hp<0.5&&near5.length>0;break;
      case 'dash':if(p.away)go=near5.some(m=>dist(m.x,m.z,P.x,P.z)<3)&&(hp<0.7||CLS[h.cls].range>5);else{const t=nearestMob(P.x,P.z,(p.dist||10)+3);go=!!t&&(dist(t.x,t.z,P.x,P.z)>4||near5.length>=3)}break;
      case 'summon':go=p.dur?near12.length>0:pets.filter(q=>q.skill===id).length<(p.count||1);break;
      case 'curse':{const t=densest(P.x,P.z,p.range||10,p.r||5);go=!!t&&(t.curseT<NOW+1)&&(near12.length>=2||elite);break}
      case 'ground':case 'zone':go=near12.length>=(cat==='ultime'?3:1)||elite;break;
      default:go=near12.length>0;
    }
    if(go&&castSkill(id))break;
  }
}
/* Farm automatique : le héros parcourt la carte seul */
function farmDir(dt){
  const M=MAP;let tx=null,tz=null;
  const t=nearestMob(P.x,P.z,26);const rng=SLOTSK[0]&&SKC[SLOTSK[0]]&&SKC[SLOTSK[0]].range||CLS[hero().cls].range;
  if(t){const d=dist(t.x,t.z,P.x,P.z);if(d<rng*0.8&&losOk(P.x,P.z,t.x,t.z))return null;const s=navStep(P.x,P.z,t.x,t.z);tx=s.x;tz=s.z}
  else{let best=null,bd=18;for(const d of drops){if(!d.gold&&hero().inv.length>=INV_MAX)continue;const dd=dist(d.x,d.z,P.x,P.z);if(dd<bd){bd=dd;best=d}}
    if(best){tx=best.x;tz=best.z}
    else if(GS.rift&&GS.rift.done){GS.farmWait+=dt;if(GS.farmWait>4&&!GS.loading){GS.farmWait=0;if(GS.rift.gr&&G.keys>0){G.keys--;startRift(GS.rift.nextGr?Math.max(1,Math.min(GS.rift.nextGr,hero().bestGR+1)):GS.rift.gr)}else startRift(0)}return null}
    else{const L=M.path.length;let p=M.path[Math.min(GS.farmIdx,L-1)];if(dist(p.x,p.z,P.x,P.z)<5)GS.farmIdx=Math.min(L-1,GS.farmIdx+(M.dungeon?1:3));
      if(GS.farmIdx>=L-1&&!mobs.some(m=>!m.dead&&dist(m.x,m.z,P.x,P.z)<40)){GS.farmWait+=dt;if(GS.farmWait>3&&!GS.loading){GS.farmWait=0;if(GS.rift)GS.farmIdx=0;else if(hero().actDone)startRift(0);else enterZone(GS.zone)}return null}
      p=M.path[Math.min(GS.farmIdx,L-1)];const s=navStep(P.x,P.z,p.x,p.z);tx=s.x;tz=s.z}}
  const dx=tx-P.x,dz=tz-P.z,l=Math.hypot(dx,dz);if(l<0.5)return null;
  /* évite les cercles rouges */
  let ax=dx/l,az=dz/l;for(const hz of hazards)if(hz.kind==='tele'||hz.kind==='pool'){const d=dist(P.x,P.z,hz.x,hz.z);if(d<hz.r+1.5){ax+=(P.x-hz.x)/(d||1)*2;az+=(P.z-hz.z)/(d||1)*2}}
  const al=Math.hypot(ax,az)||1;return{x:ax/al,z:az/al};
}

/* ================= Compagnons ================= */
let compState=null;
function tavernOpen(h){return h.actDone||h.lvl>=D.UNLOCKS.tavern}
function spawnCompanion(){
  if(compState){worldGroup.remove(compState.mesh);scene.remove(compState.mesh);compState=null}
  const h=hero();if(!h.comp||!h.comp.active||!tavernOpen(h))return;const C=D.COMPANIONS.find(c=>c.id===h.comp.active);if(!C)return;
  const g=new THREE.Group();const M=c=>new THREE.MeshLambertMaterial({color:c,flatShading:true});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.4,1.1,8),M(C.color));body.position.y=1.1;const head=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,6),M(0xd8b498));head.position.y=1.9;
  g.add(body,head);if(C.id==='brann'){const s=new THREE.Mesh(new THREE.BoxGeometry(0.1,1,0.8),M(0x8a8a9a));s.position.set(-0.45,1.1,-0.1);const hm=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.3,0.35,8),M(0x8a8a9a));hm.position.y=1.98;g.add(s,hm)}
  else if(C.id==='sylene'){const b=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.04,4,10,Math.PI),M(0x6a4a2a));b.position.set(0.45,1.2,-0.1);b.rotation.y=1.57;const hd=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.5,8),M(0x2a5a3a));hd.position.y=2.1;g.add(b,hd)}
  else{const st=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.8,5),M(0xd8c890));st.position.set(0.45,1.1,0);const orb=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,5),new THREE.MeshBasicMaterial({color:0x9cff6a}));orb.position.set(0.45,2.05,0);g.add(st,orb)}
  scene.add(g);compState={id:C.id,C,mesh:g,x:P.x+1.5,z:P.z+1.5,atkT:1,skT:3,sk2T:5,taunt:0,healT:0,shieldT:0,t:0};
}
function compHurt(v){/* les compagnons ne meurent pas : ils encaissent */}
function compDmgCoef(){const h=hero();let main=0,wd=null;for(const k in (h.comp.gear||{})){const it=h.comp.gear[k];if(!it)continue;if(it.wpn)wd=it.wpn;for(const a of it.aff)if(a.k==='main')main+=a.v}
  const avg=wd?(wd.min+wd.max)/2:wpnAvg(h.lvl)*0.7;return avg*(1+(main+refMain(h.lvl)*0.5)/100)}
function updateCompanion(dt){
  const c=compState;if(!c)return;c.t+=dt;const h=hero();const sk=h.comp.sk||[0,0];
  const t=nearestMob(c.x,c.z,12);let gx=P.x+1.5,gz=P.z+1.5;const ranged=c.id!=='brann';
  if(t&&dist(t.x,t.z,P.x,P.z)<16){const d=dist(c.x,c.z,t.x,t.z);if(d>(ranged?8:1.8)){gx=t.x;gz=t.z}else{gx=c.x;gz=c.z}
    c.atkT-=dt;if(c.atkT<=0&&d<(ranged?10:2.4)){c.atkT=c.id==='oriane'?1.4:1.1;const base=compDmgCoef()*(c.id==='oriane'?0.5:0.8)*rnd(0.9,1.1);
      if(ranged)boltFx([new THREE.Vector3(c.x,1.5+H(c.x,c.z),c.z),new THREE.Vector3(t.x,1+H(t.x,t.z),t.z)],c.id==='oriane'?0xffe39a:0x9cff6a,0.15);else slashFx(c.x,c.z,Math.atan2(t.x-c.x,t.z-c.z),0xd8d8ff,0.7);
      hitMob(t,0,{flat:base,label:c.C.name,src:'proc',proc:0,slow:c.id==='sylene'&&sk[0]===1?2:0});if(c.id==='sylene'&&sk[1]===1)t.markT=NOW+5}
    c.skT-=dt;if(c.skT<=0){
      if(c.id==='brann'){if(sk[0]===0){c.skT=8;c.taunt=NOW+3;ringFx(c.x,c.z,6,0xd8d8ff,0.5);for(const m of enemiesNear(c.x,c.z,8))m.aggro=true}else{c.skT=6;if(t){t.stunT=NOW+1.5;flashDisc(t.x,t.z,1.2,0xffffff,0.3)}}}
      else if(c.id==='sylene'){c.skT=5;if(sk[0]===0){const ex=new Set();for(let i=0;i<3;i++){const q=nearestMob(c.x,c.z,12,ex);if(!q)break;ex.add(q);hitMob(q,0,{flat:compDmgCoef()*1.2,label:c.C.name+' (volée)',src:'proc',proc:0});boltFx([new THREE.Vector3(c.x,1.5,c.z),new THREE.Vector3(q.x,1,q.z)],0x9cff6a,0.2)}}}
      else{c.skT=99}}
  }
  if(c.id==='oriane'&&sk[1]===1){c.shieldT-=dt;if(c.shieldT<=0){c.shieldT=15;P.shield=Math.max(P.shield,S.maxHp*0.2);ringFx(P.x,P.z,2,0xffe39a,0.5)}}
  const d=dist(c.x,c.z,gx,gz);if(d>0.6){const sp=Math.min(d,(d>12?12:6)*dt);c.x+=(gx-c.x)/d*sp;c.z+=(gz-c.z)/d*sp}
  if(dist(c.x,c.z,P.x,P.z)>25){c.x=P.x+1;c.z=P.z+1}
  c.mesh.position.set(c.x,H(c.x,c.z),c.z);c.mesh.rotation.y=Math.atan2(gx-c.x,gz-c.z)+Math.PI;shadowAt(c.x,c.z,0.55);
}

/* ================= Ville ================= */
const NPCS=[
  {id:'forge',n:'Forgeron',sub:'Fabriquer · Recycler · Améliorer',icon:'anvil',color:0xb86a3a},
  {id:'mystic',n:'Mystique',sub:'Relancer un affixe',icon:'crystal-ball',color:0x8a5aff},
  {id:'cube',n:'Cube Nova',sub:'Pouvoirs légendaires',icon:'cube',color:0x5ab0ff},
  {id:'altar',n:'Autel des fusions',sub:'Combiner deux compétences',icon:'fire-ring',color:0xff6a2a,lvl:30},
  {id:'stash',n:'Coffre partagé',sub:'Entre tous tes héros',icon:'locked-chest',color:0xd8a040},
  {id:'board',n:'Panneau des primes',sub:'Mode Aventure',icon:'scroll-unfurled',color:0xd8c890,adv:1},
  {id:'obelisk',n:'Obélisque des failles',sub:'Failles · difficulté',icon:'obelisk',color:0x9a6aff},
  {id:'tavern',n:'Taverne des compagnons',sub:'Recruter un allié',icon:'tavern-sign',color:0xc88a4a,tav:1},
  {id:'nova',n:'Conseiller NOVA',sub:'Analyse de ton build',icon:'robot-grab',color:0x4ae0ff},
  {id:'dummy',n:"Mannequin d'entraînement",sub:'Teste tes dégâts',icon:'target-dummy',color:0xc8a878},
  {id:'waypoint',n:'Point de passage',sub:'Voyager',icon:'magic-portal',color:0x5ab0ff}
];
let townDummies=[];
function buildTown(){
  buildMap('town',{theme:'ville'});
  /* Flamme-Mère au centre */
  const br=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2,1,10),new THREE.MeshLambertMaterial({color:0x4a4040}));br.position.y=0.5;worldGroup.add(br);
  const fl=new THREE.Mesh(GB.cone,addMat(0xff8a2a,0.9));fl.scale.set(2,3.2,2);fl.position.y=2.4;worldGroup.add(fl);GS.flame=fl;
  const L=new THREE.PointLight(0xff9a4a,1.4,26);L.position.set(0,4,0);worldGroup.add(L);
  GS.npcs=[];townDummies=[];
  NPCS.forEach((n,i)=>{const a=-Math.PI/2+(i/NPCS.length)*Math.PI*2+0.3;const x=Math.cos(a)*15,z=Math.sin(a)*15;
    const g=new THREE.Group();
    if(n.id==='dummy'){for(let k=0;k<6;k++){const dx=x+(k===0?0:Math.cos(k*1.2)*2.6),dz=z+(k===0?0:Math.sin(k*1.2)*2.6);const dm=makeDummyMesh();dm.position.set(dx,0,dz);worldGroup.add(dm);townDummies.push({x:dx,z:dz,mesh:dm,main:k===0})}}
    else{const robe=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.6,8),new THREE.MeshLambertMaterial({color:n.color,flatShading:true}));robe.position.y=0.8;const hd=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),new THREE.MeshLambertMaterial({color:0xd8b498}));hd.position.y=1.85;g.add(robe,hd);
      const prop=townProp(n.id);if(prop){prop.position.set(Math.cos(a)*1.6,0,Math.sin(a)*1.6);g.add(prop)}
      g.position.set(x,0,z);g.rotation.y=-a-Math.PI/2;worldGroup.add(g);MAP.blockers.push({x,z,r:0.7})}
    const lab=addLabel(x,z,n.id==='dummy'?3:3.1,`<b>${n.n}</b><small>${n.sub}</small>`,'npc');
    GS.npcs.push({n,x,z,lab,inside:true});
  });
  addPortal(0,-22,'rift_menu','Failles (Obélisque)',0x9a6aff,{fake:1});GS.portals.pop();
}
function makeDummyMesh(){const g=new THREE.Group();const M=new THREE.MeshLambertMaterial({color:0xb8945a,flatShading:true});const post=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,2,6),new THREE.MeshLambertMaterial({color:0x5a3a20}));post.position.y=1;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.3,0.9,8),M);body.position.y=1.4;const head=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,6),M);head.position.y=2.05;const arm=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.12,0.12),M);arm.position.y=1.6;g.add(post,body,head,arm);return g}
function townProp(id){const g=new THREE.Group();const M=c=>new THREE.MeshLambertMaterial({color:c,flatShading:true});
  if(id==='forge'){const a=new THREE.Mesh(new THREE.BoxGeometry(1,0.5,0.5),M(0x3a3a40));a.position.y=0.8;const b=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.4),M(0x2a2a30));b.position.y=0.3;g.add(a,b);const f=new THREE.Mesh(GB.cone,addMat(0xff6a1a,0.8));f.scale.set(0.5,0.8,0.5);f.position.set(0.9,0.4,0);g.add(f)}
  else if(id==='mystic'){const o=new THREE.Mesh(GB.sph,addMat(0xb07aff,0.8));o.scale.setScalar(0.8);o.position.y=1.4;const s=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,1,6),M(0x3a2a4a));s.position.y=0.5;g.add(o,s)}
  else if(id==='cube'){const c=new THREE.Mesh(GB.box,new THREE.MeshLambertMaterial({color:0x2a4a8a,emissive:0x1a3a7a}));c.scale.setScalar(1.1);c.position.y=1.2;c.rotation.set(0.6,0.6,0);g.add(c);g.userData.spin=c}
  else if(id==='altar'){const a=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,0.8,6),M(0x4a2a2a));a.position.y=0.4;const f=new THREE.Mesh(GB.oct,addMat(0xff6a2a,0.9));f.scale.set(0.6,1,0.6);f.position.y=1.5;g.add(a,f);g.userData.spin=f}
  else if(id==='stash'){const c=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.7,0.8),M(0x6a4a2a));c.position.y=0.35;const l=new THREE.Mesh(new THREE.BoxGeometry(1.25,0.15,0.85),M(0xd8a040));l.position.y=0.75;g.add(c,l)}
  else if(id==='board'){const b=new THREE.Mesh(new THREE.BoxGeometry(1.4,1,0.1),M(0x6a4a2a));b.position.y=1.4;const p=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.6,0.1),M(0x4a3a2a));p.position.y=0.8;g.add(b,p)}
  else if(id==='obelisk'){const o=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.6,3.4,4),new THREE.MeshLambertMaterial({color:0x2a2440,emissive:0x2a1a5a}));o.position.y=1.7;g.add(o);const r=new THREE.Mesh(ringGeo,addMat(0x9a6aff,0.7));r.scale.setScalar(1.6);r.position.y=0.15;g.add(r)}
  else if(id==='tavern'){const t=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.8,10),M(0x6a4a2a));t.position.y=0.4;const m=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.25,8),M(0xd8c890));m.position.y=0.95;g.add(t,m)}
  else if(id==='nova'){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,1.1,6),M(0x2a3a4a));p.position.y=0.55;const s=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.05),new THREE.MeshBasicMaterial({color:0x4ae0ff,transparent:true,opacity:0.7}));s.position.y=1.5;s.rotation.x=-0.3;g.add(p,s);g.userData.spin=null}
  else if(id==='waypoint'){const r=new THREE.Mesh(portalGeo,addMat(0x5ab0ff,0.9));r.position.y=1.6;g.add(r);g.userData.spin=r}
  return g}
function updateTown(dt){
  if(GS.flame){GS.flame.scale.y=3.2+Math.sin(NOW*5)*0.3;GS.flame.rotation.y+=dt}
  for(const c of GS.npcs){const d=dist(P.x,P.z,c.x,c.z);const near=d<(c.n.id==='dummy'?4.5:2.8);
    if(near&&!c.inside){c.inside=true;openNpc(c.n.id)}else if(!near&&d>4.5)c.inside=false;}
  /* mannequin : DPS en direct */
  if(townDummies.length){const inRange=dist(P.x,P.z,townDummies[0].x,townDummies[0].z)<14;
    if(inRange&&!mobs.some(m=>m.dummy)){townDummies.forEach(d=>{const m=spawnMob('rodeur',d.x,d.z,{hpMul:1e9,aggro:false,progress:0,xp:0});if(m){m.dummy=1;m.speed=0;m.mesh.visible=false;m.def=Object.assign({},m.def,{beh:'dummy'});m.r=0.5;m.h=2.2;m.untarget=false}});dummyStat.on=true;dummyStat.acc=0;dummyStat.hist=[];dummyStat.t=0}
    if(!inRange&&mobs.some(m=>m.dummy)){for(const m of mobs)if(m.dummy){m.dead=true;m.deadT=0}dummyStat.on=false;$('dummyBox').classList.remove('on')}
    for(const m of mobs)if(m.dummy){m.hp=m.max;m.aggro=false;m.atkT=99;m.castT=99;m.x=m.hx;m.z=m.hz;const d=townDummies.find(q=>q.x===m.hx);if(d&&m.flash>0)d.mesh.rotation.z=Math.sin(NOW*40)*0.05;else if(d)d.mesh.rotation.z=0}
    if(dummyStat.on){dummyStat.t+=dt;if(dummyStat.t>=0.5){dummyStat.hist.push(dummyStat.acc/0.5);dummyStat.acc=0;dummyStat.t=0;if(dummyStat.hist.length>10)dummyStat.hist.shift();
      const avg=dummyStat.hist.reduce((a,b)=>a+b,0)/Math.max(1,dummyStat.hist.length);const sim=simulateBuild(hero());
      $('dummyBox').classList.add('on');$('dummyBox').innerHTML=`<b>Mannequins</b><div class="dbig">${fmt(avg)}<small> dégâts/s en direct</small></div><div>Estimation : ${fmt(sim.single)} /s sur une cible · ${fmt(sim.group)} /s sur un groupe de 5</div><small>Approche-toi : les 6 mannequins encaissent sans mourir.</small>`}}
  }
}
/* ================= Interface : HUD, bulles, fenêtres ================= */
const nums=$('nums');
function floatNum(x,y,z,txt,cls,el){if(nums.childElementCount>30)return;const p=project(x,y,z);if(!p.vis)return;const d=document.createElement('div');d.className='n '+(cls||'');d.textContent=txt;
  if(el&&!cls&&el!=='phys')d.style.color=(ELC[el]||{}).css;d.style.left=p.x+'%';d.style.top=p.y+'%';nums.appendChild(d);setTimeout(()=>d.remove(),900)}
let toastT=null;const toastQ=[];
function banner(title,sub,color){const b=$('banner');b.innerHTML=`<b style="color:${color||'#ffd36a'}">${title}</b>${sub?'<small>'+sub+'</small>':''}`;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),2600)}
function toast(html,ms){const t=$('toast');const el=document.createElement('div');el.className='tst';el.innerHTML=html;t.appendChild(el);while(t.childElementCount>3)t.firstChild.remove();setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400)},ms||2600)}
function tutoTip(k){if(G.tuto[k]||!D.TUTORIAL[k])return;G.tuto[k]=1;const t=$('tip');t.textContent=D.TUTORIAL[k];t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),5500)}
let dlgQ=[];
function dialog(lines){dlgQ=dlgQ.concat(lines);if(!$('dlg').classList.contains('on'))nextDialog()}
function nextDialog(){const d=$('dlg');if(!dlgQ.length){d.classList.remove('on');return}const l=dlgQ.shift();d.innerHTML=`<b>${esc(l.who)}</b><p>${esc(l.txt)}</p><small>Touche pour continuer</small>`;d.classList.add('on');clearTimeout(d._t);d._t=setTimeout(nextDialog,6500)}
$('dlg').addEventListener('click',nextDialog);

/* ----- barre de compétences ----- */
function renderSkillBar(){
  const h=hero();if(!h)return;let s='',m='';
  for(let i=0;i<6;i++){const id=SLOTSK[i];const sk=id&&SK[id];
    s+=`<div class="sk${sk?'':' empty'}" data-i="${i}" title="${sk?esc(sk.name):''}">${sk?icon(sk.icon):''}<i class="cd"></i><em>${sk&&i===0?'auto':''}</em></div>`;
    if(ST().manual&&sk)m+=`<button class="mb" data-cast="${i}" style="--k:${i}" aria-label="${esc(sk.name)}">${icon(sk.icon)}<i class="cd"></i></button>`}
  $('skills').innerHTML=s;$('manual').innerHTML=m;$('hud').classList.toggle('manual',!!ST().manual);$('manual').style.display=ST().manual?'':'none';
}
function flashSkill(id){const i=SLOTSK.indexOf(id);if(i<0)return;const el=$('skills').children[i];if(el){el.classList.remove('fire');void el.offsetWidth;el.classList.add('fire')}}
$('manual').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-cast]');if(!b)return;e.stopPropagation();e.preventDefault();audioInit();const id=SLOTSK[+b.dataset.cast];if(id&&!castSkill(id)){b.classList.add('no');setTimeout(()=>b.classList.remove('no'),200)}});

/* ----- HUD ----- */
let hudT=0;
function updateHud(dt,bossNear){
  const h=hero(),C=CLS[h.cls];
  $('hpFill').style.width=clamp(P.hp/S.maxHp*100,0,100)+'%';$('hpTxt').textContent=fmt(Math.max(0,P.hp))+' / '+fmt(S.maxHp);
  $('shFill').style.width=clamp(P.shield/S.maxHp*100,0,100)+'%';
  $('resFill').style.width=clamp(P.res/S.resMaxTot*100,0,100)+'%';$('resTxt').textContent=Math.floor(P.res)+' '+C.res.n;
  if(C.res2){$('res2').style.display='';$('res2Fill').style.width=clamp(P.res2/C.res2.max*100,0,100)+'%';$('res2Txt').textContent=Math.floor(P.res2)+' '+C.res2.n}else $('res2').style.display='none';
  const xpPct=h.lvl<70?h.xp/xpNeed(h.lvl):G.paragon.xp/paraNeed(G.paragon.lvl+1);$('xpFill').style.width=clamp(xpPct*100,0,100)+'%';
  $('lvl').textContent=h.lvl<70?h.lvl:'P'+G.paragon.lvl;
  $('potion').style.setProperty('--p',clamp(P.potion/D.POTION.cd,0,1));$('potion').classList.toggle('ready',P.potion<=0);
  /* recharges */
  const ks=$('skills').children,mb=$('manual').children;let j=0;
  for(let i=0;i<6;i++){const id=SLOTSK[i];if(!id)continue;const p=SKC[id];const cd=P.cds[id]||0,tot=cdOf(p)||1;const f=cd>0?clamp(cd/tot,0,1):0;const noRes=!canCast(id)&&cd<=0;
    if(ks[i]){ks[i].querySelector('.cd').style.height=(f*100)+'%';ks[i].classList.toggle('nores',noRes&&i>0)}
    if(mb[j]){mb[j].querySelector('.cd').style.height=(f*100)+'%';mb[j].classList.toggle('nores',noRes);j++}}
  /* bonus actifs */
  hudT-=dt;if(hudT<=0){hudT=0.25;
    const bs=P.buffs.filter(b=>b.until-NOW>0.2).slice(0,6).map(b=>{const n=b.id.startsWith('sk_')?SK[b.id.slice(3)]:null;const lab=n?n.name:b.id.startsWith('py_')?'Pylône':b.id.startsWith('shr_')?'Sanctuaire':'Bonus';return `<span>${esc(lab)} ${Math.ceil(b.until-NOW)}s</span>`}).join('');
    $('buffs').innerHTML=bs;drawMinimap();updateTrackerLive();
    $('farmTag').style.display=ST().farm&&GS.zone!=='ville'?'':'none';
  }
  /* boss */
  const bb=$('bossbar');if(bossNear&&bossNear.aggro){bb.classList.add('on');$('bossName').textContent=(bossNear.label||bossNear.def.name)+(bossNear.def.phases?' — '+(bossNear.def.phases[bossNear.phase].name||'Phase '+(bossNear.phase+1)):'');$('bossFill').style.width=(bossNear.hp/bossNear.max*100)+'%'}else bb.classList.remove('on');
  /* barres de vie des monstres */
  for(const m of mobs){if(m.dummy)continue;const d=dist(m.x,m.z,P.x,P.z);const show=!m.dead&&m.active&&d<18&&!m.boss&&(m.hp<m.max||m.elite||m.named);
    if(show){if(!m.hpEl){m.hpEl=document.createElement('div');m.hpEl.className='mhp'+(m.elite==='rare'||m.named?' rare':m.elite==='champion'?' champ':'');
        const aff=m.affix.length?`<small>${m.affix.map(a=>D.ELITE_AFFIXES.find(x=>x.id===a).n).join(' · ')}</small>`:'';
        m.hpEl.innerHTML=(m.elite||m.named?`<b>${esc(m.label||m.def.name)}</b>${aff}`:'')+'<div><i></i></div>';$('labels').appendChild(m.hpEl)}
      const p=project(m.x,m.y+m.h+0.3,m.z);m.hpEl.style.display=p.vis?'':'none';m.hpEl.style.left=p.x+'%';m.hpEl.style.top=p.y+'%';m.hpEl.lastChild.firstChild.style.width=(m.hp/m.max*100)+'%'}
    else if(m.hpEl){m.hpEl.remove();m.hpEl=null}}
}
/* ----- suivi de quête / faille ----- */
function updateTracker(){updateTrackerLive(true)}
function updateTrackerLive(){
  const h=hero();if(!h)return;let s='';
  if(GS.rift){const r=GS.rift;const t=r.gr?Math.max(0,r.timer-(NOW-r.t0)):NOW-r.t0;
    s=`<b>${r.gr?'Faille supérieure '+r.gr:'Faille'} · ${esc(r.name)}</b><div class="rbar"><i style="width:${Math.min(100,r.progress)}%"></i><span>${r.guardianSpawned?(r.done?'Terminée !':'Gardien !'):Math.floor(r.progress)+' %'}</span></div>`+
      (r.gr?`<div class="timer${t<120?' low':''}">⏱ ${mmss(t)}${r.deaths?' · morts : '+r.deaths:''}</div>`:'')+(r.done?'<small>Prends le portail pour rentrer.</small>':'');}
  else if(GS.zone==='ville'){s=`<b>Havrebraise</b><small>Approche-toi d'un personnage.</small>`;
    const qs=questState(h);if(qs){const st=qs.step;s+=`<div class="q">▸ ${esc(st.text)}</div><small>Utilise le Point de passage.</small>`}}
  else{const Z=D.ZONES[GS.zone];s=`<b>${esc(Z.name)}</b><small>${esc(DIFF[h.diff||0].n)} · monstres niv ${P.mobLvl}</small>`;
    const qs=questState(h);if(qs&&(qs.n===1||D.ZONES[GS.zone].act===2||!h.bounties||!h.bounties[GS.zone])){const st=qs.step;if(st.zone===GS.zone){const k=(h.qk&&h.qk[st.id])||0,need=st.clear?clearNeed(st):0;if(st.clear&&k<need)s+=`<div class="q">▸ Purifie ${st.goal==='boss'?'le donjon':'la zone'}</div><div class="rbar"><i style="width:${Math.min(100,k/need*100)}%;background:linear-gradient(90deg,#c0501a,#ffb04a)"></i><span>${Math.floor(k/need*100)} %</span></div><small>Ensuite : ${esc(st.hint)}</small>`;else s+=`<div class="q">▸ ${esc(st.hint)}</div>`}else if(st.zone)s+=`<div class="q">▸ Va vers : ${esc(D.ZONES[st.zone].name)}</div>`}
    else if(h.bounties&&h.bounties[GS.zone]){const B=h.bounties[GS.zone];s+=B.list.map(b=>`<div class="q${b.done?' done':''}">${b.done?'✓':'▸'} ${esc(b.name)}</div>`).join('')}
  }
  $('tracker').innerHTML=s;
}
/* ----- minimap ----- */
function drawMinimap(){
  if(!MAP||!mmBase)return;const N=MAP.N,W=mm.width;mmx.clearRect(0,0,W,W);mmx.globalAlpha=0.9;mmx.drawImage(mmBase,0,0,W,W);mmx.drawImage(mmFog,0,0,W,W);mmx.globalAlpha=1;
  const k=W/N,tp=(x,z)=>[(x+N/2)*k,(z+N/2)*k];
  for(const m of mobs){if(m.dead||m.dummy)continue;const [x,y]=tp(m.x,m.z);mmx.fillStyle=m.boss?'#ff3a3a':m.elite||m.named?'#ffd04a':'#d84a3a';const r=m.boss?4:m.elite||m.named?2.6:1.6;mmx.fillRect(x-r/2,y-r/2,r,r)}
  for(const p of GS.portals){const [x,y]=tp(p.x,p.z);mmx.fillStyle='#5ab0ff';mmx.beginPath();mmx.arc(x,y,3,0,6.28);mmx.fill()}
  for(const e of GS.events)if(e.state<2){const [x,y]=tp(e.x,e.z);mmx.fillStyle='#ff9a3a';mmx.fillRect(x-2.5,y-2.5,5,5)}
  for(const c of GS.npcs){const [x,y]=tp(c.x,c.z);mmx.fillStyle='#ffe0a0';mmx.beginPath();mmx.arc(x,y,2.5,0,6.28);mmx.fill()}
  for(const s of GS.shrines)if(!s.used){const [x,y]=tp(s.x,s.z);mmx.fillStyle='#'+s.d.c.toString(16).padStart(6,'0');mmx.fillRect(x-2,y-2,4,4)}
  const tgt=questTarget();if(tgt){const [x,y]=tp(tgt.x,tgt.z);mmx.strokeStyle='#ffd76a';mmx.lineWidth=2;mmx.beginPath();mmx.arc(x,y,5+Math.sin(NOW*4),0,6.28);mmx.stroke()}
  const [px,py]=tp(P.x,P.z);mmx.save();mmx.translate(px,py);mmx.rotate(-P.face+Math.PI);mmx.fillStyle='#fff';mmx.beginPath();mmx.moveTo(0,-5);mmx.lineTo(4,4);mmx.lineTo(-4,4);mmx.closePath();mmx.fill();mmx.restore();
}
function questTarget(){const h=hero();if(GS.rift){if(GS.bossRef&&!GS.bossRef.dead)return GS.bossRef;if(GS.rift.done&&GS.portals[0])return GS.portals[0];return null}
  if(GS.zone==='ville'){const w=GS.npcs.find(c=>c.n.id==='waypoint');return w&&questState(h)?w:null}
  if(!MAP)return null;
  const qs=questState(h);if(qs&&(qs.n===1||D.ZONES[GS.zone].act===2)){const st=qs.step;if(st.zone===GS.zone){const m=mobs.find(x=>!x.dead&&(x.quest===st.named||x.boss===st.named));if(m)return m;if(st.clear){let b=null,bd=1e9;for(const x of mobs){if(x.dead||x.dummy||x.thief)continue;const d=dist(x.x,x.z,P.x,P.z)-(x.elite?6:0);if(d<bd){bd=d;b=x}}if(b)return b}}else{const p=GS.portals.find(q=>q.to!=='ville');if(p)return p}}
  else{const m=mobs.find(x=>!x.dead&&x.bounty);if(m)return m;const e=GS.events.find(x=>x.bounty&&x.state<2);if(e)return e}
  return null}

/* ----- fenêtres (menu et panneaux) ----- */
let menuTab='perso',selItem=null,selSlot=0,selSkill=null,confirmKey=null,panelId=null,panelState={};
function openMenu(tab){audioInit();if(tab)menuTab=tab;selItem=null;confirmKey=null;$('menu').classList.add('on');$('btnMenu').classList.remove('new');renderMenu();SFX.ui()}
function closeMenu(){$('menu').classList.remove('on');rebuild();save()}
const TABS=[['perso','Personnage','person'],['inv','Inventaire','swap-bag'],['skills','Compétences','spell-book'],['fus','Fusions','fire-ring'],['para','Parangon','star-medal'],['gems','Gemmes','gem-pendant'],
  ['season','Saison','laurels-trophy'],['map','Carte','treasure-map'],['codex','Codex','open-book'],['armory','Armurerie','bookmarklet'],['settings','Réglages','cog']];
function renderMenu(){
  const h=hero();if(!h)return;
  const tabs=TABS.map(([k,n,ic])=>`<button class="tab${menuTab===k?' on':''}" data-tab="${k}">${icon(ic)}<span>${n}</span>${k==='para'&&paraFree(h)>0?'<i class="dot"></i>':''}</button>`).join('');
  let body='';try{body=({perso:tabPerso,inv:tabInv,skills:tabSkills,fus:tabFus,para:tabPara,gems:tabGems,season:tabSeason,map:tabMap,codex:tabCodex,armory:tabArmory,settings:tabSettings}[menuTab])(h)}catch(e){console.error(e);body='<p>Erreur d\'affichage.</p>'}
  $('menu').innerHTML=`<div class="mhead"><div class="tabs">${tabs}</div><button class="x" data-act="close">✕</button></div><div class="mbody">${body}</div>`;
}
function openPanel(id,st){audioInit();panelId=id;panelState=st||{};confirmKey=null;$('panel').classList.add('on');renderPanel();SFX.ui()}
function closePanel(){$('panel').classList.remove('on');panelId=null;rebuild();save()}
function renderPanel(){const h=hero();if(!panelId||!h)return;let t='',b='';
  try{const r=PANELS[panelId](h);t=r[0];b=r[1]}catch(e){console.error(e);t='Erreur';b=''}
  $('panel').innerHTML=`<div class="phead"><h2>${t}</h2><button class="x" data-act="pclose">✕</button></div><div class="pbody">${b}</div>`}
function openNpc(id){const h=hero();const n=NPCS.find(x=>x.id===id);
  if(n.lvl&&h.lvl<n.lvl){toast(`${n.n} : débloqué au niveau ${n.lvl}.`,2400);return}
  if(n.adv&&!h.actDone){toast(`${n.n} : termine l'Acte I pour ouvrir le Mode Aventure.`,2600);return}
  if(n.tav&&!tavernOpen(h)){toast(`${n.n} : termine l'Acte I ou atteins le niveau ${D.UNLOCKS.tavern}.`,2600);return}
  if(id==='dummy')return;
  openPanel(id)}

/* ----- cartes d'objets ----- */
function statDelta(h,it){const tgt=targetSlot(h,it);const eq=Object.assign({},h.equip);eq[tgt]=it;
  if(it.slot==='arme'&&false)eq.offhand=null;const S1=computeStats(h,eq);const S0=S;const L=P.mobLvl||h.lvl;
  const d=sim=>sim;const dp=(S1.sheetDps/S0.sheetDps-1),tp=(toughness(S1,L)/toughness(S0,L)-1);return{dps:dp,tough:tp,S1}}
function targetSlot(h,it){if(it.slot==='anneau'){if(!h.equip.anneau1)return 'anneau1';if(!h.equip.anneau2)return 'anneau2';const a=computeStats(h,Object.assign({},h.equip,{anneau1:it})),b=computeStats(h,Object.assign({},h.equip,{anneau2:it}));return a.sheetDps+toughness(a,h.lvl)/50>b.sheetDps+toughness(b,h.lvl)/50?'anneau1':'anneau2'}return it.slot}
function deltaTag(v,lab){if(Math.abs(v)<0.001)return `<span class="eq">= ${lab}</span>`;return `<span class="${v>0?'up':'dn'}">${v>0?'▲ +':'▼ '}${(v*100).toFixed(1).replace('.',',')} % ${lab}</span>`}
function itemCard(it,o){
  o=o||{};const h=hero();const B=D.BASES[it.base];const col=rarCss(it);
  let s=`<div class="icard" style="--rc:${col}"><div class="ihead"><div class="iic">${icon(B.icon)}</div><div><b>${esc(it.name)}</b><small>${rarName(it)} · ${SLOT[it.slot]?SLOT[it.slot].n:'Anneau'} · niv ${it.lvl}${it.up?' · +'+it.up:''}${it.cls?' · '+CLS[it.cls].name:''}</small></div></div>`;
  if(it.wpn)s+=`<div class="ibig">${fmt(it.wpn.min*(1+0.06*it.up))}–${fmt(it.wpn.max*(1+0.06*it.up))} dégâts · ${String(it.wpn.aps).replace('.',',')} att/s</div>`;
  if(it.armor)s+=`<div class="ibig">${fmt(it.armor*(1+0.06*it.up))} armure</div>`;
  const cmpIt=o.cmp;
  s+='<ul>'+it.aff.map((a,i)=>{let cls='';if(cmpIt){const old=cmpIt.aff.find(x=>x.k===a.k&&(x.st===a.st)&&(x.el===a.el)&&(x.sk===a.sk));cls=!old?'up':a.v>old.v?'up':a.v<old.v?'dn':''}
    return `<li class="${cls}${D.AFFIXES[a.k].prim?'':' sec'}">${i===it.ench?'✦ ':''}${esc(affixText(a,it))}</li>`}).join('')+'</ul>';
  if(it.leg){const L=LEG[it.leg];s+=`<p class="lpow">${esc(L.text)}</p>`;if(L.cls&&L.cls!==h.cls)s+=`<p class="warn">Pouvoir réservé : ${CLS[L.cls].name}</p>`}
  if(it.set){const st=SETS[it.set];const n=S&&S.setCount[it.set]||0;s+=`<div class="setb"><b>${esc(st.name)}</b> <small>(${esc(st.style)}) · ${n}/6 portées</small>`+
    [['b2',2],['b4',4],['b6',6]].map(([k,nn])=>`<div class="${S&&S.setBonus.includes(it.set+':'+nn)?'on':''}">(${nn}) ${esc(st[k].text)}</div>`).join('')+`</div>`}
  if(it.cls&&it.cls!==h.cls)s+=`<p class="warn">Utilisable par : ${CLS[it.cls].name}</p>`;
  if(o.delta&&canEquip(it,h)){const d=statDelta(h,it);s+=`<div class="delta">${deltaTag(d.dps,'DPS')} ${deltaTag(d.tough,'robustesse')}</div>`}
  return s+'</div>';
}
function itemCell(it,act,extra){const h=hero();let up='';if(canEquip(it,h)&&act==='sel'){const d=statDelta(h,it);if(d.dps+0.5*d.tough>0.01)up='<i class="upa">▲</i>'}
  return `<button class="cell${selItem===it.id?' sel':''}" data-act="${act}" data-id="${it.id}" style="--rc:${rarCss(it)}">${icon(D.BASES[it.base].icon)}${up}${it.lock?'<i class="lk">🔒</i>':''}${it.anc?'<i class="anc">'+(it.anc===2?'P':'A')+'</i>':''}${extra||''}</button>`}

/* ----- onglets ----- */
function tabPerso(h){
  const L=P.mobLvl||h.lvl;const mt=mitigation(S,L);const C=CLS[h.cls];
  let doll='<div class="doll">'+D.SLOTS.map(sl=>{const it=h.equip[sl.id];return `<button class="slot${it?'':' empty'}" data-act="eqsel" data-slot="${sl.id}" style="--rc:${it?rarCss(it):'#3a3324'}">${icon(it?D.BASES[it.base].icon:sl.icon)}<span>${sl.n}</span></button>`}).join('')+'</div>';
  const sim=simulateBuild(h);
  const st=[['Dégâts par seconde (fiche)',fmt(S.sheetDps)],['Estimation 1 cible / groupe',fmt(sim.single)+' / '+fmt(sim.group)],['Robustesse',fmt(toughness(S,L))],['Récupération',fmt(recovery(S))+' vie/s'],
    [C.mainName,fmt(S.main)],['Vitalité',fmt(S.vit)],['Vie',fmt(S.maxHp)],['Dégâts d\'arme',fmt(S.wpnAvg)],['Vitesse d\'attaque',S.aps.toFixed(2).replace('.',',')+'/s'],
    ['Chance de critique',pct(S.chc,1)],['Dégâts critiques',pct(S.chd)],['Réduction des recharges',pct(S.cdr,1)],['Réduction des coûts',pct(S.rcr,1)],['Dégâts de zone',pct(S.area)],['Dégâts contre élites',pct(S.elite)],
    ['Armure',fmt(S.armor)+' ('+pct(mt.aDR,1)+')'],['Résistances',fmt(S.res)+' ('+pct(mt.rDR,1)+')'],['Réduction totale des dégâts',pct(1-mt.mult,1)],['Épines',fmt(S.thorns*S.thornsM)],['Vol de vie',pct(S.ls,1)],['Vie par coup',fmt(S.loh)],
    ['Vitesse de déplacement','+'+pct(S.ms)],['Or trouvé','+'+pct(S.gold)],['Rayon de ramassage',S.pickup.toFixed(1).replace('.',',')+' m']];
  Object.keys(S.elem).forEach(k=>st.push(['Dégâts '+ELC[k].n.toLowerCase(),'+'+pct(S.elem[k])]));
  let side='';if(selItem){const it=h.equip[selItem];if(it)side=itemCard(it)+`<div class="row"><button class="btn" data-act="unequip" data-slot="${selItem}">Retirer</button></div>`}
  else side=`<div class="statl">${st.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
  const fz=S.fusions.length?S.fusions.map(id=>`<span class="chip fus">${esc(FUS[id].name)}</span>`).join(''):'<span class="hint">aucune fusion active</span>';
  const sets=Object.keys(S.setCount).map(k=>`<span class="chip set">${esc(SETS[k].name)} ${S.setCount[k]}/6</span>`).join('');
  return `<div class="cols"><div><h3>${esc(h.name)} <small>${C.name} · niv ${h.lvl}${h.lvl>=70?' · parangon '+G.paragon.lvl:''}</small></h3>${doll}<div class="row">${fz}${sets}</div><p class="hint">Touche un emplacement pour voir l'objet, ou retourne aux statistiques en touchant le même.</p></div><div>${side}</div></div>`;
}
function tabInv(h){
  const sorted=h.inv;const cells=sorted.map(it=>itemCell(it,'sel')).join('')+Array(Math.max(0,INV_MAX-h.inv.length)).fill('<div class="cell vide"></div>').join('');
  let side='<p class="hint">Touche un objet pour le comparer avec celui que tu portes. ▲ vert = amélioration.</p>';
  const it=h.inv.find(x=>x.id===selItem);
  if(it){const tgt=targetSlot(h,it);const cur=h.equip[tgt];
    side=itemCard(it,{delta:1,cmp:cur})+`<div class="row">${canEquip(it,h)?`<button class="btn gold" data-act="equip" data-id="${it.id}">Équiper</button>`:''}<button class="btn" data-act="lock" data-id="${it.id}">${it.lock?'Déverrouiller':'Verrouiller'}</button><button class="btn" data-act="salv1" data-id="${it.id}" ${it.lock?'disabled':''}>Recycler</button></div>`+
      (cur?`<h4>Porté actuellement</h4>`+itemCard(cur):'<p class="hint">Emplacement vide.</p>')}
  const conf=confirmKey==='salvAll'?`<div class="confirm">Recycler tous les objets non verrouillés <b>blancs, bleus et jaunes</b> ? <button class="btn red" data-act="salvAllY">Oui</button><button class="btn" data-act="cancel">Non</button></div>`:
    confirmKey==='salvLeg'?`<div class="confirm">Recycler aussi les <b>légendaires et sets</b> non verrouillés ? <button class="btn red" data-act="salvLegY">Oui</button><button class="btn" data-act="cancel">Non</button></div>`:'';
  return `<div class="cols inv"><div><div class="row"><b>${h.inv.length}/${INV_MAX}</b><button class="btn sm" data-act="sort">Trier</button><button class="btn sm" data-act="salvAll">Tout recycler</button><button class="btn sm" data-act="salvLeg">+ légendaires</button><span class="gold">${fmt(G.gold)} or</span></div>${conf}<div class="grid">${cells}</div>${matsLine()}</div><div class="side">${side}</div></div>`;
}
function matsLine(){return `<div class="mats">${Object.keys(D.MATERIALS).map(k=>`<span style="color:${D.MATERIALS[k].css}" title="${D.MATERIALS[k].n}">${icon(D.MATERIALS[k].icon)}${fmt(G.mats[k]||0)}</span>`).join('')}<span title="Clés de faille supérieure">${icon('key')}${G.keys}</span></div>`}
function tabSkills(h){
  const free=ST().free;const slots=D.CATS.map((c,i)=>{const s=h.skills[i];const sk=s&&SK[s.id];const locked=!sk||h.lvl<sk.lvl;
    return `<button class="sslot${selSlot===i?' on':''}" data-act="sslot" data-i="${i}">${sk?icon(sk.icon):''}<b>${sk?esc(sk.name):'—'}</b><small>${free?'Libre':c.n}${sk&&s.rune>=0&&sk.runes[s.rune]?' · '+esc(sk.runes[s.rune].name):''}</small></button>`}).join('');
  const cat=D.CATS[selSlot].id;const pool=D.SKILLS.filter(s=>s.cls===h.cls&&(free||s.cat===cat));const cur=h.skills[selSlot];
  const list=pool.map(s=>{const lk=h.lvl<s.lvl;const used=h.skills.findIndex(x=>x&&x.id===s.id);return `<button class="skc${cur&&cur.id===s.id?' on':''}${lk?' lk':''}" data-act="pick" data-id="${s.id}" ${lk?'disabled':''}>${icon(s.icon)}<div><b>${esc(s.name)}</b><small>${lk?'Niveau '+s.lvl:esc(D.CATS.find(c=>c.id===s.cat).n)+(used>=0&&used!==selSlot?' · déjà équipée':'')}</small><p>${esc(s.desc)}</p></div></button>`}).join('');
  let runes='';if(cur&&SK[cur.id]){const sk=SK[cur.id];const p=SKC[cur.id]||resolveSkill(cur.id,cur.rune);
    runes=`<h4>Runes de ${esc(sk.name)}</h4><button class="rune${cur.rune<0?' on':''}" data-act="rune" data-r="-1"><b>Sans rune</b><small>${esc(sk.desc)}</small></button>`+sk.runes.map((r,i)=>{const lk=h.lvl<r.lvl;return `<button class="rune${cur.rune===i?' on':''}${lk?' lk':''}" data-act="rune" data-r="${i}" ${lk?'disabled':''}><b>${esc(r.name)}</b><small>${lk?'Niveau '+r.lvl+' — ':''}${esc(r.desc)}</small></button>`}).join('')+
    `<p class="hint">${skillInfo(p)}</p>`}
  return `<div class="sslots">${slots}</div><div class="cols"><div class="skl">${list}</div><div>${runes}</div></div><p class="hint">${free?'Mode choix libre : n\'importe quelle compétence dans n\'importe quel emplacement.':'Une compétence par catégorie. Mode choix libre dans Réglages.'} ${ST().manual?'Mode manuel : boutons ronds à droite.':'Les compétences se lancent toutes seules.'}</p>`;
}
function skillInfo(p){const a=[];if(p.dmg)a.push('Dégâts : '+Math.round(p.dmg*100)+' % de l\'arme');if(p.cost)a.push('Coût : '+Math.round(skillCost(p))+(p.res2?' Discipline':''));if(p.gen)a.push('Génère '+p.gen);if(p.cd)a.push('Recharge : '+cdOf(p).toFixed(1).replace('.',',')+' s');if(p.el)a.push('Élément : '+ELC[p.el].n);return a.join(' · ')}
function tabFus(h){
  const all=D.FUSIONS.filter(f=>f.cls===h.cls);const eq=equippedSkills(h);
  const lst=all.map(f=>{const known=h.fus.known.includes(f.id)||S.legs.some(l=>LEG[l].fuse===f.id);const act=S.fusions.includes(f.id);const hasSk=eq.includes(f.a)&&eq.includes(f.b);
    return `<div class="fusc${act?' on':''}${known?'':' unk'}"><div class="fh"><b>${known?esc(f.name):'Fusion inconnue'}</b><span class="chip">${esc(f.style)}</span></div><div class="fsk">${icon(SK[f.a].icon)}<span>${esc(SK[f.a].name)}</span> + ${icon(SK[f.b].icon)}<span>${esc(SK[f.b].name)}</span></div>
      <p>${known?esc(f.text):'Découvre-la à l\'Autel des fusions (niveau 30) ou avec un légendaire de fusion.'}</p><small>${act?'✓ ACTIVE':known?(h.fus.active.includes(f.id)?(hasSk?'Active':'Active, mais équipe les deux compétences'):'Connue — active-la à l\'Autel'):''}</small></div>`}).join('');
  return `<p class="hint">Une fusion combine deux compétences équipées pour créer un effet nouveau. ${fusionSlots(h)} fusions actives possibles (3 au parangon 100). Les légendaires de fusion ajoutent la leur en plus.</p><div class="fgrid">${lst}</div>`;
}
function fusionSlots(h){return G.paragon.lvl>=D.UNLOCKS.fusionSlot3Paragon?3:2}
function paraFree(h){if(!G.paragon.lvl)return 0;let f=0;D.PARAGON.forEach((c,ci)=>{const tot=paragonPoints(G.paragon.lvl,ci);const used=c.stats.reduce((a,s)=>a+(h.para[s.k]||0),0);f+=tot-used});return f}
function tabPara(h){
  if(G.paragon.lvl<=0)return `<div class="empty-state">${icon('star-medal')}<h3>Parangon</h3><p>Atteins le niveau 70 : chaque niveau de parangon (sans limite, partagé entre tous tes héros) donnera un point, tour à tour dans 4 catégories.</p></div>`;
  const cats=D.PARAGON.map((c,ci)=>{const tot=paragonPoints(G.paragon.lvl,ci);const used=c.stats.reduce((a,s)=>a+(h.para[s.k]||0),0);
    return `<div class="pcat"><h4>${c.n} <small>${tot-used} point(s) libre(s)</small></h4>${c.stats.map(s=>{const n=h.para[s.k]||0;const v=n*s.per;return `<div class="prow"><span>${s.n}</span><b>${s.pct?'+'+pct(v,1):'+'+fmt(v)}</b><small>${n}${s.cap?'/'+s.cap:''}</small><button class="btn sm" data-act="pm" data-k="${s.k}" ${n<=0?'disabled':''}>−</button><button class="btn sm" data-act="pp" data-k="${s.k}" data-c="${ci}" ${tot-used<=0||(s.cap&&n>=s.cap)?'disabled':''}>+</button><button class="btn sm" data-act="pp10" data-k="${s.k}" data-c="${ci}" ${tot-used<=0||(s.cap&&n>=s.cap)?'disabled':''}>+10</button></div>`}).join('')}</div>`}).join('');
  return `<div class="row"><b>Parangon ${G.paragon.lvl}</b><span class="hint">Prochain niveau : ${fmt(G.paragon.xp)} / ${fmt(paraNeed(G.paragon.lvl+1))} XP</span><button class="btn sm" data-act="preset">Réinitialiser</button></div><div class="pgrid">${cats}</div>`;
}
function tabGems(h){
  if(!h.gems.length)return `<div class="empty-state">${icon('gem-pendant')}<h3>Gemmes légendaires</h3><p>Termine une faille supérieure (Obélisque, après l'Acte I) pour obtenir ta première gemme. Elles montent de rang à chaque faille supérieure réussie et se sertissent dans l'amulette et les deux anneaux.</p></div>`;
  const socks=['amulette','anneau1','anneau2'].map(sl=>{const gi=h.gemSock[sl];const g=gi!=null&&h.gems[gi];return `<div class="gsock"><small>${SLOT[sl].n}${h.equip[sl]?'':' (vide)'}</small>${g?`<b style="color:${GEM[g.id].color}">${esc(GEM[g.id].name)} · rang ${g.rank}</b>`:'<i class="hint">aucune gemme</i>'}<div class="row">${h.gems.map((x,i)=>`<button class="btn sm${gi===i?' gold':''}" data-act="sock" data-sl="${sl}" data-i="${i}">${esc(GEM[x.id].name.split(' ')[0])}</button>`).join('')}<button class="btn sm" data-act="sock" data-sl="${sl}" data-i="-1">Retirer</button></div></div>`}).join('');
  const list=h.gems.map(g=>{const G_=GEM[g.id];let v=G_.v0+G_.vr*g.rank;if(G_.cap)v=Math.min(G_.cap,v);return `<div class="gem" style="--gc:${G_.color}">${icon(G_.icon)}<div><b>${esc(G_.name)} <small>rang ${g.rank}</small></b><p>${esc(G_.text.replace(/\{v\}/g,String(Math.round(v*10)/10).replace('.',',')))}</p><small class="${g.rank>=25?'on':''}">${esc(G_.r25.text)}</small></div></div>`}).join('');
  return `<div class="gsocks">${socks}</div><div class="gems">${list}</div>`;
}
function seasonProgress(g){const h=hero(),s=G.season;switch(g.type){case 'level':return h.lvl;case 'kills':return s.kills;case 'equipLeg':return Object.values(h.equip).some(it=>it&&(it.r==='l'||it.r==='s'))?1:0;
  case 'actBoss':return s.actBoss;case 'elites':return s.elites;case 'rifts':return s.rifts;case 'bounties':return s.bounties;case 'gr':return Math.max(...G.heroes.map(x=>x.bestGR||0));case 'extract':return s.extract;
  case 'fusion':return S&&S.fusions.length?1:s.fusion;case 'paragon':return G.paragon.lvl;case 'diff':return s.maxDiff;default:return 0}}
function tabSeason(h){
  const S1=D.SEASON;const ch=S1.chapters.map((c,i)=>{const done=c.goals.every(g=>seasonProgress(g)>=g.n);const claimed=G.season.claimed.includes(i);
    const rw=[];if(c.reward.gold)rw.push(fmt(c.reward.gold)+' or');if(c.reward.mats)for(const k in c.reward.mats)rw.push(c.reward.mats[k]+' '+D.MATERIALS[k].n);if(c.reward.keys)rw.push(c.reward.keys+' clés');if(c.reward.set)rw.push('Set complet : '+SETS[c.reward.set].name);
    return `<div class="chap${claimed?' claimed':done?' done':''}"><h4>${esc(c.name)}</h4>${c.goals.map(g=>{const v=seasonProgress(g);return `<div class="goal${v>=g.n?' ok':''}">${v>=g.n?'✓':'○'} ${esc(g.text)} <small>${fmt(Math.min(v,g.n))}/${fmt(g.n)}</small></div>`}).join('')}
      <div class="rw">Récompense : ${rw.join(' · ')}</div>${claimed?'<small>Réclamée</small>':done?`<button class="btn gold" data-act="sclaim" data-i="${i}">Réclamer</button>`:''}</div>`}).join('');
  return `<div class="season"><h3>${esc(S1.name)}</h3><p>${esc(S1.theme)}</p><p class="rule">Règle de saison : ${esc(S1.rule.text)}</p></div><div class="chaps">${ch}</div>`;
}
function tabMap(h){
  const wps=['ville'].concat(h.wp).filter((v,i,a)=>a.indexOf(v)===i).map(z=>`<button class="btn wp${GS.zone===z?' on':''}" data-act="travel" data-z="${z}">${esc(D.ZONES[z].name)}${D.ZONES[z].lvl?' <small>niv '+D.ZONES[z].lvl+'+</small>':''}</button>`).join('');
  return `<h3>Points de passage</h3><div class="row wrap">${wps}</div>${diffPicker(h)}<p class="hint">${h.actDone?(questState(h)?'Quête : '+esc(questState(h).step.text)+' · ':'')+'Mode Aventure : primes dans chaque zone, failles à l\'Obélisque.':'Suis la quête : '+esc(D.ACT.steps[h.act].text)}</p>`;
}
function diffPicker(h){
  return `<h3>Difficulté</h3><div class="diffs">${DIFF.map((d,i)=>{const lk=h.lvl<d.lvl||(d.para&&G.paragon.lvl<d.para);return `<button class="dbtn${(h.diff||0)===i?' on':''}" data-act="diff" data-i="${i}" ${lk?'disabled':''}><b>${d.n}</b><small>${lk?(h.lvl<d.lvl?'niv '+d.lvl:'parangon '+d.para):'PV ×'+fmt(d.hp)+' · dégâts ×'+fmt(d.dmg)+(d.xp?' · XP +'+Math.round(d.xp*100)+' %':'')}</small></button>`}).join('')}</div><p class="hint">Chaque cran : monstres plus solides et plus dangereux, plus d'XP, d'or et de légendaires. Change de zone pour appliquer.</p>`}
function codexSee(it){if(it.leg)G.codex[it.leg]=1;if(it.set)G.codex[it.set]=1}
function tabCodex(h){
  const zoneOf=id=>{for(const z in D.BOUNTY_TARGETS)if(D.BOUNTY_TARGETS[z].includes(id))return D.ZONES[z].name;return null};
  const f=panelState.codexCls||h.cls;
  const legs=D.LEGENDARIES.filter(l=>!l.cls||l.cls===f).map(l=>{const seen=G.codex[l.id];const z=zoneOf(l.id);return `<div class="cx${seen?'':' unseen'}">${icon(D.BASES[l.slot==='anneau'?'anneau':l.slot==='arme'?CLS[l.cls||h.cls].weapons[0]:l.slot==='offhand'?CLS[l.cls||h.cls].offhand:l.slot].icon)}<div><b>${esc(l.name)}</b><small>${l.cls?CLS[l.cls].name:'Toutes classes'} · ${SLOT[l.slot]?SLOT[l.slot].n:'Anneau'}${seen?' · trouvé':' · jamais vu'}</small><p>${esc(l.text)}</p>${z?`<small class="tgt">Ciblage : plus fréquent dans le coffre de primes — ${esc(z)}</small>`:''}</div></div>`}).join('');
  const sets=D.SETS.filter(s=>!s.cls||s.cls===f).map(s=>`<div class="cx set${G.codex[s.id]?'':' unseen'}"><div><b>${esc(s.name)}</b><small>Set · ${esc(s.style)}${s.season?' · offert par la saison':''}</small><p>(2) ${esc(s.b2.text)}<br>(4) ${esc(s.b4.text)}<br>(6) ${esc(s.b6.text)}</p></div></div>`).join('');
  const n=Object.keys(G.codex).length,tot=D.LEGENDARIES.length+D.SETS.length;
  return `<div class="row"><b>Collection : ${n}/${tot}</b>${D.CLASSES.filter(c=>c.playable).map(c=>`<button class="btn sm${f===c.id?' gold':''}" data-act="cxcls" data-c="${c.id}">${c.name}</button>`).join('')}</div><div class="cxg">${legs}${sets}</div>`;
}
function tabArmory(h){
  const b=h.builds||[];
  return `<p class="hint">Enregistre ton build complet (équipement, compétences, runes, fusions, cube, parangon) et recharge-le en un geste.</p><div class="arm">${[0,1,2,3,4].map(i=>{const x=b[i];
    return `<div class="armc"><b>Emplacement ${i+1}</b>${x?`<small>${esc(x.name)} · ${new Date(x.t).toLocaleDateString('fr-FR')}</small><small>${x.skills.filter(Boolean).map(s=>SK[s.id]?SK[s.id].name:'').join(', ')}</small>`:'<small>vide</small>'}
      <div class="row"><button class="btn sm" data-act="bsave" data-i="${i}">Enregistrer ici</button>${x?`<button class="btn sm gold" data-act="bload" data-i="${i}">Charger</button>`:''}</div></div>`}).join('')}</div>`;
}
function tabSettings(h){
  const s=ST();const tog=(k,lab,sub)=>`<button class="tog${s[k]?' on':''}" data-act="set" data-k="${k}"><b>${lab}</b><small>${sub}</small><i>${s[k]?'Oui':'Non'}</i></button>`;
  const conf=confirmKey==='delHero'?`<div class="confirm">Supprimer <b>${esc(h.name)}</b> définitivement ? <button class="btn red" data-act="delHeroY">Oui, supprimer</button><button class="btn" data-act="cancel">Annuler</button></div>`:
    confirmKey==='resetAll'?`<div class="confirm">Tout effacer (tous les héros, coffre, parangon) ? <button class="btn red" data-act="resetY">Oui, tout effacer</button><button class="btn" data-act="cancel">Annuler</button></div>`:'';
  return `<div class="sets">${tog('music','Musique','Ambiance douce par zone')}${tog('sfx','Effets sonores','Sons discrets')}
    <label class="tog"><b>Volume</b><input type="range" min="0" max="1" step="0.05" value="${s.vol}" data-act="vol"></label>
    ${tog('manual','Compétences manuelles','6 boutons ronds à droite')}${tog('free','Mode choix libre','Mélanger les catégories')}${tog('farm','Farm auto','Le héros joue seul (failles, zones)')}${tog('filter','Filtre de butin','Masque blancs et bleus après le niveau 60')}
    <div class="tog"><b>Qualité graphique</b><small>Particules et distance</small><span class="row">${['bas','moyen','haut'].map(q=>`<button class="btn sm${s.quality===q?' gold':''}" data-act="qual" data-q="${q}">${q}</button>`).join('')}</span></div></div>
    <h4>Sauvegarde</h4><div class="row"><button class="btn sm" data-act="export">Exporter (code)</button><button class="btn sm" data-act="import">Importer</button><button class="btn sm" data-act="title">Changer de héros</button></div>
    <textarea id="saveCode" rows="3" placeholder="Colle ici un code de sauvegarde puis touche Importer"></textarea>
    <div class="row"><button class="btn sm red" data-act="delHero">Supprimer ce héros</button><button class="btn sm red" data-act="resetAll">Tout recommencer</button></div>${conf}
    ${DEBUG?`<h4>Debug</h4><div class="row wrap"><button class="btn sm" data-act="dbg" data-k="lvl">Niveau 70</button><button class="btn sm" data-act="dbg" data-k="items">Objets</button><button class="btn sm" data-act="dbg" data-k="para">+100 parangon</button><button class="btn sm" data-act="dbg" data-k="mats">Matériaux</button><button class="btn sm" data-act="dbg" data-k="act">Finir l'acte</button><button class="btn sm" data-act="dbg" data-k="god">Invincible</button></div>`:''}
    <p class="hint">Icônes : game-icons.net (CC BY 3.0).</p>`;
}
/* ================= Panneaux de la ville ================= */
function costLine(c,mul){mul=mul||1;return Object.keys(c).filter(k=>k!=='max'&&k!=='step').map(k=>{const v=Math.ceil(c[k]*mul);const have=k==='gold'?G.gold:k==='keys'?G.keys:(G.mats[k]||0);
  return `<span class="${have>=v?'':'dn'}">${k==='gold'?fmt(v)+' or':v+' '+(D.MATERIALS[k]?D.MATERIALS[k].n:k)}</span>`}).join(' · ')}
function canPay(c,mul){mul=mul||1;return Object.keys(c).filter(k=>k!=='max'&&k!=='step').every(k=>{const v=Math.ceil(c[k]*mul);return (k==='gold'?G.gold:(G.mats[k]||0))>=v})}
function pay(c,mul){mul=mul||1;if(!canPay(c,mul)){toast('Pas assez de ressources.',1800);return false}Object.keys(c).filter(k=>k!=='max'&&k!=='step').forEach(k=>{const v=Math.ceil(c[k]*mul);if(k==='gold')G.gold-=v;else G.mats[k]-=v});return true}
function salvageValue(it){const r=it.r;const o={};if(r==='c')o.ferraille=rndi(1,2);else if(r==='m')o.azur=rndi(1,2);else if(r==='r'){o.ambre=rndi(1,2);o.azur=1}else{o.braise=it.anc?2:1;o.ambre=1}o.gold=Math.round(goldDrop(it.lvl)*({c:1,m:2,r:4,l:10,s:10}[r]));return o}
function salvage(it,silent){const h=hero();const i=h.inv.indexOf(it);if(i<0||it.lock)return false;h.inv.splice(i,1);const v=salvageValue(it);for(const k in v){if(k==='gold')G.gold+=v[k];else G.mats[k]=(G.mats[k]||0)+v[k]}
  if(!silent)toast('Recyclé : '+Object.keys(v).map(k=>k==='gold'?fmt(v[k])+' or':v[k]+' '+D.MATERIALS[k].n).join(', '),1800);return true}
function allItems(h){return Object.keys(h.equip).filter(k=>h.equip[k]).map(k=>({it:h.equip[k],where:'eq',slot:k})).concat(h.inv.map(it=>({it,where:'inv'})))}
function findItem(h,id){const e=Object.keys(h.equip).find(k=>h.equip[k]&&h.equip[k].id===id);if(e)return h.equip[e];return h.inv.find(x=>x.id===id)||G.stash.find(x=>x.id===id)}
function pickGrid(h,filter,act){const L=allItems(h).filter(x=>!filter||filter(x.it));if(!L.length)return '<p class="hint">Aucun objet.</p>';return `<div class="grid sm">${L.map(x=>itemCell(x.it,act,x.where==='eq'?'<i class="eqd">É</i>':'')).join('')}</div>`}

const PANELS={
  forge(h){const t=panelState.t||'craft';const tabs=`<div class="row">${[['craft','Fabriquer'],['salv','Recycler'],['up','Améliorer']].map(([k,n])=>`<button class="btn${t===k?' gold':''}" data-act="pt" data-t="${k}">${n}</button>`).join('')}</div>`;
    let b='';const mul=1+h.lvl/10;
    if(t==='craft'){b=`<p class="hint">Fabrique un objet rare (jaune) du niveau de ton héros, pour l'emplacement choisi.</p><div class="row wrap">${['tete','epaules','torse','mains','poignets','taille','jambes','pieds','amulette','anneau','arme','offhand'].map(s=>`<button class="btn sm${panelState.slot===s?' gold':''}" data-act="fslot" data-s="${s}">${SLOT[s]?SLOT[s].n:'Anneau'}</button>`).join('')}</div>
      <p>Coût : ${costLine(D.COSTS.craft,mul)}</p><button class="btn gold" data-act="craft" ${panelState.slot?'':'disabled'}>Fabriquer</button>${panelState.made?itemCard(panelState.made,{delta:1}):''}${matsLine()}`}
    else if(t==='salv'){b=`<p class="hint">Touche un objet pour le recycler. Blanc → Ferraille · Bleu → Poussière d'azur · Jaune → Cristal d'ambre · Légendaire/Set → Braise éternelle.</p><div class="row"><button class="btn" data-act="salvAllY">Recycler tous les blancs, bleus et jaunes</button></div><div class="grid sm">${h.inv.map(it=>itemCell(it,'fsalv')).join('')||'<p class="hint">Inventaire vide.</p>'}</div>${matsLine()}`}
    else{const it=panelState.id&&findItem(h,panelState.id);const U=D.COSTS.upgrade;const m2=1+(it?it.lvl:h.lvl)/10;
      b=`<p class="hint">Améliore une pièce : +6 % à toutes ses statistiques par niveau (5 maximum).</p>${pickGrid(h,x=>x.r!=='c','fupsel')}${it?itemCard(it)+`<p>Amélioration ${it.up}/${U.max} · Coût : ${costLine(U,m2*(1+it.up*0.5))}</p><button class="btn gold" data-act="upgrade" ${it.up>=U.max?'disabled':''}>Améliorer</button>`:''}${matsLine()}`}
    return['Forgeron',tabs+b]},
  mystic(h){const it=panelState.id&&findItem(h,panelState.id);let b=`<p class="hint">Relance UNE statistique par objet (toujours la même ensuite). Le coût augmente à chaque fois.</p>${pickGrid(h,x=>x.aff.length>0,'mysel')}`;
    if(it){const c=D.COSTS.enchant;const mul=(1+it.lvl/10)*Math.pow(c.step,it.enchN);
      b+=itemCard(it)+`<div class="row wrap">${it.aff.map((a,i)=>`<button class="btn sm${panelState.ai===i?' gold':''}" data-act="myaff" data-i="${i}" ${it.ench>=0&&it.ench!==i?'disabled':''}>${esc(affixText(a,it))}</button>`).join('')}</div>`;
      if(panelState.ai!=null){b+=`<p>Coût : ${costLine({gold:c.gold,azur:c.azur},mul)}</p><button class="btn gold" data-act="myroll">Relancer</button>`;
        if(panelState.opts)b+=`<div class="opts"><h4>Choisis :</h4>${panelState.opts.map((o,k)=>`<button class="btn wide${k===0?'':' gold'}" data-act="mypick" data-k="${k}">${k===0?'Garder : ':''}${esc(affixText(o,it))}</button>`).join('')}</div>`}}
    return['Mystique',b+matsLine()]},
  cube(h){const t=panelState.t||'pow';const tabs=`<div class="row">${[['pow','Pouvoirs équipés'],['ext','Extraire'],['up','Rare → Légendaire']].map(([k,n])=>`<button class="btn${t===k?' gold':''}" data-act="pt" data-t="${k}">${n}</button>`).join('')}</div>`;let b='';
    const cat=sl=>sl==='arme'||sl==='offhand'?'arme':sl==='amulette'||sl==='anneau'?'bijou':'armure';
    if(t==='pow'){b=`<p class="hint">Équipe jusqu'à 3 pouvoirs extraits : un d'arme, un d'armure, un de bijou. Ils comptent comme si tu portais l'objet.</p>`+['arme','armure','bijou'].map(c=>{const cur=h.cubeEq[c];const opts=G.cube.filter(id=>LEG[id]&&cat(LEG[id].slot)===c&&(!LEG[id].cls||LEG[id].cls===h.cls));
      return `<div class="cubec"><h4>${c==='arme'?'Arme':c==='armure'?'Armure':'Bijou'}</h4>${cur&&LEG[cur]?`<p class="lpow"><b>${esc(LEG[cur].name)}</b> — ${esc(LEG[cur].text)}</p>`:'<p class="hint">vide</p>'}<div class="row wrap">${opts.map(id=>`<button class="btn sm${cur===id?' gold':''}" data-act="cubeq" data-c="${c}" data-id="${id}">${esc(LEG[id].name)}</button>`).join('')||'<small class="hint">Aucun pouvoir extrait de ce type.</small>'}${cur?`<button class="btn sm" data-act="cubeq" data-c="${c}" data-id="">Retirer</button>`:''}</div></div>`}).join('')}
    else if(t==='ext'){const legs=h.inv.filter(it=>it.leg);b=`<p class="hint">Extrais le pouvoir d'un légendaire : l'objet est détruit, le pouvoir est gardé pour tous tes héros. Coût : ${costLine(D.COSTS.extract)}</p><div class="grid sm">${legs.map(it=>itemCell(it,'cubsel')).join('')||'<p class="hint">Aucun légendaire dans l\'inventaire.</p>'}</div>`;
      const it=panelState.id&&h.inv.find(x=>x.id===panelState.id);if(it){const known=G.cube.includes(it.leg);b+=itemCard(it)+(known?'<p class="warn">Pouvoir déjà connu.</p>':`<button class="btn gold" data-act="extract">Extraire (détruit l'objet)</button>`)}
      b+=`<p class="hint">Pouvoirs connus : ${G.cube.length}</p>`}
    else{const rares=h.inv.filter(it=>it.r==='r');b=`<p class="hint">Transforme un objet rare en légendaire aléatoire du même emplacement. Coût : ${costLine(D.COSTS.rareToLeg)}</p><div class="grid sm">${rares.map(it=>itemCell(it,'cubsel')).join('')||'<p class="hint">Aucun objet rare.</p>'}</div>`;
      const it=panelState.id&&h.inv.find(x=>x.id===panelState.id);if(it&&it.r==='r')b+=itemCard(it)+`<button class="btn gold" data-act="r2l">Transformer</button>`;if(panelState.made)b+=itemCard(panelState.made,{delta:1})}
    return['Cube Nova',tabs+b+matsLine()]},
  altar(h){const all=D.FUSIONS.filter(f=>f.cls===h.cls);const unk=all.filter(f=>!h.fus.known.includes(f.id));const eq=equippedSkills(h);
    let b=`<p class="hint">Découvre des fusions, puis active-en ${fusionSlots(h)} (3 au parangon 100). Une fusion active ne fonctionne que si ses deux compétences sont équipées.</p>
      <div class="row"><button class="btn gold" data-act="fdisc" ${unk.length?'':'disabled'}>Découvrir une fusion</button><span>${costLine(D.COSTS.fusionDiscover)}</span><span class="hint">${all.length-unk.length}/${all.length} connues</span></div><div class="fgrid">`;
    b+=all.filter(f=>h.fus.known.includes(f.id)).map(f=>{const act=h.fus.active.includes(f.id);const ok=eq.includes(f.a)&&eq.includes(f.b);return `<div class="fusc${act?' on':''}"><div class="fh"><b>${esc(f.name)}</b><span class="chip">${esc(f.style)}</span></div><div class="fsk">${icon(SK[f.a].icon)}<span>${esc(SK[f.a].name)}</span> + ${icon(SK[f.b].icon)}<span>${esc(SK[f.b].name)}</span></div><p>${esc(f.text)}</p>
      ${ok?'':'<small class="warn">Équipe les deux compétences pour qu\'elle fonctionne.</small>'}<div class="row"><button class="btn sm${act?'':' gold'}" data-act="ftog" data-id="${f.id}">${act?'Désactiver':'Activer'}</button>${act?'':`<small>${costLine(D.COSTS.fusionActivate)}</small>`}</div></div>`}).join('');
    return['Autel des fusions',b+'</div>'+matsLine()]},
  stash(h){const b=`<div class="cols"><div><h4>Inventaire (${h.inv.length}/${INV_MAX})</h4><div class="grid sm">${h.inv.map(it=>itemCell(it,'tostash')).join('')}</div></div><div><h4>Coffre partagé (${G.stash.length}/80)</h4><div class="grid sm">${G.stash.map(it=>itemCell(it,'fromstash')).join('')||'<p class="hint">Vide. Touche un objet de l\'inventaire pour le ranger.</p>'}</div></div></div>`;return['Coffre partagé',b]},
  board(h){ensureBounties(h);let b='<p class="hint">5 primes par zone. Termine-les toutes pour réclamer un coffre de primes (chances accrues sur certains légendaires — voir le Codex).</p><div class="bgrid">';
    for(const z in h.bounties){const B=h.bounties[z];const done=B.list.filter(x=>x.done).length;b+=`<div class="bz"><h4>${esc(D.ZONES[z].name)} <small>${done}/5</small></h4>${B.list.map(x=>`<div class="q${x.done?' done':''}">${x.done?'✓':'▸'} ${esc(x.name)} <small>${x.type==='named'?'monstre nommé':x.type==='event'?'événement':'boss'}</small></div>`).join('')}
      ${done===5?`<button class="btn gold" data-act="cache" data-z="${z}">Réclamer le coffre</button>`:`<button class="btn sm" data-act="travel" data-z="${z}">Y aller</button>`}</div>`}
    return['Panneau des primes',b+'</div>'+matsLine()]},
  obelisk(h){const gr=panelState.gr||Math.max(1,h.bestGR);const lb=G.heroes.filter(x=>x.bestGR).sort((a,b)=>b.bestGR-a.bestGR||a.bestGRt-b.bestGRt);
    let b=diffPicker(h)+`<div class="obs"><div class="ob"><h4>Faille</h4><p>Carte aléatoire. Remplis la barre en tuant, puis affronte le Gardien. Gratuite. Donne des clés de faille supérieure.</p><button class="btn gold" data-act="rift" ${h.actDone?'':'disabled'}>Ouvrir une faille</button></div>
      <div class="ob"><h4>Faille supérieure</h4><p>15 minutes. Palier au choix. Coûte 1 clé (tu en as <b>${G.keys}</b>). Réussir fait monter une gemme légendaire.</p><div class="row"><button class="btn" data-act="grm">−</button><b class="grv">Palier ${gr}</b><button class="btn" data-act="grp">+</button><button class="btn sm" data-act="grp10">+10</button></div>
      <small>Ton record : ${h.bestGR||'—'}${h.bestGRt?' en '+mmss(h.bestGRt):''}${gr>h.bestGR+5?' · palier élevé : difficile !':''}</small><button class="btn gold" data-act="gr" ${h.actDone&&G.keys>0?'':'disabled'}>Ouvrir (1 clé)</button></div></div>`;
    b+=`<h4>Classement local</h4><div class="lb">${D.CLASSES.filter(c=>c.playable).map(c=>{const L=lb.filter(x=>x.cls===c.id);return `<div><b>${c.name}</b>${L.map((x,i)=>`<div>${i+1}. ${esc(x.name)} — palier ${x.bestGR} <small>${mmss(x.bestGRt)}</small></div>`).join('')||'<small class="hint">aucun</small>'}</div>`}).join('')}</div>`;
    const W=weeklyRift();const wd=G.weekly[W.id+'_'+weekNum()];
    b+=`<div class="ob weekly"><h4>Faille de la semaine : ${esc(W.name)}</h4><p>${esc(W.text)}</p><small>Héros et build imposés, mêmes conditions pour tout le monde. Récompense : un coffre (2 légendaires, matériaux, clés).</small>${wd?'<p class="up">Réussie cette semaine !</p>':`<button class="btn gold" data-act="weekly">Relever le défi</button>`}</div>`;
    if(!h.actDone)b='<p class="warn">Termine l\'Acte I pour ouvrir les failles.</p>'+b;
    return['Obélisque des failles',b]},
  tavern(h){const c=h.comp;let b='<p class="hint">Un compagnon te suit, combat et t\'aide. Choisis ses compétences et donne-lui jusqu\'à 3 objets (arme, anneau, amulette).</p><div class="cgrid">';
    b+=D.COMPANIONS.map(C=>{const act=c.active===C.id;return `<div class="comp${act?' on':''}">${icon(C.icon)}<b>${esc(C.name)}</b><small>${esc(C.role)}</small><p>${esc(C.desc)}</p>${act?C.skills.map((row,ri)=>`<div class="row wrap">${row.map((s,si)=>`<button class="btn sm${(c.sk||[0,0])[ri]===si?' gold':''}" data-act="csk" data-r="${ri}" data-s="${si}" title="${esc(s.desc)}">${esc(s.name)}</button>`).join('')}</div><small>${esc(row[(c.sk||[0,0])[ri]].desc)}</small>`).join(''):''}
      <button class="btn${act?'':' gold'}" data-act="cpick" data-id="${C.id}">${act?'Renvoyer':'Recruter'}</button></div>`}).join('')+'</div>';
    if(c.active){b+=`<h4>Équipement du compagnon</h4><div class="row">${['arme','anneau','amulette'].map(sl=>{const it=c.gear[sl];return `<div class="cslot">${it?itemCell(it,'cgearoff','')+'<small>'+esc(it.name)+'</small>':'<small>'+(sl==='arme'?'Arme':sl==='anneau'?'Anneau':'Amulette')+' : vide</small>'}</div>`}).join('')}</div>
      <p class="hint">Touche un objet de ton inventaire pour le donner :</p><div class="grid sm">${h.inv.filter(it=>it.slot==='arme'||it.slot==='anneau'||it.slot==='amulette').map(it=>itemCell(it,'cgear')).join('')||'<small class="hint">Aucune arme, anneau ou amulette dans l\'inventaire.</small>'}</div>`}
    return['Taverne des compagnons',b]},
  nova(h){const A=novaAdvice(h);const sim=A.sim;
    const b=`<div class="nova"><div class="novah">${icon('robot-grab')}<div><b>Conseiller NOVA</b><small>Analyse automatique de ton build (version 1)</small></div></div>
      <div class="simrow"><div><small>Une cible</small><b>${fmt(sim.single)}/s</b></div><div><small>Groupe de 5</small><b>${fmt(sim.group)}/s</b></div><div><small>Verdict</small><b class="${A.verdictCls}">${A.verdict}</b></div><div><small>Style</small><b>${A.style}</b></div></div>
      <div class="rbars">${Object.entries(sim.by).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><i style="width:${Math.max(2,v/Math.max(1,...Object.values(sim.by))*100)}%"></i><b>${fmt(v)}</b></div>`).join('')}</div>
      <ul class="advice">${A.tips.map(t=>`<li class="${t[0]}">${t[1]}</li>`).join('')}</ul>
      ${A.items.length?`<h4>Objets à chercher pour ce build</h4>${A.items.map(o=>`<div class="nv"><b class="${o.kind==='set'?'st':'lg'}">${esc(o.name)}</b><p>${esc(o.text)}</p><small>Où : ${esc(o.where)}</small></div>`).join('')}`:''}
      ${A.target?(()=>{const t=A.target,k=(t.single+t.group/3)/Math.max(1,A.sim.single+A.sim.group/3);const same=t.sk.every((s,i)=>!s||(h.skills[i]&&h.skills[i].id===s.id));return `<h4>Build cible</h4><div class="nv"><p>${t.sk.filter(Boolean).map(s=>esc(SK[s.id].name)).join(' · ')}${t.fus?' + fusion <b>'+esc(FUS[t.fus].name)+'</b>':''}</p><small>${same?'C\'est déjà ton build : bravo.':k>1.05?`Environ <b class="up">+${Math.round((k-1)*100)} %</b> de dégâts estimés par rapport à ton build actuel, avec ton équipement.`:k<0.95?'Ton build actuel fait déjà mieux que cette référence.':'Équivalent à ton build actuel.'}</small></div>`})():''}
      ${A.fusion?`<h4>Fusion conseillée</h4><div class="nv"><b class="lg">${esc(A.fusion.f.name)}</b> <span class="chip">${esc(A.fusion.f.style)}</span><p>${esc(A.fusion.f.text)}</p><small>${A.fusion.gain>0.005?`Gain estimé : <b class="up">+${Math.round(A.fusion.gain*100)} %</b>`:'Change surtout le style de jeu'} · ${A.fusion.known?'connue : active-la à l\'Autel':'à découvrir à l\'Autel des fusions'}</small></div>`:''}</div>`;
    return['Conseiller NOVA',b]},
  waypoint(h){return['Point de passage',tabMap(h)]},
  gemup(h){const gr=panelState.gr;if(!h.gems.length)return['Gemmes',`<p>Aucune gemme à améliorer pour l'instant.</p><button class="btn" data-act="pclose">OK</button>`];
    const b=`<p>Faille supérieure ${gr} réussie ! Choisis une gemme à faire monter :</p><div class="gems">${h.gems.map((g,i)=>{const ch=gemChance(g.rank,gr);return `<button class="gem btn wide" data-act="gemup" data-i="${i}" style="--gc:${GEM[g.id].color}">${icon(GEM[g.id].icon)}<div><b>${esc(GEM[g.id].name)} · rang ${g.rank}</b><small>Chance : ${Math.round(ch*100)} %</small></div></button>`}).join('')}</div>`;
    return['Montée de gemme',b]},
  report(h){const tot=Object.values(DMG).reduce((a,b)=>a+b,0)||1;const r=GS.rift||{};const t=(combatLog.t1||NOW)-combatLog.t0;
    const rows=Object.entries(DMG).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><i style="width:${Math.max(1,v/tot*100)}%"></i><b>${Math.round(v/tot*100)} %</b></div>`).join('');
    return['Bilan de combat',`<div class="simrow"><div><small>Temps</small><b>${mmss(t)}</b></div><div><small>Morts</small><b>${combatLog.deaths}</b></div><div><small>Dégâts totaux</small><b>${fmt(tot)}</b></div><div><small>DPS moyen</small><b>${fmt(tot/Math.max(1,t))}</b></div></div><h4>Ce qui porte ton build</h4><div class="rbars">${rows||'<p class="hint">Aucun dégât enregistré.</p>'}</div><button class="btn gold" data-act="pclose">Continuer</button>`]},
  offline(h){const g=panelState.g;return['Pendant ton absence…',`<p>${esc(h.name)} a continué à se battre pendant <b>${g.hours}</b>${g.capped?' (plafond de 8 h atteint)':''}.</p><div class="simrow"><div><small>Monstres</small><b>${fmt(g.kills)}</b></div><div><small>Expérience</small><b>${fmt(g.xp)}</b></div><div><small>Or</small><b>${fmt(g.gold)}</b></div><div><small>Clés</small><b>${g.keys}</b></div></div>
    <p>Matériaux : ${Object.keys(g.mats).map(k=>g.mats[k]+' '+D.MATERIALS[k].n).join(' · ')}</p><p>Objets : ${g.items} ${g.items?'(dans l\'inventaire)':''}</p><p class="hint">${ST().farm?'Farm auto était actif : gains complets.':'Active « Farm auto » dans les Réglages pour gagner 3× plus hors ligne.'}</p><button class="btn gold" data-act="pclose">Récupérer</button>`]}
};
function gemChance(rank,gr){const d=gr-rank;return d>=10?1:d>=0?0.6+d*0.04:Math.max(0.05,0.6+d*0.08)}
function openGemUpgrade(gr){const h=hero();if(h.gems.length)openPanel('gemup',{gr})}
function showCombatReport(){openPanel('report')}
function weekNum(){return Math.floor((Date.now()/864e5+3)/7)}
function weeklyRift(){return D.WEEKLY[weekNum()%D.WEEKLY.length]}

/* ----- Faille de la semaine : héros temporaire aux conditions imposées ----- */
let weeklyBackup=null;
function startWeekly(){
  const W=weeklyRift();const h0=hero();weeklyBackup={cur:G.cur};
  const h=newHero('Défi : '+CLS[W.cls].name,W.cls);h.lvl=W.level;h.actDone=true;h.weekly=W.id;h.skills=W.skills.map(([id,r])=>({id,rune:r}));
  const st=SETS[W.set];st.slots.forEach(sl=>{h.equip[sl]=makeItem({ilvl:70,cls:W.cls,set:W.set,slot:sl,anc:1})});
  const freeSlots=['poignets','taille','amulette','anneau1','anneau2','arme','offhand'].filter(s=>!h.equip[s]||s==='arme'||s==='offhand');
  W.legs.forEach(id=>{const L=LEG[id];let sl=L.slot==='anneau'?(h.equip.anneau1?'anneau2':'anneau1'):L.slot;h.equip[sl]=makeItem({ilvl:70,cls:W.cls,leg:id,anc:1})});
  ['poignets','taille','amulette','anneau1','anneau2','arme','offhand'].forEach(sl=>{if(!h.equip[sl])h.equip[sl]=makeItem({ilvl:70,cls:W.cls,r:'r',slot:slotType(sl)})});
  h.fus={known:W.fusions.slice(),active:W.fusions.slice()};
  G.heroes.push(h);G.cur=G.heroes.length-1;rebuild();P.hp=S.maxHp;spawnHeroMesh();
  closePanel();G.weeklyRun={id:W.id,idx:G.cur};startRift(W.gr);
}
function endWeekly(success){
  const run=G.weeklyRun;if(!run)return;const W=D.WEEKLY.find(w=>w.id===run.id);
  G.heroes.splice(run.idx,1);G.cur=weeklyBackup?weeklyBackup.cur:0;G.weeklyRun=null;rebuild();spawnHeroMesh();spawnCompanion();
  if(success){G.weekly[W.id+'_'+weekNum()]=1;const h=hero();for(let i=0;i<2;i++){const it=rollDrop({ilvl:Math.min(70,h.lvl),forceLeg:true});if(it)h.inv.unshift(it)}G.mats.braise+=5;G.mats.ambre+=20;G.keys+=3;toast('<b>Défi de la semaine réussi !</b> Coffre : 2 légendaires, matériaux et 3 clés.',5000)}
  else toast('Défi de la semaine échoué. Tu peux réessayer.',3500);
  enterZone('ville');
}

/* ----- action unique pour tous les boutons des fenêtres ----- */
function onUiClick(e){
  const b=e.target.closest('[data-act],[data-tab]');if(!b)return;const h=hero();SFX.ui();
  if(b.dataset.tab){menuTab=b.dataset.tab;selItem=null;confirmKey=null;renderMenu();return}
  const a=b.dataset.act,d=b.dataset;const inPanel=!!b.closest('#panel');
  const R=()=>{rebuild();if(inPanel)renderPanel();else renderMenu();save()};
  switch(a){
    case 'close':closeMenu();return;case 'pclose':{const was=panelId;closePanel();if(was==='report'&&G.weeklyRun){endWeekly(GS.rift&&GS.rift.success)}return}
    case 'cancel':confirmKey=null;break;
    case 'sel':selItem=selItem===d.id?null:d.id;break;
    case 'eqsel':selItem=selItem===d.slot?null:d.slot;if(!h.equip[d.slot])selItem=null;break;
    case 'equip':{const it=h.inv.find(x=>x.id===d.id);if(!it||!canEquip(it,h))break;const tgt=targetSlot(h,it);const old=h.equip[tgt];h.inv.splice(h.inv.indexOf(it),1);h.equip[tgt]=it;if(old)h.inv.unshift(old);selItem=null;codexSee(it);if(it.r==='l'||it.r==='s')G.season.equipLeg=1;toast('Équipé : '+esc(it.name),1500);break}
    case 'unequip':{const it=h.equip[d.slot];if(it&&h.inv.length<INV_MAX){h.inv.unshift(it);delete h.equip[d.slot];selItem=null}else toast('Inventaire plein.',1500);break}
    case 'lock':{const it=findItem(h,d.id);if(it)it.lock=it.lock?0:1;break}
    case 'salv1':{const it=h.inv.find(x=>x.id===d.id);if(it)salvage(it);selItem=null;break}
    case 'salvAll':confirmKey='salvAll';break;case 'salvLeg':confirmKey='salvLeg';break;
    case 'salvAllY':{let n=0;for(const it of h.inv.slice())if(!it.lock&&(it.r==='c'||it.r==='m'||it.r==='r')){salvage(it,1);n++}confirmKey=null;toast(n+' objets recyclés.',1800);break}
    case 'salvLegY':{let n=0;for(const it of h.inv.slice())if(!it.lock){salvage(it,1);n++}confirmKey=null;toast(n+' objets recyclés.',1800);break}
    case 'sort':{const ord={l:0,s:0,r:1,m:2,c:3};const so=D.SLOTS.map(s=>slotType(s.id));h.inv.sort((x,y)=>(ord[x.r]-ord[y.r])||(so.indexOf(x.slot)-so.indexOf(y.slot))||(y.lvl-x.lvl));break}
    case 'sslot':selSlot=+d.i;break;
    case 'pick':{const used=h.skills.findIndex(x=>x&&x.id===d.id);if(used>=0&&used!==selSlot){const tmp=h.skills[selSlot];h.skills[selSlot]=h.skills[used];h.skills[used]=tmp}else h.skills[selSlot]={id:d.id,rune:-1};break}
    case 'rune':{const s=h.skills[selSlot];if(s)s.rune=+d.r;break}
    case 'pp':case 'pp10':{const ci=+d.c;const cat=D.PARAGON[ci];const st=cat.stats.find(s=>s.k===d.k);const tot=paragonPoints(G.paragon.lvl,ci);let used=cat.stats.reduce((x,s)=>x+(h.para[s.k]||0),0);
      let n=a==='pp10'?10:1;while(n-->0&&used<tot&&(!st.cap||(h.para[d.k]||0)<st.cap)){h.para[d.k]=(h.para[d.k]||0)+1;used++}break}
    case 'pm':h.para[d.k]=Math.max(0,(h.para[d.k]||0)-1);break;case 'preset':h.para={};break;
    case 'sock':{const i=+d.i;for(const k in h.gemSock)if(h.gemSock[k]===i)h.gemSock[k]=null;h.gemSock[d.sl]=i<0?null:i;break}
    case 'sclaim':{const i=+d.i;const c=D.SEASON.chapters[i];if(G.season.claimed.includes(i))break;G.season.claimed.push(i);const r=c.reward;if(r.gold)G.gold+=r.gold;if(r.mats)for(const k in r.mats)G.mats[k]+=r.mats[k];if(r.keys)G.keys+=r.keys;
      if(r.set){const st=SETS[r.set];st.slots.forEach(sl=>h.inv.unshift(makeItem({ilvl:Math.max(h.lvl,1),cls:h.cls,set:r.set,slot:sl})));codexSee({set:r.set});toast('<b>Set offert :</b> '+st.name+' (6 pièces dans l\'inventaire)',4000)}
      SFX.leg();toast('Récompense de saison réclamée !',2000);break}
    case 'travel':{const z=d.z;closeMenu();closePanel();enterZone(z);return}
    case 'diff':{h.diff=+d.i;if(+d.i>G.season.maxDiff)G.season.maxDiff=+d.i;toast('Difficulté : '+DIFF[h.diff].n+(GS.zone&&GS.zone!=='ville'?' (s\'applique à la prochaine zone)':''),2200);break}
    case 'cxcls':panelState.codexCls=d.c;break;
    case 'bsave':{h.builds[+d.i]={name:CLS[h.cls].name+' niv '+h.lvl,t:Date.now(),equip:Object.fromEntries(Object.entries(h.equip).filter(([k,v])=>v).map(([k,v])=>[k,v.id])),skills:JSON.parse(JSON.stringify(h.skills)),fus:h.fus.active.slice(),cube:Object.assign({},h.cubeEq),para:Object.assign({},h.para),gems:Object.assign({},h.gemSock)};toast('Build enregistré.',1500);break}
    case 'bload':{const B=h.builds[+d.i];if(!B)break;let miss=0;for(const sl in B.equip){const id=B.equip[sl];if(h.equip[sl]&&h.equip[sl].id===id)continue;let it=null,src=null;for(const k in h.equip)if(h.equip[k]&&h.equip[k].id===id){it=h.equip[k];src=['eq',k]}
        if(!it){const i=h.inv.findIndex(x=>x.id===id);if(i>=0){it=h.inv[i];src=['inv',i]}}if(!it){const i=G.stash.findIndex(x=>x.id===id);if(i>=0){it=G.stash[i];src=['st',i]}}
        if(!it){miss++;continue}if(src[0]==='inv')h.inv.splice(h.inv.indexOf(it),1);else if(src[0]==='st')G.stash.splice(G.stash.indexOf(it),1);else delete h.equip[src[1]];const old=h.equip[sl];h.equip[sl]=it;if(old)h.inv.unshift(old)}
      h.skills=JSON.parse(JSON.stringify(B.skills));h.fus.active=B.fus.filter(id=>h.fus.known.includes(id));h.cubeEq=Object.assign({},B.cube);h.para=Object.assign({},B.para);h.gemSock=Object.assign({},B.gems||{});
      toast(miss?`Build chargé (${miss} objet(s) introuvable(s)).`:'Build chargé !',2200);break}
    case 'set':{const k=d.k;ST()[k]=ST()[k]?0:1;applyVolume();if(k==='music'){if(ST().music&&curMusic)startMusic(curMusic)}if(k==='manual'||k==='free')renderSkillBar();if(k==='farm'&&ST().farm)toast('Farm auto : le héros joue seul. Touche l\'écran pour reprendre la main.',3500);break}
    case 'qual':ST().quality=d.q;R();toast('Qualité : '+d.q+' (la distance et les particules changent tout de suite, l\'anticrénelage au rechargement)',3000);scene.fog&&(scene.fog.far=Q().far);return;
    case 'export':{const code=btoa(unescape(encodeURIComponent(JSON.stringify(G))));$('saveCode').value=code;try{$('saveCode').select();navigator.clipboard&&navigator.clipboard.writeText(code).catch(()=>{})}catch(err){}toast('Code copié dans la zone de texte.',2000);return}
    case 'import':{try{const txt=$('saveCode').value.trim();const g=JSON.parse(decodeURIComponent(escape(atob(txt))));if(!g||g.v!==1||!Array.isArray(g.heroes))throw 0;localStorage.setItem(SAVE_KEY,JSON.stringify(g));location.reload()}catch(err){toast('Code invalide.',2000)}return}
    case 'title':closeMenu();showTitle();return;
    case 'delHero':confirmKey='delHero';break;case 'resetAll':confirmKey='resetAll';break;
    case 'delHeroY':{G.heroes.splice(G.cur,1);G.cur=G.heroes.length?0:-1;save();closeMenu();showTitle();return}
    case 'resetY':{try{localStorage.removeItem(SAVE_KEY)}catch(err){}location.reload();return}
    case 'dbg':debugAct(d.k);break;
    /* panneaux */
    case 'pt':panelState.t=d.t;panelState.id=null;panelState.made=null;break;
    case 'fslot':panelState.slot=d.s;break;
    case 'craft':{const mul=1+h.lvl/10;if(h.inv.length>=INV_MAX){toast('Inventaire plein.',1500);break}if(!pay(D.COSTS.craft,mul))break;const it=makeItem({ilvl:h.lvl,cls:h.cls,r:'r',slot:panelState.slot});h.inv.unshift(it);panelState.made=it;SFX.loot();break}
    case 'fsalv':{const it=h.inv.find(x=>x.id===d.id);if(it){if(it.lock)toast('Objet verrouillé.',1500);else salvage(it)}break}
    case 'fupsel':case 'mysel':case 'cubsel':panelState.id=d.id;panelState.ai=null;panelState.opts=null;panelState.made=null;break;
    case 'upgrade':{const it=findItem(h,panelState.id);if(!it||it.up>=D.COSTS.upgrade.max)break;if(!pay(D.COSTS.upgrade,(1+it.lvl/10)*(1+it.up*0.5)))break;it.up++;SFX.lvl();toast('Amélioré : +'+it.up,1500);break}
    case 'myaff':panelState.ai=+d.i;panelState.opts=null;break;
    case 'myroll':{const it=findItem(h,panelState.id);if(!it)break;const c=D.COSTS.enchant;if(!pay({gold:c.gold,azur:c.azur},(1+it.lvl/10)*Math.pow(c.step,it.enchN)))break;
      const cur=it.aff[panelState.ai];const st=slotType(it.slot);const used=new Set(it.aff.map(x=>x.k));const isPrim=D.AFFIXES[cur.k].prim;
      const pool=Object.keys(D.AFFIXES).filter(k=>affixAllowed(k,st)&&(!used.has(k)||k===cur.k)&&!!D.AFFIXES[k].prim===!!isPrim&&k!=='socket');
      const o1=rollAffix(pick(pool),it.lvl,it.cls||h.cls,it.anc,false),o2=rollAffix(pick(pool),it.lvl,it.cls||h.cls,it.anc,false);
      if(cur.k==='main')o1.st=o2.st=cur.st;if(o1.k==='main')o1.st=cur.st||CLS[h.cls].main;if(o2.k==='main')o2.st=cur.st||CLS[h.cls].main;
      panelState.opts=[cur,o1,o2];it.enchN++;it.ench=panelState.ai;break}
    case 'mypick':{const it=findItem(h,panelState.id);if(!it||!panelState.opts)break;it.aff[panelState.ai]=panelState.opts[+d.k];panelState.opts=null;toast('Statistique choisie.',1400);break}
    case 'cubeq':{h.cubeEq[d.c]=d.id||null;break}
    case 'extract':{const it=h.inv.find(x=>x.id===panelState.id);if(!it||!it.leg||G.cube.includes(it.leg))break;if(!pay(D.COSTS.extract))break;h.inv.splice(h.inv.indexOf(it),1);G.cube.push(it.leg);G.season.extract++;codexSee(it);panelState.id=null;SFX.leg();toast('Pouvoir extrait : '+esc(LEG[it.leg].name),2400);break}
    case 'r2l':{const it=h.inv.find(x=>x.id===panelState.id);if(!it||it.r!=='r')break;if(!pay(D.COSTS.rareToLeg))break;const pool=D.LEGENDARIES.filter(l=>l.slot===it.slot&&(!l.cls||l.cls===h.cls));
      if(!pool.length){toast('Aucun légendaire pour cet emplacement.',2000);break}const n=makeItem({ilvl:it.lvl,cls:h.cls,leg:pick(pool).id,anc:h.lvl>=70&&Math.random()<0.1?1:0});h.inv.splice(h.inv.indexOf(it),1,n);panelState.made=n;panelState.id=null;codexSee(n);SFX.leg();break}
    case 'fdisc':{const unk=D.FUSIONS.filter(f=>f.cls===h.cls&&!h.fus.known.includes(f.id));if(!unk.length)break;if(!pay(D.COSTS.fusionDiscover))break;const eq=equippedSkills(h);const pref=unk.filter(f=>eq.includes(f.a)||eq.includes(f.b));const f=pick(pref.length?pref:unk);h.fus.known.push(f.id);SFX.leg();toast('<b>Fusion découverte :</b> '+esc(f.name),3000);break}
    case 'ftog':{const id=d.id;const i=h.fus.active.indexOf(id);if(i>=0)h.fus.active.splice(i,1);else{if(h.fus.active.length>=fusionSlots(h)){toast(`Maximum ${fusionSlots(h)} fusions actives. Désactive-en une.`,2200);break}if(!pay(D.COSTS.fusionActivate))break;h.fus.active.push(id);G.season.fusion=1;toast('Fusion activée : '+esc(FUS[id].name),2000)}break}
    case 'tostash':{const it=h.inv.find(x=>x.id===d.id);if(it&&G.stash.length<80){h.inv.splice(h.inv.indexOf(it),1);G.stash.unshift(it)}break}
    case 'fromstash':{const it=G.stash.find(x=>x.id===d.id);if(it&&h.inv.length<INV_MAX){G.stash.splice(G.stash.indexOf(it),1);h.inv.unshift(it)}break}
    case 'cache':{const z=d.z;const B=h.bounties[z];if(!B.list.every(x=>x.done))break;const L=Math.min(70,h.lvl);G.gold+=Math.round(goldDrop(L)*150*(1+monsterScale(h.diff,1,0).gold));G.mats.ambre+=rndi(3,6);G.mats.azur+=rndi(4,8);G.mats.ferraille+=rndi(6,10);G.mats.braise+=h.lvl>=60?rndi(1,3):0;G.keys+=1;
      gainXp(xpNeed(Math.min(69,h.lvl))*0.5);let n=0;for(let i=0;i<3;i++){const it=rollDrop({ilvl:L,leg:monsterScale(h.diff,1,0).leg,legBoost:3,target:D.BOUNTY_TARGETS[z],keep:1,forceLeg:i===0});if(it&&h.inv.length<INV_MAX){h.inv.unshift(it);codexSee(it);n++}}
      B.list=D.BOUNTIES[z].map(x=>Object.assign({},x,{done:false}));SFX.leg();toast(`<b>Coffre de primes !</b> Or, matériaux, 1 clé et ${n} objets (inventaire).`,3500);break}
    case 'rift':closePanel();startRift(0);return;
    case 'grm':panelState.gr=Math.max(1,(panelState.gr||Math.max(1,h.bestGR))-1);break;case 'grp':panelState.gr=(panelState.gr||Math.max(1,h.bestGR))+1;break;case 'grp10':panelState.gr=(panelState.gr||Math.max(1,h.bestGR))+10;break;
    case 'gr':{if(G.keys<1)break;G.keys--;const g=panelState.gr||Math.max(1,h.bestGR);closePanel();startRift(g);return}
    case 'weekly':startWeekly();return;
    case 'cpick':{h.comp.active=h.comp.active===d.id?null:d.id;h.comp.gear={};h.comp.sk=[0,0];spawnCompanion();break}
    case 'csk':h.comp.sk[+d.r]=+d.s;break;
    case 'cgear':{const it=h.inv.find(x=>x.id===d.id);if(!it)break;const sl=it.slot;const old=h.comp.gear[sl];h.inv.splice(h.inv.indexOf(it),1);h.comp.gear[sl]=it;if(old)h.inv.unshift(old);break}
    case 'cgearoff':{for(const k in h.comp.gear)if(h.comp.gear[k]&&h.comp.gear[k].id===d.id){h.inv.unshift(h.comp.gear[k]);h.comp.gear[k]=null}break}
    case 'gemup':{const g=h.gems[+d.i];const ch=gemChance(g.rank,panelState.gr);if(Math.random()<ch){g.rank++;SFX.lvl();toast(`<b>${GEM[g.id].name}</b> passe au rang ${g.rank} !`,2600)}else toast('La gemme résiste… (échec)',2200);closePanel();setTimeout(showCombatReport,400);return}
    default:return;
  }
  R();
}
$('menu').addEventListener('click',onUiClick);$('panel').addEventListener('click',onUiClick);
$('menu').addEventListener('input',e=>{if(e.target.dataset.act==='vol'){ST().vol=+e.target.value;applyVolume();save()}});
/* ================= Simulateur d'équilibrage + Conseiller NOVA ================= */
/* simulateBuild(build) : estime les dégâts par seconde sur une cible et sur un groupe de 5.
   build = un héros (équipement, compétences, runes, fusions…). Utilisé par le Conseiller NOVA et le mannequin. */
function simulateBuild(h,skillsOverride,fusOverride){
  const saveS=S,saveK=SKC,saveL=SLOTSK,saveSk=h.skills,saveF=h.fus.active;
  SIMU=true;try{
    if(skillsOverride)h.skills=skillsOverride;if(fusOverride)h.fus.active=fusOverride;
    S=computeStats(h);S.fxBy={};for(const f of S.fx)(S.fxBy[f.t]||(S.fxBy[f.t]=[])).push(f);
    SKC={};SLOTSK=[];h.skills.forEach((s,i)=>{if(s&&SK[s.id]&&h.lvl>=SK[s.id].lvl){SKC[s.id]=resolveSkill(s.id,s.rune);SLOTSK[i]=s.id}});
    return simCore(h);
  }finally{SIMU=false;S=saveS;SKC=saveK;SLOTSK=saveL;h.skills=saveSk;h.fus.active=saveF}
}
function simCore(h){
  const C=CLS[h.cls];const base=S.wpnAvg*S.mainMul*(1+S.chc*S.chd)*(1+S.dmg);let dotM=1;for(const f of FX('dotMult'))dotM*=f.m;
  const ids=SLOTSK.filter(Boolean);const prim=SLOTSK[0];const pp=prim&&SKC[prim];
  const regen=C.res.regen+(pp&&pp.gen?pp.gen*S.aps:0);const spend=ids.filter(id=>id!==prim&&SKC[id].cost&&!SKC[id].res2);
  const budget=spend.length?regen/spend.length:0;const disc=C.res2?C.res2.regen:0;const spend2=ids.filter(id=>SKC[id].res2);
  const rate={},by={};let single=0,group=0,gMul=1,uptimeBuffs=[];
  const add=(lab,s,g)=>{by[lab]=(by[lab]||0)+s;single+=s;group+=g};
  for(const id of ids){const p=SKC[id];let r;
    if(id===prim)r=S.aps;else{r=p.cd?1/Math.max(0.3,cdOf(p)):S.aps;if(p.cost&&!p.res2)r=Math.min(r,budget/Math.max(1,skillCost(p)));if(p.res2)r=Math.min(r,disc/spend2.length/Math.max(1,skillCost(p)))}
    rate[id]=r;}
  const dmgOf=(id,p,mult)=>{const k=skillMul(id,null,false)*elMul(p.el||'phys')*(mult||1);const d=p.dmg||0;let s=0,g=0;
    switch(p.kind){
      case 'strike':s=d*(1+(p.hits||0))+(p.jumps?d*0.6*Math.min(1,p.jumps)*0:0);g=d*(1+(p.hits||0))*(p.r?4:1)+(p.jumps?d*0.6*Math.min(4,p.jumps):0);break;
      case 'proj':{const n=p.count||1;s=d*(n>1&&(p.spread||0)<=40?Math.min(n,2):1)*(p.ret?1.6:1);g=d*Math.min(n,5)*(p.pierce?1.5:1)*(p.boom?2.5:1)*(p.ret?1.6:1);if(p.jumps)g+=d*0.6*Math.min(4,p.jumps);break}
      case 'chain':s=d;g=d*(1+Math.min(4,p.jumps||3)*0.85)*(p.boom?1.6:1);break;
      case 'nova':s=d;g=d*4;break;case 'ground':s=d*Math.min(p.count||1,1.6);g=d*(p.count||1)*3;if(p.zdur){s+=p.zdps*p.zdur*0.6;g+=p.zdps*p.zdur*3}break;
      case 'zone':s=(p.zdps||0)*(p.zdur||0)*0.8;g=s*4;break;case 'dash':s=d*(p.endNova?1:1);g=d*3;if(p.trail){s+=p.trail*1.5;g+=p.trail*4}break;
      case 'trap':s=d*1.2;g=d*(p.count||3)*2;break;case 'cone':s=d;g=d*4;break;
    }
    if(p.dot){s+=p.dot*dotM;g+=p.dot*dotM*(p.kind==='cone'||p.kind==='curse'?4:p.r||p.boom?3:1)}
    return[s*k,g*k]};
  for(const id of ids){const p=SKC[id];const r=rate[id];const lab=SK[id].name;
    if(p.kind==='summon'){const U=D.UNITS[p.unit];const pm=skillMul(id,null,true)*elMul(p.el||'phys');const up=p.dur?Math.min(1,p.dur/Math.max(1,cdOf(p))):1;const v=p.count*p.dmg/U.rate*pm*up*(p.petBuff?1:1);add(lab,v*base,v*base*1.4);continue}
    if(p.kind==='buff'){const up=Math.min(1,(p.dur||5)/Math.max(1,cdOf(p)));const b=p.buff||{};gMul*=(1+(b.dmg||0)*up)*(1+(b.as||0)*up)*(1+(b.crit||0)*S.chd*up);if(p.petBuff)uptimeBuffs.push(['pets',1+p.petBuff*up]);if(p.pulse){add(lab,2/p.pulse*up*base*elMul(p.el),2/p.pulse*up*base*4)}if(p.volley){add(lab,1.2/0.45*up*base,1.2/0.45*up*base*1.5)}continue}
    if(p.kind==='curse'){const up=Math.min(1,(p.dur||8)/Math.max(1,cdOf(p)||p.dur));gMul*=1+(p.vuln||0)*up;if(p.dot){const v=p.dot*dotM*base*r*elMul(p.el);add(lab,v,v*4)}continue}
    const [s,g]=dmgOf(id,p);add(lab,s*r*base,g*r*base);
  }
  /* invocations amplifiées */
  for(const [k,m] of uptimeBuffs)for(const id of ids)if(SKC[id].kind==='summon'){const v=by[SK[id].name]*(m-1);add(SK[id].name,v,v*1.4)}
  /* effets */
  for(const f of FX('castAlso')){if(!rate[f.on])continue;const q=SKC[f.cast]||resolveSkill(f.cast,-1);const [s,g]=dmgOf(f.cast,q,f.m);const rr=rate[f.on]*(f.ch||1);add(f.src,s*rr*base,g*rr*base)}
  for(const f of FX('zoneOn')){if(!rate[f.on])continue;const v=f.dps*f.dur*rate[f.on]*base*elMul(f.el)*(f.at==='path'?1.5:1);add(f.src,v*0.7,v*3)}
  for(const f of FX('periodic')){const v=f.m/f.every*base*elMul(f.el||'phys');const gm=f.do==='nova'||f.do==='explode'||f.do==='meteor'?3:f.do==='chain'?2.5:f.do==='pull'||f.do==='curse'?0:1;if(f.do==='curse'){gMul*=1+f.m;continue}if(gm)add(f.src,v,v*gm)}
  const hitsPerSec=Object.keys(rate).reduce((a,id)=>a+rate[id]*((SKC[id].count||1)),0);
  for(const f of FX('onHit')){const rr=(f.on==='*'?hitsPerSec:(rate[f.on]||0))*f.ch;if(f.do==='curse'){gMul*=1+Math.min(1,rr*5)*f.m*0.5;continue}const v=rr*f.m*base*(f.do==='summon'?3:1);add(f.src,v,v*(f.do==='explode'?3:f.do==='chain'?2.5:1.2))}
  for(const f of FX('onImpact')){if(!rate[f.on])continue;const n=(SKC[f.on].count||1);const v=rate[f.on]*n*f.m*base*(f.n||1);add(f.src,v*0.8,v*(f.do==='heal'?0:2.5))}
  for(const f of FX('onKill')){if(f.do==='explode'){const v=f.ch*f.m*base*0.6;add(f.src,v*0.2,v*2)}}
  for(const f of FX('summonOnCast')){const rr=f.on==='*'?hitsPerSec*0.3:(rate[f.on]||0);const v=rr*(f.ch||1)*f.count*Math.min(f.dur,8)*f.m/1.0*base*skillMul('pets',null,true);add(f.src,v,v*1.3)}
  for(const f of FX('petCast')){const q=SKC[f.cast]||resolveSkill(f.cast,-1);const [s,g]=dmgOf(f.cast,q,f.m);const n=Math.max(1,Math.min(3,ids.filter(id=>SKC[id].kind==='summon').length));add(f.src,s/f.every*n*base,g/f.every*n*base)}
  for(const f of FX('whileBuff')){const bp=SKC[f.skill];if(!bp)continue;const up=Math.min(1,(bp.dur||10)/Math.max(1,cdOf(bp)));const q=SKC[f.cast]||resolveSkill(f.cast,-1);const [s,g]=dmgOf(f.cast,q,f.m);add(f.src,s/f.every*up*base,g/f.every*up*base)}
  for(const f of FX('cloneOnDash')){let rr=0;for(const id of ids)if(SK[id].cat==='mobilite'&&(!f.on||f.on===id))rr+=rate[id];const v=Math.min(1,rr*f.dur)*1.6*f.m/0.6*base;add(f.src,v,v*1.2)}
  for(const f of FX('thornsHit')){let rr=0;for(const id of f.skill)rr+=rate[id]||0;const v=rr*(S.thorns||mobDmg(h.lvl)*2)*S.thornsM*f.m;add(f.src,v,v*1.5)}
  for(const f of FX('stackOn')){if(rate[f.on]&&rate[f.skill]){const k=f.m*f.max*0.7;const lab=SK[f.skill].name;const v=(by[lab]||0)*k;add(f.src,v,v*3)}}
  for(const f of FX('doubleCast')){const k=f.ch;for(const id of ids){if(SK[id].cat==='ultime'||(f.skill!=='*'&&f.skill!==id))continue;const lab=SK[id].name;const v=(by[lab]||0)*k;add(f.src,v,v*2.5)}}
  for(const f of FX('buffOnCast')){if(!f.on)continue;let rr=0;for(const id of ids)if(matchSkill(f.on,id))rr+=rate[id];const up=Math.min(1,rr*f.dur);if(f.buff.dmg)gMul*=1+f.buff.dmg*up;if(f.buff.skill){for(const id of ids)if(matchSkill(f.buff.skill,id,SKC[id].kind==='summon')||(f.buff.skill==='pets'&&SKC[id].kind==='summon')){const lab=SK[id].name;const v=(by[lab]||0)*(f.buff.m-1)*up;add(lab,v,v*2)}}}
  for(const f of FX('periodicBuff'))gMul*=1+(f.buff.dmg||0)*f.dur/f.every;
  const cd=S.chc*S.chd;/* critique déjà dans base */
  single*=gMul;group*=gMul;for(const k in by)by[k]*=gMul;
  /* style dominant */
  const style=group/Math.max(1,single)>3.2?'zone':'mono-cible';
  return{single,group,by,style};
}
/* Moyenne de builds alternatifs de la même classe avec le même équipement (référence d'équilibrage) */
function simReference(h){
  const cls=h.cls;const opts=D.FUSIONS.filter(f=>f.cls===cls);const res=[];
  for(const f of opts.slice(0,8)){const sk=D.CATS.map(c=>{const pool=D.SKILLS.filter(s=>s.cls===cls&&s.cat===c.id&&s.lvl<=h.lvl);if(!pool.length)return null;const inF=pool.find(s=>s.id===f.a||s.id===f.b);const s=inF||pool[0];return{id:s.id,rune:h.lvl>=s.runes[0].lvl?0:-1}});
    const r=simulateBuild(h,sk,h.lvl>=30?[f.id]:[]);r.sk=sk;r.fus=h.lvl>=30?f.id:null;res.push(r)}
  if(!res.length)return{single:1,group:1,best:null};const best=res.reduce((a,r)=>r.single+r.group/3>a.single+a.group/3?r:a);
  return{single:res.reduce((a,r)=>a+r.single,0)/res.length,group:res.reduce((a,r)=>a+r.group,0)/res.length,best};
}
function novaAdvice(h){
  const sim=simulateBuild(h);const ref=simReference(h);const tips=[];const eq=equippedSkills(h);
  const ratio=(sim.single/ref.single+sim.group/ref.group)/2;
  const verdict=ratio>1.2?'Au-dessus de la moyenne':ratio<0.8?'En dessous de la moyenne':'Dans la moyenne';const verdictCls=ratio>1.2?'up':ratio<0.8?'dn':'';
  const style=sim.group/Math.max(1,sim.single)>3.2?'Vitesse / zone':'Poussée / mono-cible';
  tips.push(['',`Ce build est <b>${verdict.toLowerCase()}</b> (${Math.round(ratio*100)} % de la moyenne des builds de ta classe avec ton équipement). Il est plus fort en <b>${sim.group/Math.max(1,sim.single)>3.2?'vitesse (zone) qu\'en poussée':'poussée (mono-cible) qu\'en vitesse'}</b>.`]);
  /* sets incomplets */
  for(const sid in S.setCount){const st=SETS[sid];const n=S.setCount[sid];const next=[2,4,6].find(x=>x>n);if(next){const have=Object.keys(h.equip).filter(k=>h.equip[k]&&h.equip[k].set===sid).map(k=>slotType(k));const miss=st.slots.filter(s=>!have.includes(s)).map(s=>SLOT[s]?SLOT[s].n.toLowerCase():s);
    tips.push(['warn',`Tu portes ${n} pièce${n>1?'s':''} du set <b>${esc(st.name)}</b> : il te manque ${next-n} pièce${next-n>1?'s':''} (${miss.slice(0,3).join(', ')}) pour le bonus ${next} pièces. Les sets tombent plus souvent dans les Failles et en difficulté élevée.`])}}
  if(h.lvl>=40&&S.chc<0.25)tips.push(['warn',`Ta chance de critique est faible (${pct(S.chc,1)}) pour ton niveau : cherche-la sur la tête, les mains, les poignets et les bijoux, ou au Mystique.`]);
  if(h.lvl>=40&&S.chd<S.chc*8&&S.chc>0.2)tips.push(['',`Ton ratio critique est déséquilibré : vise environ 1 % de chance pour 10 % de dégâts critiques.`]);
  /* compétences sans synergie */
  const refd=new Set();S.fx.forEach(f=>{['skill','on','cast','a','b'].forEach(k=>{const v=f[k];if(Array.isArray(v))v.forEach(x=>refd.add(x));else if(v)refd.add(v)})});S.fusions.forEach(id=>{refd.add(FUS[id].a);refd.add(FUS[id].b)});
  for(const id of eq.slice(1)){if(refd.has(id)||SK[id].cat==='primaire')continue;const f=D.FUSIONS.find(x=>x.cls===h.cls&&(x.a===id||x.b===id));if(f){const other=f.a===id?f.b:f.a;tips.push(['',`<b>${esc(SK[id].name)}</b> n'a aucune synergie équipée : essaie la fusion <b>${esc(f.name)}</b> (${esc(SK[id].name)} + ${esc(SK[other].name)}).`]);break}}
  /* robustesse */
  const L=P.mobLvl||h.lvl;const sc=monsterScale(h.diff||0,1,0);const hitPct=mobDmg(L)*sc.dmg*mitigation(S,L).mult/S.maxHp;
  if(hitPct>0.08)tips.push(['dn',`Ta robustesse est faible pour la difficulté ${DIFF[h.diff||0].n} : un coup normal t'enlève ${pct(hitPct)} de ta vie. Vitalité, armure, résistances, ou baisse la difficulté.`]);
  else if(hitPct<0.02&&S.sheetDps>mobHp(L)*sc.hp*2&&(h.diff||0)<DIFF.length-1){const nd=DIFF[(h.diff||0)+1];if(h.lvl>=nd.lvl)tips.push(['up',`Tu écrases cette difficulté : monte en <b>${nd.n}</b> pour plus d'XP et de légendaires.`])}
  /* divers */
  const empty=D.SLOTS.filter(s=>!h.equip[s.id]);if(empty.length)tips.push(['warn',`Emplacements vides : ${empty.map(s=>s.n.toLowerCase()).join(', ')}.`]);
  const upg=h.inv.filter(it=>canEquip(it,h)&&statDelta(h,it).dps>0.03);if(upg.length)tips.push(['up',`${upg.length} objet(s) de ton inventaire augmenteraient tes dégâts (flèches vertes dans l'Inventaire).`]);
  if(paraFree(h)>0)tips.push(['warn',`Tu as ${paraFree(h)} point(s) de parangon à placer.`]);
  if(h.gems.length&&!Object.values(h.gemSock).some(v=>v!=null))tips.push(['warn','Tu as des gemmes légendaires non serties (onglet Gemmes).']);
  if(G.cube.length&&!Object.values(h.cubeEq).some(Boolean))tips.push(['warn','Tu connais des pouvoirs au Cube Nova sans les utiliser.']);
  if(h.lvl>=30&&!S.fusions.length)tips.push(['',"Aucune fusion active : passe à l'Autel des fusions."]);
  h.skills.forEach(s=>{if(s&&SK[s.id]&&s.rune<0&&h.lvl>=SK[s.id].runes[0].lvl&&tips.length<12)tips.push(['',`<b>${esc(SK[s.id].name)}</b> n'a pas de rune : une rune change vraiment son effet.`])});
  /* objets précis à chercher (Codex) et où les farmer */
  const owned=new Set();const all=allItems(h).map(x=>x.it).concat(G.stash);all.forEach(it=>{if(it.leg)owned.add(it.leg);if(it.set)owned.add(it.set)});G.cube.forEach(id=>owned.add(id));
  const refs=o=>{const r=[];JSON.stringify(o,(k,v)=>{if(typeof v==='string'&&SK[v])r.push(v);return v});return r};
  const farmAt=id=>{for(const z in D.BOUNTY_TARGETS)if(D.BOUNTY_TARGETS[z].includes(id))return 'coffre de primes — '+D.ZONES[z].name;return null};
  const cand=[];D.LEGENDARIES.filter(l=>(!l.cls||l.cls===h.cls)&&!owned.has(l.id)).forEach(l=>{const r=refs(l.fx);let sc=r.filter(x=>eq.includes(x)).length*2;if(l.fuse){const f=FUS[l.fuse];sc+=(eq.includes(f.a)?1.5:0)+(eq.includes(f.b)?1.5:0)}if(!l.cls)sc+=0.4;if(sc>0)cand.push({kind:'leg',id:l.id,name:l.name,text:l.text,sc,where:farmAt(l.id)||'tout le monde (plus souvent en difficulté élevée)'})});
  D.SETS.filter(st=>(!st.cls||st.cls===h.cls)&&!st.season).forEach(st=>{const r=refs([st.b2,st.b4,st.b6]);const sc=r.filter(x=>eq.includes(x)).length*1.5+((S.setCount[st.id]||0)>0?3:0);if(sc>0)cand.push({kind:'set',id:st.id,name:st.name,text:'Set '+st.style+' — (6) '+st.b6.text,sc,where:'Failles et difficulté élevée (28 % des légendaires sont des pièces de set)'})});
  cand.sort((a,b)=>b.sc-a.sc);const items=cand.slice(0,3);
  /* build cible et fusion conseillée */
  const target=ref.best;let fusion=null;
  if(h.lvl>=30){const cur=(h.fus.active||[]).slice();const slots=fusionSlots(h);
    for(const f of D.FUSIONS.filter(f=>f.cls===h.cls&&eq.includes(f.a)&&eq.includes(f.b)&&!S.fusions.includes(f.id))){const act=cur.length<slots?cur.concat([f.id]):cur.slice(1).concat([f.id]);const r=simulateBuild(h,null,act);const gain=(r.single+r.group/3)/(sim.single+sim.group/3)-1;if(!fusion||gain>fusion.gain)fusion={f,gain,known:h.fus.known.includes(f.id)}}}
  return{sim,ref,verdict,verdictCls,style,tips:tips.slice(0,10),items,target,fusion};
}
/* ================= Écran titre, création, boucle principale ================= */
const showScene=new THREE.Scene();showScene.background=new THREE.Color(0x0c0a10);showScene.fog=new THREE.Fog(0x0c0a10,14,30);
showScene.add(new THREE.HemisphereLight(0xffe8d0,0x201810,0.9));{const l=new THREE.DirectionalLight(0xff9a5a,0.9);l.position.set(5,8,6);showScene.add(l);const l2=new THREE.DirectionalLight(0x5ab0ff,0.5);l2.position.set(-6,4,-3);showScene.add(l2)}
const showCam=new THREE.PerspectiveCamera(40,9/16,0.5,60);showCam.position.set(0,3.4,13);showCam.lookAt(0,1.4,0);
const showModels=[];
{const floor=new THREE.Mesh(new THREE.CircleGeometry(12,40).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x1a1418}));showScene.add(floor);
  D.CLASSES.forEach((c,i)=>{const g=heroModel(c.id,c.playable?null:0x333344);g.position.set((i-2)*3.1,0,0);g.scale.setScalar(1.05);showScene.add(g);showModels.push(g);
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(1,1.15,0.25,16),new THREE.MeshLambertMaterial({color:c.playable?0x3a2a22:0x1e1c22,emissive:c.playable?0x2a0a00:0}));ped.position.set((i-2)*3.1,0.12,0);showScene.add(ped)});
  const emb=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(Array.from({length:240},(_,i)=>i%3===1?Math.random()*8:(Math.random()-0.5)*22)),3)),new THREE.PointsMaterial({color:0xff8a3a,size:0.08,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));showScene.add(emb);showScene.userData.emb=emb}
let createSel='paladin';
function showTitle(){
  GS.mode='title';stopMusic();$('hud').classList.remove('on');$('menu').classList.remove('on');$('panel').classList.remove('on');
  const list=G.heroes.map((h,i)=>h.weekly?'':`<button class="hero" data-hero="${i}"><b>${esc(h.name)}</b><small>${CLS[h.cls].name} · niv ${h.lvl}${h.lvl>=70?' · P'+G.paragon.lvl:''}${h.bestGR?' · FS '+h.bestGR:''}</small></button>`).join('');
  $('title').innerHTML=`<div class="logo"><h1>NOVA <span>INFERNO</span></h1><p>Action-RPG · Acte I : La Braise Éteinte</p></div>
    <div class="tmenu">${list?`<h3>Tes héros</h3><div class="heroes">${list}</div>`:''}<button class="btn gold big" data-act="new">Nouveau héros</button></div>
    <small class="credit">Icônes : game-icons.net (CC BY 3.0)</small>`;
  $('title').classList.add('on');$('create').classList.remove('on');
}
function showCreate(){
  GS.mode='create';$('title').classList.remove('on');
  $('create').innerHTML=`<div class="ccards">${D.CLASSES.map(c=>`<button class="ccard${c.playable?'':' locked'}${createSel===c.id?' on':''}" data-cls="${c.id}" ${c.playable?'':'disabled'}><b>${c.name}</b><small>${esc(c.role)}</small>${c.playable?`<span class="res" style="color:${c.res.color}">${c.res.n}${c.res2?' + '+c.res2.n:''}</span>`:'<span class="soon">Bientôt</span>'}</button>`).join('')}</div>
    <div class="cform"><p>${esc(CLS[createSel].desc)}</p><div class="row"><input id="heroName" maxlength="16" placeholder="Nom du héros" value="${esc(['Aube','Vesper','Kaël','Lyra','Orin','Sélène'][Math.random()*6|0])}"><button class="btn gold" data-act="create">Commencer</button><button class="btn" data-act="back">Retour</button></div></div>`;
  $('create').classList.add('on');
  const on=$('create').querySelector('.ccard.on');if(on&&on.scrollIntoView)on.scrollIntoView({inline:'center',block:'nearest'});
}
$('title').addEventListener('click',e=>{audioInit();const b=e.target.closest('[data-hero],[data-act]');if(!b)return;SFX.ui();if(b.dataset.act==='new')showCreate();else if(b.dataset.hero!=null){G.cur=+b.dataset.hero;startGame(false)}});
$('create').addEventListener('click',e=>{audioInit();const b=e.target.closest('[data-cls],[data-act]');if(!b)return;SFX.ui();
  if(b.dataset.cls){const nm=$('heroName')&&$('heroName').value;createSel=b.dataset.cls;showCreate();if(nm)$('heroName').value=nm;return}
  if(b.dataset.act==='back'){showTitle();return}
  if(b.dataset.act==='create'){const nm=($('heroName').value||'Héros').trim().slice(0,16)||'Héros';G.heroes.push(newHero(nm,createSel));G.cur=G.heroes.length-1;save();startGame(true)}});

let heroLook='';
function spawnHeroMesh(){if(heroMesh)scene.remove(heroMesh);const h=hero();heroMesh=heroModel(h.cls,null,h.equip);heroLook=heroSig(h);scene.add(heroMesh);const sh=heroMesh.children.find(o=>o.material&&o.material.opacity===0.3&&o.geometry.type==='CircleGeometry');if(sh)heroMesh.remove(sh)}
function startGame(isNew){
  const h=hero();if(!h)return;GS.mode='play';
  /* compatibilité des anciennes sauvegardes */
  if(h.legSeen==null)h.legSeen=Object.values(h.equip).concat(h.inv).some(i=>i&&(i.r==='l'||i.r==='s'))?1:0;if(h.act2==null)h.act2=0;if(h.act2Done==null)h.act2Done=false;if(h.actDone&&D.ACT2&&!h.wp.includes('dunes'))h.wp.push('dunes');if(h.bounties)ensureBounties(h);$('title').classList.remove('on');$('create').classList.remove('on');$('hud').classList.add('on');
  for(let i=pets.length-1;i>=0;i--)removePet(i);P.buffs=[];P.cds={};P.stacks={};P.dead=0;P.deaths=0;
  rebuild();P.hp=S.maxHp;P.res=CLS[h.cls].res.max*0.5;P.res2=CLS[h.cls].res2?CLS[h.cls].res2.max:0;spawnHeroMesh();
  if(isNew){enterZone('ville');setTimeout(()=>dialog(D.ACT.intro),1200);setTimeout(()=>tutoTip('move'),400)}
  else{enterZone('ville');offlineGains()}
  setTimeout(spawnCompanion,500);
}
/* ----- gains hors ligne (plafond 8 h) ----- */
function offlineGains(){
  const h=hero();const el=(Date.now()-(G.lastTime||Date.now()))/1000;if(el<180||!h)return;
  const capped=el>8*3600;const hrs=Math.min(8,el/3600);const L=Math.min(70,h.lvl);const sc=monsterScale(h.diff||0,1,0);
  const eff=clamp(S.sheetDps/(mobHp(L)*sc.hp)*0.5,0.15,2);const k=ST().farm?1:0.33;
  const kills=Math.round(700*hrs*eff*k);const xp=kills*xpMob(L)*(1+sc.xp)*0.5;const gold=Math.round(kills*goldDrop(L)*0.25*(1+sc.gold));
  const mats={ferraille:Math.round(kills/30),azur:Math.round(kills/50),ambre:Math.round(kills/120),braise:h.lvl>=60?Math.round(kills/500):0};
  const keys=h.actDone?Math.floor(hrs*2*k):0;let items=0;const nIt=Math.min(10,Math.floor(kills/250));
  for(let i=0;i<nIt;i++){if(h.inv.length>=INV_MAX)break;const it=rollDrop({ilvl:L,leg:sc.leg,keep:1});if(it&&it.r!=='c'){h.inv.unshift(it);items++}}
  gainXp(xp);G.gold+=gold;for(const m in mats)G.mats[m]+=mats[m];G.keys+=keys;save();
  const hh=Math.floor(hrs),mm=Math.round((hrs-hh)*60);
  setTimeout(()=>openPanel('offline',{g:{hours:(hh?hh+' h ':'')+mm+' min',capped,kills,xp,gold,mats,keys,items}}),900);
}
/* ----- entrées ----- */
cv.addEventListener('pointerdown',e=>{audioInit();if(GS.mode!=='play')return;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);touch={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};GS.lastInput=NOW;if(!G.tuto.attack&&G.tuto.move)setTimeout(()=>tutoTip('attack'),1500)});
cv.addEventListener('pointermove',e=>{if(touch&&e.pointerId===touch.id){touch.dx=e.clientX-touch.x;touch.dy=e.clientY-touch.y;const L=Math.hypot(touch.dx,touch.dy);if(L>70){touch.x=e.clientX-touch.dx/L*70;touch.y=e.clientY-touch.dy/L*70}}});
const endT=e=>{if(touch&&e.pointerId===touch.id)touch=null};cv.addEventListener('pointerup',endT);cv.addEventListener('pointercancel',endT);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;keys[k]=1;audioInit();
  if(GS.mode==='play'){if(k==='escape'||k==='i'||k==='m'){if($('panel').classList.contains('on'))closePanel();else if($('menu').classList.contains('on'))closeMenu();else openMenu(k==='i'?'inv':null)}
    if(ST().manual&&'123456'.includes(k)&&k.length===1){const id=SLOTSK[+k-1];if(id)castSkill(id)}}
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)&&GS.mode==='play')e.preventDefault()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0});
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;touch=null});
$('btnMenu').addEventListener('click',()=>openMenu());
$('respWp').addEventListener('click',()=>{if(P.dead&&P.deadT<=0)respawn(false)});$('respHere').addEventListener('click',()=>{if(P.dead&&P.deadWait>=P.hereT&&!(GS.rift&&GS.rift.gr))respawn(true)});
$('btnTown').addEventListener('click',()=>{audioInit();if(GS.zone==='ville'||GS.loading||P.dead)return;if(GS.rift&&GS.rift.gr&&!GS.rift.done){if(!confirmTownGR){confirmTownGR=1;toast('Quitter la faille supérieure ? Touche encore VILLE pour confirmer (la clé est perdue).',3000);setTimeout(()=>confirmTownGR=0,3000);return}}
  if(G.weeklyRun){endWeekly(false);return}enterZone('ville')});
let confirmTownGR=0;
$('btnFs').addEventListener('click',()=>{audioInit();const el=stage;try{if(document.fullscreenElement){document.exitFullscreen().catch(()=>{})}else if(el.requestFullscreen){el.requestFullscreen().then(()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('portrait').catch(()=>{})}catch(e){}}).catch(()=>toast('Plein écran indisponible ici.',1800))}else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();else toast('Plein écran indisponible ici.',1800)}catch(e){toast('Plein écran indisponible ici.',1800)}});
document.addEventListener('fullscreenchange',()=>setTimeout(resize,100));

/* ----- debug (?debug=1 uniquement) ----- */
function debugAct(k){if(!DEBUG)return;const h=hero();
  if(k==='lvl'){while(h.lvl<70){h.lvl++;unlockSkillsAt(h,h.lvl)}h.xp=0;rebuild();P.hp=S.maxHp;toast('Niveau 70',1500)}
  if(k==='items'){const L=h.lvl;const st=D.SETS.find(s=>s.cls===h.cls);st.slots.forEach(sl=>h.inv.unshift(makeItem({ilvl:L,cls:h.cls,set:st.id,slot:sl,anc:L>=70?1:0})));
    D.LEGENDARIES.filter(l=>l.cls===h.cls).slice(0,6).forEach(l=>h.inv.unshift(makeItem({ilvl:L,cls:h.cls,leg:l.id,anc:L>=70?1:0})));
    ['amulette','anneau','anneau','arme','poignets','taille'].forEach(s=>h.inv.unshift(makeItem({ilvl:L,cls:h.cls,r:'r',slot:s})));h.inv=h.inv.slice(0,INV_MAX);toast('Objets ajoutés',1500)}
  if(k==='para'){G.paragon.lvl+=100;toast('+100 parangon',1500)}
  if(k==='mats'){G.gold+=1e7;for(const m in G.mats)G.mats[m]+=500;G.keys+=20;toast('Ressources ajoutées',1500)}
  if(k==='act'){h.act=4;h.actDone=true;genBounties(h);['landes','sylve','marais','crypte'].forEach(z=>{if(!h.wp.includes(z))h.wp.push(z)});toast('Acte I terminé',1500)}
  if(k==='god'){G.godmode=!G.godmode;toast('Invincible : '+(G.godmode?'oui':'non'),1500)}
  rebuild();save()}
if(DEBUG)window.NI={G:()=>G,P,S:()=>S,hero,debugAct,startRift,enterZone,openMenu,openPanel,closePanel,closeMenu,castSkill,simulateBuild,novaAdvice,mobs,spawnPack,rebuild,makeItem,GS,killAll:()=>{for(const m of mobs)if(!m.dead&&!m.dummy)hitMob(m,0,{flat:m.hp+1,noCrit:1,proc:0})},hurt:v=>hurtPlayer(v,'aoe'),startWeekly,MAP:()=>MAP,save,
  tp:(x,z)=>{P.x=x;P.z=z},balance:(cls,L,r)=>{const h=newHero('t',cls);h.lvl=L;D.SLOTS.forEach(sl=>{h.equip[sl.id]=makeItem({ilvl:L,cls,r:r||'r',slot:slotType(sl.id)})});h.skills=D.CATS.map(c=>{const s=D.SKILLS.find(x=>x.cls===cls&&x.cat===c.id&&x.lvl<=L);return s?{id:s.id,rune:L>=20?0:-1}:null});const sim=simulateBuild(h);const Sx=computeStats(h);return{L,dps:Math.round(Sx.sheetDps),single:Math.round(sim.single),group:Math.round(sim.group),mobHp:Math.round(mobHp(L)),secWhite:+(mobHp(L)/sim.single).toFixed(2),hitPct:+(mobDmg(L)*mitigation(Sx,L).mult/Sx.maxHp*100).toFixed(1),hp:Sx.maxHp}},fx:()=>fx.length,R:()=>R,NOW:()=>NOW,offline:s=>{G.lastTime=Date.now()-s*1000;offlineGains()}};

/* ----- outils de test : ?turbo=N accélère l'horloge (N pas de jeu par image), ?bot=1 expose une télémétrie en lecture seule ----- */
const TURBO=Math.max(1,Math.min(40,+((location.search.match(/[?&]turbo=(\d+)/)||[])[1]||1)));
if(/[?&]bot=1/.test(location.search))window.NIBOT={
  st:()=>{const h=hero();if(!h||!S)return{mode:GS.mode};const near=nearestMob(P.x,P.z,40);const qt=questTarget();let drop=null,bd=40;for(const d of drops){const dd=dist(d.x,d.z,P.x,P.z);if(dd<bd){bd=dd;drop={x:d.x,z:d.z,gold:!!d.gold}}}
    return{mode:GS.mode,t:NOW,zone:GS.zone,loading:GS.loading,x:P.x,z:P.z,hp:P.hp/S.maxHp,dead:P.dead,lastHit:P.lastHit?P.lastHit.who+'/'+P.lastHit.type:'',lvl:h.lvl,xp:h.xp,act:h.act,actDone:h.actDone,act2:h.act2||0,questZone:(questState(h)||{step:{}}).step.zone||null,deaths:P.deaths,kills:h.kills,inv:h.inv.length,
      near:near?{x:near.x,z:near.z,d:dist(near.x,near.z,P.x,P.z),boss:!!near.boss}:null,qt:qt?{x:qt.x,z:qt.z}:null,drop,range:(SLOTSK[0]&&SKC[SLOTSK[0]]&&SKC[SLOTSK[0]].range)||CLS[h.cls].range,
      legs:h.inv.concat(Object.values(h.equip)).filter(i=>i&&(i.r==='l'||i.r==='s')).length,menu:$('menu').classList.contains('on'),panel:panelId,dps:S.sheetDps,maxHp:S.maxHp,
      tele:hazards.filter(z=>z.kind==='tele'||z.kind==='pool').map(z=>({x:z.x,z:z.z,r:z.r}))}},
  /* prochain point du chemin de la carte vers une cible (aide au déplacement, comme le farm auto) */
  step:(tx,tz)=>navStep(P.x,P.z,tx,tz)};
/* ----- boucle ----- */
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!R||!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();showCam.aspect=w/h;showCam.updateProjectionMatrix();
  stage.style.setProperty('--fs',clamp(w/25.5,13.5,17)+'px');mm.width=mm.height=Math.round(clamp(w*0.25,80,118))}
addEventListener('resize',resize);
let last=0,frames=0,fpsT=0;
function frame(now){
  requestAnimationFrame(frame);if(document.hidden){last=now;return}
  if(TURBO>1){last=now;try{for(let i=0;i<TURBO;i++){if(window.__botTick)window.__botTick();tick(1/30,i<TURBO-1)}}catch(e){console.error(e)}return}
  if(now-last<32)return;const dt=Math.min(0.1,(now-last)/1000);last=now;
  try{tick(dt)}catch(e){console.error(e)}
}
function tick(dt,noRender){
  if(GS.mode!=='play'){updateParticles(dt);showModels.forEach((g,i)=>{const c=D.CLASSES[i];const sel=c.id===createSel&&GS.mode==='create';g.rotation.y+=dt*(sel?1.2:0.35);g.position.y=sel?0.3+Math.sin(NOW*3)*0.05:0;animHero(g,NOW,false,0,dt)});NOW+=dt;
    const e=showScene.userData.emb;const p=e.geometry.attributes.position.array;for(let i=1;i<p.length;i+=3){p[i]+=dt*0.6;if(p[i]>8)p[i]=0}e.geometry.attributes.position.needsUpdate=true;
    const tx=GS.mode==='create'?(D.CLASSES.findIndex(c=>c.id===createSel)-2)*3.1:Math.sin(NOW*0.2)*0.6;showCam.position.x+=(tx-showCam.position.x)*Math.min(1,dt*5);showCam.position.z=GS.mode==='create'?9:13;showCam.lookAt(showCam.position.x,1.5,0);if(!noRender)R.render(showScene,showCam);return}
  const paused=$('menu').classList.contains('on')||($('panel').classList.contains('on')&&GS.zone!=='ville')||GS.loading;
  const frozen=!paused&&hitStop>0;if(frozen)hitStop-=dt;
  if(!paused&&S&&!frozen){NOW+=dt;shadowN=0;runTimers();
    updatePlayer(dt);if(heroMesh)shadowAt(P.x,P.z,0.6);updateCompanion(dt);updatePets(dt);const bossNear=updateMobs(dt);updateProjs(dt);updateHazards(dt);updateEvents(dt);
    /* chrono de faille supérieure */
    if(GS.rift&&GS.rift.gr&&!GS.rift.done&&!GS.rift.failed&&NOW-GS.rift.t0>GS.rift.timer){GS.rift.failed=true;toast('<b>Temps écoulé !</b> Tu peux finir la faille, mais sans récompense de palier.',4000)}
    revealT-=dt;if(revealT<=0){revealT=0.4;revealFog(P.x,P.z)}
    for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;f.upd(f.o,f.t,dt);if(f.t>=f.life){scene.remove(f.o);if(f.own)f.o.geometry.dispose();if(f.o.material&&!(f.o.material.userData&&f.o.material.userData.keep))f.o.material.dispose();fx.splice(i,1)}}
    updateParticles(dt);updateFlashLights(dt);
    shadowIM.count=shadowN;shadowIM.instanceMatrix.needsUpdate=true;
    updateHud(dt,bossNear);
  }
  if(noRender)return;
  /* caméra en hauteur derrière le héros */
  shake=Math.max(0,shake-dt);const hy=H(P.x,P.z);const sx=shake?rnd(-0.25,0.25)*shake*3:0,sz=shake?rnd(-0.25,0.25)*shake*3:0;
  cam.position.set(P.x+sx,hy+13.5,P.z+12+sz);cam.lookAt(P.x,hy+0.5,P.z-5);
  updateLabels();
  R.render(scene,cam);
}
let revealT=0;

/* ----- démarrage ----- */
function boot(){
  load();
  /* nettoyage : un défi de la semaine interrompu ne laisse pas de héros temporaire */
  if(G.heroes.some(h=>h.weekly)){const keep=G.heroes.filter(h=>!h.weekly);G.cur=Math.min(keep.length-1,Math.max(0,G.weeklyRun&&weeklyBackup?weeklyBackup.cur:0));G.heroes=keep;G.weeklyRun=null}
  if(!DEBUG)G.godmode=false;
  makeRenderer();resize();
  if(!G.heroes.length||G.cur<0)showTitle();else showTitle();
  requestAnimationFrame(frame);
  setInterval(()=>{if(GS.mode==='play')save()},15000);
  addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
}
try{boot()}catch(e){console.error(e);const b=$('bootErr');if(b){b.style.display='flex';b.textContent='Erreur au démarrage : '+e.message}}
})();
