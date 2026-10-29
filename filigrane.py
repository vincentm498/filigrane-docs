#!/usr/bin/env python3
"""Protège une copie de document (pièce d'identité, etc.) avant envoi.

Pour chaque fichier d'entrée (image JPG/PNG/WEBP/HEIC/TIFF/BMP/GIF… ou PDF) :
  1. masque les zones indiquées (aplat noir) ;
  2. applique un filigrane diagonal répété sur toute la surface ;
  3. supprime les métadonnées (EXIF, etc.) ;
  4. exporte dans le format choisi (jpg, png, webp, pdf), résolution réduite.

Exemple :
  python filigrane.py carte.jpg -f pdf -d "Société ACME" -m "Dossier de location" \
      --masque 860,0,340,120
"""
import argparse
import math
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

FORMATS = {"jpg": "JPEG", "png": "PNG", "webp": "WEBP", "pdf": "PDF"}
EXTENSIONS = {"jpg": ".jpg", "png": ".png", "webp": ".webp", "pdf": ".pdf"}

POLICES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def charger_police(taille):
    for chemin in POLICES:
        try:
            return ImageFont.truetype(chemin, taille)
        except OSError:
            continue
    return ImageFont.load_default(taille)


def enregistrer_heif():
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except ImportError:
        pass


def ouvrir_pages(chemin, dpi):
    """Retourne la liste des pages (images RGB) d'un fichier d'entrée."""
    if chemin.suffix.lower() == ".pdf":
        try:
            import pymupdf
        except ImportError:
            sys.exit("Lecture des PDF : pip install pymupdf")
        pages = []
        with pymupdf.open(chemin) as pdf:
            for page in pdf:
                pix = page.get_pixmap(dpi=dpi)
                pages.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
        return pages

    pages = []
    with Image.open(chemin) as img:
        n = getattr(img, "n_frames", 1)
        for i in range(n):
            img.seek(i)
            frame = ImageOps.exif_transpose(img)  # applique la rotation EXIF avant de la supprimer
            pages.append(frame.convert("RGB"))
    return pages


def parse_masque(texte):
    try:
        x, y, l, h = (int(v) for v in texte.split(","))
    except ValueError:
        raise argparse.ArgumentTypeError("format attendu : x,y,largeur,hauteur (pixels)")
    return x, y, l, h


def masquer(img, zones, echelle):
    draw = ImageDraw.Draw(img)
    for x, y, l, h in zones:
        draw.rectangle(
            [x * echelle, y * echelle, (x + l) * echelle, (y + h) * echelle], fill="black"
        )


def onduler(calque, amplitude, longueur_onde, largeur_bande=2):
    """Décale chaque bande verticale selon une sinusoïde : le texte ondule, les lignes restent parallèles."""
    resultat = Image.new("RGBA", calque.size, (0, 0, 0, 0))
    for x in range(0, calque.width, largeur_bande):
        decalage = round(amplitude * math.sin(2 * math.pi * x / longueur_onde))
        resultat.paste(calque.crop((x, 0, x + largeur_bande, calque.height)), (x, decalage))
    return resultat


