import React, { useState } from 'react';
import type { Book } from '../types';
import { Plus, BookOpen, CheckCircle, Circle, Search } from 'lucide-react';

interface BookListProps {
  books: Book[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (title: string) => void;
}

export function BookList({ books, selectedId, onSelect, onAdd }: BookListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle('');
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <BookOpen className="text-blue-600" size={24} />
        <h1 className="text-xl font-bold text-gray-800">Reading Tracker</h1>
      </div>

      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center gap-2 bg-white">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add new book..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/50">
        {filteredBooks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-4 italic">No books found</p>
        ) : (
          filteredBooks.map((book) => {
            const isSelected = book.id === selectedId;
            return (
              <button
                key={book.id}
                onClick={() => onSelect(isSelected ? null : book.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all border ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm font-medium'
                    : 'bg-white border-gray-100 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="truncate text-sm">{book.title}</p>
                </div>
                <div className="flex-shrink-0">
                  {book.isRead ? (
                    <CheckCircle className="text-green-500" size={16} />
                  ) : (
                    <Circle className="text-gray-300" size={16} />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
