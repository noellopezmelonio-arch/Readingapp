import { useState, useEffect } from 'react';
import type { Book } from '../types';
import { NotesEditor } from './NotesEditor';
import { BookOpen, CheckCircle, Trash2, Edit } from 'lucide-react';
import { useRef } from 'react';

interface BookDetailsProps {
  book: Book;
  onUpdate: (id: string, updates: Partial<Book>) => void;
  onDelete: (id: string) => void;
}

export function BookDetails({ book, onUpdate, onDelete }: BookDetailsProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [finishedDate, setFinishedDate] = useState<string | null>(book.finishedDate ?? null);
  const [pages, setPages] = useState<number | null>(book.pages ?? null);
  const [genreEditing, setGenreEditing] = useState(false);
  const [localGenre, setLocalGenre] = useState(book.genre ?? '');
  const genreRef = useRef<HTMLInputElement | null>(null);
  const [publicationYear, setPublicationYear] = useState<number | null>(book.publicationYear ?? null);

  useEffect(() => {
    setTitle(book.title);
    setAuthor(book.author ?? '');
    setFinishedDate(book.finishedDate ?? null);
    setPages(book.pages ?? null);
    setLocalGenre(book.genre ?? '');
    setPublicationYear(book.publicationYear ?? null);
  }, [book.id, book.title, book.author, book.finishedDate, book.pages]);

  const handleTitleBlur = () => {
    if (title.trim() && title !== book.title) {
      onUpdate(book.id, { title: title.trim() });
    } else {
      setTitle(book.title);
    }
  };

  const handleAuthorBlur = () => {
    if (author !== (book.author ?? '')) {
      onUpdate(book.id, { author: author.trim() });
    }
  };

  const handleFinishedDateChange = (value: string) => {
    const val = value || null;
    setFinishedDate(val);
    onUpdate(book.id, { finishedDate: val });
  };

  const handlePagesBlur = () => {
    const val = pages ?? null;
    onUpdate(book.id, { pages: val });
  };

  const handlePublicationYearBlur = () => {
    const val = publicationYear ?? null;
    onUpdate(book.id, { publicationYear: val });
  };

  const toggleReadStatus = () => {
    onUpdate(book.id, { isRead: !book.isRead });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 md:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-600 focus:outline-none px-1 w-full sm:max-w-xl transition-colors"
          placeholder="Book Title"
        />
        <div className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto sm:mr-28">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onBlur={handleAuthorBlur}
            placeholder="Author"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          />
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="date"
                value={finishedDate ?? ''}
                onChange={(e) => handleFinishedDateChange(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Finished date"
              />
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={book.isRead}
                  onChange={(e) => onUpdate(book.id, { isRead: e.target.checked })}
                  className="h-4 w-4"
                />
                <span>Completed</span>
              </label>
            </div>
            <input
              type="number"
              value={pages ?? ''}
              onChange={(e) => setPages(e.target.value ? Number(e.target.value) : null)}
              onBlur={handlePagesBlur}
              className="mt-2 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Pages"
              min={0}
            />
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={toggleReadStatus}
            className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              book.isRead 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {book.isRead ? (
              <><CheckCircle size={16} className="mr-2" /> Read</>
            ) : (
              <><BookOpen size={16} className="mr-2" /> Not Read</>
            )}
          </button>
          
          <button
            onClick={() => {
              if(window.confirm('Are you sure you want to delete this book?')) {
                onDelete(book.id);
              }
            }}
            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-full transition-colors"
            title="Delete Book"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl">
        <div className="mb-2 text-sm text-gray-600">
          <label className="block text-xs text-gray-500">Genre</label>
          {genreEditing ? (
            <input
              ref={genreRef}
              type="text"
              value={localGenre}
              onChange={(e) => setLocalGenre(e.target.value)}
              onBlur={() => {
                setGenreEditing(false);
                onUpdate(book.id, { genre: localGenre });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Genre"
            />
          ) : (
            <div className="mt-1 flex items-center space-x-2">
              <div className="text-sm text-gray-700 truncate">{book.genre || '—'}</div>
              <button type="button" onClick={() => { setGenreEditing(true); setTimeout(() => genreRef?.current?.focus(), 0); }} className="text-gray-500 hover:text-gray-700 p-0 ml-2">
                <Edit size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="mb-4 text-sm text-gray-600">
          <label className="block text-xs text-gray-500">Publication year</label>
          <input
            type="number"
            value={publicationYear ?? ''}
            onChange={(e) => setPublicationYear(e.target.value ? Number(e.target.value) : null)}
            onBlur={handlePublicationYearBlur}
            className="mt-1 w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Year"
            min={0}
          />
        </div>
        <NotesEditor 
          notes={book.notes} 
          onChange={(notes: string) => onUpdate(book.id, { notes })} 
        />
      </div>
    </div>
  );
}
