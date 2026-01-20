
import React, { useState, useMemo, useRef, useEffect } from 'react';

interface AutocompleteValueInputProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  dataset: any[];
  placeholder?: string;
  type?: string;
  transformSuggestion?: (val: any) => string | null;
}

const AutocompleteValueInput: React.FC<AutocompleteValueInputProps> = ({
  fieldName,
  value,
  onChange,
  dataset,
  placeholder = "Enter value...",
  type = "text",
  transformSuggestion
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Extract unique values for the field from the active dataset
  const suggestions = useMemo(() => {
    const values = new Set<string>();
    dataset.forEach((item: any) => {
      let val = item[fieldName];
      
      // Apply transformation if provided (e.g., extract year from date)
      if (transformSuggestion) {
        val = transformSuggestion(val);
      }

      if (val !== undefined && val !== null) {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  }, [fieldName, dataset, transformSuggestion]);

  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions.slice(0, 10);
    const search = value.toLowerCase();
    return suggestions
      .filter(s => s.toLowerCase().includes(search))
      .slice(0, 10);
  }, [suggestions, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-[2] min-w-[150px]">
      <input
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-[200] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-50">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suggestions</span>
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors first:mt-1 last:mb-1"
              onClick={() => {
                onChange(suggestion);
                setIsOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteValueInput;
