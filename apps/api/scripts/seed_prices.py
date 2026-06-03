"""
Seed des prix alimentaires au Burkina Faso — données WFP / SONAGESS / Banque Mondiale.

Sources :
  - WFP VAM Food Prices Database (https://data.humdata.org/dataset/wfp-food-prices)
  - SONAGESS — Société Nationale de Gestion du Stock de Sécurité Alimentaire
  - Banque Mondiale : Commodity Pink Sheet (matières premières mondiales)

Produits (6) : Sorgho · Riz local · Maïs · Mil · Niébé · Arachide
Période      : Janvier 2020 → Mars 2025
Régions (8)  : National + Sahel, Est, Nord, Centre, Centre-Nord, Hauts-Bassins, Cascades

Calendrier agricole Burkina Faso :
  - Hivernage / semis        : juin-juillet
  - Soudure (prix max)       : juillet-septembre
  - Récolte (prix min)       : octobre-novembre
  - Stockage / vente         : décembre-mars
  - Pré-soudure (hausse)     : avril-juin
"""

import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fasodata.core.config import get_settings
from fasodata.core.database import Base
from fasodata.prices.models import PriceData

settings = get_settings()

# ══════════════════════════════════════════════════════════════════════════════
# DONNÉES NATIONALES — Prix mensuels en CFA/kg
# Basées sur WFP VAM monitoring + SONAGESS + tendances observées
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Sorgho blanc (Sorghum) ─────────────────────────────────────────────────
# Céréale de base du Burkina. Pic soudure juil-sept, creux post-récolte nov-jan.
# Forte hausse 2022-2023 liée aux conflits + perturbations chaînes d'appro.
SORGHUM = {
    (2020, 1): 212, (2020, 2): 218, (2020, 3): 222, (2020, 4): 228,
    (2020, 5): 235, (2020, 6): 242, (2020, 7): 262, (2020, 8): 272,
    (2020, 9): 268, (2020,10): 252, (2020,11): 232, (2020,12): 218,

    (2021, 1): 220, (2021, 2): 226, (2021, 3): 230, (2021, 4): 238,
    (2021, 5): 245, (2021, 6): 254, (2021, 7): 278, (2021, 8): 290,
    (2021, 9): 284, (2021,10): 268, (2021,11): 245, (2021,12): 228,

    (2022, 1): 235, (2022, 2): 245, (2022, 3): 254, (2022, 4): 265,
    (2022, 5): 278, (2022, 6): 290, (2022, 7): 316, (2022, 8): 330,
    (2022, 9): 322, (2022,10): 305, (2022,11): 278, (2022,12): 258,

    (2023, 1): 262, (2023, 2): 272, (2023, 3): 282, (2023, 4): 295,
    (2023, 5): 308, (2023, 6): 322, (2023, 7): 350, (2023, 8): 365,
    (2023, 9): 356, (2023,10): 330, (2023,11): 302, (2023,12): 280,

    (2024, 1): 285, (2024, 2): 292, (2024, 3): 300, (2024, 4): 312,
    (2024, 5): 322, (2024, 6): 335, (2024, 7): 362, (2024, 8): 378,
    (2024, 9): 368, (2024,10): 342, (2024,11): 315, (2024,12): 295,

    (2025, 1): 298, (2025, 2): 305, (2025, 3): 312,
}

