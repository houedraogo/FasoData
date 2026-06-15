from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from fasodata.alerts.email_service import _send
from fasodata.core.config import get_settings

router = APIRouter(prefix="/api/contact", tags=["contact"])


class ContributeurPayload(BaseModel):
    nom: str
    email: EmailStr
    region: str
    marche: str
    message: str = ""


@router.post("/contributeur", status_code=200)
async def contact_contributeur(payload: ContributeurPayload):
    settings = get_settings()

    rows = [
        ("Nom",     payload.nom),
        ("Email",   payload.email),
        ("Région",  payload.region),
        ("Marché",  payload.marche),
    ]
    if payload.message:
        rows.append(("Message", payload.message))

    table_rows = "".join(
        f"""<tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">{label}</td>
          <td style="padding:8px 12px;color:#111;font-weight:600;font-size:13px">{value}</td>
        </tr>"""
        for label, value in rows
    )

    body_html = f"""
      <h2 style="color:#1A2C42;margin:0 0 8px">Nouvelle candidature contributeur terrain</h2>
      <p style="color:#6b7280;margin:0 0 20px;font-size:14px">
        Un utilisateur souhaite devenir contributeur terrain sur FasoData.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px">
        <tr style="background:#f8f9fa">
          <td style="padding:10px 12px;color:#6b7280;font-size:11px;font-weight:700;
                     text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb">
            Champ
          </td>
          <td style="padding:10px 12px;color:#6b7280;font-size:11px;font-weight:700;
                     text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb">
            Valeur
          </td>
        </tr>
        {table_rows}
      </table>
      <p style="color:#9ca3af;font-size:12px;margin:0">
        Répondez directement à cet email pour contacter le candidat.
      </p>
    """

    ok = _send(
        to_email=settings.emails_from,
        subject=f"[FasoData] Candidature contributeur — {payload.nom} · {payload.region}",
        body_html=body_html,
        unsubscribe_url="https://fasodata.com/",
        settings=settings,
    )

    if not ok:
        raise HTTPException(status_code=500, detail="Échec d'envoi de l'email.")

    return {"ok": True}
