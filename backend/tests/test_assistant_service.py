import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch


class Cursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, *args):
        return self

    def limit(self, *args):
        return self

    async def to_list(self, **kwargs):
        return self.documents


class Collection:
    def __init__(self):
        self.documents = []
        self.profile = None
        self.updates = []

    async def find_one(self, query):
        return self.profile

    def find(self, query):
        return Cursor(self.documents)

    async def insert_one(self, document):
        # Motor/PyMongo adds its ObjectId to the supplied dictionary.
        document['_id'] = object()
        self.documents.append(dict(document))

    async def update_one(self, query, update, **kwargs):
        if '_id' in update['$set']:
            raise ValueError('Immutable MongoDB field')
        self.updates.append(update)


def load_service(collection):
    database = types.ModuleType('app.database')
    database.get_collection = lambda name: collection
    schemas = types.ModuleType('app.schemas.assistant')
    schemas.default_profile = lambda: {'name': '', 'busy': False, 'tamil': False}
    ai = types.ModuleType('app.services.ai_service')
    ai.generate_reply = AsyncMock(return_value='Please provide reminder details.')
    state = types.ModuleType('app.services.state_service')
    state.read_state = AsyncMock(return_value=None)
    source = Path(__file__).parents[1] / 'app/services/assistant_service.py'
    spec = importlib.util.spec_from_file_location('service_under_test', source)
    service = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {'app.database': database, 'app.schemas.assistant': schemas, 'app.services.ai_service': ai, 'app.services.state_service': state}):
        spec.loader.exec_module(service)
    return service


class AssistantServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_existing_profile_updates_exclude_immutable_id(self):
        collection = Collection()
        collection.profile = {'_id': object(), 'name': 'Customer'}
        service = load_service(collection)
        profile = await service.get_profile()
        self.assertNotIn('_id', profile)
        updated = await service.upsert_profile({'busy': True})
        self.assertEqual(updated['name'], 'Customer')
        self.assertTrue(updated['busy'])
        json.dumps(updated)
        self.assertNotIn('_id', collection.updates[0]['$set'])

    async def test_created_and_listed_records_are_json_serializable(self):
        collection = Collection()
        service = load_service(collection)
        message = await service.insert_message({'text': 'Hello'})
        task = await service.create_task({'title': 'Call home'})
        json.dumps(message)
        json.dumps(task)
        self.assertNotIn('_id', message)
        self.assertNotIn('_id', task)
        messages = await service.list_messages()
        tasks = await service.list_tasks()
        json.dumps(messages)
        json.dumps(tasks)
        self.assertTrue(all('_id' not in item for item in messages + tasks))
        self.assertTrue(all('_id' in item for item in collection.documents))

    async def test_chat_does_not_claim_an_unsaved_reminder(self):
        collection = Collection()
        service = load_service(collection)
        _, _, created = await service.generate_assistant_response('Remind me to call home')
        self.assertFalse(created)
        self.assertEqual(collection.documents, [])


if __name__ == '__main__':
    unittest.main()
