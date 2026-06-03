"""Tests des endpoints /api/alerts/*."""

from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from fasodata.alerts.models import AlertSubscription
from fasodata.prices.models import PriceData


def admin_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def create_subscription(client, email: str = "abonne@test.bf") -> dict:
    resp = await client.post(
        "/api/alerts/subscribe",
        json={
            "email": email,
            "commodity": "sorghum",
            "region": "Sahel",
            "threshold_price": 275,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_subscription_with_whatsapp(client, email: str = "wa@test.bf") -> dict:
    resp = await client.post(
        "/api/alerts/subscribe",
        json={
            "email": email,
            "whatsapp_number": "+22670112233",
            "commodity": "sorghum",
            "region": "Sahel",
            "threshold_price": 275,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
class TestAlertSubscribe:
    async def test_subscribe_creates_pending_subscription(self, client, monkeypatch):
        calls = []

        def fake_apply_async(**kwargs):
            calls.append(kwargs)

        monkeypatch.setattr(
            "fasodata.alerts.tasks.send_confirmation_email_task.apply_async",
            fake_apply_async,
        )

        data = await create_subscription(client)

        assert data["email"] == "abonne@test.bf"
        assert data["commodity"] == "sorghum"
        assert data["region"] == "Sahel"
        assert data["threshold_price"] == 275
        assert data["whatsapp_number"] is None
        assert data["is_active"] is False
        assert data["is_confirmed"] is False
        assert len(calls) == 1
        assert calls[0]["queue"] == "default"

    async def test_subscribe_accepts_optional_whatsapp_number(self, client, monkeypatch):
        monkeypatch.setattr(
            "fasodata.alerts.tasks.send_confirmation_email_task.apply_async",
            lambda **kwargs: None,
        )

        data = await create_subscription_with_whatsapp(client)

        assert data["email"] == "wa@test.bf"
        assert data["whatsapp_number"] == "+22670112233"
        assert data["is_confirmed"] is False

    async def test_subscribe_confirmation_links_use_app_base_url(self, client, monkeypatch):
        calls = []

        def fake_apply_async(**kwargs):
            calls.append(kwargs)

        monkeypatch.setattr("fasodata.alerts.router.settings.app_base_url", "https://fasodata.bf")
        monkeypatch.setattr(
            "fasodata.alerts.tasks.send_confirmation_email_task.apply_async",
            fake_apply_async,
        )

        await create_subscription(client, "prod-link@test.bf")

        kwargs = calls[0]["kwargs"]
        assert kwargs["confirm_url"].startswith("https://fasodata.bf/api/alerts/confirm/")
        assert kwargs["unsubscribe_url"].startswith("https://fasodata.bf/api/alerts/unsubscribe/")
        assert "localhost" not in kwargs["confirm_url"]

    async def test_subscribe_duplicate_active_returns_conflict(self, client, db_session):
        data = await create_subscription(client, "dupe@test.bf")
        sub = await db_session.get(AlertSubscription, data["id"])
        sub.is_confirmed = True
        sub.is_active = True
        sub.confirmed_at = datetime.now(timezone.utc)
        await db_session.commit()

        resp = await client.post(
            "/api/alerts/subscribe",
            json={
                "email": "dupe@test.bf",
                "commodity": "sorghum",
                "region": "Sahel",
                "threshold_price": 300,
            },
        )

        assert resp.status_code == 409

    async def test_subscribe_invalid_email(self, client):
        resp = await client.post(
            "/api/alerts/subscribe",
            json={
                "email": "pas-un-email",
                "commodity": "sorghum",
                "region": "Sahel",
                "threshold_price": 275,
            },
        )
        assert resp.status_code == 422

    async def test_subscribe_invalid_threshold(self, client):
        resp = await client.post(
            "/api/alerts/subscribe",
            json={
                "email": "abonne@test.bf",
                "commodity": "sorghum",
                "region": "Sahel",
                "threshold_price": 0,
            },
        )
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestAlertPublicLifecycle:
    async def test_confirm_subscription_activates_it(self, client, db_session):
        created = await create_subscription(client)
        sub = await db_session.get(AlertSubscription, created["id"])

        resp = await client.get(f"/api/alerts/confirm/{sub.token}")

        assert resp.status_code == 200
        assert "Abonnement" in resp.text
        await db_session.refresh(sub)
        assert sub.is_confirmed is True
        assert sub.is_active is True
        assert sub.confirmed_at is not None

    async def test_confirm_unknown_token_returns_404(self, client):
        resp = await client.get("/api/alerts/confirm/token-inconnu")
        assert resp.status_code == 404

    async def test_unsubscribe_deactivates_subscription(self, client, db_session):
        created = await create_subscription(client)
        sub = await db_session.get(AlertSubscription, created["id"])
        sub.is_confirmed = True
        sub.is_active = True
        await db_session.commit()

        resp = await client.get(f"/api/alerts/unsubscribe/{sub.token}")

        assert resp.status_code == 200
        await db_session.refresh(sub)
        assert sub.is_active is False
        assert sub.is_confirmed is True

    async def test_status_returns_public_metrics(self, client, db_session):
        pending = AlertSubscription(
            email="pending@test.bf",
            commodity="sorghum",
            region="Sahel",
            threshold_price=275,
        )
        active = AlertSubscription(
            email="active@test.bf",
            commodity="maize",
            region="Centre",
            threshold_price=320,
            is_confirmed=True,
            is_active=True,
            confirmed_at=datetime.now(timezone.utc),
        )
        db_session.add_all([pending, active])
        await db_session.commit()

        resp = await client.get("/api/alerts/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["total_subscriptions"] == 2
        assert data["active_confirmed"] == 1
        assert data["pending_confirmation"] == 1
        assert "smtp_configured" in data
        assert "whatsapp_configured" in data
        assert "whatsapp_mode" in data
        assert "check_schedule" in data


@pytest.mark.asyncio
class TestAlertAdminSubscriptions:
    async def test_list_subscriptions_requires_auth(self, client):
        resp = await client.get("/api/alerts/subscriptions")
        assert resp.status_code == 401

    async def test_list_subscriptions_requires_admin(self, client, institutional_token):
        resp = await client.get(
            "/api/alerts/subscriptions",
            headers=admin_headers(institutional_token),
        )
        assert resp.status_code == 403

    async def test_admin_lists_subscriptions_with_pagination(self, client, admin_token):
        await create_subscription(client, "one@test.bf")
        await create_subscription(client, "two@test.bf")

        resp = await client.get(
            "/api/alerts/subscriptions?page=1&page_size=1",
            headers=admin_headers(admin_token),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["items"]) == 1

    async def test_admin_filters_active_subscriptions(self, client, admin_token, db_session):
        created = await create_subscription(client, "active-filter@test.bf")
        sub = await db_session.get(AlertSubscription, created["id"])
        sub.is_confirmed = True
        sub.is_active = True
        await db_session.commit()
        await create_subscription(client, "inactive-filter@test.bf")

        resp = await client.get(
            "/api/alerts/subscriptions?active=true",
            headers=admin_headers(admin_token),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["email"] == "active-filter@test.bf"

    async def test_admin_updates_subscription(self, client, admin_token):
        created = await create_subscription(client, "update@test.bf")

        resp = await client.patch(
            f"/api/alerts/subscriptions/{created['id']}",
            json={
                "threshold_price": 350,
                "is_confirmed": True,
                "is_active": True,
                "region": "Nord",
            },
            headers=admin_headers(admin_token),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["threshold_price"] == 350
        assert data["is_confirmed"] is True
        assert data["is_active"] is True
        assert data["region"] == "Nord"
        assert data["confirmed_at"] is not None

    async def test_admin_update_requires_admin(self, client, institutional_token):
        created = await create_subscription(client, "forbidden-update@test.bf")

        resp = await client.patch(
            f"/api/alerts/subscriptions/{created['id']}",
            json={"is_active": True},
            headers=admin_headers(institutional_token),
        )

        assert resp.status_code == 403

    async def test_admin_delete_subscription(self, client, admin_token, db_session):
        created = await create_subscription(client, "delete@test.bf")

        resp = await client.delete(
            f"/api/alerts/subscriptions/{created['id']}",
            headers=admin_headers(admin_token),
        )

        assert resp.status_code == 204
        result = await db_session.execute(select(AlertSubscription))
        assert result.scalars().all() == []

    async def test_admin_delete_unknown_subscription(self, client, admin_token):
        resp = await client.delete(
            "/api/alerts/subscriptions/00000000-0000-0000-0000-000000000000",
            headers=admin_headers(admin_token),
        )
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestAlertManualCheck:
    async def test_trigger_check_requires_auth(self, client):
        resp = await client.post("/api/alerts/trigger-check")
        assert resp.status_code == 401

    async def test_trigger_check_requires_admin(self, client, institutional_token):
        resp = await client.post(
            "/api/alerts/trigger-check",
            headers=admin_headers(institutional_token),
        )
        assert resp.status_code == 403

    async def test_admin_trigger_check_queues_task(self, client, admin_token, monkeypatch):
        class DummyTask:
            id = "task-test-123"

        def fake_apply_async(queue: str):
            assert queue == "default"
            return DummyTask()

        monkeypatch.setattr(
            "fasodata.alerts.tasks.check_price_alerts.apply_async",
            fake_apply_async,
        )

        resp = await client.post(
            "/api/alerts/trigger-check",
            headers=admin_headers(admin_token),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "queued"
        assert data["task_id"] == "task-test-123"
        assert "message" in data


@pytest.mark.asyncio
class TestAlertChannels:
    async def test_check_price_alerts_sends_email_and_whatsapp(self, db_session, monkeypatch):
        settings = SimpleNamespace(
            database_url="postgresql+asyncpg://fasodata:changeme_db@db:5432/fasodata_test",
            public_app_base_url="https://fasodata.bf",
        )
        monkeypatch.setattr("fasodata.core.config.get_settings", lambda: settings)

        sub = AlertSubscription(
            email="channels@test.bf",
            whatsapp_number="+22670112233",
            commodity="sorghum",
            region="Sahel",
            threshold_price=275,
            is_confirmed=True,
            is_active=True,
            confirmed_at=datetime.now(timezone.utc),
        )
        price = PriceData(
            commodity="sorghum",
            region="Sahel",
            market="Dori",
            price=325,
            unit="CFA/kg",
            price_date=date.today(),
            source="wfp",
            validation_status="auto",
        )
        db_session.add_all([sub, price])
        await db_session.commit()

        email_calls = []
        whatsapp_calls = []

        def fake_email(**kwargs):
            email_calls.append(kwargs)
            return True

        def fake_whatsapp(**kwargs):
            whatsapp_calls.append(kwargs)
            return True

        monkeypatch.setattr("fasodata.alerts.email_service.send_price_alert_email", fake_email)
        monkeypatch.setattr("fasodata.alerts.whatsapp_service.send_price_alert_whatsapp", fake_whatsapp)

        from fasodata.alerts.tasks import check_price_alerts

        result = check_price_alerts()

        assert result["sent"] == 1
        assert result["errors"] == 0
        assert len(email_calls) == 1
        assert len(whatsapp_calls) == 1
        assert whatsapp_calls[0]["to_number"] == "+22670112233"
        assert whatsapp_calls[0]["unsubscribe_url"].startswith("https://fasodata.bf/api/alerts/unsubscribe/")

        await db_session.refresh(sub)
        assert sub.alert_count == 1
        assert sub.last_price_alerted == 325