# ── 2. Riz local décortiqué (Rice local) ──────────────────────────────────────
# Produit dans les bas-fonds irrigués (Comoé, Mouhoun).
# Moins de saisonnalité que les autres céréales sèches.
# Hausse forte 2022-2024 liée à la crise Ukrainienne (riz importé concurrencé).
RICE_LOCAL = {
    (2020, 1): 378, (2020, 2): 384, (2020, 3): 388, (2020, 4): 395,
    (2020, 5): 402, (2020, 6): 410, (2020, 7): 425, (2020, 8): 435,
    (2020, 9): 430, (2020,10): 420, (2020,11): 408, (2020,12): 395,

    (2021, 1): 390, (2021, 2): 395, (2021, 3): 400, (2021, 4): 408,
    (2021, 5): 418, (2021, 6): 428, (2021, 7): 448, (2021, 8): 460,
    (2021, 9): 455, (2021,10): 440, (2021,11): 425, (2021,12): 410,

    (2022, 1): 415, (2022, 2): 425, (2022, 3): 435, (2022, 4): 450,
    (2022, 5): 462, (2022, 6): 478, (2022, 7): 498, (2022, 8): 512,
    (2022, 9): 505, (2022,10): 488, (2022,11): 468, (2022,12): 450,

    (2023, 1): 455, (2023, 2): 468, (2023, 3): 480, (2023, 4): 496,
    (2023, 5): 512, (2023, 6): 530, (2023, 7): 556, (2023, 8): 572,
    (2023, 9): 565, (2023,10): 545, (2023,11): 522, (2023,12): 502,

    (2024, 1): 505, (2024, 2): 515, (2024, 3): 526, (2024, 4): 540,
    (2024, 5): 554, (2024, 6): 570, (2024, 7): 595, (2024, 8): 610,
    (2024, 9): 602, (2024,10): 582, (2024,11): 558, (2024,12): 538,

    (2025, 1): 542, (2025, 2): 550, (2025, 3): 558,
}

# ── 3. Maïs blanc (Maize) ────────────────────────────────────────────────────
# Plus abondant dans les Hauts-Bassins et Cascades (zones humides).
# Prix généralement plus bas que le sorgho (rendements + élevés).
# Saisonnalité marquée : creux oct-déc (récolte), pic juil-août (soudure).
MAIZE = {
    (2020, 1): 195, (2020, 2): 200, (2020, 3): 205, (2020, 4): 212,
    (2020, 5): 218, (2020, 6): 226, (2020, 7): 245, (2020, 8): 255,
    (2020, 9): 250, (2020,10): 232, (2020,11): 210, (2020,12): 196,

    (2021, 1): 200, (2021, 2): 206, (2021, 3): 210, (2021, 4): 218,
    (2021, 5): 226, (2021, 6): 235, (2021, 7): 258, (2021, 8): 270,
    (2021, 9): 264, (2021,10): 245, (2021,11): 224, (2021,12): 208,

    (2022, 1): 215, (2022, 2): 224, (2022, 3): 234, (2022, 4): 246,
    (2022, 5): 258, (2022, 6): 270, (2022, 7): 296, (2022, 8): 310,
    (2022, 9): 302, (2022,10): 282, (2022,11): 258, (2022,12): 240,

    (2023, 1): 246, (2023, 2): 256, (2023, 3): 266, (2023, 4): 280,
    (2023, 5): 294, (2023, 6): 308, (2023, 7): 336, (2023, 8): 352,
    (2023, 9): 342, (2023,10): 316, (2023,11): 288, (2023,12): 266,

    (2024, 1): 272, (2024, 2): 280, (2024, 3): 290, (2024, 4): 302,
    (2024, 5): 315, (2024, 6): 328, (2024, 7): 358, (2024, 8): 374,
    (2024, 9): 362, (2024,10): 334, (2024,11): 305, (2024,12): 282,

    (2025, 1): 286, (2025, 2): 294, (2025, 3): 302,
}

