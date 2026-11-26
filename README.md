# Stackr · gestion de stock Riftbound

Application pour gérer sa collection de cartes **Riftbound** :

- import de toutes les cartes et de leurs infos depuis l'API officielle Riot Games (`riftbound-content-v1`) ;
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
- Une clé API Riot Games (`RGAPI-…`) avec l'accès à Riftbound : <https://developer.riotgames.com>

## Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env
node ace generate:key
# Renseigner RIOT_API_KEY (et RIOT_REGION si besoin : americas, europe, asia) dans .env
node ace migration:run
node ace riftbound:import          # importe toutes les cartes (option --locale=fr)
npm run dev                        # http://localhost:3333

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

Le frontend relaie `/api/**` vers le backend (variable `NUXT_API_URL`, par défaut `http://localhost:3333`).

L'import peut être relancé à tout moment (commande ou bouton « Mettre à jour les cartes depuis Riot ») :
les cartes sont mises à jour sans toucher aux exemplaires, decklists et rangements.
`node ace riftbound:import --file=export.json` importe depuis un fichier JSON au même format que l'API.

La base SQLite est stockée dans `backend/tmp/db.sqlite3`.

## Modèle de données

- `card_sets` / `cards` : catalogue issu de l'API Riot (la réponse brute de chaque carte est conservée dans `cards.raw`).
- `card_copies` : **un exemplaire physique** = une ligne (état, langue, foil, notes),
  rattaché à un rangement (`storage_location_id`) et éventuellement à une decklist (`decklist_id`).
- `storage_locations` : rangements.
- `decklists` / `decklist_entries` : la liste théorique (carte × quantité). Les exemplaires affectés
  au deck sont les `card_copies` dont `decklist_id` pointe sur la decklist.

Complétion du masterset d'une extension = cartes distinctes possédées (au moins un exemplaire) / cartes de l'extension.

## API (préfixe `/api/v1`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET / POST | `/import` | État du catalogue / lancer l'import Riot |
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
