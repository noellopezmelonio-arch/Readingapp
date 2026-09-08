import { useState, useEffect } from 'react';
import type { Book } from '../types';

const STORAGE_KEY = 'reading-tracker-books';
const API_BASE = 'https://mockapi.io';

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
        let noelId: string | null = null;
        try {
          const usersRaw = localStorage.getItem('reading-tracker-users');
          if (usersRaw) {
            const users = JSON.parse(usersRaw) as Array<any>;
            const noel = users.find(u => String(u.email).toLowerCase() === 'noelviajando@gmail.com');
            if (noel) noelId = noel.id;
          }
        } catch (e) {}
        
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
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    console.debug(books.length);
  }, [books]);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const hasLocal = raw && raw !== '[]';
        if (hasLocal) return;
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) return;
        const serverBooks = await res.json() as Book[];
        if (serverBooks && serverBooks.length) {
          setBooks(dedupe(serverBooks));
        }
      } catch (e) {}
    })();
  }, []);

  const addBook = (title: string, ownerId: string) => {
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
      ownerId
    };
    
    setBooks(prev => {
      const next = dedupe([...prev, newBook]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      fetch(`${API_BASE}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      }).catch(() => {});
      return next;
    });
    return newBook.id;
  };

  const deleteBook = (id: string) => {
    setBooks(prev => {
      const next = prev.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' }).catch(() => {});
      return next;
    });
  };

  const updateBook = (updated: Book) => {
    setBooks(prev => {
      const next = prev.map(b => b.id === updated.id ? updated : b);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      fetch(`${API_BASE}/books/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
      return next;
    });
  };

  async function syncLocalToServer() {
    try {
      setIsSyncing(true);
      const res = await fetch(`${API_BASE}/books`);
      if (!res.ok) return;
      const serverBooks = await res.json() as Book[];
      if (serverBooks && serverBooks.length) {
        setBooks(prev => {
          const merged = dedupe([...prev, ...serverBooks]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (e) {
    } finally {
      setIsSyncing(false);
    }
  }

  return {
    books,
    addBook,
    deleteBook,
    updateBook,
    syncLocalToServer,
    isSyncing
  };
}
