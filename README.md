# Skwamat Kwizz

Le quiz photo des reptiles de Guyane : serpents, amphisbènes, lézards, tortues et caïmans.
Le jeu frère de [Krapo Kwizz](https://nicolasburnel.github.io/krapo-kwizz/).

Site : https://nicolasburnel.github.io/skwamat-kwizz/

## Modifier le contenu

Tout le contenu des fiches est dans **`data/especes.csv`** (modifiable directement sur GitHub, bouton crayon).

| Colonne | Contenu |
|---|---|
| `id` | identifiant (ne pas changer, il sert aux progrès et au carnet) |
| `nom` | nom scientifique à jour |
| `nom_vernaculaire` | nom français |
| `groupe` | `serpent`, `amphisbene`, `lezard`, `tortue` ou `croco` |
| `famille` | famille |
| `ancien_nom` | nom dans le guide, s'il a changé (accepté en saisie libre) |
| `inat_id` | numéro du taxon iNaturalist (plusieurs : `123+456`) |
| `habitat`, `taille` | texte libre |
| `abondance` | `TC`, `C`, `PF`, `R`, `TR` |
| `moeurs` | `T`, `A`, `Aq`, `F` (plusieurs : `T/Aq`) |
| `activite` | `J` (diurne), `N` (nocturne), `JN` |
| `uicn` | `CR`, `EN`, `VU`, `NT`, `LC`, `DD`, `NA`, `NE` (liste rouge Guyane) |
| `protection` | `P` (protégée) ou `H` (protégée avec son habitat) |
| `venin` | serpents : `N` non venimeux, `NM` venimeux non mordeur, `L` venimeux à venin léger, `F` venimeux à venin fort |
| `exotique` | `oui` pour une espèce introduite |
| `criteres` | critères d'identification, séparés par `\|` |
| `confusions` | noms scientifiques des espèces confondables, séparés par `\|` |
| `commentaire` | texte libre |
| `source` | guide d'où viennent les textes |

## Photos et cartes

### Photos transmises par leurs auteurs
`data/photos.csv` liste les photos ajoutées à la main (dossier `assets/photos/`, avec une version `-mini.jpg`) :
`id` de l'espèce, `fichier`, `auteur`, `remplace_inat`. Avec `remplace_inat` = `oui`, les photos et la carte iNaturalist
de l'espèce ne sont plus utilisées (utile quand les observations iNat sont mal identifiées).

### Photos iNaturalist

Toutes les photos viennent d'iNaturalist, sous licence Creative Commons, avec le nom de l'auteur affiché.
`data/medias.json` (photos des fiches, localités des cartes) et `data/inat.json` (photos de terrain du quiz)
sont régénérés automatiquement le 1er de chaque mois par GitHub Actions (`tools/build_inat.py`).
Pour lancer une mise à jour tout de suite : onglet **Actions** → « Photos et cartes iNaturalist » → **Run workflow**.
La mise à jour se lance aussi toute seule à chaque modification de `data/especes.csv`.

## Licences

Code sous licence MIT. Chaque photo garde la licence choisie par son auteur sur iNaturalist.
Les textes des fiches sont adaptés des guides d'identification de Guyane cités dans « À propos ».
