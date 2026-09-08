import { useState, useRef, useEffect } from 'react';
import { useBooks } from './hooks/useBooks';
import useUsers from './hooks/useUsers';
import { BookList } from './components/BookList';
import { BookDetails } from './components/BookDetails';
import { BookOpen } from 'lucide-react';
import { Login } from './components/Login';
import type { User } from './types';

function App() {
  const { books, addBook, deleteBook, updateBook, syncLocalToServer, isSyncing, saveLocal, saveAndSync } = useBooks();
  const { authenticate, users } = useUsers();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('reading-tracker-current-user');
      return raw ? JSON.parse(raw) as User : null;
    } catch { return null; }
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem('reading-tracker-selected-id'); } catch { return null; }
  });
  const setSelected = (id: string | null) => {
    console.debug('[App] setSelected called', id, new Error().stack.split('\n').slice(1,4).join('\n'));
    // If a sync is in progress, ignore automatic clears to avoid UI jumping
    try {
      if (id === null && isSyncing) {
        console.debug('[App] ignoring setSelected(null) during sync (isSyncing)');
        return;
      }
    } catch (e) {}
    setSelectedId(id);
    try { if (id) localStorage.setItem('reading-tracker-selected-id', id); else localStorage.removeItem('reading-tracker-selected-id'); } catch {}
  };
  

  const lastSelectRef = useRef<{ id: string | null; t: number } | null>(null);

  const handleSelect = (id: string | null) => {
    const now = Date.now();
    const last = lastSelectRef.current;
    if (last && last.id === id && now - last.t < 400) {
      return; // ignore duplicate rapid events (touch/click duplication)
    }

    setSelected(id);
    lastSelectRef.current = { id, t: now };

    try {
      if (window.innerWidth < 640) {
        setMobileView('details');
      }
    } catch {}
  };

  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  const handleDelete = (id: string) => {
    deleteBook(id);
    if (selectedId === id) {
      setSelected(null);
    }
  };

  const login = (user: User) => {
    setCurrentUser(user);
    try { localStorage.setItem('reading-tracker-current-user', JSON.stringify(user)); } catch {}
    setSelected(null);
  };

  const logout = async () => {
    try { await syncLocalToServer?.(); } catch (e) { console.debug('[App] logout: sync failed', e); }
    setCurrentUser(null);
    try { localStorage.removeItem('reading-tracker-current-user'); } catch {}
  };

  // If the stored currentUser doesn't exist in users (e.g. IDs changed after seeding), clear it.
  useEffect(() => {
    if (!currentUser) return;
    // If a server user with same email exists, map to that user's id so ownerId matches server
    const byEmail = users.find(u => u.email === currentUser.email);
    if (byEmail) {
      if (byEmail.id !== currentUser.id) {
        setCurrentUser(byEmail);
        try { localStorage.setItem('reading-tracker-current-user', JSON.stringify(byEmail)); } catch {}
      }
      return;
    }
    // if no matching user, clear stale currentUser
    const exists = users.some(u => u.id === currentUser.id);
    if (!exists) {
      setCurrentUser(null);
      try { localStorage.removeItem('reading-tracker-current-user'); } catch {}
    }
  }, [users]);

  // reset selection when user changes
  // Reset selection when a different user logs in/out.
  // If the `id` changes but the email remains the same (server mapping), keep selection.
  const prevUserRef = useRef<{ id: string | null; email?: string | null } | null>(null);
  const pendingClearRef = useRef(false);
  useEffect(() => {
    const prev = prevUserRef.current;
    const curr = currentUser ? { id: currentUser.id, email: currentUser.email } : { id: null, email: null };
    // Only clear selection when there is no current user (explicit logout).
    if (!curr.id) {
      if (isSyncing) {
        pendingClearRef.current = true;
      } else {
        setSelected(null);
        setMobileView('list');
      }
    }
    prevUserRef.current = curr;
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isSyncing && pendingClearRef.current) {
      pendingClearRef.current = false;
      setSelected(null);
      setMobileView('list');
    }
  }, [isSyncing]);

  useEffect(() => {
    console.debug('[App] currentUser changed', currentUser && { id: currentUser.id, email: currentUser.email });
  }, [currentUser?.id]);

  useEffect(() => {
    console.debug('[App] selectedId changed', selectedId);
  }, [selectedId]);


  if (!currentUser) {
    return <Login authenticate={authenticate} onLogin={login} />;
  }
  const userBooks = books.filter(b => b.ownerId === currentUser.id);
  // Keep showing the selected book by id even if ownerId mapping changes
  const selectedBook = books.find(b => b.id === selectedId) ?? userBooks.find(b => b.id === selectedId);


  return (
    <>
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <div className={`${mobileView === 'list' ? 'block' : 'hidden'} sm:block w-full sm:w-auto`}> 
        <BookList 
          books={userBooks}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAdd={(title) => {
            const id = addBook(title, currentUser.id);
            handleSelect(id);
          }}
        />
      </div>
      
      <main className={`${mobileView === 'details' ? 'block' : 'hidden'} sm:block flex-1 overflow-hidden relative h-full`}>
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          <button onClick={() => { try { saveAndSync && saveAndSync(currentUser?.id); } catch (e) {} }} className="text-sm text-blue-600">Guardar cambios</button>
          <button onClick={logout} className="text-sm text-red-600">Logout</button>
        </div>
        {selectedBook ? (
          <div className="h-full">
            <div className="p-4 sm:hidden">
              <button onClick={() => setMobileView('list')} className="text-sm text-blue-600">← Back</button>
            </div>
            <BookDetails 
              book={selectedBook} 
              onUpdate={updateBook}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <BookOpen size={64} className="mb-4 opacity-50" />
            <h2 className="text-xl font-medium">Select a book or add a new one</h2>
            <p className="mt-2 text-sm">Your reading journey awaits.</p>
          </div>
        )}
      </main>
      
    </div>
    {/* debug overlay removed */}
    </>
  );
}

export default App;
