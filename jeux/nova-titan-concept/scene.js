'use strict';
/* Nova Titan — scène 3D de démonstration (modèles KayKit, CC0) */
window.NTScene=function(canvas,opts){opts=opts||{};
 const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
 const fmt=n=>{const u=['','k','M','G','T','aa','ab','ac'];let i=0;while(n>=1000&&i<u.length-1){n/=1000;i++}return(n<10&&i?n.toFixed(2):n<100&&i?n.toFixed(1):Math.round(n))+u[i]};
 const R=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:!!opts.capture});R.setPixelRatio(Math.min(devicePixelRatio||1,1.5));R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
 const S=new THREE.Scene();S.background=new THREE.Color(0x0c0810);S.fog=new THREE.Fog(0x0c0810,16,30);
 const cam=new THREE.PerspectiveCamera(40,1,.3,60);cam.position.set(0,7.6,13.6);cam.lookAt(0,3.1,-2.2);
 S.add(new THREE.AmbientLight(0x6a5a7a,.25),new THREE.HemisphereLight(0x8890b0,0x2a1a10,.35));const key=new THREE.DirectionalLight(0xffe2c0,.75);key.position.set(-5,10,7);S.add(key);
 const rim=new THREE.PointLight(0x6a4aff,1.6,14,2);rim.position.set(3,4,-5);S.add(rim);
 const torches=[];for(const x of[-5.2,5.2]){const l=new THREE.PointLight(0xff7a2a,3.2,13,2);l.position.set(x,2.6,-4.6);S.add(l);torches.push(l)}
 const L=new THREE.GLTFLoader(),cache={},base=opts.base||'m/';const load=n=>cache[n]||(cache[n]=new Promise((ok,ko)=>L.load(base+n+(opts.ext||''),ok,undefined,ko)));
 const mixers=[],fx=[];let titan=null,hero=null,clone=null,comps=[],mode=opts.mode||'normal',hp=1,maxhp=1,stageN=opts.stage||87,onUI=opts.onUI||(()=>{});
 const tags=opts.tags;
 function unit(g,keep,o={}){const m=THREE.SkeletonUtils.clone(g.scene);m.traverse(x=>{if(x.isMesh){x.frustumCulled=false;x.material=x.material.clone();if(/Sword|Shield|Axe|Staff|Wand|Crossbow|Knife|Throwable|Mug|Spellbook/.test(x.name))x.visible=!!keep&&keep.includes(x.name)}});
  const mx=new THREE.AnimationMixer(m);mixers.push(mx);const acts={};for(const c of g.animations)acts[c.name]=mx.clipAction(c);
  const u={o:m,mx,acts,cur:null,play(n,once,ts=1){const a=acts[n]||acts.Idle;if(!a)return;if(u.cur===a&&!once)return;if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else a.setLoop(THREE.LoopRepeat);a.timeScale=ts;a.enabled=true;a.setEffectiveWeight(1);if(u.cur&&u.cur!==a)a.crossFadeFrom(u.cur,.1,false);a.play();u.cur=a;
   if(once)clearTimeout(u.t),u.t=setTimeout(()=>{if(!u.dead)u.play(o.idle||'Idle')},a.getClip().duration/ts*1000*.92)},...o};
  S.add(m);u.play(o.idle||'Idle');return u}
 const spark=new THREE.SphereGeometry(.16,8,6),ringG=new THREE.RingGeometry(.85,1,40);
 function burst(p,col,n=10,sp=5){for(let i=0;i<n;i++){const m=new THREE.Mesh(spark,new THREE.MeshBasicMaterial({color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(p);m.scale.setScalar(rnd(.4,1.1));S.add(m);fx.push({m,t:0,life:rnd(.35,.7),v:new THREE.Vector3(rnd(-sp,sp),rnd(1,sp*1.4),rnd(-sp,sp)),g:14})}}
 function ring(p,r,col){const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:2}));m.rotation.x=-Math.PI/2;m.position.set(p.x,.12,p.z);S.add(m);fx.push({m,t:0,life:.45,ring:r})}
 function bolt(from,to,col){const m=new THREE.Mesh(spark,new THREE.MeshBasicMaterial({color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.setScalar(1.6);m.position.copy(from);S.add(m);fx.push({m,t:0,life:.28,from:from.clone(),to:to.clone()})}
 const tmp=new THREE.Vector3();
 function num(txt,cls,p){if(!tags)return;tmp.copy(p||titan.o.position);tmp.y=(p?p.y:3.6*titan.s/2.4)+rnd(-.3,.4);tmp.x+=rnd(-.8,.8);tmp.project(cam);const d=document.createElement('div');d.className='dmg '+(cls||'');d.textContent=txt;
  const w=canvas.clientWidth,h=canvas.clientHeight;d.style.left=(tmp.x*.5+.5)*w+'px';d.style.top=(-tmp.y*.5+.5)*h+'px';tags.appendChild(d);let t=0,y0=(-tmp.y*.5+.5)*h;const st=()=>{t+=.06;d.style.top=(y0-t*46)+'px';d.style.opacity=Math.min(1,2-2*t);if(t<1)requestAnimationFrame(st);else d.remove()};requestAnimationFrame(st)}
 let titanIdx=0;const TT=[['Skeleton_Warrior.glb','Ossarque le Titan'],['Skeleton_Mage.glb','Liche Titanesque'],['Skeleton_Rogue.glb','Rôdeur des Os'],['Skeleton_Minion.glb','Colosse d\'Os']];
 async function spawnTitan(){const boss=mode==='boss';const [f,n]=boss?TT[0]:TT[titanIdx++%TT.length];const g=await load(f);if(titan)S.remove(titan.o);
  titan=unit(g,null,{idle:'Idle_Combat',s:boss?3.1:2.4,name:boss?'Kharzul, Seigneur des Cryptes':n});titan.o.scale.setScalar(titan.s);titan.o.position.set(.9,0,-3.2);titan.o.rotation.y=-.35;
  if(boss)titan.o.traverse(x=>{if(x.isMesh){x.material.emissive=new THREE.Color(0x7a1006);x.material.emissiveIntensity=.55}});
  maxhp=hp=boss?4.8e12:3.1e11*rnd(.9,1.1);titan.dead=false;titan.play('Spawn_Ground_Skeletons',true,1.4);onUI({hp,maxhp,name:titan.name,boss})}
 function hitTitan(d,crit,cls){if(!titan||titan.dead)return;hp-=d;num(fmt(d),crit?'crit':cls||'');if(Math.random()<.35&&!cls)titan.play('Hit_A',true,1.6);onUI({hp,maxhp,name:titan.name,boss:mode==='boss'});
  if(hp<=0){titan.dead=true;titan.play('Death_A',true,1.2);const p=titan.o.position.clone();p.y=1;burst(p,0xffd84a,22,6);num('+'+fmt(maxhp*.04)+' or','gold',p.clone().setY(2));onUI({kill:true,gold:maxhp*.04});setTimeout(()=>{if(mode!=='boss')spawnTitan()},1500)}}
 const heroDmg=8.6e9;
 function tap(){if(!hero||!titan)return;hero.play(pick(['1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal']),true,2);
  const crit=Math.random()<.18;const p=titan.o.position.clone();p.y=2.4;p.x-=.6;burst(p,crit?0xffb02a:0xfff0d0,crit?12:6,crit?6:4);hitTitan(heroDmg*(crit?6.5:1)*rnd(.9,1.1),crit)}
 const ready=(async()=>{
  const parts=['floor_tile_large.gltf.glb','floor_tile_large_rocks.gltf.glb','wall.gltf.glb','wall_cracked.gltf.glb','wall_arched.gltf.glb','pillar_decorated.gltf.glb','torch_mounted.gltf.glb','banner_patternA_white.gltf.glb','barrel_large.gltf.glb','box_stacked.gltf.glb','chest_gold.glb'];
  const P={};await Promise.all(parts.map(async n=>P[n]=(await load(n)).scene));const put=(n,x,z,ry=0,s=1)=>{const o=P[n].clone();o.position.set(x,0,z);o.rotation.y=ry;o.scale.setScalar(s);S.add(o);return o};
  for(let i=-2;i<=2;i++)for(let j=-2;j<=1;j++)put(j===-2&&i%2?'floor_tile_large_rocks.gltf.glb':'floor_tile_large.gltf.glb',i*4,j*4);
  put('wall_cracked.gltf.glb',-8,-8);put('wall.gltf.glb',-4,-8);put('wall_arched.gltf.glb',0,-8);put('wall.gltf.glb',4,-8);put('wall_cracked.gltf.glb',8,-8);
  put('pillar_decorated.gltf.glb',-6,-6);put('pillar_decorated.gltf.glb',6,-6);put('torch_mounted.gltf.glb',-5.2,-7.6);put('torch_mounted.gltf.glb',5.2,-7.6);
  put('banner_patternA_white.gltf.glb',-2.2,-7.6);put('banner_patternA_white.gltf.glb',2.2,-7.6);put('barrel_large.gltf.glb',-6.6,-3.4,.4);put('box_stacked.gltf.glb',6.8,-2.4,.8);put('chest_gold.glb',-6.4,1.4,.9);
  const [K,M,B,Rg,RH]=await Promise.all(['Knight.glb','Mage.glb','Barbarian.glb','Rogue.glb','Rogue_Hooded.glb'].map(load));
  hero=unit(K,['1H_Sword','Round_Shield'],{idle:'Idle_Combat'});hero.o.position.set(-.9,0,.5);hero.o.lookAt(.9,0,-3.2);
  comps=[unit(M,['2H_Staff'],{idle:'Idle',cls:'mage',col:0x7ab8ff}),unit(B,['2H_Axe'],{idle:'Idle_Combat',cls:'barbare'}),unit(Rg,['1H_Crossbow'],{idle:'Idle',cls:'rodeuse',col:0xffe08a})];
  comps[0].o.position.set(-3.6,0,-.8);comps[1].o.position.set(3.5,0,-1.2);comps[2].o.position.set(2.6,0,1.9);
  for(const c of comps)c.o.lookAt(.9,0,-3.2);
  if(mode==='clone'){clone=unit(K,['1H_Sword','Round_Shield'],{idle:'Idle_Combat'});clone.o.traverse(x=>{if(x.isMesh){x.material.color.setHex(0x1a0a2a);x.material.emissive=new THREE.Color(0x5a2aff);x.material.emissiveIntensity=.7;x.material.transparent=true;x.material.opacity=.82}});clone.o.position.set(-2.2,0,-1.6);clone.o.lookAt(.9,0,-3.2)}
  await spawnTitan();
  if(mode==='loot'){const beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.42,12,12,1,true),new THREE.MeshBasicMaterial({color:0xff8a1a,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.set(-2.8,6,2.2);S.add(beam);
   const it=new THREE.Mesh(new THREE.OctahedronGeometry(.35),new THREE.MeshBasicMaterial({color:0xff8a1a}));it.position.set(-2.8,.4,2.2);S.add(it);fx.push({m:it,spin:1})}
 })();
 let ctime=0,cT=[1.1,1.7,1.3],cAcc=[.2,.9,.5],last=performance.now(),acc=0,tt=0,running=true;
 function frame(now){if(!running)return;requestAnimationFrame(frame);if(document.hidden){last=now;return}acc+=Math.min(.1,(now-last)/1000);last=now;if(acc<1/30)return;const dt=Math.min(.066,acc);acc=0;step(dt)}
 function step(dt){tt+=dt;for(const m of mixers)m.update(dt);for(const [i,l]of torches.entries())l.intensity=3.2*(.85+.15*Math.sin(tt*9+i*3)+.06*Math.random());rim.intensity=1.4+.4*Math.sin(tt*1.3);
  if(hero&&titan&&!titan.dead){comps.forEach((c,i)=>{cAcc[i]+=dt;if(cAcc[i]>=cT[i]){cAcc[i]=0;const tp=titan.o.position.clone();tp.y=2.2;
    if(c.cls==='barbare'){c.play('2H_Melee_Attack_Chop',true,1.5);setTimeout(()=>{burst(tp,0xffffff,5,3);hitTitan(2.1e9*rnd(.9,1.1),false,'cp')},250)}
    else{c.play(c.cls==='mage'?'Spellcast_Shoot':'1H_Ranged_Shoot',true,1.4);const from=c.o.position.clone();from.y=1.5;setTimeout(()=>bolt(from,tp,c.col),200);setTimeout(()=>hitTitan(1.6e9*rnd(.9,1.1),false,'cp'),460)}}});
   if(clone){ctime+=dt;if(ctime>.22){ctime=0;clone.play(pick(['1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Chop']),true,2.4);const p=titan.o.position.clone();p.y=2;burst(p,0x8a5aff,4,3);hitTitan(heroDmg*.7,false,'cp')}}
   if(opts.autoTap&&Math.random()<dt*3.2)tap()}
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];if(f.spin){f.m.rotation.y+=dt*2;continue}f.t+=dt;const k=f.t/f.life;
   if(f.ring){f.m.scale.setScalar(f.ring*(.3+.7*k));f.m.material.opacity=.8*(1-k)}else if(f.from){f.m.position.lerpVectors(f.from,f.to,k)}else{f.m.position.addScaledVector(f.v,dt);f.v.y-=f.g*dt;f.m.material.opacity=1-k}
   if(f.t>=f.life){S.remove(f.m);f.m.material.dispose();fx.splice(i,1)}}
  R.render(S,cam)}
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.fov=w/h<.8?44:38;cam.updateProjectionMatrix()}
 addEventListener('resize',resize);resize();requestAnimationFrame(frame);
 return{ready,tap,resize,step,stop(){running=false},setStage(n){stageN=n}}};
