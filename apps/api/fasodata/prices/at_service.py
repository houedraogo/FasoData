"""
Service Africa's Talking pour FasoData.

Fonctions :
  - initialize()       : initialise le SDK AT (appelé au démarrage)
  - send_sms()        : envoie un SMS de confirmation à un enquêteur
  - send_alert()      : envoie une alerte prix à une liste d'abonnés
  - is_configured()   : vérifie si les credentials AT sont renseignés

Mode sandbox (gratuit, sans SIM) :
  1. Créer un compte sur https://account.africastalking.com
  2. Aller dans "Sandbox" > "SMS" > récupérer la clé API sandbox
  3. Ajouter dans .env :
       AT_USERNAME=sandbox
       AT_API_KEY=<votre_clé_sandbox>
  4. Tester avec l'outil Simulator : https://simulator.africastalking.com

Format du message SMS d'un enquêteur :
  SORGHO SAHEL 285
  MAIS OUAGA 302
  RIZ BOBO 520

Réponse automatique envoyée :
  ✅ Prix reçu : Sorgho · Sahel · 285 CFA/kg
  Merci [prénom] ! Données enregistrées le 15/01/2025.
"""

import logging
from datetime import date

logger = logging.getLogger(__name__)

_initialized = False
_sms_service = None


def initialize(username: str, api_key: str) -> bool:
    """Initialise le SDK Africa's Talking. Retourne True si OK."""
    global _initialized, _sms_service
    if not api_key:
        logger.warning("AT_API_KEY non défini — SMS désactivé (mode simulation)")
        return False
    try:
        import africastalking
        africastalking.initialize(username, api_key)
        _sms_service = africastalking.SMS
        _initialized = True
        logger.info(f"Africa's Talking initialisé (username={username})")
        return True
    except ImportError:
        logger.error("Package 'africastalking' non installé — pip install africastalking")
        return False
    except Exception as e:
        logger.error(f"Erreur initialisation AT : {e}")
        return False


def is_configured() -> bool:
    return _initialized and _sms_service is not None


def send_sms(recipients: list[str], message: str) -> dict:
    """
    Envoie un SMS via Africa's Talking.
    En mode sandbox, le message est loggué mais pas envoyé réellement.
    """
    if not is_configured():
        logger.info(f"[AT-SIMULATION] SMS vers {recipients}: {message}")
        return {
            "status": "simulated",
            "message": message,
            "recipients": recipients,
            "note": "Configurez AT_API_KEY pour l'envoi réel",
        }
    try:
        response = _sms_service.send(
            message=message,
            recipients=recipients,
        )
        logger.info(f"SMS envoyé via AT : {response}")
        return {"status": "sent", "response": response}
    except Exception as e:
        logger.error(f"Erreur envoi SMS AT : {e}")
        return {"status": "error", "error": str(e)}


def build_confirmation(
    commodity_label: str,
    region: str,
    price: float,
    reporter: str | None = None,
    price_date: date | None = None,
) -> str:
    """Construit le message de confirmation à renvoyer à l'enquêteur."""
    date_str = (price_date or date.today()).strftime("%d/%m/%Y")
    greeting = f"Bonjour {reporter.split()[0]}," if reporter and " " in reporter else "Bonjour,"
    return (
        f"✅ {greeting}\n"
        f"Prix enregistré : {commodity_label} · {region} · {int(price)} CFA/kg\n"
        f"Date : {date_str}\n"
        f"Merci pour votre relevé FasoData 🌾"
    )


def build_rejection(raw_message: str) -> str:
    """Construit le message d'erreur si le format SMS n'est pas reconnu."""
    return (
        f"❌ Format non reconnu : \"{raw_message[:30]}\"\n"
        f"Format attendu : PRODUIT REGION PRIX\n"
        f"Ex: SORGHO SAHEL 285\n"
        f"Produits : SORGHO RIZ MAIS MIL NIEBE ARACHIDE"
    )


def send_price_alert(
    recipients: list[str],
    commodity_label: str,
    region: str,
    current_price: float,
    threshold: float,
) -> dict:
    """Envoie une alerte SMS quand un prix dépasse un seuil."""
    pct = round(((current_price - threshold) / threshold) * 100, 1)
    message = (
        f"⚠️ ALERTE PRIX FASODATA\n"
        f"{commodity_label} · {region}\n"
        f"Prix actuel : {int(current_price)} CFA/kg\n"
        f"Seuil : {int(threshold)} CFA/kg (+{pct}%)\n"
        f"→ fasodata.bf/dashboard/prix"
    )
    return send_sms(recipients, message)
