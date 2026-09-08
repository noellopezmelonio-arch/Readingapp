
import { useState, useEffect } from 'react';
import type { Book } from '../types';

const STORAGE_KEY = 'reading-tracker-books';
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function useBooks() {
  const [isSyncing, setIsSyncing] = useState(false);
  const dedupe = (arr: Book[]) => {
    const m = new Map<string, Book>();
    arr.forEach(b => { if (b && b.id) m.set(String(b.id), b); });
    return Array.from(m.values());
  };

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Book>[];
        // attempt to find a seeded Noel user and assign existing orphaned books to them
        let noelId: string | null = null;
        try {
          const usersRaw = localStorage.getItem('reading-tracker-users');
          if (usersRaw) {
            const users = JSON.parse(usersRaw) as Array<any>;
            const noel = users.find(u => String(u.email).toLowerCase() === 'noelviajando@gmail.com');
            if (noel) noelId = noel.id;
          }
        } catch (e) {
          /* ignore */
        }
        // Normalize stored books to ensure required fields exist
        return dedupe(parsed.map(p => ({
          id: p.id ?? crypto.randomUUID(),
          title: (p.title as string) ?? 'Untitled',
          isRead: (p.isRead as boolean) ?? false,
          customInfo: (p.customInfo as any[]) ?? [],
          notes: (p.notes as string) ?? '',
          author: (p.author as string) ?? '',
          finishedDate: (p.finishedDate as string) ?? null,
          pages: (typeof p.pages === 'number' ? p.pages : (p.pages ? Number(p.pages) : null)) ?? null,
          genre: (p.genre as string) ?? '',
          publicationYear: (typeof p.publicationYear === 'number' ? p.publicationYear : (p.publicationYear ? Number(p.publicationYear) : null)) ?? null,
          ownerId: (p as any).ownerId ?? noelId ?? null
        } as Book)));
      } catch (e) {
        console.error('Failed to parse books from local storage', e);
      }
    }
    return [];
  });

  // NOTE: automatic saving to localStorage disabled to avoid cross-window
  // races and UI jumps while editing. Use `saveLocal` or `saveAndSync`
  // to persist changes explicitly.

  useEffect(() => {
    console.debug('[useBooks] books updated, count=', books.length);
  }, [books]);

  // Try to load books from server when available
  // On first mount, if there are no local books, attempt to fetch books from
  // the server so fresh windows (e.g. incognito) can load shared data.
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const hasLocal = raw && raw !== '[]';
        if (hasLocal) return;
        const ping = await fetch(`${API_BASE}/api/ping`);
        if (!ping.ok) return;
        const res = await fetch(`${API_BASE}/api/books`);
        if (!res.ok) return;
        const serverBooks = await res.json() as Book[];
        if (serverBooks && serverBooks.length) {
          setBooks(dedupe(serverBooks));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Poll server for sync marker; only when marker advances do we fetch new
  // books. This prevents silent updates unless another client explicitly
  // indicated a save (by POSTing to /api/sync).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sync`);
        if (!res.ok) return;
        const { lastSync } = await res.json() as { lastSync?: number };
        if (!lastSync) return;
        const localLast = Number(localStorage.getItem('reading-tracker-last-sync') || 0);
        if (lastSync <= localLast) return;
        // server has a newer sync marker; fetch books and add non-destructively
        const r2 = await fetch(`${API_BASE}/api/books`);
        if (!r2.ok) return;
        const serverBooks = await r2.json() as Book[];
        setBooks(prev => {
          // load local modified timestamps map
          let modifiedMap: Record<string, number> = {};
          try { modifiedMap = JSON.parse(localStorage.getItem('reading-tracker-local-modified') || '{}'); } catch {}

          const next = [...prev];
          const byId = new Map(next.map(b => [String(b.id), b]));

          let changed = false;

          for (const sb of serverBooks) {
            const sid = String(sb.id);
            const local = byId.get(sid);
            if (!local) {
              // new book from server
              next.push(sb);
              changed = true;
              continue;
            }
            // existing locally: decide if server version should replace local
            const serverUpdated = (sb as any).updatedAt ? Number((sb as any).updatedAt) : 0;
            const localModified = Number(modifiedMap[sid] || 0);
            // If local has been modified after serverUpdated, keep local. Otherwise accept server.
            if (serverUpdated && serverUpdated > localModified) {
              // compare shallow equality to avoid unnecessary replacements
              try {
                const ljson = JSON.stringify(local);
                const sjson = JSON.stringify(sb);
                if (ljson !== sjson) {
                  const idx = next.findIndex(x => String(x.id) === sid);
                  if (idx !== -1) next[idx] = sb;
                  else next.push(sb);
                  changed = true;
                }
              } catch (e) {
                // fallback: replace
                const idx = next.findIndex(x => String(x.id) === sid);
                if (idx !== -1) next[idx] = sb; else next.push(sb);
                changed = true;
              }
            }
          }

          if (!changed) {
            try { localStorage.setItem('reading-tracker-last-sync', String(lastSync)); } catch {}
            return prev;
          }

          const merged = dedupe(next);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); localStorage.setItem('reading-tracker-last-sync', String(lastSync)); } catch {}
          console.debug('[useBooks] poll: merged', merged.length, 'books from server after sync');
          return merged;
        });
      } catch (e) {
        // ignore
      }
    };

    const iv = setInterval(() => { if (!cancelled) void poll(); }, 5000);
    void poll();
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Exposed sync function so App can trigger migration after login
  async function syncLocalToServer() {
    console.debug('[useBooks] syncLocalToServer start');
    try { setIsSyncing(true); } catch (e) {}
    let mergedCount = 0;
    try {
      try { window.dispatchEvent(new CustomEvent('reading-sync-start')); } catch (e) {}

      const ping = await fetch(`${API_BASE}/api/ping`);
      if (!ping.ok) return;
      const [resBooks, resUsers] = await Promise.all([
        fetch(`${API_BASE}/api/books`),
        fetch(`${API_BASE}/api/users`)
      ]);
      if (!resBooks.ok) return;
      const serverBooks = await resBooks.json();
      const serverUsers = resUsers && resUsers.ok ? await resUsers.json() : [];

      // Merge local books into server: POST any local-only books so the server has them.
      const localRaw = localStorage.getItem(STORAGE_KEY);
      let localBooks: Book[] = [];
      try { localBooks = localRaw ? JSON.parse(localRaw) as Book[] : []; } catch {}

      const serverMap = new Map((serverBooks as Book[]).map((b: Book) => [String(b.id), b]));
      const createdOnServer: Book[] = [];

      // attempt to read local users to map ownerId -> email
      let localUsers: any[] = [];
      try {
        const usersRaw = localStorage.getItem('reading-tracker-users');
        localUsers = usersRaw ? JSON.parse(usersRaw) as any[] : [];
      } catch {}

      for (const lb of localBooks) {
        if (serverMap.has(String(lb.id))) continue;
        // map ownerId via email if possible
        let ownerIdForServer = lb.ownerId;
        try {
          const localOwner = localUsers.find(u => String(u.id) === String(lb.ownerId));
          if (localOwner) {
            const match = serverUsers.find((su: any) => String(su.email).toLowerCase() === String(localOwner.email).toLowerCase());
            if (match) ownerIdForServer = match.id;
          }
        } catch {}

        const toPost = { ...lb, ownerId: ownerIdForServer };
        try {
          const p = await fetch(`${API_BASE}/api/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toPost)
          });
          if (p.ok) {
            const created = await p.json();
            createdOnServer.push(created as Book);
          } else {
            // server rejected; keep local-only
          }
        } catch (e) {
          // network error posting this book: skip
        }
      }

      // We pushed any local-only books to the server. We intentionally DO NOT
      // overwrite local `books` state here to avoid disrupting the user's
      // current view while they're editing. Other windows (like incognito)
      // will fetch from the server on first load.
      mergedCount = (serverBooks as Book[]).length + createdOnServer.length;
      console.debug('[useBooks] syncLocalToServer done, pushed local-only books, server count approx=', mergedCount);
    } catch (e) {
      console.debug('[useBooks] syncLocalToServer error', e);
    } finally {
      try { window.dispatchEvent(new CustomEvent('reading-sync-done', { detail: { count: mergedCount } })); } catch (e) {}
      try { setIsSyncing(false); } catch (e) {}
    }
  }

  const saveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
      console.debug('[useBooks] saveLocal: saved', books.length);
    } catch (e) {
      console.error('saveLocal failed', e);
    }
  };

  const saveAndSync = async (currentUserId?: string | null) => {
    saveLocal();
    try {
      // Fetch server books so we can decide creates/updates/deletes
      const ping = await fetch(`${API_BASE}/api/ping`);
      if (!ping.ok) return;
      const res = await fetch(`${API_BASE}/api/books`);
      if (!res.ok) return;
      const serverBooks = await res.json() as Book[];

      // Push each local book to server (server accepts POST for create/update)
      const modifiedMap = JSON.parse(localStorage.getItem('reading-tracker-local-modified') || '{}');
      for (const b of books) {
        try {
          const p = await fetch(`${API_BASE}/api/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(b)
          });
          if (p.ok) {
            // clear local modified flag for this book
            try { delete modifiedMap[b.id]; } catch {}
          }
        } catch (e) {
          // ignore per-book failures
        }
      }
      try { localStorage.setItem('reading-tracker-local-modified', JSON.stringify(modifiedMap)); } catch {}

      // Delete on server any book owned by currentUserId that no longer exists locally
      if (currentUserId) {
        const localIds = new Set(books.map(b => String(b.id)));
        for (const sb of serverBooks) {
          try {
            if (String(sb.ownerId) === String(currentUserId) && !localIds.has(String(sb.id))) {
              await fetch(`${API_BASE}/api/books/${encodeURIComponent(String(sb.id))}`, { method: 'DELETE' });
            }
          } catch (e) {}
        }
      }
      // Notify server that a save completed: set sync marker
      try {
        const r = await fetch(`${API_BASE}/api/sync`, { method: 'POST' });
        if (r.ok) {
          const { lastSync } = await r.json();
          try { localStorage.setItem('reading-tracker-last-sync', String(lastSync)); } catch {}
        }
      } catch (e) {}
    } catch (e) {
      console.debug('[useBooks] saveAndSync failed', e);
    }
  };

  const addBook = (title: string, ownerId?: string | null) => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      title,
      isRead: false,
      customInfo: [],
      notes: '',
      author: '',
      finishedDate: null,
      pages: null,
      genre: '',
      publicationYear: null,
      ownerId: ownerId ?? null
    };
    // Update local state immediately; server sync happens only on explicit save.
    setBooks(prev => [...prev, newBook]);
    // mark as locally modified
    try {
      const map = JSON.parse(localStorage.getItem('reading-tracker-local-modified') || '{}');
      map[newBook.id] = Date.now();
      localStorage.setItem('reading-tracker-local-modified', JSON.stringify(map));
    } catch {}

    return newBook.id;
  };

  const deleteBook = (id: string) => {
    // Remove locally; server will be updated on explicit sync.
    setBooks(prev => prev.filter(book => book.id !== id));
    try {
      const map = JSON.parse(localStorage.getItem('reading-tracker-local-modified') || '{}');
      map[id] = Date.now();
      localStorage.setItem('reading-tracker-local-modified', JSON.stringify(map));
    } catch {}
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    // Update locally; defer server propagation to explicit save/sync.
    setBooks(prev => prev.map(book => book.id === id ? { ...book, ...updates } : book));
    try {
      const map = JSON.parse(localStorage.getItem('reading-tracker-local-modified') || '{}');
      map[id] = Date.now();
      localStorage.setItem('reading-tracker-local-modified', JSON.stringify(map));
    } catch {}
  };

  return {
    books,
    addBook,
    deleteBook,
    updateBook,
    isSyncing,
    syncLocalToServer,
    saveLocal,
    saveAndSync
  };
}
