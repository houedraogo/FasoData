import httpx
from fastapi import APIRouter, HTTPException
from html import escape
from pydantic import BaseModel, EmailStr

from fasodata.alerts.email_service import _send
from fasodata.alerts.whatsapp_service import normalize_whatsapp_number
from fasodata.core.config import get_settings

router = APIRouter(prefix="/api/contact", tags=["contact"])


def _html(value: object) -> str:
    return escape(str(value or ""))


class ContactPayload(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    subject: str = "Demande FasoData"
    message: str


@router.post("/message", status_code=200)
async def contact_message(payload: ContactPayload):
    settings = get_settings()
    app_base_url = settings.public_app_base_url
    sender_name = _html(f"{payload.firstName} {payload.lastName}")
    email = _html(payload.email)
    subject = _html(payload.subject)
    message = _html(payload.message)

    body_html = f"""
      <h2 style="color:#1A2C42;margin:0 0 8px">Nouveau message de contact</h2>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0 24px">
        <tr style="background:#f8f9fa">
          <td colspan="2" style="padding:10px 12px;color:#6b7280;font-size:11px;font-weight:700;
                     text-transform:uppercase;border-bottom:1px solid #e5e7eb">Expéditeur</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;width:120px">Nom</td>
          <td style="padding:8px 12px;color:#111;font-weight:600;font-size:13px">{sender_name}</td>
        </tr>
        <tr style="background:#f8f9fa">
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">Email</td>
          <td style="padding:8px 12px;font-size:13px">
            <a href="mailto:{email}" style="color:#E04E2F">{email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">Sujet</td>
          <td style="padding:8px 12px;color:#111;font-weight:600;font-size:13px">{subject}</td>
        </tr>
      </table>
      <div style="background:#f8f9fa;border-radius:12px;padding:16px 20px;border-left:4px solid #1A2C42">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap">{message}</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0">
        Répondez directement à cet email pour contacter l'expéditeur.
      </p>
    """

    ok = _send(
        to_email=settings.emails_from,
        subject=f"[FasoData Contact] {payload.subject} — {payload.firstName} {payload.lastName}",
        body_html=body_html,
        unsubscribe_url=f"{app_base_url}/",
        settings=settings,
    )

    if not ok:
        raise HTTPException(status_code=500, detail="Échec d'envoi de l'email.")

    return {"ok": True, "message": "Message de contact envoyé"}


class ContributeurPayload(BaseModel):
    nom: str
    email: EmailStr
    phone: str = ""
    region: str
    marche: str
    message: str = ""


@router.post("/contributeur", status_code=200)
async def contact_contributeur(payload: ContributeurPayload):
    settings = get_settings()
    app_base_url = settings.public_app_base_url

    rows = [
        ("Nom",       payload.nom),
        ("Email",     payload.email),
        ("Téléphone", payload.phone or "—"),
        ("Région",    payload.region),
        ("Marché",    payload.marche),
    ]
    if payload.message:
        rows.append(("Message", payload.message))

    table_rows = "".join(
        f"""<tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">{label}</td>
          <td style="padding:8px 12px;color:#111;font-weight:600;font-size:13px">{_html(value)}</td>
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
        unsubscribe_url=f"{app_base_url}/",
        settings=settings,
    )

    if not ok:
        raise HTTPException(status_code=500, detail="Échec d'envoi de l'email.")

    return {"ok": True}


class ApprobationEnqueteurPayload(BaseModel):
    nom: str
    phone: str


@router.post("/contributeur/approuver", status_code=200)
async def approuver_enqueteur(payload: ApprobationEnqueteurPayload):
    """Envoie le message WhatsApp de bienvenue à un enquêteur approuvé."""
    settings = get_settings()
    recipient = normalize_whatsapp_number(payload.phone)
    if not recipient:
        raise HTTPException(status_code=422, detail="Numéro de téléphone invalide.")

    token = settings.whatsapp_access_token
    phone_id = settings.whatsapp_phone_number_id
    base_url = settings.whatsapp_graph_api_url.rstrip("/")
    prenom = payload.nom.split()[0]

    try:
        r = httpx.post(
            f"{base_url}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "template",
                "template": {
                    "name": "bienvenue_enqueteur_fasodata",
                    "language": {"code": "fr"},
                    "components": [{
                        "type": "body",
                        "parameters": [{"type": "text", "text": prenom}],
                    }],
                },
            },
            timeout=15,
        )
        r.raise_for_status()
        return {"ok": True, "sent_to": recipient}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur WhatsApp : {exc}")
