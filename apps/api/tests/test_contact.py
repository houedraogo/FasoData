"""Tests for public contact and contributor emails."""

import pytest


@pytest.mark.asyncio
async def test_contact_message_email_uses_app_base_url_and_escapes_html(client, monkeypatch):
    sent: list[dict] = []

    def fake_send(**kwargs):
        sent.append(kwargs)
        return True

    from fasodata.contact import router as contact_router
    from fasodata.core.config import get_settings

    monkeypatch.setattr(contact_router, "_send", fake_send)
    monkeypatch.setattr(get_settings(), "app_base_url", "https://app.fasodata.test")

    resp = await client.post("/api/contact/message", json={
        "firstName": "Aicha <img src=x>",
        "lastName": "Sawadogo",
        "email": "aicha@example.com",
        "subject": "Question <b>data</b>",
        "message": "Bonjour <script>alert(1)</script>",
    })

    assert resp.status_code == 200
    assert len(sent) == 1
    email = sent[0]
    assert email["unsubscribe_url"] == "https://app.fasodata.test/"
    assert "<img src=x>" not in email["body_html"]
    assert "&lt;img src=x&gt;" in email["body_html"]
    assert "<script>" not in email["body_html"]
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in email["body_html"]


@pytest.mark.asyncio
async def test_contributor_contact_email_uses_app_base_url_and_escapes_html(client, monkeypatch):
    sent: list[dict] = []

    def fake_send(**kwargs):
        sent.append(kwargs)
        return True

    from fasodata.contact import router as contact_router
    from fasodata.core.config import get_settings

    monkeypatch.setattr(contact_router, "_send", fake_send)
    monkeypatch.setattr(get_settings(), "app_base_url", "https://app.fasodata.test")

    resp = await client.post("/api/contact/contributeur", json={
        "nom": "Moussa <b>Test</b>",
        "email": "moussa@example.com",
        "phone": "+22670000000",
        "region": "Sahel",
        "marche": "Dori <script>alert(1)</script>",
        "message": "Disponible",
    })

    assert resp.status_code == 200
    assert len(sent) == 1
    email = sent[0]
    assert email["unsubscribe_url"] == "https://app.fasodata.test/"
    assert "<b>Test</b>" not in email["body_html"]
    assert "&lt;b&gt;Test&lt;/b&gt;" in email["body_html"]
    assert "<script>" not in email["body_html"]
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in email["body_html"]
