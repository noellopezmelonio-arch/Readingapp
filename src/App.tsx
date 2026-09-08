import { useState, useEffect } from 'react';
import { useBooks } from './hooks/useBooks';
import useUsers from './hooks/useUsers';
import { BookList } from './components/BookList';
import { BookDetails } from './components/BookDetails';
import { BookOpen } from 'lucide-react';
import { Login } from './components/Login';
import type { User } from './types';

function App() {
  const { books, addBook, deleteBook, updateBook } = useBooks();
  const { authenticate, users } = useUsers();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('reading-tracker-current-user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedBook = books.find(b => b.id === selectedId);
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (window.innerWidth < 640 && id) {
      setMobileView('details');
    }
  };

  const handleDelete = (id: string) => {
    deleteBook(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const login = (user: User) => {
    setCurrentUser(user);
    try { localStorage.setItem('reading-tracker-current-user', JSON.stringify(user)); } catch {}
    setSelectedId(null);
  };

  const logout = () => {
    setCurrentUser(null);
    try { localStorage.removeItem('reading-tracker-current-user'); } catch {}
    setSelectedId(null);
  };

  useEffect(() => {
    if (!currentUser) return;
    const byEmail = users.find(u => u.email === currentUser.email);
    if (byEmail && byEmail.id !== currentUser.id) {
      setCurrentUser(byEmail);
    }
  }, [users, currentUser]);

  if (!currentUser) {
    return <Login authenticate={authenticate as any} onLogin={login} />;
  }

  const userBooks = books.filter(b => b.ownerId === currentUser.id);

  return (
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
  );
}

export default App;
