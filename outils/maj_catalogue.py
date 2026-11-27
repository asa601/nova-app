#!/usr/bin/env python3
"""Tient à jour catalogue.json de Nova App (à lancer depuis la racine du dépôt nova-app).

  python3 outils/maj_catalogue.py maj ID [ID...]
      Après avoir remplacé les fichiers de jeux/ID/ : version du jeu +1.
  python3 outils/maj_catalogue.py ajouter ID --nom "Nom" --groupe GROUPE --genre "Type" --desc "Description" [--orientation portrait|paysage]
      Ajoute un nouveau jeu (fichiers déjà copiés dans jeux/ID/, vignette dans vignettes/ID.jpg).
  python3 outils/maj_catalogue.py groupe ID "Nom du groupe"
      Ajoute un groupe (rangée de l'accueil).
  python3 outils/maj_catalogue.py firebase API_KEY PROJECT_ID
      Active les comptes (Firebase Auth + Firestore) chez tout le monde.
  python3 outils/maj_catalogue.py verifier
      Recalcule les listes de fichiers et vérifie tout, sans rien publier de nouveau.

Chaque commande qui change quelque chose augmente aussi la « mise à jour » affichée
dans l'appli (version 1.N.0) et le compteur rev.
"""
import argparse
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(RACINE, 'catalogue.json')
ID_OK = re.compile(r'^[a-z0-9-]{1,40}$')
FICHIER_OK = re.compile(r'^[A-Za-z0-9._/-]+$')


def lire():
    with open(CAT, encoding='utf-8') as f:
        return json.load(f)


def ecrire(c):
    with open(CAT, 'w', encoding='utf-8') as f:
        json.dump(c, f, ensure_ascii=False, indent=1)
        f.write('\n')


def fichiers(gid):
    base = os.path.join(RACINE, 'jeux', gid)
    if not os.path.isfile(os.path.join(base, 'index.html')):
        sys.exit(f'ERREUR : jeux/{gid}/index.html manquant')
    out = []
    for r, _, fs in os.walk(base):
        for f in fs:
            if f.startswith('.'):
                continue
            p = os.path.relpath(os.path.join(r, f), base).replace(os.sep, '/')
            if not FICHIER_OK.match(p):
                sys.exit(f'ERREUR : nom de fichier interdit dans jeux/{gid} : {p} (lettres, chiffres, . _ - / seulement)')
            out.append({'p': p, 't': os.path.getsize(os.path.join(r, f))})
    return sorted(out, key=lambda x: x['p'])


def rafraichir(j):
    j['fichiers'] = fichiers(j['id'])
    j['taille'] = sum(f['t'] for f in j['fichiers'])


def monter_version(c):
    a, b, _ = (c.get('version', '1.0.0').split('.') + ['0', '0'])[:3]
    c['version'] = f'{a}.{int(b) + 1}.0'
    c['rev'] = int(c.get('rev', 1)) + 1


def verifier(c):
    ids = [j['id'] for j in c['jeux']]
    groupes = {g['id'] for g in c['groupes']}
    pb = []
    for j in c['jeux']:
        if not ID_OK.match(j['id']):
            pb.append(f"id invalide : {j['id']}")
        if j['groupe'] not in groupes:
            pb.append(f"{j['id']} : groupe inconnu {j['groupe']}")
        if not os.path.isfile(os.path.join(RACINE, 'vignettes', j['id'] + '.jpg')):
            pb.append(f"{j['id']} : vignettes/{j['id']}.jpg manquante")
        reel = fichiers(j['id'])
        if reel != j['fichiers']:
            pb.append(f"{j['id']} : liste de fichiers pas à jour (lance « maj {j['id']} »)")
    for d in sorted(os.listdir(os.path.join(RACINE, 'jeux'))):
        if d not in ids:
            pb.append(f'jeux/{d} n\'est pas dans le catalogue (lance « ajouter {d} … »)')
    return pb


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    m = sp.add_parser('maj'); m.add_argument('ids', nargs='+')
    m.add_argument('--nom'); m.add_argument('--genre'); m.add_argument('--desc')
    m.add_argument('--orientation', choices=['portrait', 'paysage', 'auto'])
    a = sp.add_parser('ajouter'); a.add_argument('id')
    a.add_argument('--nom', required=True); a.add_argument('--groupe', required=True)
    a.add_argument('--genre', required=True); a.add_argument('--desc', required=True)
    a.add_argument('--orientation', default='portrait', choices=['portrait', 'paysage', 'auto'])
    g = sp.add_parser('groupe'); g.add_argument('id'); g.add_argument('nom')
    f = sp.add_parser('firebase'); f.add_argument('api_key'); f.add_argument('project_id')
    sp.add_parser('verifier')
    x = ap.parse_args()
    c = lire()
    par_id = {j['id']: j for j in c['jeux']}

    if x.cmd == 'maj':
        for gid in x.ids:
            if gid not in par_id:
                sys.exit(f'ERREUR : {gid} n\'est pas dans le catalogue')
            j = par_id[gid]
            infos = {k: getattr(x, k) for k in ('nom', 'genre', 'desc', 'orientation') if getattr(x, k)}
            if infos and len(x.ids) > 1:
                sys.exit('ERREUR : --nom/--genre/--desc/--orientation avec un seul jeu à la fois')
            j.update(infos)
            rafraichir(j)
            j['version'] = int(j.get('version', 1)) + 1
            print(f"{j['nom']} : version {j['version']} ({len(j['fichiers'])} fichiers, {j['taille']} octets)")
        monter_version(c)
    elif x.cmd == 'ajouter':
        if not ID_OK.match(x.id):
            sys.exit('ERREUR : id = minuscules, chiffres et tirets seulement')
        if x.id in par_id:
            sys.exit(f'ERREUR : {x.id} existe déjà (utilise « maj »)')
        if x.groupe not in {gr['id'] for gr in c['groupes']}:
            sys.exit(f"ERREUR : groupe inconnu. Groupes : {', '.join(gr['id'] for gr in c['groupes'])}")
        for j in c['jeux']:
            j['nouveau'] = False
        j = {'id': x.id, 'nom': x.nom, 'groupe': x.groupe, 'genre': x.genre, 'desc': x.desc, 'version': 1,
             'orientation': x.orientation, 'nouveau': True}
        rafraichir(j)
        # en tête de son groupe
        idx = next((i for i, k in enumerate(c['jeux']) if k['groupe'] == x.groupe), len(c['jeux']))
        c['jeux'].insert(idx, j)
        monter_version(c)
        print(f'Ajouté : {x.nom} ({j["taille"]} octets)')
    elif x.cmd == 'groupe':
        if x.id in {gr['id'] for gr in c['groupes']}:
            sys.exit('ERREUR : ce groupe existe déjà')
        c['groupes'].append({'id': x.id, 'nom': x.nom})
        monter_version(c)
    elif x.cmd == 'firebase':
        c['firebase'] = {'apiKey': x.api_key, 'projectId': x.project_id}
        monter_version(c)

    pb = verifier(c)
    if pb:
        print('À CORRIGER :')
        for p in pb:
            print(' -', p)
        if x.cmd != 'verifier':
            sys.exit('Catalogue NON enregistré.')
        sys.exit(1)
    if x.cmd != 'verifier':
        ecrire(c)
        print(f"catalogue.json enregistré : mise à jour v{c['version']} (rev {c['rev']}), {len(c['jeux'])} jeux")
    else:
        print(f"Tout est bon : v{c['version']} (rev {c['rev']}), {len(c['jeux'])} jeux")


if __name__ == '__main__':
    main()
