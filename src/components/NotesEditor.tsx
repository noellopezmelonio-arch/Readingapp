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

  const handleSave = () => {
    onSave(value);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-700">Notas y Comentarios</h3>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
        >
          Guardar Notas
        </button>
      </div>

      <div className="flex-1 min-h-[200px]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escribe tus notas, citas o resúmenes aquí..."
          className="w-full h-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-sans text-gray-800"
        />
      </div>
      
      <p className="mt-2 text-xs text-gray-400 italic">
        Soporta texto libre y comentarios persistentes por libro.
      </p>
    </div>
  );
}
