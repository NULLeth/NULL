import { useEffect, useState } from 'react'
import { randId } from '../lib/random'

/**
 * Generated images and attached files (cleaned photos, document text) live in this
 * browser's IndexedDB (localStorage is far too small for them). Chat messages only keep
 * the id. Nothing is uploaded anywhere.
 *
 * Ghost chats are the exception: their files get ids that start with "ghost" and are kept
 * only in memory here, never written to disk. Closing the tab drops them.
 */

const memory = new Map<string, Blob>()
const inMemory = (id: string) => id.startsWith('ghost')

/** A new file id; ghost chats get one that stays in memory. */
export const fileId = (kind: string, ghost?: boolean) => randId(ghost ? `ghost${kind}` : kind, 12)

const DB = 'null.chat.images'
const STORE = 'images'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    // version 2 only makes sure the store exists (a database can exist without it)
    const req = indexedDB.open(DB, 2)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        t.oncomplete = () => resolve(req ? req.result : undefined)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export async function putImage(id: string, dataUrl: string): Promise<void> {
  await putBlob(id, await (await fetch(dataUrl)).blob())
}

/** Any stored file, as is (used when restoring a backup). */
export async function putBlob(id: string, blob: Blob): Promise<void> {
  if (inMemory(id)) memory.set(id, blob)
  else await tx('readwrite', (s) => s.put(blob, id))
}

/** A document's text (`${id}`) or the shielded text the model saw (`${id}.wire`). */
export async function putText(id: string, text: string): Promise<void> {
  await putBlob(id, new Blob([text], { type: 'text/plain' }))
}

export async function getText(id: string): Promise<string | null> {
  const blob = await getImageBlob(id)
  return blob ? blob.text() : null
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  if (inMemory(id)) return memory.get(id) ?? null
  try {
    return ((await tx<Blob>('readonly', (s) => s.get(id))) as Blob | undefined) ?? null
  } catch {
    return null
  }
}

/** The image as a data URL, for sending it back to the model as an edit reference. */
export async function getImageDataUrl(id: string): Promise<string | null> {
  const blob = await getImageBlob(id)
  if (!blob) return null
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
    r.onerror = () => resolve(null)
    r.readAsDataURL(blob)
  })
}

export async function deleteImages(ids: string[]): Promise<void> {
  for (const id of ids.filter(inMemory)) {
    memory.delete(id)
    memory.delete(`${id}.wire`)
  }
  ids = ids.filter((id) => !inMemory(id))
  if (!ids.length) return
  try {
    await tx('readwrite', (s) => {
      // a document also has its shielded copy
      ids.forEach((id) => {
        s.delete(id)
        s.delete(`${id}.wire`)
      })
    })
  } catch {
    /* nothing to clean up */
  }
}

/** Object URL for a stored image; `undefined` while loading, `null` if it's gone. */
export function useImageUrl(id: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    let made: string | null = null
    void getImageBlob(id).then((blob) => {
      if (!alive) return
      made = blob ? URL.createObjectURL(blob) : null
      setUrl(made)
    })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  return url
}
