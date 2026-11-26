/* Nova Inferno — TOUT le contenu du jeu (données simples).
   L'assistant NOVA peut ajouter une classe, une compétence, un objet, un set, une fusion,
   un monstre, une zone ou une saison en modifiant seulement ce fichier.

   Vocabulaire des effets (champ fx: [...]) compris par le moteur :
   {t:'stat', s:{cle:valeur}}                      stats fixes (dmg, chc, chd, ias, cdr, rcr, dr, ms, thorns, ls, area, elite, armorP, lifeP, regenP, gold, pickup)
   {t:'skillDmg', skill:'id'|['id'], m:2, cond?:'cursed'}   multiplie les dégâts d'une compétence ('*' = toutes, 'cat:zone' = une catégorie, 'pets' = invocations)
   {t:'elemDmg', el:'feu', m:1.4}                  multiplie un élément
   {t:'castAlso', on:'A', cast:'B', m:0.8, ch:1}   lancer A déclenche aussi B (gratuit) à m × dégâts
   {t:'zoneOn', on:'A', at:'path'|'target'|'self', r, dur, dps, el, eff?:'thorns'|'slow'|'heal'}  A laisse une zone au sol
   {t:'onHit', on:'A'|'*', ch, do, m}              proc à l'impact sur un ennemi
   {t:'onImpact', on:'A', do, m, ch?}              proc à chaque point d'impact au sol
   {t:'onKill', on?:'A', ch, do, m, cond?}         proc à la mort d'un ennemi
   {t:'summonOnCast', on:'A', unit, count, dur, m} A invoque des unités
   {t:'petApply', debuff:'curse'|'poison', m?}     les coups de tes invocations appliquent un effet
   {t:'petCast', cast:'B', every:s, m}             tes invocations lancent B régulièrement
   {t:'cdrOnHit', on:'A', skill:'B'|'*', s}        chaque ennemi touché par A réduit la recharge de B de s secondes
   {t:'buffOnCast', on:'A', buff:{dmg,as,dr,ms,thorns,crit,rcr}, dur}  lancer A donne un bonus temporaire
   {t:'cloneOnDash', on?:'A', dur, m}              chaque mobilité crée un double qui combat
   {t:'extra', skill:'A', add:{count:2, r:1, cd:-3, dur:5, hits:1, jumps:2, follow:1, cost:-5}}  modifie les paramètres d'une compétence
   {t:'reset', on:'A', skill:'B', ch}              A a ch chances de réinitialiser la recharge de B
   {t:'stackOn', on:'A', skill:'B', m, max, dur}   chaque lancer de A augmente les dégâts de B (cumulable)
   {t:'doubleCast', skill:'A'|'*', ch}             A a ch chances de se lancer deux fois
   {t:'lowHpDr', below, dr}                        réduction des dégâts sous un seuil de vie
   {t:'eliteDmg', m} {t:'nearDmg', r, m}            dégâts contre élites / ennemis proches
   {t:'setReduce'}                                 réduit de 1 le nombre de pièces requises par set (minimum 2)
   {t:'periodic', every, do, m, el?}               action automatique toutes les X secondes
   {t:'periodicBuff', every, buff, dur}            bonus automatique cyclique
   {t:'thornsHit', skill:[..], m}                  ces compétences infligent en plus m × tes épines
   {t:'cheatDeath', cd, heal}                      survit à un coup mortel
   {t:'whileBuff', skill:'A', every, cast:'B', m}  pendant le bonus de A, lance B toutes les X s
   {t:'dotMult', m}                                 multiplie les dégâts sur la durée (poisons, brûlures)
   Actions 'do' : chain, explode, poison, curse, miniTrap, bolts, meteor, spirit, nova, heal, resource, summon, pull
*/
window.NI_DATA = {

/* ---------------- Éléments ---------------- */
ELEMENTS:{
  phys:{n:'Physique',c:0xe8e4da,css:'#e8e4da'}, feu:{n:'Feu',c:0xff7a22,css:'#ff8a3a'}, froid:{n:'Froid',c:0x7fdcff,css:'#8fe0ff'},
  foudre:{n:'Foudre',c:0xa8b4ff,css:'#b6c0ff'}, poison:{n:'Poison',c:0x8aff4a,css:'#9cff6a'}, sacre:{n:'Sacré',c:0xffd76a,css:'#ffd76a'}, ombre:{n:'Ombre',c:0xb36bff,css:'#c08aff'}
},

/* ---------------- Classes ---------------- */
CLASSES:[
  {id:'paladin', name:"Paladin de l'Aube", role:'Mêlée robuste · bouclier, charge, lanciers sacrés', main:'str', mainName:'Force',
   res:{id:'colere',n:'Colère',max:100,regen:1.5,color:'#ffb43a'}, color:0xd9b25a, accent:0xfff0b0, playable:true,
   weapons:['epee','fleau','masse'], offhand:'bouclier', range:2.6, baseArmor:1.15,
   desc:"Un chevalier sacré qui charge sur un destrier spectral, renvoie les coups et appelle une phalange de lanciers."},
  {id:'traqueuse', name:'Traqueuse', role:'Distance rapide · arbalètes, pièges, bête', main:'dex', mainName:'Dextérité',
   res:{id:'haine',n:'Haine',max:125,regen:3,color:'#e84a4a'}, res2:{id:'disc',n:'Discipline',max:30,regen:1,color:'#7a8cff'},
   color:0x4a3a5a, accent:0xe84a4a, playable:true, weapons:['arbalete'], offhand:'carquois', range:11, baseArmor:1,
   desc:"Une chasseuse insaisissable : carreaux, pièges, bonds et un fauve fidèle. Haine pour frapper, Discipline pour survivre."},
  {id:'shaman', name:'Shaman des Ossements', role:'Invocations et poisons · gardiens, colosse, nuées', main:'int', mainName:'Intelligence',
   res:{id:'mana',n:'Mana',max:250,regen:9,color:'#4aa8ff'}, color:0x3a5a3a, accent:0x9cff6a, playable:true,
   weapons:['dague','baton'], offhand:'fetiche', range:10, baseArmor:1,
   desc:"Un sorcier des marais qui maudit, empoisonne et commande une armée d'os, jusqu'à un colosse."},
  {id:'moine', name:'Moine du Vent', role:'Bientôt', playable:false, color:0xd8c8a0, desc:'Arts martiaux et vents tranchants. Bientôt disponible.'},
  {id:'necro', name:'Nécromant', role:'Bientôt', playable:false, color:0x5a6a6a, desc:'Os, sang et cadavres. Bientôt disponible.'}
],

/* Catégories de compétences (ordre des 6 emplacements) */
CATS:[
  {id:'primaire',n:'Primaire'},{id:'secondaire',n:'Secondaire'},{id:'defense',n:'Défensive'},
  {id:'mobilite',n:'Mobilité'},{id:'zone',n:'Invocation / Zone'},{id:'ultime',n:'Ultime'}
],

/* ---------------- Compétences ----------------
   kind : strike (mêlée), proj (projectiles), chain (rebonds), nova (autour de soi), ground (impacts au sol),
          zone (zone persistante), dash (déplacement), summon (invocation), buff (bonus), trap (pièges), cone, curse
   dmg = coefficient × dégâts d'arme. Les runes remplacent des paramètres (mod) : élément, forme, comportement.
   res2:true = dépense la ressource secondaire (Discipline). */
SKILLS:[
  /* ===== Paladin de l'Aube ===== */
  {id:'pal_frappe',cls:'paladin',cat:'primaire',name:"Frappe de l'Aube",icon:'sword-brandish',lvl:1,kind:'strike',el:'sacre',dmg:1.35,gen:7,r:0,
   desc:'Frappe la cible avec une lame de lumière. Génère de la Colère.',
   runes:[{name:'Éclat solaire',desc:'Feu : la frappe embrase tout autour de la cible (rayon 3).',mod:{el:'feu',r:3,dmg:1.45}},
          {name:'Écho tonnant',desc:'Foudre : un arc saute sur 3 ennemis proches.',mod:{el:'foudre',jumps:3}},
          {name:'Brise-garde',desc:'Physique : étourdit 0,6 s et génère plus de Colère.',mod:{el:'phys',stun:0.6,gen:10,dmg:1.75}}]},
  {id:'pal_lame',cls:'paladin',cat:'primaire',name:'Lame Juste',icon:'spinning-sword',lvl:10,kind:'proj',el:'sacre',dmg:1.35,gen:6,count:1,speed:16,pierce:1,range:12,
   desc:'Lance une lame de lumière qui transperce les ennemis en ligne.',
   runes:[{name:'Triple lame',desc:'Trois lames en éventail.',mod:{count:3,spread:34,dmg:0.75}},
          {name:'Lame ardente',desc:'Feu : la lame explose au premier impact.',mod:{el:'feu',pierce:0,boom:2.6,dmg:1.6}},
          {name:'Lame captive',desc:'Physique : la lame revient vers toi et retouche.',mod:{el:'phys',ret:1,dmg:1.15}}]},
  {id:'pal_marteau',cls:'paladin',cat:'secondaire',name:'Marteau du Jugement',icon:'thor-hammer',lvl:2,kind:'ground',el:'sacre',dmg:3.7,cost:16,r:3,delay:0.35,count:1,range:11,
   desc:'Un marteau de lumière s\'abat sur la cible.',
   runes:[{name:'Pluie de marteaux',desc:'Trois marteaux plus petits autour de la cible.',mod:{count:3,r:2.2,dmg:1.9,spread:3}},
          {name:'Marteau tonnant',desc:'Foudre : étourdit 1 s.',mod:{el:'foudre',stun:1}},
          {name:'Cratère ardent',desc:'Feu : laisse un sol brûlant 3 s.',mod:{el:'feu',zdur:3,zdps:1.4}}]},
  {id:'pal_bouclier',cls:'paladin',cat:'secondaire',name:'Bouclier Béni',icon:'bordered-shield',lvl:12,kind:'chain',el:'sacre',dmg:3.6,cost:20,jumps:3,range:11,
   desc:'Lance ton bouclier qui rebondit d\'ennemi en ennemi.',
   runes:[{name:'Rebonds sans fin',desc:'Rebondit sur 7 ennemis.',mod:{jumps:7,dmg:2.5}},
          {name:"Bouclier d'épines",desc:'Physique : tes épines doublent 4 s après le lancer.',mod:{el:'phys',selfBuff:{thorns:1},bdur:4}},
          {name:'Bouclier foudroyant',desc:'Foudre : chaque rebond explose (rayon 2,5).',mod:{el:'foudre',boom:2.5,dmg:2.9}}]},
  {id:'pal_rempart',cls:'paladin',cat:'defense',name:'Rempart de Lumière',icon:'magic-shield',lvl:6,kind:'buff',el:'sacre',cd:18,dur:6,buff:{dr:0.3},
   desc:'Réduit les dégâts subis de 30 % pendant 6 s.',
   runes:[{name:'Épines bénies',desc:'Triple aussi tes épines.',mod:{buff:{dr:0.3,thorns:2}}},
          {name:'Lumière guérisseuse',desc:'Rend 30 % de ta vie pendant la durée.',mod:{buff:{dr:0.25,regen:0.05}}},
          {name:'Égide ardente',desc:'Feu : libère une onde de feu (300 %) au lancer.',mod:{el:'feu',nova:5,dmg:3}}]},
  {id:'pal_sentence',cls:'paladin',cat:'defense',name:'Sentence',icon:'justice-star',lvl:18,kind:'nova',el:'sacre',dmg:1.6,cd:12,r:6,stun:1.5,
   desc:'Une onde sacrée étourdit les ennemis proches 1,5 s.',
   runes:[{name:"Sentence d'attraction",desc:'Attire les ennemis vers toi avant l\'étourdissement.',mod:{pull:1}},
          {name:'Sentence de feu',desc:'Feu : brûle les ennemis (400 % sur 4 s).',mod:{el:'feu',dot:4,dotDur:4}},
          {name:'Absolution',desc:'Rend 3 % de vie par ennemi touché.',mod:{healPer:0.03}}]},
  {id:'pal_charge',cls:'paladin',cat:'mobilite',name:'Charge du Destrier',icon:'mounted-knight',lvl:4,kind:'dash',el:'sacre',dmg:3,cd:10,dist:12,r:2.5,mount:1,
   desc:'Charge sur un destrier spectral en piétinant les ennemis.',
   runes:[{name:'Galop sans fin',desc:'Plus loin, et +30 % de vitesse 3 s.',mod:{dist:17,selfBuff:{ms:0.3},bdur:3}},
          {name:'Sabots ardents',desc:'Feu : laisse une traînée brûlante.',mod:{el:'feu',trail:1.2}},
          {name:'Destrier tonnant',desc:'Foudre : onde étourdissante à l\'arrivée.',mod:{el:'foudre',endNova:4,stun:1}}]},
  {id:'pal_bond',cls:'paladin',cat:'mobilite',name:'Bond Céleste',icon:'wing-cloak',lvl:16,kind:'dash',el:'phys',dmg:3.2,cd:8,dist:10,endNova:4,leap:1,
   desc:'Bondit sur la cible et frappe le sol à l\'arrivée.',
   runes:[{name:'Chute de comète',desc:'Feu : impact plus large et plus fort.',mod:{el:'feu',endNova:5.5,dmg:4.4}},
          {name:'Impact sismique',desc:'Ralentit les ennemis de 60 % 3 s.',mod:{slow:3}},
          {name:"Ailes d'or",desc:'Sacré : −25 % de dégâts subis 3 s.',mod:{el:'sacre',selfBuff:{dr:0.25},bdur:3}}]},
  {id:'pal_lanciers',cls:'paladin',cat:'zone',name:'Phalange Sacrée',icon:'spears',lvl:8,kind:'summon',el:'sacre',dmg:1.25,cd:20,unit:'lancier',count:3,dur:10,
   desc:'Invoque 3 lanciers sacrés pendant 10 s.',
   runes:[{name:"Archers de l'Aube",desc:'Invoque 3 archers qui tirent à distance.',mod:{unit:'archerlum'}},
          {name:'Garde éternelle',desc:'2 lanciers permanents.',mod:{count:2,dur:0,cd:8}},
          {name:'Lanciers ardents',desc:'Feu : plus de dégâts.',mod:{el:'feu',dmg:1.65}}]},
  {id:'pal_consecration',cls:'paladin',cat:'zone',name:'Sol Consacré',icon:'sunbeams',lvl:20,kind:'zone',el:'sacre',cd:14,r:6,zdur:6,zdps:1.6,at:'self',heal:0.02,
   desc:'Consacre le sol : brûle les ennemis et te soigne.',
   runes:[{name:'Terre brûlée',desc:'Feu : plus de dégâts.',mod:{el:'feu',zdps:2.3,heal:0}},
          {name:"Champ d'orage",desc:'Foudre : des éclairs frappent les ennemis dans la zone.',mod:{el:'foudre',bolts:1}},
          {name:'Cercle de foi',desc:'−15 % de dégâts subis pendant la durée.',mod:{selfBuff:{dr:0.15},bdur:6}}]},
  {id:'pal_ire',cls:'paladin',cat:'ultime',name:"Ire de l'Aube",icon:'sun-priest',lvl:14,kind:'buff',el:'sacre',cd:60,dur:15,buff:{dmg:0.5,as:0.1},
   desc:'Deviens un avatar de lumière : +50 % de dégâts et +10 % de vitesse d\'attaque 15 s.',
   runes:[{name:'Avatar ardent',desc:'Feu : une onde de feu (200 %) toutes les 2 s.',mod:{el:'feu',pulse:2}},
          {name:'Juge implacable',desc:'+15 % de chance de critique en plus.',mod:{buff:{dmg:0.5,as:0.1,crit:0.15}}},
          {name:'Sentinelle',desc:'Sacré : −35 % de dégâts subis et épines.',mod:{buff:{dmg:0.3,dr:0.35,thorns:1}}}]},
  {id:'pal_ciel',cls:'paladin',cat:'ultime',name:'Courroux Céleste',icon:'sun-spear',lvl:24,kind:'ground',el:'sacre',dmg:12,cd:30,r:7,delay:0.9,count:1,range:12,
   desc:'Une colonne de lumière écrase une large zone.',
   runes:[{name:'Colonne tonnante',desc:'Foudre : trois colonnes plus petites.',mod:{el:'foudre',count:3,r:4.5,dmg:5.5,spread:5}},
          {name:'Soleil noir',desc:'Feu : laisse un brasier 4 s.',mod:{el:'feu',zdur:4,zdps:3}},
          {name:'Lumière salvatrice',desc:'Te soigne de 40 %.',mod:{healSelf:0.4,dmg:10}}]},

  /* ===== Traqueuse ===== */
  {id:'tq_carreau',cls:'traqueuse',cat:'primaire',name:'Carreau Vif',icon:'crossbow',lvl:1,kind:'proj',el:'phys',dmg:2.9,gen:5,count:1,speed:22,range:13,
   desc:'Tire un carreau rapide. Génère de la Haine.',
   runes:[{name:'Carreau incendiaire',desc:'Feu : explose à l\'impact (rayon 2).',mod:{el:'feu',boom:2,dmg:1.4}},
          {name:'Givre-pointe',desc:'Froid : transperce et ralentit.',mod:{el:'froid',pierce:1,slow:2}},
          {name:'Carreau tonnant',desc:'Foudre : rebondit sur 2 ennemis.',mod:{el:'foudre',jumps:2}}]},
  {id:'tq_entaille',cls:'traqueuse',cat:'primaire',name:'Tir Rasant',icon:'fast-arrow',lvl:10,kind:'proj',el:'phys',dmg:1.9,gen:6,count:1,speed:20,pierce:1,range:13,
   desc:'Un tir perçant qui traverse les rangs.',
   runes:[{name:'Éventail',desc:'Trois tirs en éventail.',mod:{count:3,spread:40,dmg:0.75}},
          {name:'Ricochet',desc:'Foudre : rebondit sur 3 ennemis.',mod:{el:'foudre',pierce:0,jumps:3}},
          {name:'Saignée',desc:'Fait saigner (300 % sur 3 s).',mod:{dot:3,dotDur:3}}]},
  {id:'tq_salve',cls:'traqueuse',cat:'secondaire',name:'Salve Multiple',icon:'arrow-cluster',lvl:2,kind:'proj',el:'phys',dmg:2.5,cost:20,count:5,spread:60,speed:20,range:12,
   desc:'Une salve de 5 carreaux en éventail.',
   runes:[{name:'Salve glaciale',desc:'Froid : ralentit les ennemis.',mod:{el:'froid',slow:2}},
          {name:'Nuée de carreaux',desc:'9 carreaux, un peu moins forts.',mod:{count:9,spread:90,dmg:1.05}},
          {name:'Salve explosive',desc:'Feu : chaque carreau explose.',mod:{el:'feu',boom:1.8,dmg:1.3}}]},
  {id:'tq_trait',cls:'traqueuse',cat:'secondaire',name:'Trait Dévastateur',icon:'charged-arrow',lvl:12,kind:'proj',el:'phys',dmg:5.4,cost:24,count:1,speed:24,pierce:1,wide:1.4,range:14,
   desc:'Un énorme trait qui transperce tout sur son passage.',
   runes:[{name:'Trait foudroyant',desc:'Foudre : des arcs jaillissent sur 3 ennemis.',mod:{el:'foudre',jumps:3,dmg:3.9}},
          {name:'Trait gelé',desc:'Froid : gèle 1 s.',mod:{el:'froid',stun:1}},
          {name:'Trait de braise',desc:'Feu : laisse une traînée brûlante.',mod:{el:'feu',trail:1.5,dmg:3.8}}]},
  {id:'tq_voile',cls:'traqueuse',cat:'defense',name:"Voile d'Ombre",icon:'cloak-dagger',lvl:6,kind:'buff',el:'phys',cost:14,res2:1,cd:8,dur:3,buff:{dr:0.5,ms:0.3},
   desc:'Disparais dans l\'ombre : −50 % de dégâts subis et +30 % de vitesse 3 s.',
   runes:[{name:'Voile sanglant',desc:'+5 % de vol de vie pendant la durée.',mod:{buff:{dr:0.5,ms:0.3,ls:0.05}}},
          {name:'Voile durable',desc:'Dure 5 s.',mod:{dur:5}},
          {name:'Voile perfide',desc:'+25 % de dégâts pendant la durée.',mod:{buff:{dr:0.4,ms:0.3,dmg:0.25}}}]},
  {id:'tq_marque',cls:'traqueuse',cat:'defense',name:'Marque du Chasseur',icon:'bullseye',lvl:18,kind:'curse',el:'phys',cost:3,res2:1,cd:5,r:4,dur:8,vuln:0.2,range:13,
   desc:'Marque les ennemis : ils subissent +20 % de dégâts 8 s.',
   runes:[{name:'Marque de sang',desc:'Tes coups sur une cible marquée te soignent.',mod:{lsMark:0.02}},
          {name:'Marque contagieuse',desc:'La marque se propage à la mort de la cible.',mod:{spread:1}},
          {name:'Marque de traque',desc:'+30 % de dégâts subis et +15 % de vitesse pour toi.',mod:{vuln:0.3,selfBuff:{ms:0.15},bdur:8}}]},
  {id:'tq_saut',cls:'traqueuse',cat:'mobilite',name:'Bond Fuyant',icon:'jump-across',lvl:4,kind:'dash',el:'phys',dmg:0,cost:8,res2:1,cd:3,dist:8,away:1,
   desc:'Saute en arrière pour reprendre de la distance.',
   runes:[{name:'Bond explosif',desc:'Feu : laisse une bombe (300 %) au départ.',mod:{el:'feu',startNova:3,dmg:3}},
          {name:'Bond agile',desc:'Plus court mais sans recharge.',mod:{dist:6,cd:1}},
          {name:"Bond d'ombre",desc:'+25 % de dégâts 3 s après le bond.',mod:{selfBuff:{dmg:0.25},bdur:3}}]},
  {id:'tq_ruee',cls:'traqueuse',cat:'mobilite',name:'Ruée du Chasseur',icon:'sprint',lvl:16,kind:'dash',el:'phys',dmg:3.3,cost:10,res2:1,cd:6,dist:10,r:2,
   desc:'Fonce à travers les ennemis en les tailladant.',
   runes:[{name:'Ruée glaciale',desc:'Froid : ralentit les ennemis traversés.',mod:{el:'froid',slow:3}},
          {name:'Ruée tonnante',desc:'Foudre : onde à l\'arrivée.',mod:{el:'foudre',endNova:3.5,dmg:3}},
          {name:'Ruée vampirique',desc:'Rend 8 % de vie.',mod:{healSelf:0.08}}]},
  {id:'tq_piege',cls:'traqueuse',cat:'zone',name:'Pièges à Pointes',icon:'wolf-trap',lvl:8,kind:'trap',el:'phys',dmg:5.2,cost:18,cd:6,count:3,r:3,arm:0.8,range:10,
   desc:'Pose 3 pièges qui explosent au passage des ennemis.',
   runes:[{name:'Pièges incendiaires',desc:'Feu : brûlent aussi (300 % sur 3 s).',mod:{el:'feu',dot:3,dotDur:3}},
          {name:'Pièges gelants',desc:'Froid : ralentissent fortement.',mod:{el:'froid',slow:3}},
          {name:'Pièges en chaîne',desc:'Foudre : l\'explosion rebondit sur 3 ennemis.',mod:{el:'foudre',jumps:3}}]},
  {id:'tq_bete',cls:'traqueuse',cat:'zone',name:'Compagnon Fauve',icon:'wolf-head',lvl:20,kind:'summon',el:'phys',dmg:2.2,cd:10,unit:'fauve',count:1,dur:0,
   desc:'Un fauve fidèle combat à tes côtés (permanent).',
   runes:[{name:'Meute',desc:'Trois loups spectraux.',mod:{unit:'loupspectral',count:3,dmg:0.95}},
          {name:'Fauve guérisseur',desc:'Ses morsures te soignent.',mod:{petHeal:0.01}},
          {name:'Corbeau tonnant',desc:'Foudre : un corbeau qui frappe à distance.',mod:{unit:'corbeau',el:'foudre'}}]},
  {id:'tq_pluie',cls:'traqueuse',cat:'ultime',name:'Pluie de Carreaux',icon:'heavy-rain',lvl:14,kind:'ground',el:'phys',dmg:3.1,cost:32,count:7,r:2.4,delay:0.5,spread:4,range:12,
   desc:'Une pluie de carreaux s\'abat sur la zone.',
   runes:[{name:'Pluie de feu',desc:'Feu : laisse des flammes au sol.',mod:{el:'feu',zdur:2,zdps:1}},
          {name:'Grêle gelée',desc:'Froid : ralentit.',mod:{el:'froid',slow:2}},
          {name:'Frappe orbitale',desc:'Foudre : un seul impact énorme.',mod:{el:'foudre',count:1,r:5,dmg:12}}]},
  {id:'tq_vengeance',cls:'traqueuse',cat:'ultime',name:'Fureur de la Traque',icon:'wolf-howl',lvl:24,kind:'buff',el:'phys',cd:60,dur:15,buff:{dmg:0.4},volley:1,
   desc:'+40 % de dégâts 15 s, et des carreaux jaillissent autour de toi.',
   runes:[{name:'Fureur ardente',desc:'Feu : les carreaux explosent.',mod:{el:'feu',buff:{dmg:0.4},volleyBoom:1}},
          {name:'Sang-froid',desc:'+20 % de chance de critique.',mod:{buff:{dmg:0.3,crit:0.2}}},
          {name:'Instinct',desc:'−40 % de dégâts subis.',mod:{buff:{dmg:0.25,dr:0.4}}}]},

  /* ===== Shaman des Ossements ===== */
  {id:'sh_dard',cls:'shaman',cat:'primaire',name:'Dard Venimeux',icon:'thrown-daggers',lvl:1,kind:'proj',el:'poison',dmg:1.6,gen:0,count:1,speed:18,range:12,
   desc:'Souffle un dard empoisonné.',
   runes:[{name:'Triple dard',desc:'Trois dards en éventail.',mod:{count:3,spread:26,dmg:0.8}},
          {name:'Dard-scorpion',desc:'Transperce et ralentit.',mod:{pierce:1,slow:2}},
          {name:'Dard ardent',desc:'Feu : brûle (300 % sur 3 s).',mod:{el:'feu',dot:3,dotDur:3,dmg:1.2}}]},
  {id:'sh_crane',cls:'shaman',cat:'primaire',name:'Crâne de Braise',icon:'burning-skull',lvl:10,kind:'proj',el:'feu',dmg:1.45,gen:0,count:1,speed:13,boom:2.5,range:12,
   desc:'Lance un crâne enflammé qui explose.',
   runes:[{name:'Crâne hurlant',desc:'Étourdit 0,5 s.',mod:{stun:0.5}},
          {name:"Crâne d'ombre",desc:'Ombre : rebondit sur 2 ennemis.',mod:{el:'ombre',boom:0,jumps:2,dmg:1.7}},
          {name:'Crâne putride',desc:'Poison : laisse un nuage toxique.',mod:{el:'poison',zdur:2.5,zdps:0.9}}]},
  {id:'sh_nuee',cls:'shaman',cat:'secondaire',name:'Nuée Dévorante',icon:'fly',lvl:2,kind:'cone',el:'poison',dmg:0.6,cost:28,angle:55,range:8,dot:4.6,dotDur:4,
   desc:'Une nuée d\'insectes dévore les ennemis devant toi (460 % sur 4 s).',
   runes:[{name:'Nuée contagieuse',desc:'Se propage aux ennemis proches à la mort.',mod:{spread:1}},
          {name:'Nuée ardente',desc:'Feu : plus de dégâts.',mod:{el:'feu',dot:5.4}},
          {name:"Nuée d'ombres",desc:'Ombre : ralentit et maudit.',mod:{el:'ombre',slow:3,vuln:0.1}}]},
  {id:'sh_fosse',cls:'shaman',cat:'secondaire',name:'Fosse Putride',icon:'poison-cloud',lvl:12,kind:'zone',el:'poison',cost:32,r:4,zdur:4,zdps:2.4,at:'target',range:11,
   desc:'Ouvre une fosse d\'acide sous les ennemis.',
   runes:[{name:'Fosse profonde',desc:'Plus large et plus longue.',mod:{r:5.5,zdur:6,zdps:2}},
          {name:'Fosse ardente',desc:'Feu : brûle plus fort.',mod:{el:'feu',zdps:3}},
          {name:"Fosse d'ombre",desc:'Ombre : ralentit les ennemis.',mod:{el:'ombre',slowZone:1}}]},
  {id:'sh_marche',cls:'shaman',cat:'defense',name:'Marche des Âmes',icon:'ghost',lvl:6,kind:'buff',el:'ombre',cd:12,dur:2.5,buff:{dr:0.6,ms:0.5},ghost:1,
   desc:'Passe dans le monde des esprits : −60 % de dégâts, +50 % de vitesse 2,5 s.',
   runes:[{name:'Pas de braise',desc:'Feu : laisse une traînée brûlante.',mod:{el:'feu',trail:1}},
          {name:'Âme régénérante',desc:'Rend 20 % de vie.',mod:{healSelf:0.2}},
          {name:'Errance',desc:'Dure 4 s.',mod:{dur:4}}]},
  {id:'sh_malediction',cls:'shaman',cat:'defense',name:'Malédiction du Marais',icon:'cursed-star',lvl:18,kind:'curse',el:'ombre',cost:20,cd:8,r:6,dur:8,vuln:0.2,slow:0.3,range:11,
   desc:'Maudit une zone : +20 % de dégâts subis et ralentissement 8 s.',
   runes:[{name:'Malédiction de ruine',desc:'+30 % de dégâts subis.',mod:{vuln:0.3}},
          {name:'Malédiction sanglante',desc:'Tes coups sur les maudits te soignent.',mod:{lsMark:0.015}},
          {name:'Malédiction putride',desc:'Poison : empoisonne aussi (400 % sur 8 s).',mod:{el:'poison',dot:4,dotDur:8}}]},
  {id:'sh_corbeaux',cls:'shaman',cat:'mobilite',name:'Envol de Corbeaux',icon:'raven',lvl:4,kind:'dash',el:'ombre',dmg:2,cd:8,dist:10,r:3,
   desc:'Te disperses en corbeaux et réapparais plus loin en lacérant.',
   runes:[{name:'Corbeaux ardents',desc:'Feu : plus de dégâts.',mod:{el:'feu',dmg:2.8}},
          {name:'Corbeaux de peste',desc:'Poison : empoisonne (300 % sur 3 s).',mod:{el:'poison',dot:3,dotDur:3}},
          {name:'Vol rapide',desc:'Recharge 4 s.',mod:{cd:4,dmg:1.4}}]},
  {id:'sh_ancetres',cls:'shaman',cat:'mobilite',name:'Pas des Ancêtres',icon:'totem-mask',lvl:16,kind:'dash',el:'poison',dmg:2.6,cd:10,dist:14,endNova:4,
   desc:'Les ancêtres te portent jusqu\'aux ennemis et libèrent une onde toxique.',
   runes:[{name:'Onde de cendre',desc:'Feu : onde plus forte.',mod:{el:'feu',dmg:3.4}},
          {name:'Rappel des ancêtres',desc:'Ombre : ralentit 3 s.',mod:{el:'ombre',slow:3}},
          {name:'Pas furtif',desc:'Recharge 5 s.',mod:{cd:5,dmg:1.8}}]},
  {id:'sh_gardiens',cls:'shaman',cat:'zone',name:"Gardiens d'Os",icon:'raise-zombie',lvl:8,kind:'summon',el:'phys',dmg:1.0,cd:6,unit:'gardien',count:3,dur:0,
   desc:'Trois petits gardiens d\'os te suivent et mordent (permanents).',
   runes:[{name:'Gardiens ardents',desc:'Feu : morsures brûlantes.',mod:{el:'feu',dmg:1.2}},
          {name:'Gardiens vampires',desc:'Leurs morsures te soignent.',mod:{petHeal:0.005}},
          {name:"Meute d'os",desc:'Quatre gardiens.',mod:{count:4,dmg:0.85}}]},
  {id:'sh_colosse',cls:'shaman',cat:'zone',name:"Colosse d'Ossements",icon:'giant',lvl:20,kind:'summon',el:'phys',dmg:3.2,cd:12,unit:'colosse',count:1,dur:0,
   desc:'Invoque un colosse d\'os (permanent).',
   runes:[{name:'Colosse furieux',desc:'Frappe le sol régulièrement (onde).',mod:{petSlam:1}},
          {name:'Colosse de peste',desc:'Poison : aura toxique.',mod:{el:'poison',petAura:1,dmg:2.8}},
          {name:'Colosse ancien',desc:'Plus fort mais plus lent à revenir.',mod:{dmg:4.4,cd:30}}]},
  {id:'sh_esprits',cls:'shaman',cat:'ultime',name:"Ouragan d'Esprits",icon:'spark-spirit',lvl:14,kind:'proj',el:'ombre',dmg:1.5,cd:20,cost:40,count:10,spread:360,speed:11,homing:1,range:14,
   desc:'Libère 10 esprits qui traquent les ennemis.',
   runes:[{name:'Tourment',desc:'Les esprits forment un tourbillon au sol.',mod:{kind:'zone',at:'target',r:4.5,zdur:5,zdps:2.4}},
          {name:'Esprits voraces',desc:'Chaque esprit rend du mana.',mod:{gainHit:3}},
          {name:'Âmes en chaîne',desc:'Chaque esprit rebondit une fois.',mod:{jumps:1,count:8}}]},
  {id:'sh_rite',cls:'shaman',cat:'ultime',name:'Grand Rite',icon:'totem',lvl:24,kind:'buff',el:'ombre',cd:60,dur:15,buff:{dmg:0.3,as:0.2},petBuff:1,
   desc:'Danse rituelle : +30 % de dégâts, +20 % de vitesse d\'attaque, et tes invocations ×2 pendant 15 s.',
   runes:[{name:'Rite de feu',desc:'Feu : une onde de feu (200 %) toutes les 2 s.',mod:{el:'feu',pulse:2}},
          {name:'Rite de vie',desc:'Rend 3 % de vie par seconde.',mod:{buff:{dmg:0.3,as:0.2,regen:0.03}}},
          {name:'Rite des morts',desc:'Invocations ×3 au lieu de ×2.',mod:{petBuff:2}}]}
],

/* ---------------- Invocations ---------------- */
UNITS:{
  lancier:{name:'Lancier sacré',model:'lancier',color:0xffe39a,range:2.4,speed:6,rate:1.0},
  archerlum:{name:"Archer de l'Aube",model:'lancier',color:0xfff2c0,range:9,speed:6,rate:1.2,ranged:1},
  fauve:{name:'Fauve',model:'fauve',color:0x8a6a4a,range:2,speed:8,rate:0.9},
  loupspectral:{name:'Loup spectral',model:'fauve',color:0x7fd8ff,range:2,speed:8,rate:0.9,ghost:1},
  corbeau:{name:'Corbeau tonnant',model:'corbeau',color:0x3a3a5a,range:8,speed:9,rate:1,ranged:1,fly:1},
  gardien:{name:"Gardien d'os",model:'gardien',color:0xe8dcc0,range:1.8,speed:7,rate:0.8},
  colosse:{name:"Colosse d'os",model:'colosse',color:0xd8ccb0,range:3,speed:5,rate:1.6,big:1},
  clone:{name:'Double',model:'hero',color:0x7a50ff,range:2.5,speed:8,rate:0.6,ghost:1},
  esprit:{name:'Esprit',model:'esprit',color:0xb36bff,range:1.5,speed:10,rate:0.5,fly:1,ghost:1}
},

/* ---------------- Emplacements d'équipement ---------------- */
SLOTS:[
  {id:'tete',n:'Tête',icon:'visored-helm'},{id:'epaules',n:'Épaules',icon:'shoulder-armor'},{id:'torse',n:'Torse',icon:'chest-armor'},
  {id:'mains',n:'Mains',icon:'gauntlet'},{id:'poignets',n:'Poignets',icon:'bracers'},{id:'taille',n:'Taille',icon:'belt'},
  {id:'jambes',n:'Jambes',icon:'armored-pants'},{id:'pieds',n:'Pieds',icon:'boots'},{id:'amulette',n:'Amulette',icon:'gem-pendant'},
  {id:'anneau1',n:'Anneau',icon:'diamond-ring',type:'anneau'},{id:'anneau2',n:'Anneau',icon:'diamond-ring',type:'anneau'},
  {id:'arme',n:'Arme',icon:'broadsword'},{id:'offhand',n:'Main gauche',icon:'shield'}
],
/* Types d'objets : nom de base, icône, et pour les armes la vitesse d'attaque */
BASES:{
  tete:{names:['Heaume','Capuche','Masque','Couronne','Casque'],icon:'visored-helm',armor:1},
  epaules:{names:['Spallières','Épaulières','Mantelet'],icon:'shoulder-armor',armor:0.9},
  torse:{names:['Cuirasse','Brigandine','Robe','Plastron'],icon:'chest-armor',armor:1.4},
  mains:{names:['Gantelets','Gants','Mitaines'],icon:'gauntlet',armor:0.7},
  poignets:{names:['Brassards','Canons','Bracelets'],icon:'bracers',armor:0.6},
  taille:{names:['Ceinturon','Ceinture','Cordelière'],icon:'belt',armor:0.6},
  jambes:{names:['Jambières','Cuissards','Chausses'],icon:'armored-pants',armor:1.1},
  pieds:{names:['Bottes','Solerets','Sandales'],icon:'boots',armor:0.8},
  amulette:{names:['Amulette','Pendentif','Talisman'],icon:'gem-pendant',armor:0},
  anneau:{names:['Anneau','Chevalière','Bague'],icon:'diamond-ring',armor:0},
  epee:{names:['Épée','Lame','Glaive'],icon:'broadsword',weapon:1,aps:1.4,cls:'paladin'},
  fleau:{names:['Fléau','Étoile du matin'],icon:'flail',weapon:1,aps:1.15,dmgMul:1.15,cls:'paladin'},
  masse:{names:['Masse','Marteau'],icon:'flanged-mace',weapon:1,aps:1.2,dmgMul:1.1,cls:'paladin'},
  arbalete:{names:['Arbalète de poing','Arbalète'],icon:'crossbow',weapon:1,aps:1.6,dmgMul:0.95,cls:'traqueuse'},
  dague:{names:['Dague rituelle','Athamé'],icon:'sacrificial-dagger',weapon:1,aps:1.4,cls:'shaman'},
  baton:{names:["Bâton d'os",'Sceptre'],icon:'skull-staff',weapon:1,aps:1.1,dmgMul:1.2,cls:'shaman'},
  bouclier:{names:['Bouclier','Pavois','Écu'],icon:'shield',armor:1.3,cls:'paladin'},
  carquois:{names:['Carquois'],icon:'quiver',armor:0.3,cls:'traqueuse'},
  fetiche:{names:['Fétiche','Totem de poing','Grigri'],icon:'totem-head',armor:0.3,cls:'shaman'}
},

/* ---------------- Affixes ----------------
   v = valeur au niveau 70 [min,max]. scale:'lvl' = proportionnel au niveau de l'objet (stats), sinon fixe (pourcentages).
   slots = emplacements où l'affixe peut apparaître ('*' = tous). prim = affixe principal (sinon secondaire) */
AFFIXES:{
  main:{n:'{v} {main}',v:[500,650],scale:'lvl',slots:'*',prim:1},
  vit:{n:'{v} Vitalité',v:[500,650],scale:'lvl',slots:'*',prim:1},
  armor:{n:'{v} Armure',v:[500,600],scale:'lvl',slots:['tete','epaules','torse','mains','poignets','taille','jambes','pieds','offhand','amulette'],prim:1},
  allres:{n:'{v} Toutes les résistances',v:[90,110],scale:'lvl',slots:['tete','epaules','torse','poignets','taille','jambes','pieds','amulette','anneau','offhand'],prim:1},
  chc:{n:'+{v} % de chance de critique',v:[8,10],slots:['tete','mains','poignets','amulette','anneau','offhand'],prim:1,pct:1},
  chd:{n:'+{v} % de dégâts critiques',v:[40,50],slots:['mains','amulette','anneau','arme'],prim:1,pct:1},
  ias:{n:"+{v} % de vitesse d'attaque",v:[5,7],slots:['mains','amulette','anneau','arme'],prim:1,pct:1},
  cdr:{n:'−{v} % de temps de recharge',v:[5,8],slots:['epaules','mains','anneau','amulette','arme','offhand','tete'],prim:1,pct:1},
  rcr:{n:'−{v} % de coût des compétences',v:[5,8],slots:['epaules','anneau','amulette','arme','offhand','tete'],prim:1,pct:1},
  elem:{n:'+{v} % de dégâts {el}',v:[15,20],slots:['poignets','amulette','offhand'],prim:1,pct:1},
  skill:{n:'+{v} % de dégâts de {sk}',v:[10,15],slots:['tete','epaules','torse','pieds','offhand'],prim:1,pct:1},
  wdmg:{n:"+{v} % de dégâts de l'arme",v:[15,25],slots:['arme'],prim:1,pct:1},
  area:{n:'+{v} % de dégâts de zone',v:[15,20],slots:['mains','anneau','amulette','epaules','offhand'],prim:1,pct:1},
  lifeP:{n:'+{v} % de vie',v:[10,15],slots:['torse','epaules','jambes','amulette','offhand','tete'],prim:1,pct:1},
  elite:{n:'+{v} % de dégâts contre les élites',v:[6,10],slots:['poignets','arme','anneau','offhand'],prim:1,pct:1},
  socket:{n:'Emplacement de gemme',v:[1,1],slots:['tete','torse','jambes','arme'],prim:1,once:1},
  /* secondaires */
  ls:{n:'+{v} % de vol de vie',v:[1,2],slots:['arme','amulette','anneau','mains'],pct:1},
  loh:{n:'+{v} vie par coup',v:[2000,3500],scale:'lvl',slots:'*'},
  regen:{n:'+{v} vie par seconde',v:[3000,5000],scale:'lvl',slots:'*'},
  gold:{n:"+{v} % d'or trouvé",v:[15,25],slots:'*',pct:1},
  pickup:{n:'+{v} m de rayon de ramassage',v:[1,2],slots:'*'},
  mdr:{n:'−{v} % de dégâts de mêlée subis',v:[5,8],slots:'*',pct:1},
  rdr:{n:'−{v} % de dégâts à distance subis',v:[5,8],slots:'*',pct:1},
  ms:{n:'+{v} % de vitesse de déplacement',v:[10,12],slots:['pieds'],pct:1},
  thorns:{n:'+{v} épines',v:[3000,6000],scale:'lvl',slots:'*'},
  xpk:{n:"+{v} % d'expérience",v:[5,10],slots:'*',pct:1}
},
RARITIES:{
  c:{n:'Commun',css:'#b8b8b8',c:0xb8b8b8,prim:1,sec:0,beam:2.5},
  m:{n:'Magique',css:'#6a9bff',c:0x6a9bff,prim:2,sec:0,beam:3.5},
  r:{n:'Rare',css:'#f2d14b',c:0xf2d14b,prim:3,sec:1,beam:5},
  l:{n:'Légendaire',css:'#ff8a2e',c:0xff8a2e,prim:4,sec:1,beam:10},
  s:{n:'Set',css:'#3ee07a',c:0x3ee07a,prim:4,sec:1,beam:10}
},
NAME_PARTS:{
  magic:['vif','robuste','ardent','acéré','béni','sombre','runique','farouche','lustré','gravé'],
  rare:["de l'Aurore Cendrée",'du Dernier Rempart','des Cendres Vives','de la Lune Noire','du Serment Brisé','des Braises Lentes',
        "de l'Ost Perdu",'du Veilleur','de la Tempête Grise','des Murmures','du Sang-Froid','de la Marée Sombre','du Pèlerin','des Ronces']
},

/* ---------------- Légendaires ----------------
   cls:null = générique (toutes classes). fuse = active la fusion indiquée tant que l'objet est porté. */
LEGENDARIES:[
  /* --- génériques --- */
  {id:'g_double',name:'Couronne du Double',slot:'tete',cls:null,text:'Chaque compétence de mobilité crée un double de toi qui combat 4 s (60 % de tes dégâts).',fx:[{t:'cloneOnDash',dur:4,m:0.6}]},
  {id:'g_etoile',name:"Cœur d'Étoile",slot:'amulette',cls:null,text:'Toutes les 6 s, un météore (800 % feu) s\'écrase sur l\'ennemi le plus proche.',fx:[{t:'periodic',every:6,do:'meteor',m:8,el:'feu'}]},
  {id:'g_remanence',name:'Brassards de Rémanence',slot:'poignets',cls:null,text:'Après une compétence de mobilité, −35 % de dégâts subis pendant 4 s.',fx:[{t:'buffOnCast',on:'cat:mobilite',buff:{dr:0.35},dur:4}]},
  {id:'g_moisson',name:'Ceinture de la Moisson',slot:'taille',cls:null,text:'Chaque ennemi tué rend 2 % de vie et a 20 % de chances d\'exploser (300 %).',fx:[{t:'onKill',ch:1,do:'heal',m:0.02},{t:'onKill',ch:0.2,do:'explode',m:3}]},
  {id:'g_alliances',name:'Anneau des Alliances Brisées',slot:'anneau',cls:null,text:'Réduit de 1 le nombre de pièces nécessaires pour chaque bonus de set (minimum 2). Idéal pour mélanger deux demi-sets.',fx:[{t:'setReduce'}]},
  {id:'g_echo',name:"Anneau de l'Écho",slot:'anneau',cls:null,text:'Tes compétences (sauf ultimes) ont 15 % de chances de se lancer deux fois.',fx:[{t:'doubleCast',skill:'*',ch:0.15}]},
  {id:'g_tempete',name:'Bottes de la Tempête',slot:'pieds',cls:null,text:'Toutes les 1,5 s, un éclair (300 % foudre) frappe un ennemi proche et rebondit.',fx:[{t:'periodic',every:1.5,do:'chain',m:3,el:'foudre'},{t:'stat',s:{ms:0.05}}]},
  {id:'g_premiersang',name:'Gantelets du Premier Sang',slot:'mains',cls:null,text:'+40 % de dégâts contre les élites et les boss.',fx:[{t:'eliteDmg',m:1.4}]},
  {id:'g_gardien',name:'Épaulières du Gardien',slot:'epaules',cls:null,text:'Sous 40 % de vie, tu subis 50 % de dégâts en moins.',fx:[{t:'lowHpDr',below:0.4,dr:0.5}]},
  {id:'g_pelerin',name:'Jambières du Pèlerin',slot:'jambes',cls:null,text:'Toutes les 6 s, attire les ennemis proches vers toi. +20 % de dégâts de zone.',fx:[{t:'periodic',every:6,do:'pull',m:0},{t:'stat',s:{area:0.2}}]},
  {id:'g_braises',name:'Torse des Braises',slot:'torse',cls:null,text:'Tes épines sont triplées et une onde de feu (200 %) part de toi toutes les 3 s.',fx:[{t:'stat',s:{thornsM:2}},{t:'periodic',every:3,do:'nova',m:2,el:'feu'}]},
  {id:'g_souffle',name:'Amulette du Dernier Souffle',slot:'amulette',cls:null,text:'Un coup mortel te laisse en vie et rend 50 % de vie (une fois toutes les 60 s).',fx:[{t:'cheatDeath',cd:60,heal:0.5}]},
  {id:'g_convergence',name:'Anneau de la Convergence',slot:'anneau',cls:null,text:'Toutes les 12 s, +150 % de dégâts pendant 4 s.',fx:[{t:'periodicBuff',every:12,buff:{dmg:1.5},dur:4}]},
  {id:'g_ames',name:'Fléau des Âmes',slot:'arme',cls:null,text:'Tes coups ont 20 % de chances de libérer un esprit chercheur (250 % ombre).',fx:[{t:'onHit',on:'*',ch:0.2,do:'spirit',m:2.5}]},
  {id:'g_vigilance',name:'Heaume de Vigilance',slot:'tete',cls:null,text:'−12 % de temps de recharge. Chaque ennemi tué réduit tes recharges de 0,3 s.',fx:[{t:'stat',s:{cdr:0.12}},{t:'onKill',ch:1,do:'cdr',m:0.3}]},
  {id:'g_collecteur',name:'Gants du Collecteur',slot:'mains',cls:null,text:'+3 m de ramassage, +50 % d\'or, et chaque ennemi tué rend de la ressource.',fx:[{t:'stat',s:{pickup:3,gold:0.5}},{t:'onKill',ch:1,do:'resource',m:4}]},

  /* --- Paladin de l'Aube --- */
  {id:'p_lanceaube',name:'Lance-Aube',slot:'arme',cls:'paladin',text:'Frappe de l\'Aube frappe 2 fois de plus et inflige ×1,5 dégâts.',fx:[{t:'extra',skill:'pal_frappe',add:{hits:2}},{t:'skillDmg',skill:'pal_frappe',m:1.5}]},
  {id:'p_couchant',name:'Égide du Couchant',slot:'offhand',cls:'paladin',text:'Bouclier Béni rebondit 4 fois de plus et inflige ×2 dégâts.',fx:[{t:'extra',skill:'pal_bouclier',add:{jumps:4}},{t:'skillDmg',skill:'pal_bouclier',m:2}]},
  {id:'p_fers',name:'Fers du Destrier Spectral',slot:'pieds',cls:'paladin',text:'Fusionne Charge du Destrier et Bouclier Béni (Égide Galopante).',fuse:'pf_egide',fx:[]},
  {id:'p_tonnerre',name:'Marteau-Tonnerre',slot:'arme',cls:'paladin',text:'Marteau du Jugement fait tomber 2 marteaux de plus et inflige ×1,75 dégâts.',fx:[{t:'extra',skill:'pal_marteau',add:{count:2,spread:3}},{t:'skillDmg',skill:'pal_marteau',m:1.75}]},
  {id:'p_sentence',name:'Gantelets de Sentence',slot:'mains',cls:'paladin',text:'Sentence attire toujours les ennemis et inflige ×3 dégâts.',fx:[{t:'extra',skill:'pal_sentence',add:{pull:1}},{t:'skillDmg',skill:'pal_sentence',m:3}]},
  {id:'p_heaume',name:'Heaume des Lanciers',slot:'tete',cls:'paladin',text:'Phalange Sacrée invoque 2 combattants de plus.',fx:[{t:'extra',skill:'pal_lanciers',add:{count:2}}]},
  {id:'p_cape',name:'Cape de Lumière Vive',slot:'torse',cls:'paladin',text:'Rempart de Lumière dure 2 fois plus longtemps et donne +50 % de dégâts.',fx:[{t:'extra',skill:'pal_rempart',add:{dur:6}},{t:'buffOnCast',on:'pal_rempart',buff:{dmg:0.5},dur:12}]},
  {id:'p_brassards',name:"Brassards de l'Aube",slot:'poignets',cls:'paladin',text:'Sol Consacré te suit et inflige ×2 dégâts.',fx:[{t:'extra',skill:'pal_consecration',add:{follow:1}},{t:'skillDmg',skill:'pal_consecration',m:2}]},
  {id:'p_zelote',name:'Ceinturon du Zélote',slot:'taille',cls:'paladin',text:'Chaque ennemi touché par Charge du Destrier réduit toutes tes recharges de 0,5 s.',fx:[{t:'cdrOnHit',on:'pal_charge',skill:'*',s:0.5}]},
  {id:'p_pelerin',name:'Jambières de Foi-Ardente',slot:'jambes',cls:'paladin',text:'Frappe de l\'Aube a 10 % de chances de réinitialiser Bond Céleste. Bond Céleste ×2.',fx:[{t:'reset',on:'pal_frappe',skill:'pal_bond',ch:0.1},{t:'skillDmg',skill:'pal_bond',m:2}]},
  {id:'p_repentant',name:'Fléau Repentant',slot:'arme',cls:'paladin',text:'Lame Juste revient toujours vers toi et inflige ×2 dégâts.',fx:[{t:'extra',skill:'pal_lame',add:{ret:1}},{t:'skillDmg',skill:'pal_lame',m:2}]},
  {id:'p_zenith',name:'Couronne du Zénith',slot:'tete',cls:'paladin',text:'Courroux Céleste se recharge 15 s plus vite et inflige ×2 dégâts.',fx:[{t:'extra',skill:'pal_ciel',add:{cd:-15}},{t:'skillDmg',skill:'pal_ciel',m:2}]},
  {id:'p_phalange',name:'Épaulières de la Phalange',slot:'epaules',cls:'paladin',text:'Fusionne Phalange Sacrée et Sentence (Verdict de la Garde).',fuse:'pf_garde',fx:[]},
  {id:'p_epines',name:'Bouclier des Épines Vives',slot:'offhand',cls:'paladin',text:'Frappe de l\'Aube inflige en plus 100 % de tes épines. Épines ×2.',fx:[{t:'thornsHit',skill:['pal_frappe'],m:1},{t:'stat',s:{thornsM:1}}]},
  {id:'p_sceau',name:"Sceau de l'Aube",slot:'amulette',cls:'paladin',text:'Dégâts sacrés ×1,4. Ire de l\'Aube dure 5 s de plus.',fx:[{t:'elemDmg',el:'sacre',m:1.4},{t:'extra',skill:'pal_ire',add:{dur:5}}]},
  {id:'p_martele',name:'Masse de la Lumière Martelée',slot:'arme',cls:'paladin',text:'Fusionne Marteau du Jugement et Sol Consacré (Lumière Martelée).',fuse:'pf_martele',fx:[]},

  /* --- Traqueuse --- */
  {id:'t_hibou',name:'Arbalète du Hibou Gris',slot:'arme',cls:'traqueuse',text:'Carreau Vif tire 2 carreaux de plus.',fx:[{t:'extra',skill:'tq_carreau',add:{count:2,spread:20}}]},
  {id:'t_millepointes',name:'Carquois des Mille Pointes',slot:'offhand',cls:'traqueuse',text:'Salve Multiple tire 4 carreaux de plus et inflige ×2 dégâts.',fx:[{t:'extra',skill:'tq_salve',add:{count:4}},{t:'skillDmg',skill:'tq_salve',m:2}]},
  {id:'t_piegeur',name:'Gants du Piégeur Fou',slot:'mains',cls:'traqueuse',text:'Fusionne Pluie de Carreaux et Pièges à Pointes (Champ de Mines).',fuse:'tf_mines',fx:[]},
  {id:'t_bondissantes',name:'Bottes Bondissantes',slot:'pieds',cls:'traqueuse',text:'Bond Fuyant ne coûte plus de Discipline et crée un double 4 s.',fx:[{t:'extra',skill:'tq_saut',add:{cost:-8}},{t:'cloneOnDash',on:'tq_saut',dur:4,m:0.6}]},
  {id:'t_capuche',name:'Capuche du Traqueur',slot:'tete',cls:'traqueuse',text:'Marque du Chasseur touche une zone beaucoup plus large (+6 m) et dure 4 s de plus.',fx:[{t:'extra',skill:'tq_marque',add:{r:6,dur:4}}]},
  {id:'t_croc',name:'Collier de Croc-Fauve',slot:'amulette',cls:'traqueuse',text:'Tes bêtes infligent ×3 dégâts.',fx:[{t:'skillDmg',skill:'tq_bete',m:3}]},
  {id:'t_givre',name:'Brassards du Givre-Traque',slot:'poignets',cls:'traqueuse',text:'Dégâts de froid ×1,5.',fx:[{t:'elemDmg',el:'froid',m:1.5}]},
  {id:'t_embuscade',name:"Ceinture d'Embuscade",slot:'taille',cls:'traqueuse',text:'Pièges à Pointes pose 2 pièges de plus, armés instantanément.',fx:[{t:'extra',skill:'tq_piege',add:{count:2,arm:-0.8}}]},
  {id:'t_comete',name:'Trait-Comète',slot:'arme',cls:'traqueuse',text:'Trait Dévastateur fait exploser chaque ennemi touché (150 %) et inflige ×1,6 dégâts.',fx:[{t:'onHit',on:'tq_trait',ch:1,do:'explode',m:1.5},{t:'skillDmg',skill:'tq_trait',m:1.6}]},
  {id:'t_ombrevive',name:"Torse de l'Ombre Vive",slot:'torse',cls:'traqueuse',text:"Voile d'Ombre dure 2 s de plus et donne +60 % de dégâts.",fx:[{t:'extra',skill:'tq_voile',add:{dur:2}},{t:'buffOnCast',on:'tq_voile',buff:{dmg:0.6},dur:5}]},
  {id:'t_ruee',name:'Jambières de la Ruée',slot:'jambes',cls:'traqueuse',text:'Ruée du Chasseur inflige ×4 dégâts et chaque ennemi touché réduit sa recharge de 0,5 s.',fx:[{t:'skillDmg',skill:'tq_ruee',m:4},{t:'cdrOnHit',on:'tq_ruee',skill:'tq_ruee',s:0.5}]},
  {id:'t_pluienoire',name:'Épaulières de Pluie Noire',slot:'epaules',cls:'traqueuse',text:'Pluie de Carreaux coûte 50 % de moins et inflige ×2 dégâts.',fx:[{t:'extra',skill:'tq_pluie',add:{cost:-16}},{t:'skillDmg',skill:'tq_pluie',m:2}]},
  {id:'t_tonnerre',name:'Arbalète Tonnerre-Cri',slot:'arme',cls:'traqueuse',text:'Tes carreaux de foudre rebondissent 3 fois de plus. Foudre ×1,4.',fx:[{t:'extra',skill:'tq_carreau',add:{jumps:3}},{t:'elemDmg',el:'foudre',m:1.4}]},
  {id:'t_braise',name:'Carquois de Braise',slot:'offhand',cls:'traqueuse',text:'Fusionne Carreau Vif et Pièges à Pointes (Écho des Lames).',fuse:'tf_echo',fx:[]},
  {id:'t_lunes',name:'Pendentif des Deux Lunes',slot:'amulette',cls:'traqueuse',text:'Fureur de la Traque dure 10 s de plus.',fx:[{t:'extra',skill:'tq_vengeance',add:{dur:10}}]},
  {id:'t_meute',name:'Gants de la Meute Vengeresse',slot:'mains',cls:'traqueuse',text:'Fusionne Compagnon Fauve et Marque du Chasseur (Meute Vengeresse).',fuse:'tf_meute',fx:[]},

  /* --- Shaman des Ossements --- */
  {id:'s_milledards',name:'Dague des Mille Dards',slot:'arme',cls:'shaman',text:'Dard Venimeux tire 2 dards de plus et inflige ×2 dégâts.',fx:[{t:'extra',skill:'sh_dard',add:{count:2,spread:20}},{t:'skillDmg',skill:'sh_dard',m:2}]},
  {id:'s_colosse',name:'Fétiche du Colosse',slot:'offhand',cls:'shaman',text:"Colosse d'Ossements : un colosse de plus, et ×2 dégâts.",fx:[{t:'extra',skill:'sh_colosse',add:{count:1}},{t:'skillDmg',skill:'sh_colosse',m:2}]},
  {id:'s_ancetres',name:'Masque des Ancêtres',slot:'tete',cls:'shaman',text:"Gardiens d'Os : 2 gardiens de plus.",fx:[{t:'extra',skill:'sh_gardiens',add:{count:2}}]},
  {id:'s_nuee',name:'Gants de la Nuée',slot:'mains',cls:'shaman',text:'Nuée Dévorante se propage toujours aux ennemis proches et inflige ×2 dégâts.',fx:[{t:'extra',skill:'sh_nuee',add:{spread:1}},{t:'skillDmg',skill:'sh_nuee',m:2}]},
  {id:'s_cranes',name:'Collier des Crânes Chantants',slot:'amulette',cls:'shaman',text:'Crâne de Braise se lance toujours deux fois.',fx:[{t:'doubleCast',skill:'sh_crane',ch:1}]},
  {id:'s_lies',name:'Ceinture des Esprits Liés',slot:'taille',cls:'shaman',text:"Ouragan d'Esprits se recharge 10 s plus vite et lance 6 esprits de plus.",fx:[{t:'extra',skill:'sh_esprits',add:{cd:-10,count:6}}]},
  {id:'s_funebre',name:'Bottes de la Marche Funèbre',slot:'pieds',cls:'shaman',text:'Marche des Âmes dure 2 s de plus et laisse une traînée de poison.',fx:[{t:'extra',skill:'sh_marche',add:{dur:2}},{t:'zoneOn',on:'sh_marche',at:'path',r:2,dur:3,dps:1.2,el:'poison'}]},
  {id:'s_marais',name:'Robe du Marais',slot:'torse',cls:'shaman',text:'Toutes les 4 s, maudit automatiquement les ennemis autour de toi (+20 % de dégâts subis).',fx:[{t:'periodic',every:4,do:'curse',m:0.2}]},
  {id:'s_rite',name:'Brassards du Rite',slot:'poignets',cls:'shaman',text:'Grand Rite dure 10 s de plus.',fx:[{t:'extra',skill:'sh_rite',add:{dur:10}}]},
  {id:'s_fosse',name:'Jambières de la Fosse',slot:'jambes',cls:'shaman',text:'Fosse Putride est plus large (+2 m) et inflige ×2 dégâts.',fx:[{t:'extra',skill:'sh_fosse',add:{r:2}},{t:'skillDmg',skill:'sh_fosse',m:2}]},
  {id:'s_corbeau',name:'Épaulières du Corbeau',slot:'epaules',cls:'shaman',text:'Envol de Corbeaux inflige ×3 dégâts et a 30 % de chances de se recharger instantanément.',fx:[{t:'skillDmg',skill:'sh_corbeaux',m:3},{t:'reset',on:'sh_corbeaux',skill:'sh_corbeaux',ch:0.3}]},
  {id:'s_peste',name:'Sceptre de Peste',slot:'arme',cls:'shaman',text:'Dégâts de poison et sur la durée ×1,5.',fx:[{t:'elemDmg',el:'poison',m:1.5},{t:'dotMult',m:1.5}]},
  {id:'s_braise',name:'Fétiche de Braise',slot:'offhand',cls:'shaman',text:'Fusionne Crâne de Braise et Fosse Putride (Fosse aux Crânes).',fuse:'sf_cranes',fx:[]},
  {id:'s_manes',name:'Fétiche des Mânes',slot:'offhand',cls:'shaman',text:"Fusionne Gardiens d'Os et Malédiction du Marais (Rage Contagieuse).",fuse:'sf_rage',fx:[]},
  {id:'s_ossuaire',name:"Couronne de l'Ossuaire",slot:'tete',cls:'shaman',text:'Tes invocations infligent ×2 dégâts.',fx:[{t:'skillDmg',skill:'pets',m:2}]},
  {id:'s_essaim',name:"Amulette de l'Essaim",slot:'amulette',cls:'shaman',text:'Fusionne Colosse d\'Ossements et Nuée Dévorante (Colosse Pestilentiel).',fuse:'sf_peste',fx:[]}
],

/* ---------------- Sets (bonus à 2, 4 et 6 pièces) ---------------- */
SETS:[
  {id:'set_destrier',cls:'paladin',name:'Serment du Destrier',style:'Vitesse · charge',slots:['tete','epaules','torse','mains','jambes','pieds'],
   b2:{text:'Charge du Destrier se recharge 4 s plus vite.',fx:[{t:'extra',skill:'pal_charge',add:{cd:-4}}]},
   b4:{text:'Après une Charge, −50 % de dégâts subis pendant 5 s.',fx:[{t:'buffOnCast',on:'pal_charge',buff:{dr:0.5},dur:5}]},
   b6:{text:'Charge ×15 dégâts, et toutes tes compétences ×3 pendant 5 s après une Charge.',fx:[{t:'skillDmg',skill:'pal_charge',m:15},{t:'buffOnCast',on:'pal_charge',buff:{dmg:2},dur:5}]}},
  {id:'set_epines',cls:'paladin',name:'Écrin des Épines',style:'Épines · défense',slots:['tete','epaules','torse','poignets','taille','jambes'],
   b2:{text:'Épines ×2.',fx:[{t:'stat',s:{thornsM:1}}]},
   b4:{text:'Frappe de l\'Aube, Bouclier Béni et Sentence infligent en plus 200 % de tes épines.',fx:[{t:'thornsHit',skill:['pal_frappe','pal_bouclier','pal_sentence'],m:2}]},
   b6:{text:'Ces trois compétences infligent ×10 dégâts, et tu subis 30 % de dégâts en moins.',fx:[{t:'skillDmg',skill:['pal_frappe','pal_bouclier','pal_sentence'],m:10},{t:'stat',s:{dr:0.3}}]}},
  {id:'set_phalange',cls:'paladin',name:"Phalange de l'Aube",style:'Invocation',slots:['tete','epaules','torse','mains','pieds','amulette'],
   b2:{text:'Phalange Sacrée invoque 1 combattant de plus.',fx:[{t:'extra',skill:'pal_lanciers',add:{count:1}}]},
   b4:{text:'Lancer une compétence invoque 1 lancier pendant 5 s (20 % de chances).',fx:[{t:'summonOnCast',on:'*',unit:'lancier',count:1,dur:5,m:1.2,ch:0.2}]},
   b6:{text:'Tes invocations infligent ×15 dégâts. −30 % de dégâts subis.',fx:[{t:'skillDmg',skill:'pets',m:15},{t:'stat',s:{dr:0.3}}]}},

  {id:'set_piegeur',cls:'traqueuse',name:'Parure du Piégeur',style:'Zone · pièges',slots:['tete','epaules','torse','mains','taille','jambes'],
   b2:{text:'Pièges à Pointes pose 2 pièges de plus.',fx:[{t:'extra',skill:'tq_piege',add:{count:2}}]},
   b4:{text:'Les pièges explosent en chaîne sur 3 ennemis et sont armés instantanément.',fx:[{t:'extra',skill:'tq_piege',add:{jumps:3,arm:-0.8}}]},
   b6:{text:'Pièges ×15 dégâts et Pluie de Carreaux ×6.',fx:[{t:'skillDmg',skill:'tq_piege',m:15},{t:'skillDmg',skill:'tq_pluie',m:6}]}},
  {id:'set_rodeur',cls:'traqueuse',name:'Voile du Rôdeur',style:'Vitesse · mobilité',slots:['tete','epaules','torse','mains','jambes','pieds'],
   b2:{text:'+20 % de vitesse de déplacement.',fx:[{t:'stat',s:{ms:0.2}}]},
   b4:{text:'Chaque Bond Fuyant crée un double qui combat 4 s.',fx:[{t:'cloneOnDash',on:'tq_saut',dur:4,m:0.8}]},
   b6:{text:'Salve Multiple et Trait Dévastateur ×12 pendant 5 s après un Bond Fuyant.',fx:[{t:'buffOnCast',on:'tq_saut',buff:{skill:['tq_salve','tq_trait'],m:12},dur:5}]}},
  {id:'set_meute',cls:'traqueuse',name:'Lien de la Meute',style:'Invocation · mono-cible',slots:['tete','epaules','torse','poignets','taille','pieds'],
   b2:{text:'Tes bêtes infligent ×2 dégâts.',fx:[{t:'skillDmg',skill:'pets',m:2}]},
   b4:{text:'Les morsures de tes bêtes marquent les ennemis (+20 % de dégâts subis).',fx:[{t:'petApply',debuff:'curse',m:0.2}]},
   b6:{text:'Tes bêtes infligent ×15 dégâts et Carreau Vif ×5.',fx:[{t:'skillDmg',skill:'pets',m:15},{t:'skillDmg',skill:'tq_carreau',m:5}]}},

  {id:'set_colosse',cls:'shaman',name:'Rite du Colosse',style:'Invocation',slots:['tete','epaules','torse','mains','jambes','pieds'],
   b2:{text:"Gardiens d'Os : 1 gardien de plus.",fx:[{t:'extra',skill:'sh_gardiens',add:{count:1}}]},
   b4:{text:'Tes invocations propagent ta malédiction en mordant.',fx:[{t:'petApply',debuff:'curse',m:0.2}]},
   b6:{text:'Tes invocations infligent ×20 dégâts. −40 % de dégâts subis.',fx:[{t:'skillDmg',skill:'pets',m:20},{t:'stat',s:{dr:0.4}}]}},
  {id:'set_peste',cls:'shaman',name:'Linceul de la Peste',style:'Zone · poison',slots:['tete','epaules','torse','poignets','taille','jambes'],
   b2:{text:'Dégâts sur la durée ×2.',fx:[{t:'dotMult',m:2}]},
   b4:{text:'Nuée Dévorante se propage toujours et Fosse Putride est 2 m plus large.',fx:[{t:'extra',skill:'sh_nuee',add:{spread:1}},{t:'extra',skill:'sh_fosse',add:{r:2}}]},
   b6:{text:'Nuée Dévorante et Fosse Putride ×15 dégâts.',fx:[{t:'skillDmg',skill:['sh_nuee','sh_fosse'],m:15}]}},
  {id:'set_corbeau',cls:'shaman',name:'Plumes du Corbeau-Esprit',style:'Mono-cible · esprits',slots:['tete','epaules','torse','mains','taille','pieds'],
   b2:{text:'−20 % de temps de recharge.',fx:[{t:'stat',s:{cdr:0.2}}]},
   b4:{text:"Envol de Corbeaux lance aussi Ouragan d'Esprits (60 %).",fx:[{t:'castAlso',on:'sh_corbeaux',cast:'sh_esprits',m:0.6}]},
   b6:{text:"Ouragan d'Esprits et Dard Venimeux ×12. −50 % de dégâts subis 4 s après Envol de Corbeaux.",fx:[{t:'skillDmg',skill:['sh_esprits','sh_dard'],m:12},{t:'buffOnCast',on:'sh_corbeaux',buff:{dr:0.5},dur:4}]}},

  /* Set offert par la Saison 1 (toutes classes) */
  {id:'set_saison1',cls:null,season:1,name:'Héritage des Échos',style:'Polyvalent (saison)',slots:['tete','epaules','torse','mains','jambes','pieds'],
   b2:{text:'+15 % de vitesse d\'attaque.',fx:[{t:'stat',s:{ias:0.15}}]},
   b4:{text:'−30 % de dégâts subis.',fx:[{t:'stat',s:{dr:0.3}}]},
   b6:{text:'Toutes tes compétences ×6. Toutes les 6 s, un écho (500 %) frappe un ennemi proche.',fx:[{t:'skillDmg',skill:'*',m:6},{t:'periodic',every:6,do:'meteor',m:5,el:'ombre'}]}}
],

/* ---------------- Fusions ----------------
   Deux compétences équipées d'une même classe + une fusion active = un effet nouveau. */
FUSIONS:[
  /* Paladin */
  {id:'pf_egide',cls:'paladin',name:'Égide Galopante',a:'pal_charge',b:'pal_bouclier',style:'défense',text:'La Charge laisse une traînée de boucliers qui renvoient 300 % de tes dégâts d\'arme, et lance un Bouclier Béni à l\'arrivée.',
   fx:[{t:'zoneOn',on:'pal_charge',at:'path',r:2,dur:4,dps:3,el:'sacre',eff:'thorns'},{t:'castAlso',on:'pal_charge',cast:'pal_bouclier',m:0.8}]},
  {id:'pf_martele',cls:'paladin',name:'Lumière Martelée',a:'pal_marteau',b:'pal_consecration',style:'zone',text:'Chaque marteau consacre le sol à l\'impact (160 % par seconde, 3 s).',
   fx:[{t:'zoneOn',on:'pal_marteau',at:'target',r:3,dur:3,dps:1.6,el:'sacre'}]},
  {id:'pf_ost',cls:'paladin',name:'Ost Céleste',a:'pal_lanciers',b:'pal_ciel',style:'invocation',text:'Courroux Céleste fait descendre 3 lanciers à l\'impact, et tes invocations ×2 pendant 6 s.',
   fx:[{t:'summonOnCast',on:'pal_ciel',unit:'lancier',count:3,dur:8,m:1.25},{t:'buffOnCast',on:'pal_ciel',buff:{skill:'pets',m:2},dur:6}]},
  {id:'pf_verdict',cls:'paladin',name:'Verdict Foudroyant',a:'pal_frappe',b:'pal_sentence',style:'poussée',text:'Frappe de l\'Aube a 15 % de chances de lancer Sentence (70 %).',
   fx:[{t:'castAlso',on:'pal_frappe',cast:'pal_sentence',m:0.7,ch:0.15}]},
  {id:'pf_ardent',cls:'paladin',name:'Rempart Ardent',a:'pal_rempart',b:'pal_ire',style:'défense',text:'Ire de l\'Aube réinitialise Rempart de Lumière, et chaque Rempart libère une onde de feu (500 %).',
   fx:[{t:'reset',on:'pal_ire',skill:'pal_rempart',ch:1},{t:'onImpact',on:'pal_rempart',do:'nova',m:5}]},
  {id:'pf_bond',cls:'paladin',name:'Bond du Jugement',a:'pal_bond',b:'pal_marteau',style:'vitesse',text:'Chaque Bond Céleste fait tomber Marteau du Jugement à l\'arrivée (100 %).',
   fx:[{t:'castAlso',on:'pal_bond',cast:'pal_marteau',m:1}]},
  {id:'pf_lame',cls:'paladin',name:'Lame Phalange',a:'pal_lame',b:'pal_lanciers',style:'invocation',text:'Chaque ennemi touché par Lame Juste a 8 % de chances d\'invoquer un lancier 5 s.',
   fx:[{t:'onHit',on:'pal_lame',ch:0.08,do:'summon',m:1.25}]},
  {id:'pf_ciel',cls:'paladin',name:'Ciel Consacré',a:'pal_ciel',b:'pal_consecration',style:'zone',text:'Courroux Céleste laisse un large sol consacré (300 % par seconde, 5 s). Sol Consacré ×1,5.',
   fx:[{t:'zoneOn',on:'pal_ciel',at:'target',r:6,dur:5,dps:3,el:'sacre'},{t:'skillDmg',skill:'pal_consecration',m:1.5}]},
  {id:'pf_martyr',cls:'paladin',name:'Bouclier Martyr',a:'pal_bouclier',b:'pal_rempart',style:'mono-cible',text:'Chaque rebond de Bouclier Béni réduit la recharge de Rempart de 1 s ; pendant Rempart, Bouclier Béni ×2,5.',
   fx:[{t:'cdrOnHit',on:'pal_bouclier',skill:'pal_rempart',s:1},{t:'buffOnCast',on:'pal_rempart',buff:{skill:'pal_bouclier',m:2.5},dur:6}]},
  {id:'pf_garde',cls:'paladin',name:'Verdict de la Garde',a:'pal_lanciers',b:'pal_sentence',style:'poussée',text:'Sentence invoque 2 lanciers 6 s et réduit la recharge de Phalange de 1 s par ennemi touché.',
   fx:[{t:'summonOnCast',on:'pal_sentence',unit:'lancier',count:2,dur:6,m:1.25},{t:'cdrOnHit',on:'pal_sentence',skill:'pal_lanciers',s:1}]},
  {id:'pf_celeste',cls:'paladin',name:'Charge Céleste',a:'pal_charge',b:'pal_ciel',style:'mono-cible',text:'Chaque ennemi touché par Charge réduit la recharge de Courroux Céleste de 2 s.',
   fx:[{t:'cdrOnHit',on:'pal_charge',skill:'pal_ciel',s:2}]},

  /* Traqueuse */
  {id:'tf_mines',cls:'traqueuse',name:'Champ de Mines',a:'tq_pluie',b:'tq_piege',style:'zone',text:'Chaque carreau de la Pluie qui touche le sol pose un mini-piège (150 %).',
   fx:[{t:'onImpact',on:'tq_pluie',do:'miniTrap',m:1.5}]},
  {id:'tf_echo',cls:'traqueuse',name:'Écho des Lames',a:'tq_carreau',b:'tq_piege',style:'zone',text:'Chaque piège qui explose tire des Carreaux Vifs sur 4 ennemis proches (100 %).',
   fx:[{t:'onImpact',on:'tq_piege',do:'bolts',m:1}]},
  {id:'tf_meute',cls:'traqueuse',name:'Meute Vengeresse',a:'tq_bete',b:'tq_marque',style:'invocation',text:'Les morsures de tes bêtes appliquent la Marque du Chasseur. Bêtes ×1,5.',
   fx:[{t:'petApply',debuff:'curse',m:0.2},{t:'skillDmg',skill:'tq_bete',m:1.5}]},
  {id:'tf_saut',cls:'traqueuse',name:'Saut Piégé',a:'tq_saut',b:'tq_piege',style:'vitesse',text:'Bond Fuyant pose des Pièges à Pointes au point de départ (80 %).',
   fx:[{t:'castAlso',on:'tq_saut',cast:'tq_piege',m:0.8,at:'self'}]},
  {id:'tf_voile',cls:'traqueuse',name:'Voile Tranchant',a:'tq_voile',b:'tq_salve',style:'défense',text:"Voile d'Ombre lance une Salve Multiple tout autour de toi (150 %).",
   fx:[{t:'castAlso',on:'tq_voile',cast:'tq_salve',m:1.5,ring:1}]},
  {id:'tf_fantome',cls:'traqueuse',name:'Ruée Fantôme',a:'tq_ruee',b:'tq_voile',style:'vitesse',text:"Ruée du Chasseur crée un double 4 s et donne 30 % de réduction des dégâts 3 s.",
   fx:[{t:'cloneOnDash',on:'tq_ruee',dur:4,m:0.6},{t:'buffOnCast',on:'tq_ruee',buff:{dr:0.3},dur:3}]},
  {id:'tf_deluge',cls:'traqueuse',name:'Déluge Fauve',a:'tq_pluie',b:'tq_bete',style:'invocation',text:'Tes bêtes appellent une Pluie de Carreaux sur leur cible toutes les 6 s (60 %).',
   fx:[{t:'petCast',cast:'tq_pluie',every:6,m:0.6}]},
  {id:'tf_explosive',cls:'traqueuse',name:'Marque Explosive',a:'tq_marque',b:'tq_trait',style:'zone',text:'Les ennemis marqués explosent à leur mort (400 %).',
   fx:[{t:'onKill',ch:1,do:'explode',m:4,cond:'cursed'}]},
  {id:'tf_rafale',cls:'traqueuse',name:'Rafale Infinie',a:'tq_entaille',b:'tq_salve',style:'mono-cible',text:'Chaque Tir Rasant augmente les dégâts de Salve Multiple de 15 % (jusqu\'à 10 fois, 5 s).',
   fx:[{t:'stackOn',on:'tq_entaille',skill:'tq_salve',m:0.15,max:10,dur:5}]},
  {id:'tf_fureur',cls:'traqueuse',name:'Fureur Rémanente',a:'tq_vengeance',b:'tq_salve',style:'poussée',text:'Pendant la Fureur, une Salve Multiple part toute seule toutes les 1,5 s (70 %).',
   fx:[{t:'whileBuff',skill:'tq_vengeance',every:1.5,cast:'tq_salve',m:0.7}]},

  /* Shaman */
  {id:'sf_rage',cls:'shaman',name:'Rage Contagieuse',a:'sh_gardiens',b:'sh_malediction',style:'invocation',text:'Tes gardiens propagent la Malédiction du Marais en mordant. Gardiens ×1,5.',
   fx:[{t:'petApply',debuff:'curse',m:0.2},{t:'skillDmg',skill:'sh_gardiens',m:1.5}]},
  {id:'sf_ancetres',cls:'shaman',name:'Nuée des Ancêtres',a:'sh_nuee',b:'sh_ancetres',style:'vitesse',text:'Pas des Ancêtres libère une Nuée Dévorante tout autour de toi à l\'arrivée.',
   fx:[{t:'castAlso',on:'sh_ancetres',cast:'sh_nuee',m:1,ring:1}]},
  {id:'sf_cranes',cls:'shaman',name:'Fosse aux Crânes',a:'sh_crane',b:'sh_fosse',style:'zone',text:'Chaque explosion de Crâne de Braise ouvre une petite Fosse Putride (100 % par seconde, 2 s).',
   fx:[{t:'zoneOn',on:'sh_crane',at:'target',r:2.5,dur:2,dps:1,el:'poison'}]},
  {id:'sf_peste',cls:'shaman',name:'Colosse Pestilentiel',a:'sh_colosse',b:'sh_nuee',style:'zone',text:'Tes invocations crachent une Nuée Dévorante toutes les 5 s (60 %).',
   fx:[{t:'petCast',cast:'sh_nuee',every:5,m:0.6}]},
  {id:'sf_ailes',cls:'shaman',name:"Ailes d'Esprits",a:'sh_corbeaux',b:'sh_esprits',style:'mono-cible',text:"Envol de Corbeaux libère 4 esprits chercheurs à l'arrivée (150 % chacun).",
   fx:[{t:'onImpact',on:'sh_corbeaux',do:'spirit',m:1.5,n:4}]},
  {id:'sf_ame',cls:'shaman',name:'Âme Liée',a:'sh_marche',b:'sh_gardiens',style:'défense',text:'Marche des Âmes double les dégâts de tes invocations pendant 6 s et te rend 10 % de vie.',
   fx:[{t:'buffOnCast',on:'sh_marche',buff:{skill:'pets',m:2},dur:6},{t:'onImpact',on:'sh_marche',do:'heal',m:0.1}]},
  {id:'sf_rite',cls:'shaman',name:'Rite Toxique',a:'sh_rite',b:'sh_fosse',style:'poussée',text:'Pendant le Grand Rite, une Fosse Putride s\'ouvre toute seule toutes les 2 s (60 %).',
   fx:[{t:'whileBuff',skill:'sh_rite',every:2,cast:'sh_fosse',m:0.6}]},
  {id:'sf_dard',cls:'shaman',name:"Dard d'Ombre",a:'sh_dard',b:'sh_malediction',style:'mono-cible',text:'Dard Venimeux maudit sa cible (25 % de chances). Dard ×1,5 contre les maudits.',
   fx:[{t:'onHit',on:'sh_dard',ch:0.25,do:'curse',m:0.2},{t:'skillDmg',skill:'sh_dard',m:1.5,cond:'cursed'}]},
  {id:'sf_moisson',cls:'shaman',name:'Crâne Moissonneur',a:'sh_crane',b:'sh_esprits',style:'vitesse',text:'Les ennemis tués par Crâne de Braise libèrent un esprit chercheur (200 %).',
   fx:[{t:'onKill',on:'sh_crane',ch:1,do:'spirit',m:2}]},
  {id:'sf_marais',cls:'shaman',name:'Marais Vivant',a:'sh_malediction',b:'sh_fosse',style:'poussée',text:'Fosse Putride inflige ×2,5 dégâts aux ennemis maudits.',
   fx:[{t:'skillDmg',skill:'sh_fosse',m:2.5,cond:'cursed'}]}
],

/* ---------------- Gemmes légendaires (3 emplacements : amulette + 2 anneaux) ----------------
   v = v0 + vr × rang. Le bonus du rang 25 s'ajoute. */
GEMS:[
  {id:'gem_brasier',name:'Œil du Brasier',icon:'fire-gem',color:'#ff7a2a',text:'+{v} % de dégâts.',v0:12,vr:0.4,fx:{t:'stat',key:'dmg',pct:1},
   r25:{text:'Rang 25 : +20 % de dégâts contre les élites.',fx:[{t:'eliteDmg',m:1.2}]}},
  {id:'gem_givrelune',name:'Larme de Givre-Lune',icon:'crystal-cluster',color:'#8fe0ff',text:'+{v} % de dégâts contre les ennemis à moins de 10 m.',v0:15,vr:0.5,fx:{t:'nearDmg',r:10,pct:1},
   r25:{text:'Rang 25 : −10 % de dégâts subis.',fx:[{t:'stat',s:{dr:0.1}}]}},
  {id:'gem_vipere',name:'Croc de Vipère',icon:'snake-bite',color:'#9cff6a',text:'Tes coups empoisonnent : {v} % des dégâts d\'arme par seconde pendant 5 s.',v0:120,vr:6,fx:{t:'onHitPoison',pct:1},
   r25:{text:'Rang 25 : +15 % de dégâts contre les ennemis empoisonnés.',fx:[{t:'stat',s:{dmgPoisoned:0.15}}]}},
  {id:'gem_orage',name:"Cœur d'Orage",icon:'lightning-helix',color:'#b6c0ff',text:'Toutes les 2 s, un éclair de {v} % frappe et rebondit.',v0:300,vr:15,fx:{t:'periodicPct',every:2,do:'chain',el:'foudre',pct:1},
   r25:{text:'Rang 25 : l\'éclair rebondit 3 fois de plus.',fx:[{t:'stat',s:{chainPlus:3}}]}},
  {id:'gem_sablier',name:'Sablier Cendré',icon:'hourglass',color:'#e8c46a',text:'−{v} % de temps de recharge et +{v} % de vitesse de déplacement.',v0:5,vr:0.2,cap:15,fx:{t:'stat',key:'cdr',key2:'ms',pct:1},
   r25:{text:'Rang 25 : chaque ennemi tué réduit tes recharges de 0,2 s.',fx:[{t:'onKill',ch:1,do:'cdr',m:0.2}]}},
  {id:'gem_rempart',name:'Pierre du Rempart',icon:'rune-stone',color:'#c8c8d8',text:'−{v} % de dégâts subis.',v0:6,vr:0.25,cap:25,fx:{t:'stat',key:'dr',pct:1},
   r25:{text:'Rang 25 : sous 50 % de vie, un bouclier absorbe 30 % de ta vie (toutes les 30 s).',fx:[{t:'cheatShield',below:0.5,pct:0.3,cd:30}]}}
],

/* ---------------- Monstres ----------------
   beh : melee, ranged, kamikaze, summoner, charger, caster (zones au sol)
   model : quad, biped, brute, spider, floater, blob, bird, insect */
MONSTERS:{
  /* morts-vivants */
  rodeur:{name:'Rôdeur cadavéreux',fam:'morts',model:'biped',color:0x6a7a5a,eye:0x9cff6a,s:1,hp:1,dmg:1,speed:2.6,beh:'melee'},
  tireur:{name:"Tireur d'Os",fam:'morts',model:'biped',color:0xd8ccb0,eye:0xff4a2a,s:0.95,hp:0.7,dmg:0.9,speed:3,beh:'ranged',range:10,proj:0xffd0a0,bow:1},
  osrampant:{name:'Os-Rampant',fam:'morts',model:'blob',color:0xc8b890,eye:0xff6a1a,s:0.7,hp:0.4,dmg:2.2,speed:5,beh:'kamikaze'},
  necrophage:{name:'Nécrophage',fam:'morts',model:'quad',color:0x5a5a4a,eye:0xff3a1a,s:1.1,hp:1.3,dmg:1.3,speed:3,beh:'charger'},
  pretre:{name:'Prêtre Funeste',fam:'morts',model:'biped',color:0x3a2a4a,eye:0xb36bff,s:1.1,hp:1.2,dmg:0.8,speed:2.4,beh:'summoner',summon:'osrampant',robe:1},
  /* bêtes */
  loup:{name:'Loup Cendré',fam:'betes',model:'quad',color:0x6a6460,eye:0xff3a1a,s:0.95,hp:0.75,dmg:0.9,speed:4.6,beh:'melee'},
  sanglier:{name:'Sanglier des Tourbes',fam:'betes',model:'quad',color:0x5a3a2a,eye:0xffaa22,s:1.15,hp:1.3,dmg:1.2,speed:3,beh:'charger',tusks:1},
  ours:{name:'Ours Galeux',fam:'betes',model:'brute',color:0x4a3626,eye:0xff5a2a,s:1.4,hp:2.6,dmg:1.6,speed:2.4,beh:'caster',zone:'slam'},
  charognard:{name:'Charognard',fam:'betes',model:'bird',color:0x2a2228,eye:0xff2a2a,s:0.9,hp:0.6,dmg:0.8,speed:5,beh:'melee',fly:1},
  /* démons */
  diablotin:{name:'Diablotin de Braise',fam:'demons',model:'biped',color:0xa83a1a,eye:0xffd04a,s:0.75,hp:0.55,dmg:0.8,speed:4.4,beh:'melee',horns:1},
  cracheur:{name:'Cracheur de Soufre',fam:'demons',model:'brute',color:0x7a2a1a,eye:0xffea4a,s:1.1,hp:1.1,dmg:0.9,speed:2.4,beh:'ranged',range:9,proj:0xff8a1a,horns:1},
  brute:{name:'Brute Infernale',fam:'demons',model:'brute',color:0x5a1a14,eye:0xff6a1a,s:1.6,hp:2.6,dmg:1.35,speed:2.6,beh:'caster',zone:'fire',horns:1},
  invocatrice:{name:'Invocatrice des Cendres',fam:'demons',model:'biped',color:0x6a1a2a,eye:0xff9a4a,s:1.05,hp:1.1,dmg:0.8,speed:2.6,beh:'summoner',summon:'diablotin',robe:1,horns:1},
  /* insectes */
  tisseuse:{name:'Tisseuse Vénéneuse',fam:'insectes',model:'spider',color:0x2a2230,eye:0x8aff5a,s:1.1,hp:0.9,dmg:1,speed:3.4,beh:'ranged',range:8,proj:0x8aff4a},
  scarabee:{name:'Scarabée Bombe',fam:'insectes',model:'insect',color:0x3a4a1a,eye:0xffaa1a,s:0.8,hp:0.45,dmg:2.4,speed:4.6,beh:'kamikaze'},
  mante:{name:'Mante Faucheuse',fam:'insectes',model:'insect',color:0x4a7a2a,eye:0xffff5a,s:1.15,hp:1,dmg:1.2,speed:4.2,beh:'melee'},
  reine:{name:'Reine du Couvain',fam:'insectes',model:'spider',color:0x4a2a3a,eye:0xff5aff,s:1.5,hp:2.2,dmg:1,speed:2,beh:'summoner',summon:'larve'},
  larve:{name:'Larve',fam:'insectes',model:'blob',color:0xc8c890,eye:0x2a2a2a,s:0.55,hp:0.3,dmg:0.6,speed:3.6,beh:'melee'},
  /* esprits */
  follet:{name:'Feu Follet',fam:'esprits',model:'floater',color:0x5ad8ff,eye:0xffffff,s:0.8,hp:0.6,dmg:1,speed:3.4,beh:'ranged',range:9,proj:0x7ae8ff,fly:1},
  peine:{name:'Âme en Peine',fam:'esprits',model:'floater',color:0xb8c8d8,eye:0x2a2a4a,s:1,hp:0.9,dmg:1.2,speed:3,beh:'melee',fly:1,blink:1},
  hurleur:{name:'Spectre Hurleur',fam:'esprits',model:'floater',color:0x9a6aff,eye:0xffffff,s:1.25,hp:1.3,dmg:1.2,speed:2.4,beh:'caster',zone:'frost',fly:1},
  sentinelle:{name:'Sentinelle Spectrale',fam:'esprits',model:'brute',color:0x6a8aaa,eye:0x9affff,s:1.3,hp:2,dmg:1.4,speed:3.2,beh:'charger',ghost:1}
},
/* Boss (acte, gardiens de faille, échos de saison) : phases et mécaniques */
BOSSES:{
  morgrael:{name:'Morgraël, Cœur-de-Cendre',model:'brute',color:0x3a1410,eye:0xff5a1a,s:3,hp:40,dmg:2.2,speed:3,horns:1,
    intro:'Morgraël : « La braise de ta ville sera ma couronne. »',
    phases:[{at:1,name:'Phase 1 — Le Brasier',moves:['slam','fireRing','summon'],summon:'diablotin'},
            {at:0.5,name:'Phase 2 — Le Cœur Ardent',moves:['slam','beams','meteorRain','summon'],summon:'cracheur',enrage:1.3,text:'Morgraël s\'embrase ! Évite les rayons tournants.'}]},
  devoreur:{name:'Le Dévoreur de Failles',model:'brute',color:0x2a1a3a,eye:0xb36bff,s:2.6,hp:30,dmg:2,speed:3,horns:1,guardian:1,
    phases:[{at:1,moves:['slam','charge','summon'],summon:'peine'},{at:0.5,moves:['slam','charge','meteorRain'],enrage:1.25}]},
  dameechos:{name:'Dame des Échos',model:'floater',color:0xb8a8ff,eye:0xffffff,s:2.6,hp:26,dmg:2,speed:2.6,fly:1,guardian:1,
    phases:[{at:1,moves:['spiral','blink','fireRing']},{at:0.5,moves:['spiral','blink','beams'],enrage:1.25}]},
  colossefr:{name:'Colosse Fracturé',model:'brute',color:0x4a4a5a,eye:0x7fdcff,s:3,hp:34,dmg:2.3,speed:2.4,guardian:1,
    phases:[{at:1,moves:['slam','meteorRain']},{at:0.5,moves:['slam','beams','summon'],summon:'sentinelle',enrage:1.2}]},
  mereessaim:{name:'Mère-Essaim',model:'spider',color:0x3a2a1a,eye:0xffaa1a,s:2.8,hp:28,dmg:1.9,speed:2.8,guardian:1,
    phases:[{at:1,moves:['summon','spiral','slam'],summon:'scarabee'},{at:0.5,moves:['summon','spiral','fireRing'],summon:'mante',enrage:1.25}]}
},
/* Affixes d'élites */
ELITE_AFFIXES:[
  {id:'mortier',n:'Mortier',desc:'Lance des obus qui tombent en cercles rouges.'},
  {id:'glacial',n:'Glacial',desc:'Pose des orbes de givre qui explosent et ralentissent.'},
  {id:'arcanique',n:'Arcanique',desc:'Invoque une sentinelle aux rayons tournants.'},
  {id:'geolier',n:'Geôlier',desc:'T\'immobilise brièvement dans une cage.'},
  {id:'vampirique',n:'Vampirique',desc:'Se soigne en frappant.'},
  {id:'incendiaire',n:'Incendiaire',desc:'Laisse des flammes sur son passage.'},
  {id:'fortifie',n:'Fortifié',desc:'Beaucoup plus de vie.'},
  {id:'rapide',n:'Rapide',desc:'Se déplace et frappe plus vite.'},
  {id:'teleporteur',n:'Téléporteur',desc:'Se téléporte sur toi.'},
  {id:'moltene',n:'Moltène',desc:'Explose violemment à sa mort.'},
  {id:'foudroyant',n:'Foudroyant',desc:'Libère des étincelles quand on le frappe.'},
  {id:'pestilentiel',n:'Pestilentiel',desc:'Fait jaillir des flaques de poison sous tes pieds.'}
],

/* ---------------- Difficultés ----------------
   hp/dmg = multiplicateurs monstres ; xp/gold/leg = bonus de récompenses ; lvl = niveau minimum */
DIFFICULTIES:[
  {id:'normal',n:'Normal',hp:1,dmg:1,xp:0,gold:0,leg:0,lvl:1},
  {id:'difficile',n:'Difficile',hp:1.6,dmg:1.3,xp:0.25,gold:0.25,leg:0.1,lvl:1},
  {id:'expert',n:'Expert',hp:2.6,dmg:1.7,xp:0.5,gold:0.5,leg:0.2,lvl:1},
  {id:'maitre',n:'Maître',hp:4.2,dmg:2.2,xp:1,gold:1,leg:0.35,lvl:1},
  {id:'t1',n:'Tourment I',hp:6.8,dmg:2.8,xp:1.6,gold:1.6,leg:0.5,lvl:60},
  {id:'t2',n:'Tourment II',hp:9.9,dmg:3.2,xp:2.2,gold:2.2,leg:0.65,lvl:60},
  {id:'t3',n:'Tourment III',hp:14.3,dmg:3.7,xp:3,gold:3,leg:0.8,lvl:61},
  {id:'t4',n:'Tourment IV',hp:20.8,dmg:4.2,xp:4,gold:4,leg:1,lvl:63},
  {id:'t5',n:'Tourment V',hp:30,dmg:4.9,xp:5.2,gold:5.2,leg:1.2,lvl:65},
  {id:'t6',n:'Tourment VI',hp:44,dmg:5.6,xp:6.6,gold:6.6,leg:1.4,lvl:67},
  {id:'t7',n:'Tourment VII',hp:63,dmg:6.4,xp:8.3,gold:8.3,leg:1.6,lvl:70},
  {id:'t8',n:'Tourment VIII',hp:92,dmg:7.3,xp:10.3,gold:10.3,leg:1.8,lvl:70},
  {id:'t9',n:'Tourment IX',hp:133,dmg:8.4,xp:12.6,gold:12.6,leg:2,lvl:70},
  {id:'t10',n:'Tourment X',hp:193,dmg:9.6,xp:15.3,gold:15.3,leg:2.25,lvl:70,para:50},
  {id:'t11',n:'Tourment XI',hp:280,dmg:11.1,xp:18.5,gold:18.5,leg:2.5,lvl:70,para:100},
  {id:'t12',n:'Tourment XII',hp:406,dmg:12.7,xp:22,gold:22,leg:2.75,lvl:70,para:150},
  {id:'t13',n:'Tourment XIII',hp:589,dmg:14.6,xp:26,gold:26,leg:3,lvl:70,para:200},
  {id:'t14',n:'Tourment XIV',hp:854,dmg:16.7,xp:31,gold:31,leg:3.3,lvl:70,para:250},
  {id:'t15',n:'Tourment XV',hp:1240,dmg:19.2,xp:36,gold:36,leg:3.6,lvl:70,para:300},
  {id:'t16',n:'Tourment XVI',hp:1790,dmg:22.0,xp:42,gold:42,leg:4,lvl:70,para:350}
],
/* Failles supérieures : multiplicateurs par palier */
GREATER_RIFT:{hpBase:6.8,hpPer:1.16,dmgBase:2.8,dmgPer:1.025,timer:900,respawn:[5,10,15,20,25,30],primalAt:70},

/* ---------------- Monde : Acte I ---------------- */
ACT:{id:1,name:'Acte I — La Braise Éteinte',
  intro:[
    {who:'Maëlis la Veilleuse',txt:'Te voilà enfin. La Flamme-Mère d\'Havrebraise vacille depuis trois nuits.'},
    {who:'Maëlis la Veilleuse',txt:'Quelque chose, sous la Crypte de l\'Étoile Morte, se nourrit de sa lumière. Traverse les Landes et trouve-le.'}
  ],
  steps:[
    {id:'s1',zone:'landes',clear:190,text:'Traverse les Landes Gémissantes',goal:'named',named:'fossoyeur',hint:'Élimine le Fossoyeur Hagard'},
    {id:'s2',zone:'sylve',clear:170,text:'Retrouve la piste dans la Sylve Cendrée',goal:'named',named:'ronces',hint:'Vaincs la Mère des Ronces'},
    {id:'s3',zone:'marais',clear:130,text:"Trouve l'entrée de la Crypte dans le Marais",goal:'named',named:'gueule',hint:'Élimine Gueule-de-Vase'},
    {id:'s4',zone:'crypte',clear:110,text:'Descends au cœur de la Crypte',goal:'boss',named:'morgrael',hint:'Vaincs Morgraël, Cœur-de-Cendre'},
    {id:'s5',zone:null,text:'Acte I terminé ! Le Mode Aventure est ouvert (Obélisque et Panneau des primes).',goal:'none'}
  ],
  outro:[
    {who:'Maëlis la Veilleuse',txt:'La Flamme-Mère brille de nouveau. Mais Morgraël n\'était qu\'un écho…'},
    {who:'Maëlis la Veilleuse',txt:'Des failles s\'ouvrent partout. L\'Obélisque peut t\'y mener. Et la taverne a de nouveaux visages.'}
  ]
},
ZONES:{
  ville:{name:'Havrebraise',type:'town',music:{root:110,scale:[0,3,7,10,12],mood:0.4}},
  landes:{name:'Landes Gémissantes',type:'outdoor',lvl:1,exclude:['ours','necrophage'],size:150,theme:'landes',fams:['morts','betes'],packs:26,elites:3,next:'sylve',music:{root:98,scale:[0,3,5,7,10],mood:0.5},
    enter:{who:'Maëlis (écho)',txt:'Les morts ne reposent plus dans ces landes. Reste en mouvement, sors des cercles rouges.'},
    named:[{id:'fossoyeur',name:'Le Fossoyeur Hagard',type:'pretre',at:0.85}],
    events:[{name:'Tombes profanées',type:'waves',at:0.45,mons:['rodeur','osrampant']}]},
  sylve:{name:'Sylve Cendrée',type:'outdoor',lvl:3,size:150,theme:'sylve',fams:['betes','insectes'],packs:28,elites:4,next:'marais',music:{root:87,scale:[0,2,3,7,8],mood:0.55},
    enter:{who:'Éclaireur blessé',txt:'Une reine pond dans les racines… Les arbres brûlent sans fumée.'},
    named:[{id:'ronces',name:'Mère des Ronces',type:'reine',at:0.85}],
    events:[{name:'Nid de la Sylve',type:'waves',at:0.5,mons:['larve','mante','scarabee']}]},
  marais:{name:'Marais de Vasenoire',type:'outdoor',lvl:5,size:150,theme:'marais',fams:['insectes','esprits','morts'],packs:30,elites:4,next:'crypte',music:{root:82,scale:[0,1,5,7,8],mood:0.6},
    enter:{who:'Maëlis (écho)',txt:'Le marais garde l\'entrée de la Crypte. Méfie-toi des esprits : ils glacent le sol.'},
    named:[{id:'gueule',name:'Gueule-de-Vase',type:'ours',at:0.85}],
    events:[{name:'Feux du marais',type:'waves',at:0.5,mons:['follet','peine']}]},
  crypte:{name:"Crypte de l'Étoile Morte",type:'dungeon',lvl:7,size:120,theme:'crypte',fams:['morts','demons'],packs:24,elites:4,next:null,boss:'morgrael',music:{root:73,scale:[0,1,3,6,7],mood:0.8},
    enter:{who:'Maëlis (écho)',txt:'Tu sens cette chaleur ? Il est au fond. Prépare tes compétences.'},
    named:[],events:[{name:'Autel des cendres',type:'waves',at:0.5,mons:['diablotin','invocatrice']}]}
},
/* Thèmes visuels (zones et failles) */
THEMES:{
  ville:{sky:0x2a2c3a,fog:0x2a2c3a,ground:[0x5a5248,0x4a443c],accent:0xffa040,props:'town'},
  landes:{sky:0x5a6070,fog:0x5a6070,ground:[0x5a6a3a,0x4a5232],path:0x7a6a4a,props:'graves',trees:'dead',light:0xd8d0c0},
  sylve:{sky:0x2a3028,fog:0x2a3a2a,ground:[0x2e4a26,0x24381e],path:0x5a4a32,props:'forest',trees:'pine',light:0xb8c8a0},
  marais:{sky:0x2a3436,fog:0x334440,ground:[0x34402e,0x2a3426],path:0x4a4432,props:'swamp',trees:'swamp',water:0x2a4a40,light:0xa8c0b0},
  crypte:{sky:0x0e0c10,fog:0x140e10,ground:[0x3a3436,0x2e2a2c],wall:0x4a4248,props:'crypt',light:0xff9a5a,dungeon:1},
  /* thèmes de failles tirés au sort */
  r_cendres:{name:'Faille de Cendres',sky:0x2a1410,fog:0x3a1a10,ground:[0x3a2620,0x2a1a16],path:0x5a2a1a,props:'ash',trees:'dead',light:0xff8a5a,wall:0x4a2a22},
  r_givre:{name:'Faille Glaciale',sky:0x2a3a50,fog:0x3a4a60,ground:[0x8a9aa8,0x6a7a8a],path:0xa8b8c8,props:'ice',trees:'crystal',light:0xc0e0ff,wall:0x7a8aa0},
  r_putride:{name:'Faille Putride',sky:0x1a2a14,fog:0x24361a,ground:[0x3a4a20,0x2a3a18],path:0x4a5a2a,props:'swamp',trees:'swamp',water:0x3a5a1a,light:0xb0ff80,wall:0x3a4a2a},
  r_astrale:{name:'Faille Astrale',sky:0x100a24,fog:0x1a1236,ground:[0x2a2448,0x201a3a],path:0x4a3a7a,props:'astral',trees:'crystal',light:0xa08aff,wall:0x3a2a6a},
  r_sang:{name:'Faille Sanglante',sky:0x200808,fog:0x300c0c,ground:[0x4a1a1a,0x3a1212],path:0x6a2a2a,props:'crypt',trees:'dead',light:0xff5a5a,wall:0x4a1a1a}
},
RIFT_THEMES:['r_cendres','r_givre','r_putride','r_astrale','r_sang'],
RIFT_GUARDIANS:['devoreur','dameechos','colossefr','mereessaim'],

/* ---------------- Primes (5 par zone) ----------------
   type : named (tuer un monstre nommé), event (nettoyer un événement), boss (tuer le boss de zone) */
BOUNTIES:{
  landes:[{type:'named',name:'Gros-Os le Vorace',mon:'necrophage'},{type:'named',name:'Sœur Cendrine',mon:'pretre'},{type:'event',name:'Le Charnier Vivant',mons:['rodeur','osrampant','tireur']},
          {type:'named',name:'Croc-Gris',mon:'loup'},{type:'boss',name:'Le Fossoyeur Hagard',mon:'pretre'}],
  sylve:[{type:'named',name:'Vieille Écorce',mon:'ours'},{type:'event',name:'La Ruche Ardente',mons:['larve','scarabee','mante']},{type:'named',name:'Fauchelame',mon:'mante'},
          {type:'named',name:'Défense-Noire',mon:'sanglier'},{type:'boss',name:'Mère des Ronces',mon:'reine'}],
  marais:[{type:'named',name:'Lanterne Pâle',mon:'follet'},{type:'event',name:'La Veillée des Noyés',mons:['peine','rodeur','hurleur']},{type:'named',name:'Mâchoire-Vase',mon:'tisseuse'},
          {type:'named',name:'Le Hurleur Gris',mon:'hurleur'},{type:'boss',name:'Gueule-de-Vase',mon:'ours'}],
  crypte:[{type:'named',name:'Le Sonneur de Glas',mon:'pretre'},{type:'event',name:'Le Rituel des Cendres',mons:['diablotin','invocatrice','cracheur']},{type:'named',name:'Gardien Brisé',mon:'sentinelle'},
          {type:'named',name:'Fourneau',mon:'brute'},{type:'boss',name:'Morgraël, Cœur-de-Cendre',mon:'morgrael'}]
},
/* Ciblage du farm : chaque coffre de primes d'une zone a plus de chances de donner ces légendaires */
BOUNTY_TARGETS:{
  landes:['g_double','g_moisson','p_lanceaube','t_hibou','s_milledards','g_alliances'],
  sylve:['g_tempete','g_premiersang','p_heaume','t_croc','s_ancetres','g_echo'],
  marais:['g_souffle','g_gardien','p_cape','t_capuche','s_marais','g_convergence'],
  crypte:['g_etoile','g_braises','p_zenith','t_comete','s_ossuaire','g_ames']
},

/* ---------------- Parangon (1 point par niveau, catégories en rotation) ---------------- */
PARAGON:[
  {id:'principal',n:'Principal',stats:[{k:'main',n:'Stat principale',per:5,cap:0},{k:'ms',n:'Vitesse de déplacement',per:0.005,cap:50,pct:1},{k:'resMax',n:'Ressource max',per:0.5,cap:50},{k:'vit',n:'Vitalité',per:5,cap:0}]},
  {id:'offense',n:'Offense',stats:[{k:'ias',n:"Vitesse d'attaque",per:0.002,cap:50,pct:1},{k:'chc',n:'Chance de critique',per:0.001,cap:50,pct:1},{k:'chd',n:'Dégâts critiques',per:0.01,cap:50,pct:1},{k:'cdr',n:'Réduction des recharges',per:0.002,cap:50,pct:1}]},
  {id:'defense',n:'Défense',stats:[{k:'lifeP',n:'Vie',per:0.005,cap:50,pct:1},{k:'armorP',n:'Armure',per:0.005,cap:50,pct:1},{k:'resP',n:'Résistances',per:0.005,cap:50,pct:1},{k:'regenP',n:'Régénération',per:0.0004,cap:50,pct:1}]},
  {id:'utilitaire',n:'Utilitaire',stats:[{k:'area',n:'Dégâts de zone',per:0.01,cap:50,pct:1},{k:'rcr',n:'Réduction des coûts',per:0.002,cap:50,pct:1},{k:'gold',n:"Or trouvé",per:0.01,cap:50,pct:1},{k:'pickup',n:'Rayon de ramassage',per:0.04,cap:50}]}
],

/* ---------------- Compagnons (taverne) ---------------- */
COMPANIONS:[
  {id:'brann',name:'Brann le Rempart',role:'Tank',color:0x8a8aa0,icon:'black-knight-helm',desc:'Un ancien garde de la Flamme-Mère. Attire les coups et protège.',
   skills:[[{id:'provoc',name:'Provocation',desc:'Toutes les 8 s, attire l\'attention des ennemis proches.'},{id:'bash',name:'Coup de bouclier',desc:'Toutes les 6 s, étourdit sa cible 1,5 s.'}],
           [{id:'rally',name:'Cri de ralliement',desc:'+15 % d\'armure pour toi.'},{id:'tenace',name:'Ténacité',desc:'Brann subit 40 % de dégâts en moins.'}]]},
  {id:'sylene',name:"Sylène l'Archère",role:'Archère',color:0x4a8a5a,icon:'bow-arrow',desc:'Une chasseuse des collines au tir infaillible.',
   skills:[[{id:'volee',name:'Volée',desc:'Toutes les 5 s, tire 3 flèches.'},{id:'gelante',name:'Flèche gelante',desc:'Ses flèches ralentissent.'}],
           [{id:'oeil',name:'Œil perçant',desc:'+4 % de chance de critique pour toi.'},{id:'marque',name:'Marque',desc:'Sa cible subit +10 % de dégâts.'}]]},
  {id:'oriane',name:'Mère Oriane',role:'Soigneuse',color:0xd8c8a8,icon:'healing',desc:'Une prêtresse qui a vu trois fléaux. Elle garde tout le monde debout.',
   skills:[[{id:'soin',name:'Soin',desc:'Sous 50 % de vie, te rend 25 % (toutes les 12 s).'},{id:'bene',name:'Bénédiction',desc:'Tu régénères 1 % de vie par seconde.'}],
           [{id:'grace',name:'Grâce',desc:'+10 % de dégâts pour toi.'},{id:'egide',name:'Égide',desc:'Toutes les 15 s, un bouclier de 20 % de ta vie.'}]]}
],

/* ---------------- Saison ---------------- */
SEASON:{id:1,name:'Saison 1 — Les Échos de Cendre',theme:'Les cendres de Morgraël hantent les failles.',
  rule:{id:'echos',text:'Les failles font apparaître des échos de boss : à 50 % de progression, un écho puissant surgit et lâche un légendaire.'},
  chapters:[
    {name:'Chapitre 1 — L\'Éveil',goals:[{type:'level',n:10,text:'Atteins le niveau 10'},{type:'kills',n:300,text:'Élimine 300 monstres'},{type:'equipLeg',n:1,text:'Équipe un légendaire'}],reward:{gold:5000,mats:{ferraille:30,azur:20}}},
    {name:'Chapitre 2 — La Braise',goals:[{type:'actBoss',n:1,text:"Vaincs Morgraël (Acte I)"},{type:'level',n:25,text:'Atteins le niveau 25'},{type:'elites',n:30,text:'Élimine 30 élites'}],reward:{gold:20000,mats:{ambre:20,braise:3}}},
    {name:'Chapitre 3 — Les Failles',goals:[{type:'rifts',n:3,text:'Termine 3 failles'},{type:'bounties',n:5,text:'Termine 5 primes'},{type:'level',n:40,text:'Atteins le niveau 40'}],reward:{gold:50000,mats:{braise:8},keys:3}},
    {name:'Chapitre 4 — L\'Héritage',goals:[{type:'gr',n:5,text:'Termine une faille supérieure 5'},{type:'extract',n:1,text:'Extrais un pouvoir au Cube Nova'},{type:'fusion',n:1,text:'Active une fusion'}],reward:{gold:100000,set:'set_saison1'}},
    {name:'Chapitre 5 — Le Tourment',goals:[{type:'level',n:70,text:'Atteins le niveau 70'},{type:'diff',n:4,text:'Joue en Tourment I ou plus'},{type:'gr',n:20,text:'Termine une faille supérieure 20'}],reward:{gold:300000,mats:{braise:30},keys:10}},
    {name:'Chapitre 6 — Le Sommet',goals:[{type:'paragon',n:100,text:'Atteins le parangon 100'},{type:'gr',n:45,text:'Termine une faille supérieure 45'},{type:'diff',n:13,text:'Joue en Tourment X ou plus'}],reward:{gold:1000000,mats:{braise:80},keys:25}}
  ]
},

/* ---------------- Faille de la semaine (défi aux conditions imposées) ---------------- */
WEEKLY:[
  {id:'w1',name:'La Charge des Mille Sabots',cls:'paladin',level:70,gr:15,skills:[['pal_frappe',1],['pal_bouclier',0],['pal_rempart',1],['pal_charge',2],['pal_lanciers',2],['pal_ire',0]],
   set:'set_destrier',legs:['p_zelote','g_premiersang','g_remanence'],fusions:['pf_egide','pf_celeste'],text:'Paladin imposé, set Serment du Destrier. Termine la faille supérieure 15 en moins de 15 min.'},
  {id:'w2',name:'Le Bal des Pièges',cls:'traqueuse',level:70,gr:15,skills:[['tq_carreau',0],['tq_salve',2],['tq_voile',0],['tq_saut',0],['tq_piege',2],['tq_pluie',0]],
   set:'set_piegeur',legs:['t_embuscade','g_echo','t_piegeur'],fusions:['tf_mines','tf_saut'],text:'Traqueuse imposée, set Parure du Piégeur. Termine la faille supérieure 15 en moins de 15 min.'},
  {id:'w3',name:"L'Armée des Os",cls:'shaman',level:70,gr:15,skills:[['sh_dard',0],['sh_nuee',0],['sh_marche',1],['sh_corbeaux',0],['sh_gardiens',2],['sh_colosse',0]],
   set:'set_colosse',legs:['s_ancetres','s_colosse','s_ossuaire'],fusions:['sf_rage','sf_peste'],text:'Shaman imposé, set Rite du Colosse. Termine la faille supérieure 15 en moins de 15 min.'}
],

/* ---------------- Économie et déblocages ---------------- */
MATERIALS:{
  ferraille:{n:'Ferraille',css:'#b8b8b8',icon:'anvil'},
  azur:{n:"Poussière d'azur",css:'#6a9bff',icon:'crystal-shine'},
  ambre:{n:"Cristal d'ambre",css:'#f2d14b',icon:'crystal-cluster'},
  braise:{n:'Braise éternelle',css:'#ff8a2e',icon:'fire-gem'},
  trophee:{n:'Trophée de prime',css:'#e85aff',icon:'trophy-cup'}
},
UNLOCKS:{tavern:20,altar:30,fusionSlots:[2,2,3],fusionSlot3Paragon:100,gemSlots:3},
COSTS:{
  craft:{gold:300,ferraille:4,azur:3,ambre:2},           /* × (1 + niveau/10) */
  upgrade:{gold:1500,ambre:4,braise:1,max:5},             /* +6 % des stats par amélioration */
  enchant:{gold:400,azur:2,step:1.5},                     /* coût × step^n */
  extract:{gold:2000,braise:1,ambre:2,azur:2,ferraille:2},
  rareToLeg:{gold:5000,ferraille:25,azur:25,ambre:25,braise:3},
  fusionDiscover:{gold:5000,ambre:10,braise:2},
  fusionActivate:{gold:1000,azur:5}
},
POTION:{threshold:0.35,heal:0.6,cd:30},

/* ---------------- Histoire en ville et tutoriel ---------------- */
TUTORIAL:{
  move:'Pose le doigt n\'importe où et glisse pour te déplacer (ou ZQSD / flèches).',
  attack:'Ton héros attaque tout seul l\'ennemi le plus proche.',
  red:'Sors des cercles rouges avant qu\'ils ne se remplissent !',
  skills:'Tes compétences se lancent toutes seules. Mode manuel dans Réglages.',
  loot:'Marche sur un faisceau lumineux pour ramasser l\'objet.',
  menu:'Ouvre le MENU pour équiper tes objets (flèches vertes = mieux).',
  potion:'Ta potion se boit toute seule sous 35 % de vie (recharge 30 s).',
  town:'Ville : approche-toi d\'un personnage pour lui parler.',
  newSkill:'Nouvelle compétence débloquée ! Va voir l\'onglet Compétences.',
  rune:'Nouvelle rune débloquée : elle change le comportement d\'une compétence.',
  elite:'Élite ! Ses pouvoirs sont écrits sous son nom. Garde tes distances.',
  adventure:'Mode Aventure ouvert : primes au Panneau, failles à l\'Obélisque.',
  tavern:'La Taverne est ouverte : recrute un compagnon.',
  altar:"L'Autel des fusions est ouvert : combine deux compétences.",
  paragon:'Niveau 70 ! Chaque niveau de parangon donne un point (onglet Parangon).',
  gr:'Faille supérieure : 15 minutes. Plus tu finis vite, plus la clé monte.',
  gem:'Gemme légendaire ! Sertis-la dans l\'onglet Gemmes.'
}
};

