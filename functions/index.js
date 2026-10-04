import { timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const adminApiToken = defineSecret('ADMIN_API_TOKEN');
const statuses = new Set(['Avaliando', 'Wishlist', 'Comprado', 'Descartado']);
const editableFields = new Set([
  'title', 'collection', 'category', 'platform', 'price', 'url',
  'condition', 'status', 'notes', 'discoveredAt', 'lastCheckedAt',
]);

function authorized(request) {
  const supplied = (request.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const expected = adminApiToken.value();
  if (!supplied || !expected) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function serialize(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    discoveredAt: data.discoveredAt?.toDate?.().toISOString() || null,
    lastCheckedAt: data.lastCheckedAt?.toDate?.().toISOString() || null,
    createdAt: data.createdAt?.toDate?.().toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
    acquiredAt: data.acquiredAt?.toDate?.().toISOString() || null,
  };
}

function validate(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Payload JSON inválido.';
  if (!partial) {
    for (const field of ['title', 'collection', 'category', 'platform', 'price', 'condition', 'status']) {
      if (input[field] === undefined || input[field] === '') return `Campo obrigatório: ${field}.`;
    }
  }
  if (input.status !== undefined && !statuses.has(input.status)) return 'Status inválido.';
  if (input.price !== undefined && (typeof input.price !== 'number' || input.price < 0)) return 'Preço inválido.';
  for (const key of Object.keys(input)) {
    if (!editableFields.has(key)) return `Campo não permitido: ${key}.`;
  }
  return null;
}

function normalized(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (editableFields.has(key)) output[key] = value;
  }
  if (typeof output.discoveredAt === 'string') output.discoveredAt = new Date(output.discoveredAt);
  if (typeof output.lastCheckedAt === 'string') output.lastCheckedAt = new Date(output.lastCheckedAt);
  return output;
}

export const adminApi = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [adminApiToken],
    cors: false,
    invoker: 'public',
    maxInstances: 3,
  },
  async (request, response) => {
    response.set('Cache-Control', 'no-store');

    if (request.method === 'GET' && request.path === '/health') {
      response.json({ ok: true, service: 'star-wars-collection-admin-api' });
      return;
    }
    if (!authorized(request)) {
      response.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    try {
      const path = request.path.replace(/\/+$/, '') || '/';
      const match = path.match(/^\/opportunities\/([^/]+)$/);

      if (request.method === 'GET' && (path === '/opportunities' || path === '/collection')) {
        let ref = db.collection('opportunities');
        const requestedStatus = path === '/collection' ? 'Comprado' : request.query.status;
        if (requestedStatus) ref = ref.where('status', '==', requestedStatus);
        if (request.query.category) ref = ref.where('category', '==', request.query.category);
        const snapshot = await ref.get();
        response.json({ items: snapshot.docs.map(serialize) });
        return;
      }

      if (request.method === 'POST' && path === '/opportunities') {
        const error = validate(request.body);
        if (error) { response.status(400).json({ error }); return; }
        const now = FieldValue.serverTimestamp();
        const ref = await db.collection('opportunities').add({
          ...normalized(request.body),
          discoveredAt: request.body.discoveredAt ? new Date(request.body.discoveredAt) : now,
          lastCheckedAt: request.body.lastCheckedAt ? new Date(request.body.lastCheckedAt) : now,
          createdAt: now,
          updatedAt: now,
        });
        response.status(201).json({ id: ref.id });
        return;
      }

      if (request.method === 'PATCH' && match) {
        const error = validate(request.body, true);
        if (error) { response.status(400).json({ error }); return; }
        await db.collection('opportunities').doc(match[1]).update({
          ...normalized(request.body),
          lastCheckedAt: request.body.lastCheckedAt ? new Date(request.body.lastCheckedAt) : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          acquiredAt: request.body.status === 'Comprado' ? FieldValue.serverTimestamp() : null,
        });
        response.status(204).send();
        return;
      }

      if (request.method === 'DELETE' && match) {
        await db.collection('opportunities').doc(match[1]).delete();
        response.status(204).send();
        return;
      }

      response.status(404).json({ error: 'Endpoint não encontrado.' });
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: 'Erro interno.' });
    }
  },
);
