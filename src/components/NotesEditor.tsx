import { useState, useEffect } from 'react';

interface NotesEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
}

export function NotesEditor({ initialValue, onSave }: NotesEditorProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Guarda automáticamente en el estado local del libro cada vez que el usuario escribe
  const handleChange = (text: string) => {
    setValue(text);
    onSave(text);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-700">Notes & Commentary</h3>
      </div>

      <div className="flex-1 min-h-[200px]">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Write your notes, quotes or summaries here..."
          className="w-full h-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-sans text-gray-800"
        />
      </div>
      
      <p className="mt-2 text-xs text-gray-400 italic">
        Changes are kept locally. Click "Save changes" top-right to sync to cloud.
      </p>
    </div>
  );
}