/* ======================= Acte II : Les Sables Rouges (passe 2) =======================
   Ajouté comme un bloc séparé : mêmes formats de données que ci-dessus. */
(function(D){
D.ACT2={id:2,name:'Acte II — Les Sables Rouges',
  intro:[{who:'Maëlis la Veilleuse',txt:"Les cendres de Morgraël ont été emportées vers le sud, au-delà des Dunes de Sel-Rouge."},
         {who:'Maëlis la Veilleuse',txt:"Une reine ancienne s'y réveille. Le Point de passage te mène aux Dunes."}],
  steps:[
    {id:'a2s1',zone:'dunes',clear:130,text:'Traverse les Dunes de Sel-Rouge',goal:'named',named:'pilleur',hint:'Élimine Khaz le Pilleur'},
    {id:'a2s2',zone:'canyon',clear:140,text:'Descends le Canyon des Échos',goal:'named',named:'gardecanyon',hint:'Vaincs la Sentinelle des Échos'},
    {id:'a2s3',zone:'oasis',clear:150,text:"Purifie l'Oasis Noire",goal:'named',named:'djinnoir',hint:'Bannis le Djinn Noir'},
    {id:'a2s4',zone:'tombeau',clear:120,text:'Entre dans le Tombeau du Roi-Scarabée',goal:'boss',named:'ashkara',hint:'Vaincs Ashkara, la Reine des Sables'},
    {id:'a2s5',zone:null,text:'Acte II terminé ! Nouvelles primes et failles dans le désert.',goal:'none'}],
  outro:[{who:'Maëlis la Veilleuse',txt:"La Reine des Sables est tombée. Mais le sable murmure encore le nom d'un troisième feu…"},
         {who:'Maëlis la Veilleuse',txt:"(L'Acte III arrivera bientôt.) En attendant, les failles du désert t'attendent."}]};
Object.assign(D.MONSTERS,{
  scorpion:{name:'Scorpion de Sel',fam:'sables',model:'spider',color:0x8a4a2a,eye:0xffd04a,s:1.2,hp:1.2,dmg:1.2,speed:3.6,beh:'charger'},
  momie:{name:'Momie Bandée',fam:'sables',model:'biped',color:0xc8b890,eye:0x5ac8ff,s:1.05,hp:1.6,dmg:1.1,speed:2.2,beh:'melee'},
  djinn:{name:'Djinn de Braise',fam:'sables',model:'floater',color:0xd86a2a,eye:0xfff07a,s:1.15,hp:1.1,dmg:1.2,speed:2.8,beh:'caster',zone:'fire',fly:1},
  vercendre:{name:'Ver de Cendre',fam:'sables',model:'blob',color:0x9a7a4a,eye:0xff3a1a,s:0.85,hp:0.5,dmg:2.3,speed:4.4,beh:'kamikaze'},
  archersable:{name:'Archer des Dunes',fam:'sables',model:'biped',color:0xa8804a,eye:0xff8a3a,s:0.95,hp:0.8,dmg:0.95,speed:3,beh:'ranged',range:10,proj:0xffc070,bow:1},
  pretrescarabee:{name:'Prêtre Scarabée',fam:'sables',model:'biped',color:0x2a6a6a,eye:0xffd04a,s:1.1,hp:1.2,dmg:0.8,speed:2.4,beh:'summoner',summon:'scarabee',robe:1},
  pilier:{name:'Pilier de sable',fam:'sables',model:'brute',color:0xc8a060,eye:0xffe08a,s:1.2,hp:1.4,dmg:0,speed:0,beh:'totem'},
  voleur:{name:"Voleur d'Étincelles",fam:'demons',model:'biped',color:0xd8a020,eye:0xffffff,s:0.85,hp:2.5,dmg:0,speed:5.2,beh:'flee'}
});
Object.assign(D.BOSSES,{
  ashkara:{name:'Ashkara, la Reine des Sables',model:'spider',color:0x6a4a1a,eye:0x3affd0,s:3.2,hp:46,dmg:2.3,speed:2.8,
    intro:'Ashkara : « Le sable a tout englouti. Il t\'engloutira aussi. »',
    phases:[{at:1,name:'Phase 1 — La Tempête',moves:['slam','tornado','summon'],summon:'vercendre'},
            {at:0.6,name:'Phase 2 — Les Piliers',moves:['pillars','burrow','tornado'],text:'Ashkara se protège : détruis les Piliers de sable !',summon:'scarabee',enrage:1.15},
            {at:0.25,name:'Phase 3 — La Reine Furieuse',moves:['burrow','tornado','meteorRain','slam'],text:'Ashkara entre en fureur !',enrage:1.35}]},
  scarabroi:{name:'Roi-Scarabée Fantôme',model:'spider',color:0x2a5a5a,eye:0xffd04a,s:2.6,hp:30,dmg:2,speed:3,guardian:1,
    phases:[{at:1,moves:['tornado','slam','summon'],summon:'scarabee'},{at:0.5,moves:['burrow','tornado','slam'],enrage:1.25}]}
});
D.RIFT_GUARDIANS.push('scarabroi');
Object.assign(D.THEMES,{
  dunes:{sky:0x8a6a48,fog:0x9a7a58,ground:[0xc8a068,0xb08a58],path:0xd8b880,props:'desert',trees:'cactus',light:0xffe0b0,tex:'sand'},
  canyon:{sky:0x6a3a2a,fog:0x7a4a32,ground:[0xa8603a,0x8a4a2e],path:0xc8805a,props:'desert',trees:'dead',light:0xffc89a,tex:'dirt',wall:0x7a3a24},
  oasis:{sky:0x2a3a3a,fog:0x2a4040,ground:[0x6a7a3a,0x5a6a32],path:0xb89a68,props:'swamp',trees:'palm',water:0x1a4a4a,light:0xb8e0d0,tex:'grass'},
  tombeau:{sky:0x120e08,fog:0x1a140c,ground:[0x8a7450,0x6a5a40],wall:0x8a7048,props:'crypt',light:0xffd08a,dungeon:1,tex:'tiles'},
  r_sables:{name:'Faille des Sables',sky:0x6a5030,fog:0x7a5a38,ground:[0xb89058,0x9a7848],path:0xd8b070,props:'desert',trees:'cactus',light:0xffd8a0,wall:0x8a6a40,tex:'sand'},
  r_abime:{name:"Faille de l'Abîme",sky:0x050508,fog:0x0a0a14,ground:[0x2a2a3a,0x1e1e2a],path:0x3a3a5a,props:'astral',trees:'crystal',light:0x6a8aff,wall:0x2a2a40,tex:'ash'}
});
D.RIFT_THEMES.push('r_sables','r_abime');
Object.assign(D.ZONES,{
  dunes:{name:'Dunes de Sel-Rouge',type:'outdoor',lvl:10,size:150,theme:'dunes',fams:['sables','betes'],packs:28,elites:4,next:'canyon',act:2,music:{root:92,scale:[0,1,4,5,7],mood:0.5},
    enter:{who:'Maëlis (écho)',txt:"Le vent du désert porte des voix. Méfie-toi des vers : ils explosent à ton contact."},
    named:[{id:'pilleur',name:'Khaz le Pilleur',type:'archersable',at:0.85}],events:[{name:'Caravane attaquée',type:'waves',at:0.5,mons:['archersable','scorpion']}]},
  canyon:{name:'Canyon des Échos',type:'outdoor',lvl:12,size:150,theme:'canyon',fams:['sables','demons'],packs:30,elites:4,next:'oasis',act:2,music:{root:82,scale:[0,1,4,5,8],mood:0.6},
    enter:{who:'Maëlis (écho)',txt:"Les parois renvoient tout. Même les cris des djinns."},
    named:[{id:'gardecanyon',name:'Sentinelle des Échos',type:'sentinelle',at:0.85}],events:[{name:'Nid de scorpions',type:'waves',at:0.5,mons:['scorpion','vercendre']}]},
  oasis:{name:'Oasis Noire',type:'outdoor',lvl:13,size:150,theme:'oasis',fams:['sables','esprits'],packs:30,elites:5,next:'tombeau',act:2,music:{root:78,scale:[0,2,3,7,10],mood:0.65},
    enter:{who:'Maëlis (écho)',txt:"L'eau est noire de cendre. Quelque chose y nage."},
    named:[{id:'djinnoir',name:'Le Djinn Noir',type:'djinn',at:0.85}],events:[{name:'Les Puits Hurlants',type:'waves',at:0.5,mons:['djinn','peine','momie']}]},
  tombeau:{name:'Tombeau du Roi-Scarabée',type:'dungeon',lvl:15,size:120,theme:'tombeau',fams:['sables','morts'],packs:26,elites:5,next:null,boss:'ashkara',act:2,music:{root:69,scale:[0,1,4,6,7],mood:0.85},
    enter:{who:'Maëlis (écho)',txt:"Ashkara dort au fond. Quand elle se protège, cherche ce qui la protège."},
    named:[],events:[{name:'La Chambre des Momies',type:'waves',at:0.5,mons:['momie','pretrescarabee']}]}
});
Object.assign(D.BOUNTIES,{
  dunes:[{type:'named',name:'Mâchoire-de-Sel',mon:'scorpion'},{type:'event',name:'La Caravane Perdue',mons:['archersable','momie','vercendre']},{type:'named',name:'Seth le Bandé',mon:'momie'},{type:'named',name:'Œil-Brûlant',mon:'djinn'},{type:'boss',name:'Khaz le Pilleur',mon:'archersable'}],
  canyon:[{type:'named',name:'Dard-Rouge',mon:'scorpion'},{type:'event',name:"L'Écho des Morts",mons:['momie','rodeur','tireur']},{type:'named',name:'Cendre-Vive',mon:'brute'},{type:'named',name:'Le Prêtre Muet',mon:'pretrescarabee'},{type:'boss',name:'Sentinelle des Échos',mon:'sentinelle'}],
  oasis:[{type:'named',name:'Nymphe Pourrie',mon:'peine'},{type:'event',name:'Les Eaux Noires',mons:['djinn','follet','hurleur']},{type:'named',name:'Gardien du Puits',mon:'momie'},{type:'named',name:'La Vipère',mon:'tisseuse'},{type:'boss',name:'Le Djinn Noir',mon:'djinn'}],
  tombeau:[{type:'named',name:'Le Grand Embaumeur',mon:'pretrescarabee'},{type:'event',name:'Le Réveil des Rois',mons:['momie','momie','scorpion']},{type:'named',name:'Gardien Doré',mon:'sentinelle'},{type:'named',name:'Ver-Roi',mon:'vercendre'},{type:'boss',name:'Ashkara, la Reine des Sables',mon:'ashkara'}]
});
Object.assign(D.BOUNTY_TARGETS,{
  dunes:['g_pelerin','p_brassards','t_ruee','s_corbeau','g_vigilance','g_collecteur'],
  canyon:['g_remanence','p_fers','t_piegeur','s_funebre','g_echo','g_premiersang'],
  oasis:['g_souffle','p_sentence','t_ombrevive','s_nuee','g_gardien','g_tempete'],
  tombeau:['g_alliances','p_martele','t_meute','s_manes','g_convergence','g_etoile']
});
/* Set générique (toutes classes) */
D.SETS.push({id:'set_errant',cls:null,name:"Vestiges de l'Errant",style:'Survie · polyvalent',slots:['tete','epaules','torse','mains','jambes','pieds'],
  b2:{text:'+15 % de vie et −10 % de dégâts subis.',fx:[{t:'stat',s:{lifeP:0.15,dr:0.1}}]},
  b4:{text:'Toutes les 8 s, une onde (400 %) repousse les ennemis proches.',fx:[{t:'periodic',every:8,do:'nova',m:4,el:'phys'}]},
  b6:{text:'Toutes tes compétences ×4 et +20 % de vitesse de déplacement.',fx:[{t:'skillDmg',skill:'*',m:4},{t:'stat',s:{ms:0.2}}]}});
D.TUTORIAL.act2="Acte II ouvert : le Point de passage mène aux Dunes de Sel-Rouge.";
D.TUTORIAL.thief="Un Voleur d'Étincelles ! Rattrape-le avant qu'il ne s'enfuie : il porte un trésor.";
})(window.NI_DATA);
