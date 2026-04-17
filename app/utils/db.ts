import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface NoteNalaDB extends DBSchema {
  tasks: {
    key: number;
    value: any; 
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      action: 'INSERT' | 'UPDATE' | 'DELETE';
      table: 'tasks';
      payload: any;
      local_id?: number; 
    };
  };
}

let dbPromise: Promise<IDBPDatabase<NoteNalaDB>> | null = null;

export const initDB = () => {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<NoteNalaDB>('notenala-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
            db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
            db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
};

export const getCachedTasks = async () => {
  const db = await initDB();
  if (!db) return [];
  // Sort descending manually since we're just caching
  const all = await db.getAll('tasks');
  return all.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export const saveTasksToCache = async (tasks: any[]) => {
  const db = await initDB();
  if (!db) return;
  const tx = db.transaction('tasks', 'readwrite');
  await tx.store.clear(); // Clear old cache
  await Promise.all(tasks.map(task => tx.store.put(task)));
  await tx.done;
};

export const addSyncQueue = async (action: 'INSERT'|'UPDATE'|'DELETE', payload: any, localId?: number) => {
  const db = await initDB();
  if (!db) return;
  await db.add('sync_queue', { action, table: 'tasks', payload, local_id: localId });
};

export const getSyncQueue = async () => {
  const db = await initDB();
  if (!db) return [];
  return db.getAll('sync_queue');
};

export const removeSyncQueueItem = async (id: number) => {
  const db = await initDB();
  if (!db) return;
  await db.delete('sync_queue', id);
};
