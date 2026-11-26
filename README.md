# Stackr · gestion de stock Riftbound

Application pour gérer sa collection de cartes **Riftbound** :

- **comptes utilisateurs** : chaque compte a sa propre collection, ses decklists et ses rangements (le catalogue de cartes est commun) ;
- import de toutes les cartes et de leurs infos depuis [RiftCodex](https://riftcodex.com) (API communautaire ouverte)
  ou depuis l'API officielle Riot Games (`riftbound-content-v1`) ;
- **% de complétion du masterset** par extension (et par rareté) ;
- **nombre d'exemplaires** possédés pour chaque carte ;
- **decklists** (création, import/export texte, quantités) ;
- suivi de **quel exemplaire physique est dans quelle decklist** (affectation manuelle ou automatique) ;
- suivi de **quel exemplaire est dans quel rangement** (classeurs, boîtes…), avec déplacement en masse.

| Dossier | Techno | Rôle |
| --- | --- | --- |
| `backend/` | AdonisJS 7 + Lucid (SQLite) | API REST, base de données, import Riot |
| `frontend/` | Nuxt 4 | Interface web |

## Prérequis

- Node.js **24** ou plus (requis par AdonisJS 7)
- Optionnel : une clé API Riot Games (`RGAPI-…`) avec l'accès à Riftbound, pour utiliser la source officielle
  (<https://developer.riotgames.com>). Sans clé, l'import utilise RiftCodex.

## Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env
node ace generate:key
# IMPORT_SOURCE=all (défaut : RiftCodex + galerie officielle Riot pour les extensions
# que RiftCodex n'a pas encore, ex. Radiance), riftcodex, gallery ou riot
# (pour riot, renseigner RIOT_API_KEY et RIOT_REGION)
node ace migration:run
node ace riftbound:import                    # importe toutes les cartes depuis IMPORT_SOURCE
node ace riftbound:import --source=riot      # forcer l'API officielle Riot
npm run dev                        # http://localhost:3333

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

Le frontend relaie `/api/**` vers le backend (variable `NUXT_API_URL`, par défaut `http://localhost:3333`).

Ouvre ensuite le site et crée ton compte : **le premier compte créé est administrateur**
(il peut mettre à jour le catalogue depuis le site) et récupère les données créées avant l'ajout des comptes.

L'import peut être relancé à tout moment (commande ou bouton « Mettre à jour le catalogue », réservé aux administrateurs) :
les cartes sont mises à jour sans toucher aux exemplaires, decklists et rangements.
`node ace riftbound:import --file=export.json` importe depuis un fichier JSON au format de l'API Riot.
RiftCodex contient parfois deux fiches pour une même carte : seule la plus récente est gardée.

La base SQLite est stockée dans `backend/tmp/db.sqlite3`.

## Modèle de données

- `card_sets` / `cards` : catalogue issu de l'API Riot (la réponse brute de chaque carte est conservée dans `cards.raw`).
- `users` : comptes (authentification par jeton, `is_admin` pour la mise à jour du catalogue).
- `card_copies` : **un exemplaire physique** = une ligne, appartenant à un utilisateur (état, langue, foil, notes),
  rattaché à un rangement (`storage_location_id`) et éventuellement à une decklist (`decklist_id`).
- `storage_locations` : rangements.
- `decklists` / `decklist_entries` : la liste théorique (carte × quantité). Les exemplaires affectés
  au deck sont les `card_copies` dont `decklist_id` pointe sur la decklist.

Complétion du masterset d'une extension = cartes distinctes possédées (au moins un exemplaire) / cartes de l'extension.

## API (préfixe `/api/v1`)

`POST /auth/signup`, `POST /auth/login` (renvoient un jeton), `GET /account/profile`, `POST /account/logout`.
Toutes les autres routes demandent l'en-tête `Authorization: Bearer <jeton>`.

| Méthode | Route | Description |
| --- | --- | --- |
| GET / POST | `/import` | État du catalogue / lancer l'import (`source`: riftcodex ou riot, admin) |
| GET | `/sets`, `/sets/:id` | Extensions avec complétion, détail avec cartes et quantités |
| GET | `/cards`, `/cards/filters`, `/cards/:id` | Recherche paginée, filtres, fiche carte avec exemplaires |
| GET / POST | `/copies` | Lister (filtres `cardId`, `storageLocationId`, `decklistId`, `none`) / ajouter N exemplaires |
| PATCH | `/copies`, `/copies/:id` | Déplacement en masse / modifier un exemplaire |
| DELETE | `/copies/:id` | Supprimer un exemplaire |
| CRUD | `/storage-locations` | Rangements |
| CRUD | `/decklists` | Decklists |
| PUT | `/decklists/:id/entries` | Fixer la quantité d'une carte (0 = retirer) |
| POST | `/decklists/:id/import` | Importer une liste texte (`3 Nom de carte`) |
| GET | `/decklists/:id/export` | Exporter la liste en texte |
| POST | `/decklists/:id/auto-assign` | Affecter les exemplaires libres aux cartes manquantes |
| POST | `/decklists/:id/release` | Libérer tous les exemplaires du deck |

## Tests

```bash
cd backend && node ace test
```
