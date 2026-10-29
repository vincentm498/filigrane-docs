# Bibliothèques tierces

Ces fichiers sont copiés tels quels depuis cdnjs et servis avec la page : elle ne charge
aucun script externe, ce qui garantit qu'aucun code tiers ne peut lire les documents
déposés, et lui permet de fonctionner hors ligne.

| Fichier | Bibliothèque | Version | Licence | SHA-256 |
|---|---|---|---|---|
| `pdf.min.js` | [pdf.js](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache-2.0 | `5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946` |
| `pdf.worker.min.js` | pdf.js (worker) | 3.11.174 | Apache-2.0 | `feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b` |
| `jspdf.umd.min.js` | [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | MIT | `98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875` |
| `jszip.min.js` | [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT ou GPL-3.0 | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |

URL d'origine : `https://cdnjs.cloudflare.com/ajax/libs/<bibliothèque>/<version>/<fichier>`.

Pour vérifier un fichier : `shasum -a 256 vendor/*.js` et comparer aux empreintes ci-dessus.
