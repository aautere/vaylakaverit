export type PendingScoreChange = {
  id: string;
  roundId: string;
  playerId: string;
  holeNumber: number;
  strokes: number;
  expectedRevision: number;
  createdAt: string;
};

const databaseName = 'vaylakaverit';
const storeName = 'pending-score-changes';
let lastCreatedAt = 0;

export function createScoreChangeId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20,
    )}-${hex.slice(20)}`;
  }

  throw new Error('Turvallista tunnistetta ei voitu luoda.');
}

export function createPendingScoreChange(
  roundId: string,
  playerId: string,
  holeNumber: number,
  strokes: number,
  expectedRevision = 0,
): PendingScoreChange {
  lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);

  return {
    id: createScoreChangeId(),
    roundId,
    playerId,
    holeNumber,
    strokes,
    expectedRevision,
    createdAt: new Date(lastCreatedAt).toISOString(),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function queueScoreChange(change: PendingScoreChange): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(change);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function getPendingScoreChanges(roundId: string): Promise<PendingScoreChange[]> {
  const database = await openDatabase();

  try {
    return await new Promise<PendingScoreChange[]>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const pendingChanges = (request.result as PendingScoreChange[])
          .filter((change) => change.roundId === roundId)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
        resolve(pendingChanges);
      };
    });
  } finally {
    database.close();
  }
}

export async function removePendingScoreChange(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function clearPendingScoreChanges(): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
