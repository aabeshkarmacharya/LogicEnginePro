
import React from 'react';
import { FilterRule, Operator } from '../types';
import { DATA_FIELDS, OPERATORS } from '../constants';

interface RuleCardProps {
  rule: FilterRule;
  onUpdate: (id: string, updates: Partial<FilterRule>) => void;
  onDelete: (id: string) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onUpdate, onDelete }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-[150px]">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Field</label>
        <select
          value={rule.field}
          onChange={(e) => onUpdate(rule.id, { field: e.target.value })}
          className="w-full bg-slate-50 border-none text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 p-2 outline-none"
        >
          {DATA_FIELDS.map(f => (
            <option key={f.name} value={f.name}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Condition</label>
        <select
          value={rule.operator}
          onChange={(e) => onUpdate(rule.id, { operator: e.target.value as Operator })}
          className="w-full bg-slate-50 border-none text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 p-2 outline-none"
        >
          {OPERATORS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-[2] min-w-[200px]">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Value</label>
        <input
          type="text"
          value={rule.value}
          placeholder="Enter value..."
          onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
          className="w-full bg-slate-50 border-none text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 p-2 outline-none"
        />
      </div>

      <button
        onClick={() => onDelete(rule.id)}
        className="mt-5 p-2 text-slate-400 hover:text-red-500 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default RuleCard;
