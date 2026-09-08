import { useEffect, useRef, useState } from 'react';

interface NotesEditorProps {
  notes: string;
  onChange: (notes: string) => void;
}

export function NotesEditor({ notes, onChange }: NotesEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused && ref.current) {
      ref.current.innerHTML = notes || '';
    }
  }, [notes, isFocused]);

  const exec = (command: string, value?: string) => {
    // ensure the editable area is focused before executing commands
    if (ref.current) {
      ref.current.focus();
    }
    document.execCommand(command, false, value);
    // propagate change
    if (ref.current) scheduleChange(ref.current.innerHTML);
  };

  const scheduleChange = (html: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onChange(html);
      debounceRef.current = null;
    }, 600);
  };

  const flushChange = () => {
    if (debounceRef.current && ref.current) {
      window.clearTimeout(debounceRef.current);
      onChange(ref.current.innerHTML);
      debounceRef.current = null;
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Commentary & Notes</h3>

      <div className="bg-white rounded overflow-hidden shadow-sm border border-gray-200">
        <div className="p-2 border-b bg-gray-50 flex items-center space-x-2">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className="px-2 py-1 text-sm">Bold</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} className="px-2 py-1 text-sm">Italic</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} className="px-2 py-1 text-sm">Underline</button>
          {/* OL and UL removed (not needed) */}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')} className="px-2 py-1 text-sm">Clear</button>
        </div>

            <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
              onInput={() => ref.current && scheduleChange(ref.current.innerHTML)}
          onKeyDown={(e) => {
            // prevent keyboard events inside the editor from bubbling to outer forms or handlers
            e.stopPropagation();
            // Prevent Enter from triggering outer submits/navigation
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              // insert a newline at caret position
              document.execCommand('insertHTML', false, '<br><div></div>');
              if (ref.current) onChange(ref.current.innerHTML);
            }
          }}
          onKeyPress={(e) => { e.stopPropagation(); }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); flushChange(); }}
          className="min-h-48 p-4 text-sm prose max-w-none"
          style={{ minHeight: '12rem', outline: 'none' }}
        />
      </div>
    </div>
  );
}
