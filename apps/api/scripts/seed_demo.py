"""
Peuple la base avec des données de démonstration.
Usage: python scripts/seed_demo.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fasodata.core.config import get_settings
from fasodata.core.security import hash_password
from fasodata.datasets.models import Dataset, DatasetStatus, DatasetLicense
from fasodata.users.models import User, UserRole

settings = get_settings()

DEMO_DATASETS = [
    {
        "slug": "prix-cereales-2024",
        "name": "Prix des céréales au Burkina Faso 2024",
        "description": "Suivi mensuel des prix du mil, maïs, sorgho et riz dans les principaux marchés du Burkina Faso.",
        "category": "Agriculture",
        "tags": ["agriculture", "prix", "alimentation", "marchés"],
        "source": "Ministère de l'Agriculture",
        "license": DatasetLicense.open,
        "status": DatasetStatus.published,
        "row_count": 4320,
        "file_format": "csv",
        "download_count": 234,
        "view_count": 1821,
    },
    {
        "slug": "centres-sante-burkina",
        "name": "Centres de santé du Burkina Faso",
        "description": "Localisation et données des formations sanitaires (CSPS, CMA, CHR, CHU) sur tout le territoire.",
        "category": "Santé",
        "tags": ["santé", "géographie", "infrastructures"],
        "source": "Ministère de la Santé",
        "license": DatasetLicense.cc_by,
        "status": DatasetStatus.published,
        "row_count": 1842,
        "file_format": "csv",
        "is_geo": True,
        "download_count": 567,
        "view_count": 3210,
    },
    {
        "slug": "effectifs-scolaires-2023-2024",
        "name": "Effectifs scolaires 2023-2024",
        "description": "Données des effectifs des élèves du primaire et secondaire par région, province et commune.",
        "category": "Éducation",
        "tags": ["éducation", "école", "enfants"],
        "source": "Ministère de l'Éducation Nationale",
        "license": DatasetLicense.open,
        "status": DatasetStatus.published,
        "row_count": 8940,
        "file_format": "xlsx",
        "download_count": 128,
        "view_count": 945,
    },
    {
        "slug": "pluviometrie-2024",
        "name": "Pluviométrie mensuelle 2024",
        "description": "Données de précipitations mensuelles des stations météorologiques synoptiques du Burkina Faso.",
        "category": "Environnement",
        "tags": ["météo", "pluviométrie", "climat"],
        "source": "ANAM - Agence Nationale de la Météorologie",
        "license": DatasetLicense.cc_by,
        "status": DatasetStatus.published,
        "row_count": 528,
        "file_format": "csv",
        "download_count": 89,
        "view_count": 612,
    },
]


async def main():
    engine = create_async_engine(settings.database_url)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Créer un utilisateur institutionnel de démo
        result = await db.execute(select(User).where(User.email == "demo@ong.bf"))
        if not result.scalar_one_or_none():
            demo_user = User(
                email="demo@ong.bf",
                hashed_password=hash_password("demo1234"),
                full_name="Utilisateur Démo",
                organization="ONG Exemple BF",
                role=UserRole.institutional,
                is_active=True,
                is_verified=True,
            )
            db.add(demo_user)
            await db.flush()
            owner_id = demo_user.id
            print("Utilisateur démo créé : demo@ong.bf / demo1234")
        else:
            r = await db.execute(select(User).where(User.email == "demo@ong.bf"))
            owner_id = r.scalar_one().id

        # Créer les datasets de démo
        for ds_data in DEMO_DATASETS:
            result = await db.execute(select(Dataset).where(Dataset.slug == ds_data["slug"]))
            if not result.scalar_one_or_none():
                ds = Dataset(
                    **ds_data,
                    owner_id=owner_id,
                    data_origin="seed",
                )
                db.add(ds)
                print(f"Dataset créé : {ds_data['name']}")

        await db.commit()
        print("\nSeed terminé !")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