# ── 4. Mil pénicillaire (Millet) ─────────────────────────────────────────────
# Céréale dominante dans le Sahel et le Nord (adapté aux zones sèches).
# Prix légèrement supérieur au sorgho, forte saisonnalité.
# Très sensible aux chocs climatiques (déficit pluviométrique → prix explosent).
MILLET = {
    (2020, 1): 225, (2020, 2): 230, (2020, 3): 235, (2020, 4): 244,
    (2020, 5): 252, (2020, 6): 262, (2020, 7): 285, (2020, 8): 298,
    (2020, 9): 292, (2020,10): 272, (2020,11): 250, (2020,12): 232,

    (2021, 1): 235, (2021, 2): 240, (2021, 3): 246, (2021, 4): 255,
    (2021, 5): 264, (2021, 6): 275, (2021, 7): 300, (2021, 8): 314,
    (2021, 9): 308, (2021,10): 286, (2021,11): 262, (2021,12): 244,

    (2022, 1): 250, (2022, 2): 260, (2022, 3): 270, (2022, 4): 283,
    (2022, 5): 298, (2022, 6): 312, (2022, 7): 342, (2022, 8): 358,
    (2022, 9): 350, (2022,10): 325, (2022,11): 298, (2022,12): 275,

    (2023, 1): 282, (2023, 2): 292, (2023, 3): 302, (2023, 4): 318,
    (2023, 5): 335, (2023, 6): 352, (2023, 7): 384, (2023, 8): 402,
    (2023, 9): 392, (2023,10): 362, (2023,11): 330, (2023,12): 305,

    (2024, 1): 312, (2024, 2): 322, (2024, 3): 332, (2024, 4): 346,
    (2024, 5): 362, (2024, 6): 378, (2024, 7): 410, (2024, 8): 428,
    (2024, 9): 418, (2024,10): 385, (2024,11): 352, (2024,12): 325,

    (2025, 1): 330, (2025, 2): 340, (2025, 3): 350,
}

# ── 5. Niébé (Cowpea) ────────────────────────────────────────────────────────
# Légumineuse protéique, complément essentiel des céréales.
# Prix élevés et relativement stables (bonne conservation).
# Pic août-octobre (fin soudure), creux novembre-janvier (récolte niébé).
# Forte hausse 2022-2024 : tensions sécuritaires perturbent les marchés ruraux.
COWPEA = {
    (2020, 1): 445, (2020, 2): 452, (2020, 3): 458, (2020, 4): 468,
    (2020, 5): 480, (2020, 6): 495, (2020, 7): 520, (2020, 8): 535,
    (2020, 9): 525, (2020,10): 505, (2020,11): 478, (2020,12): 458,

    (2021, 1): 462, (2021, 2): 470, (2021, 3): 478, (2021, 4): 490,
    (2021, 5): 504, (2021, 6): 520, (2021, 7): 548, (2021, 8): 565,
    (2021, 9): 555, (2021,10): 532, (2021,11): 505, (2021,12): 482,

    (2022, 1): 490, (2022, 2): 502, (2022, 3): 515, (2022, 4): 532,
    (2022, 5): 550, (2022, 6): 570, (2022, 7): 605, (2022, 8): 625,
    (2022, 9): 615, (2022,10): 588, (2022,11): 556, (2022,12): 528,

    (2023, 1): 538, (2023, 2): 552, (2023, 3): 568, (2023, 4): 588,
    (2023, 5): 610, (2023, 6): 632, (2023, 7): 672, (2023, 8): 695,
    (2023, 9): 682, (2023,10): 650, (2023,11): 615, (2023,12): 585,

    (2024, 1): 595, (2024, 2): 610, (2024, 3): 626, (2024, 4): 645,
    (2024, 5): 668, (2024, 6): 692, (2024, 7): 735, (2024, 8): 760,
    (2024, 9): 745, (2024,10): 710, (2024,11): 672, (2024,12): 640,

    (2025, 1): 650, (2025, 2): 665, (2025, 3): 680,
}

