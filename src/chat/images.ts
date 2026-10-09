import { useEffect, useState } from 'react'

/**
 * Generated images and attached files (cleaned photos, document text) live in this
 * browser's IndexedDB (localStorage is far too small for them). Chat messages only keep
 * the id. Nothing is uploaded anywhere.
 */

const DB = 'null.chat.images'
const STORE = 'images'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
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
  const blob = await (await fetch(dataUrl)).blob()
  await tx('readwrite', (s) => s.put(blob, id))
}

/** Any stored file, as is (used when restoring a backup). */
export async function putBlob(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, id))
}

/** A document's text (`${id}`) or the shielded text the model saw (`${id}.wire`). */
export async function putText(id: string, text: string): Promise<void> {
  await tx('readwrite', (s) => s.put(new Blob([text], { type: 'text/plain' }), id))
}

export async function getText(id: string): Promise<string | null> {
  const blob = await getImageBlob(id)
  return blob ? blob.text() : null
}

export async function getImageBlob(id: string): Promise<Blob | null> {
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
