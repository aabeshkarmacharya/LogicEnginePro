
import React from 'react';
import { ActionConfig, ActionType } from '../types';
import { ACTION_DEFINITIONS } from '../constants';

interface ActionCardProps {
  action: ActionConfig;
  onUpdate: (id: string, updates: Partial<ActionConfig>) => void;
  onDelete: (id: string) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onUpdate, onDelete }) => {
  const definition = ACTION_DEFINITIONS.find(d => d.type === action.type) || ACTION_DEFINITIONS[0];

  return (
    <div className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group animate-in fade-in slide-in-from-bottom-2">
      <div className={`w-10 h-10 rounded-xl ${definition.color} flex items-center justify-center text-xl shadow-inner shrink-0`}>
        {definition.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black text-slate-800 truncate">{definition.label}</span>
          <button
            onClick={() => onDelete(action.id)}
            className="text-slate-300 hover:text-red-500 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 mb-3 leading-tight">{definition.description}</p>
        
        <div className="space-y-2">
          {action.type === 'notify_slack' && (
            <input 
              type="text" 
              placeholder="Slack message template..." 
              className="w-full bg-slate-50 border-none rounded-lg p-2 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
              value={action.params.message || ''}
              onChange={(e) => onUpdate(action.id, { params: { ...action.params, message: e.target.value } })}
            />
          )}
          {action.type === 'tag_record' && (
            <input 
              type="text" 
              placeholder="Tag name (e.g. Urgent)" 
              className="w-full bg-slate-50 border-none rounded-lg p-2 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
              value={action.params.tag || ''}
              onChange={(e) => onUpdate(action.id, { params: { ...action.params, tag: e.target.value } })}
            />
          )}
          {action.type === 'send_email' && (
            <input 
              type="email" 
              placeholder="recipient@example.com" 
              className="w-full bg-slate-50 border-none rounded-lg p-2 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
              value={action.params.email || ''}
              onChange={(e) => onUpdate(action.id, { params: { ...action.params, email: e.target.value } })}
            />
          )}
          {action.type === 'call_webhook' && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <select
                  value={action.params.method || 'POST'}
                  onChange={(e) => onUpdate(action.id, { params: { ...action.params, method: e.target.value } })}
                  className="bg-indigo-50 border-none text-[10px] font-black text-indigo-600 rounded-lg px-2 outline-none"
                >
                  <option>POST</option>
                  <option>GET</option>
                  <option>PUT</option>
                </select>
                <input 
                  type="text" 
                  placeholder="https://hooks.zapier.com/..." 
                  className="flex-1 bg-slate-50 border-none rounded-lg p-2 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={action.params.url || ''}
                  onChange={(e) => onUpdate(action.id, { params: { ...action.params, url: e.target.value } })}
                />
              </div>
            </div>
          )}
          {!['notify_slack', 'tag_record', 'send_email', 'call_webhook'].includes(action.type) && (
            <div className="text-[10px] text-slate-400 italic">No additional configuration needed.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionCard;
