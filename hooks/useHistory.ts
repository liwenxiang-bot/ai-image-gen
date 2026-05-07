"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistoryItem } from "@/lib/types";
import { MAX_HISTORY_ITEMS } from "@/lib/constants";

const DB_NAME = "ai-image-gen";
const STORE_NAME = "history";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllItems(): Promise<HistoryItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = (request.result as HistoryItem[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

async function putItem(item: HistoryItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function trimToMax(max: number): Promise<void> {
  const items = await getAllItems();
  if (items.length <= max) return;
  const toDelete = items.slice(max);
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const item of toDelete) {
    store.delete(item.id);
  }
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Migrate from localStorage if exists
    const migrateAndLoad = async () => {
      try {
        const stored = localStorage.getItem("ai-image-gen-history");
        if (stored) {
          const items: HistoryItem[] = JSON.parse(stored);
          for (const item of items) {
            await putItem(item);
          }
          localStorage.removeItem("ai-image-gen-history");
        }
      } catch {}

      try {
        const items = await getAllItems();
        setHistory(items);
      } catch {}
    };
    migrateAndLoad();
  }, []);

  const addItem = useCallback(
    async (item: Omit<HistoryItem, "id" | "createdAt">) => {
      const newItem: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setHistory((prev) => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
      await putItem(newItem);
      await trimToMax(MAX_HISTORY_ITEMS);
    },
    []
  );

  const removeItem = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await deleteItem(id);
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await clearAll();
  }, []);

  return { history, addItem, removeItem, clearHistory };
}
