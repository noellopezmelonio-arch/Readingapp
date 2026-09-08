import { useState, useEffect } from 'react';
import type { Book } from '../types';

const STORAGE_KEY = 'reading-tracker-books';
const API_BASE = 'https://6aa024883e0d88d3d7e5692d.mockapi.io';

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
          ownerId: (p as any).ownerId ?? null
        } as Book)));
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

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
      return next;
    });
  };

  // FUNCIÓN CRÍTICA: Envía todos los libros a internet de golpe
  const saveAndSync = async (userId: string | null) => {
    if (!userId) return;
    try {
      setIsSyncing(true);
      const userBooks = books.filter(b => b.ownerId === userId);
      
      // Consultar qué libros ya existen en el servidor para no duplicar
      const res = await fetch(`${API_BASE}/books`);
      const serverBooks = res.ok ? await res.json() as Book[] : [];
      const serverIds = new Set(serverBooks.map(b => String(b.id)));

      for (const book of userBooks) {
        if (serverIds.has(String(book.id))) {
          // Si ya existe, actualiza sus datos con un PUT
          await fetch(`${API_BASE}/books/${book.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
          });
        } else {
          // Si es nuevo, lo registra con un POST
          await fetch(`${API_BASE}/books`, {
            method: 'POST',
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

  // Descargar libros desde internet si el localStorage está vacío (para incógnito)
  const syncLocalToServer = async () => {
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
  };

  return {
    books,
    addBook,
    deleteBook,
    updateBook,
    syncLocalToServer,
    saveAndSync,
    isSyncing
  };
}