def filigraner(img, texte, opacite, angle):
    larg, haut = img.size
    taille = max(10, int(min(larg, haut) / 40))
    police = charger_police(taille)
    bbox = police.getbbox(texte)
    largeur_texte = bbox[2] - bbox[0]
    pas_ligne = int(taille * 2.2)
    pas_texte = largeur_texte + taille * 2

    # grand calque droit couvert de lignes de texte décalées d'une ligne à l'autre,
    # puis tourné d'un bloc : les lignes restent parallèles et ne se chevauchent pas
    cote = int((larg ** 2 + haut ** 2) ** 0.5) + 2 * pas_texte
    calque = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    # contour clair pour rester lisible sur fond sombre comme sur fond clair
    contour = (255, 255, 255, opacite // 2)
    for n, y in enumerate(range(0, cote, pas_ligne)):
        for x in range(-(n * pas_texte // 3) % pas_texte - pas_texte, cote, pas_texte):
            d.text((x, y), texte, font=police, fill=(128, 128, 128, opacite),
                   stroke_width=1, stroke_fill=contour)
    calque = onduler(calque, amplitude=taille * 0.7, longueur_onde=taille * 12)
    calque = calque.rotate(angle, resample=Image.BICUBIC)
    gauche, haut_c = (cote - larg) // 2, (cote - haut) // 2
    calque = calque.crop((gauche, haut_c, gauche + larg, haut_c + haut))
    return Image.alpha_composite(img.convert("RGBA"), calque).convert("RGB")


def sans_metadonnees(img):
    """Recrée l'image à partir des seuls pixels : plus d'EXIF/ICC/XMP."""
    return Image.frombytes("RGB", img.size, img.tobytes())


def exporter(pages, base, fmt, qualite):
    ext = EXTENSIONS[fmt]
    if fmt == "pdf":
        sortie = base.with_name(base.name + ext)
        pages[0].save(sortie, "PDF", save_all=True, append_images=pages[1:], resolution=150.0)
        return [sortie]
    sorties = []
    for i, page in enumerate(pages, 1):
        sortie = base.with_name(f"{base.name}_p{i}{ext}") if len(pages) > 1 else base.with_name(base.name + ext)
        options = {"quality": qualite} if fmt in ("jpg", "webp") else {}
        if fmt == "jpg":
            options["optimize"] = True
        page.save(sortie, FORMATS[fmt], **options)
        sorties.append(sortie)
    return sorties


def traiter(chemin, args):
    pages = ouvrir_pages(chemin, args.dpi)
    resultat = []
    for page in pages:
        echelle = 1.0
        if args.largeur_max and page.width > args.largeur_max:
            echelle = args.largeur_max / page.width
            page = page.resize((args.largeur_max, round(page.height * echelle)), Image.LANCZOS)
        masquer(page, args.masque, echelle)
        page = filigraner(page, args.texte, args.opacite, args.angle)
        resultat.append(sans_metadonnees(page))

    args.sortie.mkdir(parents=True, exist_ok=True)
    return exporter(resultat, args.sortie / f"{chemin.stem}_protege", args.format, args.qualite)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("fichiers", nargs="+", type=Path, help="fichiers d'entrée (images, PDF)")
    p.add_argument("-f", "--format", choices=FORMATS, default="jpg", help="format de sortie (défaut : jpg)")
    p.add_argument("-t", "--texte", help="texte complet du filigrane (remplace -d/-m/date)")
    p.add_argument("-d", "--destinataire", help="« Destiné à … »")
    p.add_argument("-m", "--motif", help="« … pour … »")
    p.add_argument("--masque", action="append", default=[], type=parse_masque, metavar="X,Y,L,H",
                   help="zone à masquer en pixels de l'original ; répétable")
    p.add_argument("-o", "--sortie", type=Path, default=Path("sortie"), help="dossier de sortie (défaut : ./sortie)")
    p.add_argument("-q", "--qualite", type=int, default=70, help="qualité JPG/WEBP 1-95 (défaut : 70)")
    p.add_argument("--largeur-max", type=int, default=1600, help="largeur max en px, 0 = inchangée (défaut : 1600)")
    p.add_argument("--dpi", type=int, default=150, help="résolution de rendu des PDF (défaut : 150)")
    p.add_argument("--opacite", type=int, default=115, help="opacité du filigrane 0-255 (défaut : 115)")
    p.add_argument("--angle", type=float, default=30, help="angle du filigrane (défaut : 30)")
    args = p.parse_args()

    if not args.texte:
        if not (args.destinataire and args.motif):
            p.error("indiquez --texte, ou bien --destinataire ET --motif")
        args.texte = f"Destiné à {args.destinataire} – pour {args.motif} – le {date.today():%d/%m/%Y}"

    enregistrer_heif()
    code = 0
    for chemin in args.fichiers:
        try:
            for s in traiter(chemin, args):
                print(f"{chemin} -> {s}")
        except Exception as e:  # un fichier illisible ne bloque pas les suivants
            print(f"ERREUR {chemin} : {e}", file=sys.stderr)
            code = 1
    sys.exit(code)


if __name__ == "__main__":
    main()
