from copy import deepcopy
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

KEY = 'test-only-backend-key-with-more-than-32-characters'


class SnapshotCollection:
    def __init__(self):
        self.document = None

    async def find_one(self, query):
        return deepcopy(self.document)

    async def replace_one(self, query, document, **kwargs):
        self.document = deepcopy(document)


def snapshot():
    return {
        'version': 1, 'savedAt': '2026-10-05T10:00:00Z',
        'data': {
            'name': 'Customer', 'tamil': True, 'busy': False, 'custom': '',
            'messages': [{'id': '1', 'source': 'WhatsApp', 'text': 'வணக்கம்',
                          'important': True, 'receivedAt': 123, 'origin': 'notification'}],
            'important': True, 'draft': 'Local draft', 'source': 'SMS', 'phone': '', 'title': '', 'date': '',
        },
    }


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.key_patch = patch.object(settings, 'backend_api_key', KEY)
        self.key_patch.start()
        self.addCleanup(self.key_patch.stop)
        self.addCleanup(self.client.close)
        self.headers = {'Authorization': f'Bearer {KEY}'}
        self.collection = SnapshotCollection()
        self.collection_patch = patch('app.services.state_service.get_collection', return_value=self.collection)
        self.collection_patch.start()
        self.addCleanup(self.collection_patch.stop)

    def test_snapshot_requires_authentication(self):
        self.assertEqual(self.client.put('/api/v1/assistant/state', json=snapshot()).status_code, 401)
        self.assertEqual(self.client.get('/api/v1/assistant/state', headers={'Authorization': 'Bearer wrong'}).status_code, 401)
        self.assertIsNone(self.collection.document)

    def test_status_checks_database_readiness(self):
        database = AsyncMock()
        with patch('app.api.routes.assistant.get_database', return_value=database):
            self.assertEqual(self.client.get('/api/v1/assistant/status', headers=self.headers).json()['status'], 'ok')
            database.command.side_effect = RuntimeError('Offline')
            self.assertEqual(self.client.get('/api/v1/assistant/status', headers=self.headers).status_code, 503)

    def test_sync_round_trip_and_retry_preserve_tamil_and_metadata(self):
        body = snapshot()
        for _ in range(2):
            response = self.client.put('/api/v1/assistant/state', headers=self.headers, json=body)
            self.assertEqual(response.status_code, 200, response.text)
        response = self.client.get('/api/v1/assistant/state', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data'], body['data'])
        self.assertEqual(len(response.json()['data']['messages']), 1)
        body['data']['messages'] = []
        self.client.put('/api/v1/assistant/state', headers=self.headers, json=body)
        self.assertEqual(self.client.get('/api/v1/assistant/state', headers=self.headers).json()['data']['messages'], [])

    def test_invalid_snapshot_does_not_replace_saved_data(self):
        body = snapshot()
        self.client.put('/api/v1/assistant/state', headers=self.headers, json=body)
        duplicate = deepcopy(body)
        duplicate['data']['messages'].append(duplicate['data']['messages'][0])
        self.assertEqual(self.client.put('/api/v1/assistant/state', headers=self.headers, json=duplicate).status_code, 422)
        body['data']['webClientId'] = 'must-not-be-uploaded'
        self.assertEqual(self.client.put('/api/v1/assistant/state', headers=self.headers, json=body).status_code, 422)
        self.assertEqual(len(self.collection.document['snapshot']['data']['messages']), 1)

    def test_empty_server_is_explicit_and_missing_key_is_rejected(self):
        self.assertEqual(self.client.get('/api/v1/assistant/state', headers=self.headers).status_code, 404)
        with patch.object(settings, 'backend_api_key', ''):
            self.assertEqual(self.client.get('/api/v1/assistant/state', headers=self.headers).status_code, 503)


if __name__ == '__main__':
    unittest.main()
