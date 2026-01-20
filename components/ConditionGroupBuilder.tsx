
import React from 'react';
import { ConditionGroup, ConditionNode, FilterRule, Operator, DataField } from '../types';
import { OPERATORS, MONTHS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import AutocompleteValueInput from './AutocompleteValueInput';

interface ConditionGroupBuilderProps {
  group: ConditionGroup;
  onUpdate: (updatedGroup: ConditionGroup) => void;
  fields: DataField[];
  dataset: any[];
  onDelete?: () => void;
  depth?: number;
}

const extractYear = (val: any) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.getFullYear().toString();
};

const ConditionGroupBuilder: React.FC<ConditionGroupBuilderProps> = ({ 
  group, 
  onUpdate, 
  fields,
  dataset,
  onDelete, 
  depth = 0 
}) => {
  const addRule = () => {
    const newRule: FilterRule = {
      id: uuidv4(),
      type: 'rule',
      field: fields[0]?.name || '',
      operator: 'equals',
      value: '',
      valueType: 'static'
    };
    onUpdate({ ...group, children: [...group.children, newRule] });
  };

  const addSubGroup = () => {
    const newGroup: ConditionGroup = {
      id: uuidv4(),
      type: 'group',
      logic: 'AND',
      children: []
    };
    onUpdate({ ...group, children: [...group.children, newGroup] });
  };

  const updateChild = (id: string, updatedNode: ConditionNode) => {
    onUpdate({
      ...group,
      children: group.children.map(c => c.id === id ? updatedNode : c)
    });
  };

  const removeChild = (id: string) => {
    onUpdate({
      ...group,
      children: group.children.filter(c => c.id !== id)
    });
  };

  return (
    <div className={`relative p-4 rounded-2xl border transition-all ${
      depth === 0 ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/50 border-indigo-100 ml-4 md:ml-8'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <button 
              onClick={() => onUpdate({...group, logic: 'AND'})}
              className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${group.logic === 'AND' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
            >AND</button>
            <button 
              onClick={() => onUpdate({...group, logic: 'OR'})}
              className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${group.logic === 'OR' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
            >OR</button>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Condition Block</span>
        </div>
        
        {onDelete && (
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {group.children.map((child) => {
          if (child.type === 'rule') {
            const currentField = fields.find(f => f.name === child.field) || fields[0];
            const availableOperators = OPERATORS.filter(op => op.types.includes(currentField?.type || 'string'));
            const isFieldMode = child.valueType === 'field';
            
            return (
              <div key={child.id} className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm group/rule hover:border-indigo-200 transition-colors">
                <select
                  value={child.field}
                  onChange={(e) => {
                    const nextField = fields.find(f => f.name === e.target.value) || currentField;
                    const nextOps = OPERATORS.filter(op => op.types.includes(nextField.type));
                    const nextOp = nextOps.find(o => o.value === child.operator) ? child.operator : nextOps[0].value;
                    updateChild(child.id, { ...child, field: e.target.value, operator: nextOp as Operator });
                  }}
                  className="flex-1 min-w-[120px] bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  {fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                </select>

                <select
                  value={child.operator}
                  onChange={(e) => updateChild(child.id, { ...child, operator: e.target.value as Operator, value: '' })}
                  className="w-[120px] bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-indigo-600"
                >
                  {availableOperators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <div className="flex-[2] min-w-[200px] flex items-center gap-2">
                  <button
                    onClick={() => updateChild(child.id, { ...child, valueType: isFieldMode ? 'static' : 'field', value: '' })}
                    className={`p-2 rounded-lg transition-all ${isFieldMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    title={isFieldMode ? "Compare with static value" : "Compare with another field"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isFieldMode ? (
                    <select
                      value={child.value}
                      onChange={(e) => updateChild(child.id, { ...child, value: e.target.value })}
                      className="flex-1 bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 font-medium shadow-sm"
                    >
                      <option value="">Select field...</option>
                      {fields.filter(f => f.name !== child.field).map(f => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  ) : child.operator === 'is_month' ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number"
                        placeholder="Year"
                        value={String(child.value).split('-')[0] || ''}
                        onChange={(e) => {
                          const month = String(child.value).split('-')[1] || '0';
                          updateChild(child.id, { ...child, value: `${e.target.value}-${month}` });
                        }}
                        className="w-1/2 bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                      />
                      <select
                        value={String(child.value).split('-')[1] || ''}
                        onChange={(e) => {
                          const year = String(child.value).split('-')[0] || new Date().getFullYear().toString();
                          updateChild(child.id, { ...child, value: `${year}-${e.target.value}` });
                        }}
                        className="w-1/2 bg-slate-50 border-none text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 font-medium shadow-sm"
                      >
                        <option value="">Month...</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  ) : child.operator === 'is_year' ? (
                    <AutocompleteValueInput
                      fieldName={child.field}
                      value={child.value}
                      dataset={dataset}
                      onChange={(val) => updateChild(child.id, { ...child, value: val })}
                      placeholder="YYYY"
                      type="number"
                      transformSuggestion={extractYear}
                    />
                  ) : (
                    <AutocompleteValueInput
                      fieldName={child.field}
                      value={child.value}
                      dataset={dataset}
                      onChange={(val) => updateChild(child.id, { ...child, value: val })}
                      placeholder="Value..."
                      type={currentField?.type === 'number' ? 'number' : 'text'}
                    />
                  )}
                </div>

                <button onClick={() => removeChild(child.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-auto opacity-0 group-hover/rule:opacity-100">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            );
          } else {
            return (
              <ConditionGroupBuilder 
                key={child.id} 
                group={child} 
                fields={fields}
                dataset={dataset}
                depth={depth + 1}
                onUpdate={(updated) => updateChild(child.id, updated)}
                onDelete={() => removeChild(child.id)}
              />
            );
          }
        })}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button 
          onClick={addRule}
          className="px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-[10px] font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          Add Rule
        </button>
        <button 
          onClick={addSubGroup}
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Add Nested Group
        </button>
      </div>
    </div>
  );
};

export default ConditionGroupBuilder;
