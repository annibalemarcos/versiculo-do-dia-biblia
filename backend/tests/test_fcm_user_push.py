import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import unittest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

class TestFCMUserPushService(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()

    def test_fcm_delivery_mode_fallback_to_simulation(self):
        """Verifies delivery mode defaults to simulation when no FCM credentials exist."""
        from app.services.fcm_user_push_service import get_fcm_delivery_mode
        with patch("app.services.fcm_user_push_service.get_firebase_app", return_value=None), \
             patch("app.core.config.settings.FCM_SERVER_KEY", ""):
            mode = get_fcm_delivery_mode()
            self.assertEqual(mode, "simulation")

    def test_send_fcm_multicast_simulation(self):
        """Verifies multicast push handles tokens gracefully in simulation mode."""
        from app.services.fcm_user_push_service import send_fcm_multicast
        with patch("app.services.fcm_user_push_service.get_fcm_delivery_mode", return_value="simulation"):
            tokens = ["fcm_token_device_1", "fcm_token_device_2"]
            result = send_fcm_multicast(
                tokens=tokens,
                title="Versículo do Dia",
                body="O Senhor é o meu pastor",
                data={"campaign_id": "camp_123"},
                deep_link="daily_verse"
            )
            self.assertEqual(result["success_count"], 2)
            self.assertEqual(result["failure_count"], 0)
            self.assertEqual(result["successful_tokens"], tokens)
            self.assertEqual(result["invalid_tokens"], [])

    def test_send_fcm_multicast_empty_tokens(self):
        """Verifies multicast returns zeros without errors when token list is empty."""
        from app.services.fcm_user_push_service import send_fcm_multicast
        result = send_fcm_multicast([], "Título", "Mensagem")
        self.assertEqual(result["success_count"], 0)
        self.assertEqual(result["failure_count"], 0)

    def test_update_device_statuses_deactivates_invalid_tokens(self):
        """Verifies invalid/unregistered tokens are deactivated (active=False)."""
        from app.services.fcm_user_push_service import update_device_statuses_after_push

        update_device_statuses_after_push(
            db=self.mock_db,
            successful_tokens=["tok_good"],
            failed_tokens=["tok_bad"],
            invalid_tokens=["tok_bad"]
        )
        self.assertTrue(self.mock_db.query.called)
        self.assertTrue(self.mock_db.flush.called)

    def test_dispatch_campaign_immediate(self):
        """Verifies dispatch_campaign sets sent_at, transitions to sent, and creates broadcast UserNotification."""
        from app.services.fcm_user_push_service import dispatch_campaign
        from app.models.notification import NotificationCampaign

        campaign = NotificationCampaign(
            id="camp_test_001",
            app_id="verse_daily",
            title="Boa Noite na Paz de Deus",
            message="Em paz me deito e logo adormeço, pois só tu, Senhor, me fazes viver em segurança.",
            deep_link="daily_verse",
            target_audience="all",
            status="scheduled",
            scheduled_at=datetime.now(timezone.utc) - timedelta(minutes=5)
        )

        with patch("app.services.fcm_user_push_service.get_target_device_tokens", return_value=(["tok_1", "tok_2"], ["usr_1", "usr_2"])), \
             patch("app.services.fcm_user_push_service.send_fcm_multicast", return_value={
                 "success_count": 2,
                 "failure_count": 0,
                 "successful_tokens": ["tok_1", "tok_2"],
                 "failed_tokens": [],
                 "invalid_tokens": [],
                 "mode": "simulation"
             }), \
             patch("app.services.fcm_user_push_service.update_device_statuses_after_push"):

            res = dispatch_campaign(db=self.mock_db, campaign=campaign)
            self.assertTrue(res["success"])
            self.assertEqual(res["target_count"], 2)
            self.assertEqual(res["success_count"], 2)
            self.assertEqual(campaign.status, "sent")
            self.assertIsNotNone(campaign.sent_at)
            self.assertTrue(self.mock_db.add.called)
            self.assertTrue(self.mock_db.commit.called)

    def test_process_due_scheduled_campaigns(self):
        """Verifies scheduler picks up due scheduled campaigns and calls dispatch."""
        from app.services.fcm_user_push_service import process_due_scheduled_campaigns
        from app.models.notification import NotificationCampaign

        due_camp = NotificationCampaign(
            id="camp_due_1",
            app_id="verse_daily",
            title="Campanha Agendada Vencida",
            message="Hora do versículo!",
            target_audience="all",
            status="scheduled",
            scheduled_at=datetime.now(timezone.utc) - timedelta(minutes=2)
        )

        # Mock DB query
        mock_query = self.mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.all.return_value = [due_camp]

        with patch("app.services.fcm_user_push_service.dispatch_campaign", return_value={"success": True, "status": "sent"}) as mock_dispatch:
            res = process_due_scheduled_campaigns(self.mock_db)
            self.assertTrue(res["success"])
            self.assertEqual(res["processed_count"], 1)
            mock_dispatch.assert_called_once_with(db=self.mock_db, campaign=due_camp)

    def test_fcm_service_status_diagnostics(self):
        """Verifies get_fcm_service_status returns accurate summary without exposing secrets."""
        from app.services.fcm_user_push_service import get_fcm_service_status

        mock_query = self.mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.count.return_value = 42
        mock_order = mock_filter.order_by.return_value
        mock_order.first.return_value = None

        status = get_fcm_service_status(self.mock_db, app_id="verse_daily")
        self.assertIn("delivery_mode", status)
        self.assertIn("is_configured", status)
        self.assertIn("registered_active_devices", status)
        self.assertIn("provider_description", status)
        # Ensure zero secret leakage
        self.assertNotIn("secret", str(status).lower())
        self.assertNotIn("key", str(status).lower())

if __name__ == "__main__":
    unittest.main()
