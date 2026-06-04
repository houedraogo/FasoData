from __future__ import annotations

import textwrap
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.datasets.models import Dataset, ImportJob
from fasodata.prices.models import PriceData


def _pdf_escape(value: object) -> str:
    text = str(value if value is not None else "")
    text = (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", " ")
        .replace("\n", " ")
    )
    return text.encode("latin-1", "replace").decode("latin-1")


def _wrap_lines(lines: Iterable[str], width: int = 92) -> list[str]:
    wrapped: list[str] = []
    for line in lines:
        if not line:
            wrapped.append("")
            continue
        wrapped.extend(textwrap.wrap(line, width=width, replace_whitespace=False) or [""])
    return wrapped


def build_text_pdf(title: str, lines: list[str]) -> bytes:
    wrapped = _wrap_lines(lines)
    stream_lines = [
        "BT",
        "/F1 18 Tf",
        "50 790 Td",
        f"({_pdf_escape(title)}) Tj",
        "/F1 10 Tf",
        "0 -24 Td",
    ]
    for index, line in enumerate(wrapped[:58]):
        if index:
            stream_lines.append("0 -13 Td")
        stream_lines.append(f"({_pdf_escape(line)}) Tj")
    stream_lines.append("ET")
    content = "\n".join(stream_lines).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


def _format_date(value: datetime | None) -> str:
    if not value:
        return "-"
    return value.strftime("%Y-%m-%d")


async def build_dataset_report_lines(db: AsyncSession, dataset: Dataset) -> list[str]:
    now = datetime.now(timezone.utc)
    lines = [
        f"Genere le: {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "Synthese du dataset",
        f"Nom: {dataset.name}",
        f"Slug: {dataset.slug}",
        f"Statut: {dataset.status.value if hasattr(dataset.status, 'value') else dataset.status}",
        f"Categorie: {dataset.category or '-'}",
        f"Source: {dataset.source or '-'}",
        f"Licence: {dataset.license.value if hasattr(dataset.license, 'value') else dataset.license}",
        f"Format: {(dataset.file_format or '-').upper()}",
        f"Lignes: {dataset.row_count if dataset.row_count is not None else '-'}",
        f"Taille fichier: {dataset.file_size_bytes if dataset.file_size_bytes is not None else '-'} octets",
        f"Vues: {dataset.view_count}",
        f"Telechargements: {dataset.download_count}",
        f"Cree le: {_format_date(dataset.created_at)}",
        f"Publie le: {_format_date(dataset.published_at)}",
        "",
        "Description",
        dataset.description or "Aucune description renseignee.",
        "",
    ]

    columns = dataset.columns_meta if isinstance(dataset.columns_meta, list) else []
    if columns:
        lines.append("Colonnes")
        for col in columns[:12]:
            if isinstance(col, dict):
                lines.append(f"- {col.get('name', '-')}: {col.get('type', '-')}")
            else:
                lines.append(f"- {col}")
        lines.append("")

    jobs = (
        await db.execute(
            select(ImportJob)
            .where(ImportJob.dataset_id == dataset.id)
            .order_by(ImportJob.created_at.desc())
            .limit(3)
        )
    ).scalars().all()
    if jobs:
        lines.append("Derniers imports")
        for job in jobs:
            lines.append(
                f"- {job.status} | {job.rows_imported} lignes | progression {job.progress}% | {_format_date(job.created_at)}"
            )
        lines.append("")

    if dataset.slug == "prix-alimentaires-burkina-faso":
        rows = (
            await db.execute(
                select(PriceData)
                .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
                .limit(8)
            )
        ).scalars().all()
        if rows:
            lines.append("Apercu prix alimentaires")
            for row in rows:
                lines.append(
                    f"- {row.price_date.isoformat()} | {row.country} | {row.region} | {row.commodity}: {row.price:g} {row.unit} | {row.source}"
                )
            lines.append("")

    lines.extend(
        [
            "Note",
            "Ce PDF est genere automatiquement depuis les donnees et metadonnees FasoData disponibles au moment de l'export.",
        ]
    )
    return lines
