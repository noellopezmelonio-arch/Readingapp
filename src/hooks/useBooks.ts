import { useState, useEffect } from 'react';
import type { Book } from '../types';

const STORAGE_KEY = 'reading-tracker-books';
const API_BASE = 'https://6aa024883e0d88d3d7e5692d.mockapi.io';

export function useBooks() {
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtro inteligente que evita duplicados comparando títulos e IDs estrictamente
  const dedupe = (arr: Book[]) => {
    const m = new Map<string, Book>();
    arr.forEach(b => {
      if (b && b.title) {
        m.set(b.title.toLowerCase().trim(), b);
      }
    });
    return Array.from(m.values());
  };

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Book>[];
        return dedupe(parsed.map(p => ({
          id: p.id ?? '',
          title: (p.title as string) ?? 'Untitled',
          isRead: (p.isRead as boolean) ?? false,
          customInfo: (p.customInfo as any[]) ?? [],
          notes: (p.notes as string) ?? '',
          author: (p.author as string) ?? '',
          finishedDate: (p.finishedDate as string) ?? null,
          pages: (typeof p.pages === 'number' ? p.pages : (p.pages ? Number(p.pages) : null)) ?? null,
          genre: (p.genre as string) ?? '',
          publicationYear: (typeof p.publicationYear === 'number' ? p.publicationYear : (p.publicationYear ? Number(p.publicationYear) : null)) ?? null,
          ownerId: (p as any).ownerId ?? null
        } as Book)));
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const syncLocalToServer = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${API_BASE}/books`);
      if (!res.ok) return;
      const serverBooks = await res.json() as Book[];
      if (serverBooks && serverBooks.length) {
        setBooks(prev => {
          // BLINDAJE: Mezcla y limpia duplicados por título antes de renderizar
          const merged = dedupe([...prev, ...serverBooks]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (e) {
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncLocalToServer();
  }, []);

  const addBook = (title: string, ownerId: string) => {
    const tempId = 'temp-' + Date.now();
    const newBook: Book = {
      id: tempId,
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
      return next;
    });

    fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newBook, id: undefined })
    })
    .then(res => res.ok ? res.json() : null)
    .then((serverBook: Book | null) => {
      if (serverBook && serverBook.id) {
        setBooks(prev => {
          const next = prev.map(b => b.title.toLowerCase().trim() === title.toLowerCase().trim() ? { ...b, id: String(serverBook.id) } : b);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    })
    .catch(() => {});

    return tempId;
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
      return next;
    });
  };

  const saveAndSync = async (userId: string | null) => {
    if (!userId) return;
    try {
      setIsSyncing(true);
      const userBooks = books.filter(b => b.ownerId === userId);
      
      for (const book of userBooks) {
        if (book.id && !String(book.id).startsWith('temp-')) {
          await fetch(`${API_BASE}/books/${book.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    books,
    addBook,
    deleteBook,
    updateBook,
    syncLocalToServer,
    saveAndSync,
    isSyncing
  }
 }