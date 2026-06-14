"""Script pour ajouter des datasets réels Burkina Faso en production."""
import asyncio
from datetime import datetime, timezone

from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset, DatasetLicense, DatasetStatus
from fasodata.users.models import User
from sqlalchemy import select


async def main():
    async for db in get_db():
        result = await db.execute(select(User).where(User.email == "admin@fasodata.bf"))
        admin = result.scalar_one_or_none()
        owner_id = admin.id if admin else None
        now = datetime.now(timezone.utc)

        datasets = [
            Dataset(
                slug="population-burkina-faso-2023",
                name="Population par province — Burkina Faso 2023",
                description=(
                    "Données démographiques par province issues du Recensement Général "
                    "de la Population et de l'Habitation (RGPH) 2019 de l'INSD, avec "
                    "projections 2023. Superficie, densité, taux d'urbanisation et "
                    "nombre de ménages par province."
                ),
                category="Géographie",
                tags=["population", "démographie", "provinces", "INSD", "recensement", "urbanisation"],
                source="INSD — Institut National de la Statistique et de la Démographie",
                data_origin="manual",
                license=DatasetLicense.open,
                status=DatasetStatus.published,
                file_format="csv",
                row_count=45,
                download_count=0,
                view_count=0,
                owner_id=owner_id,
                columns_meta=[
                    {"name": "region", "type": "string", "description": "Région administrative"},
                    {"name": "province", "type": "string", "description": "Province"},
                    {"name": "population_2019", "type": "integer", "description": "Population recensée 2019"},
                    {"name": "population_2023_estimee", "type": "integer", "description": "Population estimée 2023"},
                    {"name": "superficie_km2", "type": "float", "description": "Superficie en km²"},
                    {"name": "densite_hab_km2", "type": "float", "description": "Densité en habitants/km²"},
                    {"name": "taux_urbanisation_pct", "type": "float", "description": "Taux d'urbanisation (%)"},
                    {"name": "menages", "type": "integer", "description": "Nombre de ménages"},
                ],
                published_at=now,
                created_at=now,
                updated_at=now,
            ),
            Dataset(
                slug="acces-eau-assainissement-burkina",
                name="Accès à l'eau potable et assainissement — Burkina Faso",
                description=(
                    "Taux d'accès à l'eau potable améliorée et à l'assainissement par région "
                    "(2020 et 2022), issus du Programme commun OMS/UNICEF de suivi (JMP). "
                    "Données milieu urbain et rural, défécation à l'air libre."
                ),
                category="Eau & assainissement",
                tags=["eau", "assainissement", "WASH", "UNICEF", "JMP", "rural", "urbain"],
                source="JMP — Programme commun OMS/UNICEF (Joint Monitoring Programme)",
                data_origin="manual",
                license=DatasetLicense.open,
                status=DatasetStatus.published,
                file_format="csv",
                row_count=26,
                download_count=0,
                view_count=0,
                owner_id=owner_id,
                columns_meta=[
                    {"name": "region", "type": "string", "description": "Région administrative"},
                    {"name": "annee", "type": "integer", "description": "Année de collecte"},
                    {"name": "acces_eau_potable_pct", "type": "float", "description": "Taux accès eau potable (%)"},
                    {"name": "acces_eau_amelioree_urbain_pct", "type": "float", "description": "Eau améliorée urbain (%)"},
                    {"name": "acces_eau_amelioree_rural_pct", "type": "float", "description": "Eau améliorée rural (%)"},
                    {"name": "acces_assainissement_pct", "type": "float", "description": "Accès assainissement (%)"},
                    {"name": "defecation_air_libre_pct", "type": "float", "description": "Défécation à l'air libre (%)"},
                    {"name": "source_principale", "type": "string", "description": "Source des données"},
                ],
                published_at=now,
                created_at=now,
                updated_at=now,
            ),
            Dataset(
                slug="indicateurs-developpement-humain-burkina",
                name="Indicateurs de développement humain — Burkina Faso 2000–2022",
                description=(
                    "Série chronologique de l'Indice de Développement Humain (IDH) et "
                    "indicateurs associés : espérance de vie, scolarisation, RNB par habitant, "
                    "taux de pauvreté multidimensionnelle, accès à l'électricité. "
                    "Sources PNUD et INSD."
                ),
                category="Économie",
                tags=["IDH", "développement humain", "PNUD", "pauvreté", "espérance de vie", "éducation"],
                source="PNUD — Rapport sur le développement humain ; INSD Burkina Faso",
                data_origin="manual",
                license=DatasetLicense.open,
                status=DatasetStatus.published,
                file_format="csv",
                row_count=14,
                download_count=0,
                view_count=0,
                owner_id=owner_id,
                columns_meta=[
                    {"name": "annee", "type": "integer", "description": "Année"},
                    {"name": "idh_national", "type": "float", "description": "Indice de Développement Humain"},
                    {"name": "idh_rang_mondial", "type": "integer", "description": "Classement IDH mondial"},
                    {"name": "esperance_vie_naissance", "type": "float", "description": "Espérance de vie (ans)"},
                    {"name": "duree_scolarisation_attendue", "type": "float", "description": "Scolarisation attendue (ans)"},
                    {"name": "duree_scolarisation_moyenne", "type": "float", "description": "Scolarisation moyenne (ans)"},
                    {"name": "rnb_par_habitant_ppa_usd", "type": "float", "description": "RNB/hab PPA (USD 2017)"},
                    {"name": "taux_pauvrete_mpi_pct", "type": "float", "description": "Taux pauvreté multidimensionnelle (%)"},
                    {"name": "taux_alphabetisation_adulte_pct", "type": "float", "description": "Alphabétisation adulte (%)"},
                    {"name": "mortalite_infantile_p1000", "type": "float", "description": "Mortalité infantile (p. 1 000)"},
                    {"name": "acces_electricite_pct", "type": "float", "description": "Accès à l'électricité (%)"},
                ],
                published_at=now,
                created_at=now,
                updated_at=now,
            ),
            Dataset(
                slug="budget-etat-burkina-2020-2024",
                name="Budget de l'État burkinabè — Exécution 2020–2024",
                description=(
                    "Données d'exécution budgétaire de l'État burkinabè par ministère et par "
                    "nature de dépenses (2020–2024). Recettes, dépenses totales, "
                    "investissements, déficit budgétaire. Source : Ministère des Finances."
                ),
                category="Économie",
                tags=["budget", "finances publiques", "ministères", "recettes", "dépenses", "investissement"],
                source="Ministère des Finances et de la Comptabilité Nationale",
                data_origin="manual",
                license=DatasetLicense.open,
                status=DatasetStatus.published,
                file_format="csv",
                row_count=60,
                download_count=0,
                view_count=0,
                owner_id=owner_id,
                columns_meta=[
                    {"name": "annee", "type": "integer", "description": "Année budgétaire"},
                    {"name": "ministere", "type": "string", "description": "Ministère ou institution"},
                    {"name": "recettes_milliards_fcfa", "type": "float", "description": "Recettes totales (Mds FCFA)"},
                    {"name": "depenses_totales_milliards_fcfa", "type": "float", "description": "Dépenses totales (Mds FCFA)"},
                    {"name": "investissements_milliards_fcfa", "type": "float", "description": "Investissements (Mds FCFA)"},
                    {"name": "solde_budgetaire_milliards_fcfa", "type": "float", "description": "Solde budgétaire (Mds FCFA)"},
                    {"name": "taux_execution_pct", "type": "float", "description": "Taux d'exécution budgétaire (%)"},
                ],
                published_at=now,
                created_at=now,
                updated_at=now,
            ),
            Dataset(
                slug="vaccination-couverture-burkina-2023",
                name="Couverture vaccinale par région — Burkina Faso 2023",
                description=(
                    "Taux de couverture vaccinale par antigène (BCG, Penta3, VAR, VPO3, PCV13) "
                    "et par région pour l'année 2023. Source : Direction de la Protection de la "
                    "Santé de la Population (DGSP) / Ministère de la Santé."
                ),
                category="Santé",
                tags=["vaccination", "santé", "enfants", "PEV", "immunisation", "DGSP"],
                source="DGSP / Ministère de la Santé — Programme Élargi de Vaccination",
                data_origin="manual",
                license=DatasetLicense.open,
                status=DatasetStatus.published,
                file_format="csv",
                row_count=65,
                download_count=0,
                view_count=0,
                owner_id=owner_id,
                columns_meta=[
                    {"name": "region", "type": "string", "description": "Région administrative"},
                    {"name": "district_sanitaire", "type": "string", "description": "District sanitaire"},
                    {"name": "antigene", "type": "string", "description": "Antigène vaccinale (BCG, Penta3, VAR...)"},
                    {"name": "annee", "type": "integer", "description": "Année"},
                    {"name": "enfants_cibles", "type": "integer", "description": "Enfants cibles (< 1 an)"},
                    {"name": "enfants_vaccines", "type": "integer", "description": "Enfants vaccinés"},
                    {"name": "taux_couverture_pct", "type": "float", "description": "Taux de couverture (%)"},
                    {"name": "source", "type": "string", "description": "Source de données"},
                ],
                published_at=now,
                created_at=now,
                updated_at=now,
            ),
        ]

        for d in datasets:
            # Vérifier que le slug n'existe pas déjà
            existing = await db.execute(select(Dataset).where(Dataset.slug == d.slug))
            if existing.scalar_one_or_none():
                print(f"  Déjà existant : {d.slug}")
                continue
            db.add(d)
            print(f"  + {d.slug}")

        await db.commit()

        result2 = await db.execute(
            select(Dataset).where(Dataset.data_origin.in_(["manual", "public"]))
        )
        all_ds = result2.scalars().all()
        print(f"\nTotal datasets visibles en prod : {len(all_ds)}")
        for ds in all_ds:
            print(f"  [{ds.category}] {ds.name} — {ds.row_count} lignes")
        break


asyncio.run(main())
