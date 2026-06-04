"""
Service d'envoi d'emails — FasoData Alertes Prix.

Utilise SMTP si configuré (SMTP_HOST + SMTP_USER + SMTP_PASSWORD dans .env).
Si non configuré, logue le contenu de l'email (mode développement).

Pour la production, recommandé : Mailgun, SendGrid, ou SMTP OVH.
"""

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

COMMODITY_LABELS = {
    "sorghum":    "Sorgho blanc",
    "rice_local": "Riz local décortiqué",
    "maize":      "Maïs",
    "millet":     "Mil pénicillaire",
    "cowpea":     "Niébé",
    "groundnut":  "Arachide",
}


def _html_template(
    subject: str,
    body_html: str,
    unsubscribe_url: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#1A2C42;padding:24px 32px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;background:#E04E2F;border-radius:10px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-size:20px">🌾</span>
            </div>
            <div>
              <div style="color:white;font-weight:700;font-size:18px">FasoData</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px">Alertes Prix Alimentaires</div>
            </div>
          </div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f8f9fa;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">
            Données WFP VAM / SONAGESS Burkina Faso ·
            <a href="{unsubscribe_url}" style="color:#E04E2F;text-decoration:none">Se désabonner</a>
            · <a href="https://fasodata.bf" style="color:#6b7280;text-decoration:none">fasodata.bf</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_confirmation_email(
    to_email: str,
    confirm_url: str,
    unsubscribe_url: str,
    commodity: str,
    region: str,
    threshold: float,
    settings,
) -> bool:
    """Email de confirmation d'abonnement (double opt-in)."""
    label = COMMODITY_LABELS.get(commodity, commodity)
    subject = f"✅ Confirmez votre alerte prix — {label} · FasoData"

    body_html = f"""
      <h2 style="color:#1A2C42;margin:0 0 8px">Confirmez votre abonnement</h2>
      <p style="color:#6b7280;margin:0 0 24px">Vous avez demandé une alerte pour :</p>

      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0">Produit</td>
            <td style="color:#111;font-weight:600;font-size:13px;text-align:right">{label}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0">Région</td>
            <td style="color:#111;font-weight:600;font-size:13px;text-align:right">{region}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0">Seuil d'alerte</td>
            <td style="color:#E04E2F;font-weight:700;font-size:15px;text-align:right">{int(threshold)} CFA/kg</td>
          </tr>
        </table>
      </div>

      <p style="color:#6b7280;font-size:13px;margin:0 0 20px">
        Vous recevrez un email dès que le prix de {label} en {region}
        dépasse <strong style="color:#E04E2F">{int(threshold)} CFA/kg</strong>.
      </p>

      <div style="text-align:center;margin:24px 0">
        <a href="{confirm_url}" style="
          display:inline-block;background:#E04E2F;color:white;
          font-weight:700;font-size:15px;padding:14px 36px;
          border-radius:12px;text-decoration:none;
        ">✅ Confirmer mon abonnement →</a>
      </div>

      <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0">
        Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    """

    return _send(to_email, subject, body_html, unsubscribe_url, settings)


def send_price_alert_email(
    to_email: str,
    commodity: str,
    region: str,
    current_price: float,
    threshold: float,
    unsubscribe_url: str,
    settings,
) -> bool:
    """Email d'alerte prix (seuil dépassé)."""
    label     = COMMODITY_LABELS.get(commodity, commodity)
    diff      = current_price - threshold
    diff_pct  = round((diff / threshold) * 100, 1)
    subject   = f"⚠️ Alerte prix FasoData — {label} · {region} dépasse {int(threshold)} CFA/kg"

    color_badge = "#DC2626" if diff_pct > 15 else "#F97316"

    body_html = f"""
      <div style="background:{color_badge};color:white;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center">
        <div style="font-size:13px;opacity:0.9;margin-bottom:4px">⚠️ SEUIL D'ALERTE DÉPASSÉ</div>
        <div style="font-size:24px;font-weight:900">{label} · {region}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px">
        <tr style="background:#f8f9fa">
          <td style="padding:14px 20px;color:#6b7280;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb">INDICATEUR</td>
          <td style="padding:14px 20px;color:#6b7280;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb">VALEUR</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Prix actuel</td>
          <td style="padding:14px 20px;color:{color_badge};font-weight:800;font-size:18px;text-align:right;border-bottom:1px solid #f3f4f6">{int(current_price)} CFA/kg</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Votre seuil</td>
          <td style="padding:14px 20px;color:#374151;font-weight:700;font-size:14px;text-align:right;border-bottom:1px solid #f3f4f6">{int(threshold)} CFA/kg</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;color:#374151;font-size:14px">Dépassement</td>
          <td style="padding:14px 20px;color:{color_badge};font-weight:700;font-size:14px;text-align:right">+{int(diff)} CFA (+{diff_pct}%)</td>
        </tr>
      </table>

      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px">
        Ce prix a été enregistré par nos enquêteurs terrain et validé par notre système.
        Source : WFP VAM Food Prices · SONAGESS Burkina Faso.
      </p>

      <div style="text-align:center;margin:0 0 16px">
        <a href="https://fasodata.bf/carte-prix" style="
          display:inline-block;background:#1A2C42;color:white;
          font-weight:700;font-size:14px;padding:12px 28px;
          border-radius:10px;text-decoration:none;margin-right:8px;
        ">🗺️ Voir la carte des prix</a>
        <a href="https://fasodata.bf/dashboard/prix" style="
          display:inline-block;background:#E04E2F;color:white;
          font-weight:700;font-size:14px;padding:12px 28px;
          border-radius:10px;text-decoration:none;
        ">📊 Graphiques →</a>
      </div>
    """

    return _send(to_email, subject, body_html, unsubscribe_url, settings)


def send_password_reset_email(
    to_email: str,
    reset_url: str,
    settings,
) -> bool:
    """Email de réinitialisation de mot de passe (lien valable 30 min)."""
    subject = "🔑 Réinitialisation de votre mot de passe FasoData"

    body_html = f"""
      <h2 style="color:#1A2C42;margin:0 0 8px">Réinitialisation du mot de passe</h2>
      <p style="color:#6b7280;margin:0 0 20px;font-size:14px;line-height:1.6">
        Vous avez demandé la réinitialisation de votre mot de passe FasoData.
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>

      <div style="background:#f8f9fa;border-radius:12px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #E04E2F">
        <p style="margin:0;color:#374151;font-size:13px">
          ⏱️ <strong>Ce lien expire dans 30 minutes.</strong><br>
          Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.
        </p>
      </div>

      <div style="text-align:center;margin:28px 0">
        <a href="{reset_url}" style="
          display:inline-block;background:#E04E2F;color:white;
          font-weight:700;font-size:15px;padding:14px 36px;
          border-radius:12px;text-decoration:none;
        ">🔑 Réinitialiser mon mot de passe →</a>
      </div>

      <p style="color:#9ca3af;font-size:11px;text-align:center;margin:16px 0 0;word-break:break-all">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <span style="color:#6b7280">{reset_url}</span>
      </p>
    """

    # Pas de lien de désabonnement pour les emails transactionnels
    unsubscribe_url = f"{reset_url.split('/auth/')[0]}/"
    return _send(to_email, subject, body_html, unsubscribe_url, settings)


def _send(
    to_email: str,
    subject: str,
    body_html: str,
    unsubscribe_url: str,
    settings,
) -> bool:
    """Envoie l'email via SMTP ou logue si non configuré."""
    html = _html_template(subject, body_html, unsubscribe_url)

    smtp_host = getattr(settings, "smtp_host", "")
    smtp_user = getattr(settings, "smtp_user", "")
    smtp_pwd  = getattr(settings, "smtp_password", "")
    from_addr = getattr(settings, "emails_from", "noreply@fasodata.bf")

    if not smtp_host or not smtp_user:
        # Mode développement — log l'email
        logger.info(
            f"\n{'='*60}\n"
            f"📧 EMAIL (mode simulation)\n"
            f"  À       : {to_email}\n"
            f"  Sujet   : {subject}\n"
            f"  Désabo  : {unsubscribe_url}\n"
            f"{'='*60}"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"FasoData <{from_addr}>"
        msg["To"]      = to_email
        msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"

        msg.attach(MIMEText(html, "html", "utf-8"))

        smtp_port = getattr(settings, "smtp_port", 587)
        context   = ssl.create_default_context()

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_user, smtp_pwd)
            server.sendmail(from_addr, to_email, msg.as_bytes())

        logger.info(f"Email envoyé → {to_email} | {subject[:60]}")
        return True

    except Exception as e:
        logger.error(f"Erreur envoi email → {to_email}: {e}")
        return False
