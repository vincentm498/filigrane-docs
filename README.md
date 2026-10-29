# Filigrane de documents

**[Ouvrir la page en ligne](https://vincentm498.github.io/filigrane-docs/)** — rien à installer, tout se passe dans votre navigateur.

Protège la copie d'un document (pièce d'identité, diplôme, etc.) avant envoi ou publication.

Pour chaque fichier, l'outil :

1. masque les zones indiquées (aplat noir) ;
2. applique un filigrane en vagues, en diagonale, répété sur toute la surface :
   « Destiné à *destinataire* – pour *motif* – le *date* » ;
3. supprime les métadonnées (EXIF, etc.) ;
4. exporte dans le format choisi, en résolution réduite.

Deux façons de l'utiliser, au résultat équivalent :

| | Page web (`index.html`) | Script (`filigrane.py`) |
|---|---|---|
| Installation | aucune | Python + dépendances |
| Zones à masquer | tracées à la souris, déplaçables | coordonnées en pixels |
| Entrées | images lisibles par le navigateur, PDF | images (dont HEIC, TIFF), PDF |
| Sorties | JPG, PNG, WEBP, PDF | JPG, PNG, WEBP, PDF |
| Correction d'orientation | oui, en degrés | non (`--angle` règle le filigrane) |
| Plusieurs fichiers | oui, téléchargement en ZIP | oui, en ligne de commande |

> Un filigrane dissuade et permet de prouver l'origine d'une copie, mais il n'empêche
> pas l'OCR ni la capture d'écran. Pour les informations sensibles inutiles au
> destinataire (numéro de carte, QR code, date de naissance…), utilisez le masquage.

---

## Page web

### Installation

Aucune. Ouvrez `index.html` dans un navigateur (double-clic).

Une connexion internet est nécessaire : la page charge pdf.js (lecture des PDF),
jsPDF (sortie PDF) et JSZip (téléchargement groupé) depuis un CDN. Les images
seules fonctionnent sans ces bibliothèques, sauf le ZIP.

Aucun fichier n'est envoyé : tout est traité dans le navigateur.

### Utilisation

1. **Fichiers** : déposez vos images ou PDF dans la zone prévue, ou cliquez pour les
   choisir. Cliquez sur un fichier de la liste pour le voir dans l'aperçu.
2. **Filigrane** : renseignez le destinataire et le motif (obligatoires), vérifiez la
   date et réglez l'opacité. L'aperçu se met à jour en direct.
3. **Orientation (facultatif)** : sous l'aperçu, les boutons ⟲ 90° et ⟳ 90° tournent
   l'image, et le champ « ° » accepte n'importe quel angle (par exemple `2.5` pour
   redresser un scan penché ; positif = sens horaire). « Remettre à 0 » annule. La
   rotation est propre à chaque fichier et s'applique à toutes ses pages ; les coins
   libérés par une rotation oblique sont remplis de blanc.
4. **Masquage (facultatif)** : tracez un rectangle à la souris sur l'aperçu pour
   masquer une zone. Cliquez sur une zone pour la sélectionner (contour pointillé),
   puis faites-la glisser pour la déplacer, tirez la poignée carrée de son coin
   bas-droit pour la redimensionner, ou la poignée ronde au-dessus pour la faire
   tourner (Maj enfoncée : par pas de 15°). Le champ « Angle de la zone » permet de
   saisir l'angle exact en degrés. « Supprimer la zone » (ou la touche Suppr) retire
   la zone sélectionnée, « Tout effacer » les retire toutes. Les zones sont propres à chaque
   fichier et s'appliquent à toutes ses pages. Réglez l'orientation **avant** de tracer
   les zones : si vous tournez l'image ensuite, les zones restent à la même position
   à l'écran et il faut les replacer.
5. **Sortie** : choisissez le format, la qualité (JPG/WEBP) et la largeur maximale,
   puis cliquez sur **Générer**.
6. **Téléchargement** : un lien apparaît par fichier généré. S'il y en a plusieurs,
   « Tout télécharger (.zip) » les regroupe dans une seule archive.

### Limites

- Les formats HEIC et TIFF ne s'ouvrent que si le navigateur sait les lire (Safari
  oui, Chrome et Firefox non). Utilisez alors le script.
- L'angle du filigrane est fixé à 30°.
- Un PDF est rendu à 150 dpi, une page par image.

---

## Script `filigrane.py`

### Installation

Prérequis : Python 3 (testé avec 3.12). Les commandes ci-dessous sont celles de macOS et Linux.

```bash
cd filigrane
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Dépendances (`requirements.txt`) : `Pillow` (images), `pymupdf` (lecture des PDF),
`pillow-heif` (lecture du HEIC, facultatif).

### Utilisation

```bash
.venv/bin/python filigrane.py FICHIER [FICHIER ...] -d DESTINATAIRE -m MOTIF [options]
```

Exemple :

```bash
.venv/bin/python filigrane.py carte.jpg diplome.pdf \
    -f jpg -d "Poney club des Ulis" -m "publication sur le site web" \
    --masque 860,0,340,80 -o sortie
```

Les fichiers protégés sont écrits dans le dossier `sortie` (créé si besoin) sous le
nom `<nom d'origine>_protege.<extension>`. Un PDF de plusieurs pages donne un fichier
par page (`_p1`, `_p2`…) sauf en sortie PDF. Les originaux ne sont jamais modifiés.

### Options

| Option | Rôle | Défaut |
|---|---|---|
| `-f`, `--format` | format de sortie : `jpg`, `png`, `webp`, `pdf` | `jpg` |
| `-d`, `--destinataire` | « Destiné à … » | — |
| `-m`, `--motif` | « … pour … » | — |
| `-t`, `--texte` | texte complet du filigrane (remplace `-d`, `-m` et la date) | — |
| `--masque X,Y,L,H` | zone à masquer, en pixels de l'original ; répétable | aucune |
| `-o`, `--sortie` | dossier de sortie | `./sortie` |
| `-q`, `--qualite` | qualité JPG/WEBP, 1 à 95 | 70 |
| `--largeur-max` | largeur maximale en pixels, `0` pour ne pas redimensionner | 1600 |
| `--dpi` | résolution de rendu des PDF | 150 |
| `--opacite` | opacité du filigrane, 0 à 255 | 115 |
| `--angle` | angle du filigrane en degrés | 30 |

`-d` et `-m` vont ensemble ; à défaut, indiquez `-t`. La liste complète s'affiche avec
`--help`.

### Repérer les coordonnées d'un masque

`--masque X,Y,L,H` désigne le coin supérieur gauche (X, Y) puis la largeur L et la
hauteur H, en pixels de l'image d'origine. Pour les repérer sans calcul, tracez la zone
dans la page web : l'aperçu l'affiche immédiatement.

---

## Dépannage

- **Fichiers `.part` après un téléchargement groupé (page web)** : utilisez le bouton
  « Tout télécharger (.zip) » plutôt que de lancer plusieurs téléchargements à la suite.
- **« lecteur PDF indisponible » (page web)** : pas de connexion, le CDN n'a pas pu
  charger pdf.js.
- **`ModuleNotFoundError: PIL` ou `pymupdf` (script)** : lancez le script avec
  `.venv/bin/python`, pas avec le Python du système.

---

## Licence

[MIT](LICENSE)
