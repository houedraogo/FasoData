"""
Crée l'utilisateur admin par défaut si il n'existe pas.
Usage: python scripts/seed_admin.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fasodata.core.config import get_settings
from fasodata.core.security import hash_password
from fasodata.users.models import User, UserRole

settings = get_settings()


async def main():
    engine = create_async_engine(settings.database_url)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        result = await db.execute(
            select(User).where(User.email == settings.first_admin_email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin déjà existant : {settings.first_admin_email}")
        else:
            admin = User(
                email=settings.first_admin_email,
                hashed_password=hash_password(settings.first_admin_password),
                full_name="Administrateur FasoData",
                role=UserRole.admin,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            await db.commit()
            print(f"Admin créé : {settings.first_admin_email}")
            print(f"Mot de passe : {settings.first_admin_password}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
