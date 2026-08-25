export type PendingScoreChange = {
  id: string;
  roundId: string;
  holeNumber: number;
  strokes: number;
  revision: number;
  createdAt: string;
};

const databaseName = 'vaylakaverit';
const storeName = 'pending-score-changes';

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

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(change);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

export async function getPendingScoreChanges(roundId: string): Promise<PendingScoreChange[]> {
  const database = await openDatabase();

  const changes = await new Promise<PendingScoreChange[]>((resolve, reject) => {
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

  database.close();
  return changes;
}