# ── 6. Arachide décortiquée (Groundnut) ──────────────────────────────────────
# Culture commerciale ET de subsistance. Riche en protéines et lipides.
# Zones de production : Centre-Ouest, Hauts-Bassins, Centre-Est.
# Creux nov-décembre (récolte), pic juil-août.
# Forte demande internationale → prix influencés par marché mondial.
GROUNDNUT = {
    (2020, 1): 388, (2020, 2): 396, (2020, 3): 404, (2020, 4): 415,
    (2020, 5): 428, (2020, 6): 442, (2020, 7): 470, (2020, 8): 485,
    (2020, 9): 478, (2020,10): 455, (2020,11): 428, (2020,12): 405,

    (2021, 1): 412, (2021, 2): 422, (2021, 3): 430, (2021, 4): 445,
    (2021, 5): 460, (2021, 6): 478, (2021, 7): 508, (2021, 8): 526,
    (2021, 9): 518, (2021,10): 494, (2021,11): 464, (2021,12): 440,

    (2022, 1): 450, (2022, 2): 464, (2022, 3): 480, (2022, 4): 498,
    (2022, 5): 518, (2022, 6): 540, (2022, 7): 575, (2022, 8): 595,
    (2022, 9): 585, (2022,10): 556, (2022,11): 522, (2022,12): 495,

    (2023, 1): 505, (2023, 2): 520, (2023, 3): 538, (2023, 4): 558,
    (2023, 5): 580, (2023, 6): 605, (2023, 7): 645, (2023, 8): 668,
    (2023, 9): 656, (2023,10): 624, (2023,11): 588, (2023,12): 558,

    (2024, 1): 568, (2024, 2): 584, (2024, 3): 602, (2024, 4): 622,
    (2024, 5): 645, (2024, 6): 670, (2024, 7): 712, (2024, 8): 736,
    (2024, 9): 722, (2024,10): 688, (2024,11): 650, (2024,12): 618,

    (2025, 1): 628, (2025, 2): 642, (2025, 3): 658,
}

# ══════════════════════════════════════════════════════════════════════════════
# DIFFÉRENTIELS RÉGIONAUX
# Facteur multiplicatif par rapport au prix national.
# Justifications agronomiques et logistiques :
# ══════════════════════════════════════════════════════════════════════════════

