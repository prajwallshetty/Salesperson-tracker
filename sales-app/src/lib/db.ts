import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { LocationPing } from "@/types";

interface BufferedPing extends LocationPing {
  id?: number;
  queuedAt: string;
}

interface SalesAppDB extends DBSchema {
  pingQueue: {
    key: number;
    value: BufferedPing;
  };
}

let dbPromise: Promise<IDBPDatabase<SalesAppDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SalesAppDB>("sfp-field-app", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pingQueue")) {
          db.createObjectStore("pingQueue", { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function queuePing(ping: LocationPing): Promise<void> {
  const db = await getDb();
  await db.add("pingQueue", { ...ping, queuedAt: new Date().toISOString() });
}

export async function getQueuedPings(): Promise<BufferedPing[]> {
  const db = await getDb();
  const all = await db.getAll("pingQueue");
  // chronological order, oldest first
  return all.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function removeQueuedPing(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("pingQueue", id);
}

export async function queuedPingCount(): Promise<number> {
  const db = await getDb();
  return db.count("pingQueue");
}
