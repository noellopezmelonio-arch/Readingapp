import React, { useState } from 'react';
import type { Book } from '../types';
import { Plus, Book as BookIcon, CheckCircle, Search } from 'lucide-react';

interface BookListProps {
  books: Book[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (title: string) => void;
}

export function BookList({ books, selectedId, onSelect, onAdd }: BookListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAdd(newTitle.trim());
      setNewTitle('');
    }
  };

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold flex items-center text-gray-800 mb-4">
          <BookIcon className="mr-2 text-blue-600" /> My Library
        </h2>
        
        <form onSubmit={handleAdd} className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New book title..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit" 
            disabled={!newTitle.trim()}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            className="w-full pl-9 pr-3 py-2 border rounded-full text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredBooks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm mt-4">
            {search ? 'No books match your search.' : 'Your library is empty. Add a book above!'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredBooks.map(book => (
              <li key={book.id}>
                <button
                  onClick={() => onSelect(book.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    selectedId === book.id ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex-1 overflow-hidden">
                    <div className={`font-medium truncate pr-2 ${selectedId === book.id ? 'text-blue-900' : 'text-gray-700'}`}>
                      {book.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {(() => {
                        const parts: string[] = [];
                        if (book.author) parts.push(book.author);
                        if (book.publicationYear) parts.push(String(book.publicationYear));
                        if (book.pages) parts.push(`${book.pages} pages`);
                        return parts.join(' • ');
                      })()}
                    </div>
                  </div>
                  {book.isRead && <CheckCircle size={16} className="text-green-500 flex-shrink-0 ml-3" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