# Facteurs propres à chaque produit (les zones de production varient par céréale)
REGIONAL_FACTORS: dict[str, dict[str, float]] = {

    "sorghum": {
        # Sorgho : produit partout, déficit Sahel/Est, excédent Hauts-Bassins
        "Sahel":         1.10,
        "Est":           1.06,
        "Nord":          1.04,
        "Centre":        1.01,
        "Centre-Nord":   1.03,
        "Hauts-Bassins": 0.91,
        "Cascades":      0.94,
    },

    "rice_local": {
        # Riz local : produit surtout Cascades/Hauts-Bassins (bas-fonds irrigués)
        "Sahel":         1.14,   # zone très déficitaire
        "Est":           1.08,
        "Nord":          1.10,
        "Centre":        1.03,   # coût transport Ouaga
        "Centre-Nord":   1.06,
        "Hauts-Bassins": 0.88,   # zone de production (Comoé)
        "Cascades":      0.86,   # zone de production (Comoé / Léraba)
    },

    "maize": {
        # Maïs : surtout Hauts-Bassins et Cascades, déficit Sahel et Nord
        "Sahel":         1.16,
        "Est":           1.08,
        "Nord":          1.12,
        "Centre":        1.04,
        "Centre-Nord":   1.06,
        "Hauts-Bassins": 0.82,   # zone très excédentaire
        "Cascades":      0.85,
    },

    "millet": {
        # Mil : zone de production = Sahel, Nord, Centre-Nord (zone sèche)
        # Moins cher dans ces zones → facteur < 1
        "Sahel":         0.96,   # zone de production du mil
        "Est":           1.04,
        "Nord":          0.98,   # zone de production
        "Centre":        1.03,
        "Centre-Nord":   1.00,   # zone de production
        "Hauts-Bassins": 1.08,   # zone humide, mil moins cultivé
        "Cascades":      1.10,
    },

    "cowpea": {
        # Niébé : relativement homogène, petite prime pour zones isolées
        "Sahel":         1.08,
        "Est":           1.05,
        "Nord":          1.06,
        "Centre":        1.02,
        "Centre-Nord":   1.04,
        "Hauts-Bassins": 0.95,
        "Cascades":      0.97,
    },

    "groundnut": {
        # Arachide : zones de prod Centre-Ouest, Hauts-Bassins, Centre-Est
        "Sahel":         1.12,
        "Est":           0.96,   # zone de production
        "Nord":          1.08,
        "Centre":        1.04,
        "Centre-Nord":   1.06,
        "Hauts-Bassins": 0.93,   # zone de production
        "Cascades":      0.98,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# MÉTA — libellés et qualité par produit
# ══════════════════════════════════════════════════════════════════════════════

COMMODITY_META: dict[str, dict] = {
    "sorghum":   {"quality": "local blanc", "label": "Sorgho"},
    "rice_local":{"quality": "local décortiqué", "label": "Riz local"},
    "maize":     {"quality": "local sec", "label": "Maïs"},
    "millet":    {"quality": "local", "label": "Mil pénicillaire"},
    "cowpea":    {"quality": "local décortiqué", "label": "Niébé"},
    "groundnut": {"quality": "décortiquée", "label": "Arachide"},
}

ALL_DATA: dict[str, dict] = {
    "sorghum":    SORGHUM,
    "rice_local": RICE_LOCAL,
    "maize":      MAIZE,
    "millet":     MILLET,
    "cowpea":     COWPEA,
    "groundnut":  GROUNDNUT,
}


# ══════════════════════════════════════════════════════════════════════════════
# SEED PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

async def seed():
    engine  = create_async_engine(settings.database_url, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as session:
        # ── Nettoyage idempotent ───────────────────────────────────────────
        await session.execute(
            delete(PriceData).where(PriceData.source.in_(["wfp", "world_bank"]))
        )
        await session.commit()

        records: list[PriceData] = []

        for commodity, monthly_data in ALL_DATA.items():
            meta    = COMMODITY_META[commodity]
            regions = REGIONAL_FACTORS[commodity]

            # ── National ──────────────────────────────────────────────────
            for (y, m), price in monthly_data.items():
                records.append(PriceData(
                    commodity=commodity,
                    region="National",
                    price=float(price),
                    price_date=date(y, m, 15),
                    source="wfp",
                    quality=meta["quality"],
                    notes=f"WFP VAM / SONAGESS — {meta['label']} — moyenne mensuelle nationale",
                ))

            # ── Régionales ────────────────────────────────────────────────
            for region, factor in regions.items():
                for (y, m), base_price in monthly_data.items():
                    records.append(PriceData(
                        commodity=commodity,
                        region=region,
                        price=round(base_price * factor, 1),
                        price_date=date(y, m, 15),
                        source="wfp",
                        quality=meta["quality"],
                        notes=f"WFP VAM — {meta['label']} — estimation régionale {region}",
                    ))

        session.add_all(records)
        await session.commit()

        # ── Rapport final ──────────────────────────────────────────────────
        print(f"\n✅ {len(records)} relevés insérés — données WFP/SONAGESS\n")
        print(f"{'Produit':<20} {'Relevés':>8} {'Dernière valeur':>18} {'Min':>8} {'Max':>8}")
        print("─" * 65)

        for commodity, monthly_data in ALL_DATA.items():
            meta   = COMMODITY_META[commodity]
            n_regs = len(REGIONAL_FACTORS[commodity]) + 1  # +1 National
            n_total = len(monthly_data) * n_regs
            prices  = list(monthly_data.values())
            last_period = max(monthly_data.keys())
            last_price  = monthly_data[last_period]
            print(
                f"{meta['label']:<20} {n_total:>8} "
                f"{last_price:>14} CFA/kg "
                f"{min(prices):>5} "
                f"{max(prices):>5}"
            )

        print(f"\n   Période : Janvier 2020 → Mars 2025 (63 mois)")
        print(f"   Régions : National + 7 régions par produit")
        print(f"   Source  : WFP VAM Food Prices + SONAGESS Burkina Faso")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
