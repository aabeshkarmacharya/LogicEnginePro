
import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ConditionGroup, 
  ConditionNode, 
  FilterRule, 
  ActionConfig, 
  RuleAutomation, 
  AggregationFilter,
  Operator,
  DataField,
  FieldType,
  ActionType,
  AutomationVersion
} from './types';
import { MOCK_DATA, DATA_FIELDS, ACTION_DEFINITIONS, OPERATORS } from './constants';
import ConditionGroupBuilder from './components/ConditionGroupBuilder';
import ActionCard from './components/ActionCard';
import Visualizer from './components/Visualizer';
import { parseNaturalLanguageAutomation } from './services/geminiService';
import { saveAutomationVersion, getAutomationHistory } from './services/storageService';

type AuthType = 'none' | 'bearer' | 'api_key';

const App: React.FC = () => {
  // Dynamic Data States
  const [workingData, setWorkingData] = useState<any[]>(MOCK_DATA);
  const [workingFields, setWorkingFields] = useState<DataField[]>(DATA_FIELDS);
  const [apiUrl, setApiUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [showActionLibrary, setShowActionLibrary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Persistence States
  const [history, setHistory] = useState<AutomationVersion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Authentication State
  const [authType, setAuthType] = useState<AuthType>('none');
  const [authHeader, setAuthHeader] = useState('X-API-Key');
  const [authToken, setAuthToken] = useState('');

  const [automation, setAutomation] = useState<RuleAutomation>({
    id: uuidv4(),
    name: 'Business Logic Pipeline',
    description: 'Filter raw data and optionally aggregate metrics to trigger intelligent actions.',
    rootCondition: {
      id: uuidv4(),
      type: 'group',
      logic: 'AND',
      children: []
    },
    useAggregation: false,
    aggregation: {
      groupBy: 'region',
      measureField: 'sales',
      method: 'sum',
      filters: []
    },
    actions: [],
    isActive: true
  });

  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [viewMode, setViewMode] = useState<'simulation' | 'visualizer' | 'json'>('simulation');

  // Load history on mount
  useEffect(() => {
    setHistory(getAutomationHistory());
  }, []);

  // Discover schema from fetched JSON
  const discoverSchema = (data: any[]): DataField[] => {
    if (!data.length) return DATA_FIELDS;
    const firstItem = data[0];
    return Object.keys(firstItem).map(key => {
      const val = firstItem[key];
      let type: FieldType = 'string';
      if (typeof val === 'number') type = 'number';
      else if (typeof val === 'boolean') type = 'boolean';
      else if (typeof val === 'string' && !isNaN(Date.parse(val)) && val.includes('-')) type = 'date';
      
      return {
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        type
      };
    });
  };

  const fetchExternalData = async () => {
    if (!apiUrl) return;
    setIsFetching(true);
    setFetchError(null);

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (authType === 'bearer' && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (authType === 'api_key' && authHeader && authToken) {
      headers[authHeader] = authToken;
    }

    try {
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. Please check your credentials.");
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const json = await response.json();
      const arrayData = Array.isArray(json) ? json : (json.data && Array.isArray(json.data) ? json.data : null);
      
      if (!arrayData) throw new Error("Could not find an array in the JSON response. The API must return a list of items.");
      
      setWorkingData(arrayData);
      const newFields = discoverSchema(arrayData);
      setWorkingFields(newFields);
      setShowDataSettings(false);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedHistory = await saveAutomationVersion(automation);
      setHistory(updatedHistory);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      alert("Failed to save version.");
    } finally {
      setIsSaving(false);
    }
  };

  const restoreVersion = (version: AutomationVersion) => {
    setAutomation(version.data);
    setShowHistory(false);
  };

  const useSampleData = () => {
    setWorkingData(MOCK_DATA);
    setWorkingFields(DATA_FIELDS);
    setShowDataSettings(false);
    setApiUrl('');
    setAuthType('none');
    setAuthToken('');
  };

  // Recursive Evaluator
  const evaluateNode = (item: any, node: ConditionNode): boolean => {
    if (node.type === 'rule') {
      const itemValue = item[node.field];
      const targetValue = node.valueType === 'field' ? item[node.value] : node.value;
      
      if (!targetValue && targetValue !== 0 && node.operator !== 'is_true' && node.operator !== 'is_false') return true;

      switch (node.operator) {
        case 'equals': return String(itemValue).toLowerCase() === String(targetValue).toLowerCase();
        case 'not_equals': return String(itemValue).toLowerCase() !== String(targetValue).toLowerCase();
        case 'contains': return String(itemValue).toLowerCase().includes(String(targetValue).toLowerCase());
        case 'starts_with': return String(itemValue).toLowerCase().startsWith(String(targetValue).toLowerCase());
        case 'ends_with': return String(itemValue).toLowerCase().endsWith(String(targetValue).toLowerCase());
        case 'greater_than': {
          if (typeof itemValue === 'string' && !isNaN(Date.parse(itemValue))) {
            return new Date(itemValue).getTime() > new Date(targetValue).getTime();
          }
          return Number(itemValue) > Number(targetValue);
        }
        case 'less_than': {
           if (typeof itemValue === 'string' && !isNaN(Date.parse(itemValue))) {
            return new Date(itemValue).getTime() < new Date(targetValue).getTime();
          }
          return Number(itemValue) < Number(targetValue);
        }
        case 'is_month': {
          const date = new Date(itemValue);
          const val = String(targetValue);
          if (val.includes('-')) {
            const [y, m] = val.split('-');
            const yearMatches = y ? date.getFullYear().toString() === y : true;
            const monthMatches = m ? date.getMonth().toString() === m : true;
            return yearMatches && monthMatches;
          }
          return date.getMonth().toString() === val;
        }
        case 'is_year': {
          const date = new Date(itemValue);
          return date.getFullYear().toString() === String(targetValue);
        }
        case 'is_true': return !!itemValue;
        case 'is_false': return !itemValue;
        default: return true;
      }
    } else {
      if (node.children.length === 0) return true;
      return node.logic === 'AND' 
        ? node.children.every(c => evaluateNode(item, c))
        : node.children.some(c => evaluateNode(item, c));
    }
  };

  const filteredRawData = useMemo(() => {
    return workingData.filter(item => evaluateNode(item, automation.rootCondition));
  }, [automation.rootCondition, workingData]);

  const { aggregatedResults, totalGroupsBeforeThreshold } = useMemo(() => {
    if (!automation.useAggregation) return { aggregatedResults: [], totalGroupsBeforeThreshold: 0 };
    
    const { groupBy, measureField, method, filters } = automation.aggregation;
    if (!groupBy || !measureField) return { aggregatedResults: [], totalGroupsBeforeThreshold: 0 };

    const grouped = filteredRawData.reduce((acc: any, item: any) => {
      const key = item[groupBy];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item[measureField]);
      return acc;
    }, {});

    const results = Object.keys(grouped).map((key) => {
      const values = grouped[key];
      let val = 0;
      switch (method) {
        case 'sum': val = values.reduce((a: number, b: number) => a + b, 0); break;
        case 'average': val = values.reduce((a: number, b: number) => a + b, 0) / (values.length || 1); break;
        case 'count': val = values.length; break;
        case 'max': val = Math.max(...values); break;
        case 'min': val = Math.min(...values); break;
      }
      return { name: key, value: parseFloat(val.toFixed(2)) };
    });

    const filteredResults = results.filter(res => {
      if (filters.length === 0) return true;
      return filters.every(f => {
        switch (f.operator) {
          case 'greater_than': return res.value > Number(f.value);
          case 'less_than': return res.value < Number(f.value);
          case 'equals': return res.value === Number(f.value);
          default: return true;
        }
      });
    });

    return { 
      aggregatedResults: filteredResults, 
      totalGroupsBeforeThreshold: results.length 
    };
  }, [filteredRawData, automation.aggregation, automation.useAggregation]);

  const handleAIRequest = async () => {
    if (!naturalLanguageInput.trim()) return;
    setIsProcessingAI(true);
    try {
      const result = await parseNaturalLanguageAutomation(naturalLanguageInput, workingFields);
      setAutomation({
        ...automation,
        rootCondition: {
          ...automation.rootCondition,
          children: [...automation.rootCondition.children, ...result.conditions.map((c: any) => ({ ...c, id: uuidv4(), type: 'rule' }))]
        }
      });
      setNaturalLanguageInput('');
    } catch (error) {
      alert("Failed to parse request.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const addAction = (type: ActionType) => {
    setAutomation({
      ...automation,
      actions: [...automation.actions, { id: uuidv4(), type, params: {} }]
    });
    setShowActionLibrary(false);
  };

  const toggleAggregation = () => {
    const nextState = !automation.useAggregation;
    setAutomation({ 
      ...automation, 
      useAggregation: nextState,
      aggregation: {
        ...automation.aggregation,
        groupBy: automation.aggregation.groupBy || workingFields[0]?.name,
        measureField: automation.aggregation.measureField || workingFields.find(f => f.type === 'number')?.name || workingFields[0]?.name
      }
    });
    if (nextState) {
      setViewMode('visualizer');
    } else {
      setViewMode('simulation');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 flex flex-col">
      <nav className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-[100] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold italic shadow-lg">L</div>
          <span className="font-bold text-slate-800 tracking-tight">LogicEngine Pro</span>
        </div>
        
        <div className="flex-1 max-w-lg mx-8 relative">
          <input 
            type="text" 
            placeholder="AI Quick-Rule (e.g. Sales > 500 in UK)"
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIRequest()}
            disabled={isProcessingAI}
          />
          {isProcessingAI && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-transparent hover:bg-slate-50 transition-all text-xs font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            History
          </button>
          <button 
            onClick={() => setShowDataSettings(true)}
            className="text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-transparent hover:bg-slate-50 transition-all text-xs font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            Data
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : saveSuccess ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            ) : null}
            {saveSuccess ? 'Saved' : 'Save Version'}
          </button>
          <button className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">Deploy</button>
        </div>
      </nav>

      {/* History Slide-over */}
      {showHistory && (
        <div className="fixed inset-0 z-[300] flex justify-end">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowHistory(false)}></div>
           <div className="relative w-full max-w-sm bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                 <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Version History</h3>
                   <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Timeline of changes</p>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                 {history.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <p className="text-sm font-bold">No versions saved yet</p>
                   </div>
                 ) : (
                   history.map((ver) => (
                     <div key={ver.version} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">v{ver.version}</span>
                          <span className="text-[10px] text-slate-400">{new Date(ver.timestamp).toLocaleString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">{ver.data.name}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mb-4 leading-relaxed">{ver.data.description}</p>
                        <button 
                          onClick={() => restoreVersion(ver)}
                          className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                        >Restore This State</button>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Data Source Modal */}
      {showDataSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
             <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Connect Data Source</h3>
                  <button onClick={() => setShowDataSettings(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={useSampleData}
                      className={`p-4 border-2 rounded-2xl text-left transition-all ${!apiUrl ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                    >
                      <div className="text-lg mb-1">📊</div>
                      <div className="font-bold text-sm text-slate-800">Sample Data</div>
                      <div className="text-[10px] text-slate-500">Built-in marketplace records</div>
                    </button>
                    <button 
                      onClick={() => !apiUrl && setApiUrl('https://')}
                      className={`p-4 border-2 rounded-2xl text-left transition-all ${apiUrl ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                    >
                      <div className="text-lg mb-1">🌐</div>
                      <div className="font-bold text-sm text-slate-800">External API</div>
                      <div className="text-[10px] text-slate-500">Connect your own JSON URL</div>
                    </button>
                  </div>

                  {apiUrl && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">API Endpoint (JSON)</label>
                        <input 
                          type="text" 
                          placeholder="https://api.example.com/data"
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                        />
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Authentication</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(['none', 'bearer', 'api_key'] as AuthType[]).map((type) => (
                            <button
                              key={type}
                              onClick={() => setAuthType(type)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${authType === type ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >
                              {type.replace('_', ' ')}
                            </button>
                          ))}
                        </div>

                        {authType !== 'none' && (
                          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                            {authType === 'api_key' && (
                              <div className="col-span-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Header Name</label>
                                <input 
                                  type="text" 
                                  placeholder="X-API-Key"
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                  value={authHeader}
                                  onChange={(e) => setAuthHeader(e.target.value)}
                                />
                              </div>
                            )}
                            <div className={authType === 'bearer' ? 'col-span-2' : 'col-span-1'}>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                {authType === 'bearer' ? 'Bearer Token' : 'Value'}
                              </label>
                              <input 
                                type="password" 
                                placeholder={authType === 'bearer' ? 'sk-...' : 'Value...'}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={fetchExternalData}
                          disabled={isFetching}
                          className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isFetching ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Fetching...
                            </>
                          ) : 'Connect & Discover'}
                        </button>
                      </div>

                      {fetchError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-medium flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          {fetchError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Action Library Modal */}
      {showActionLibrary && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Select Action</h3>
                    <p className="text-xs text-slate-400">Choose what happens when your logic triggers</p>
                  </div>
                  <button onClick={() => setShowActionLibrary(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ACTION_DEFINITIONS.map(def => (
                    <button 
                      key={def.type}
                      onClick={() => addAction(def.type)}
                      className="group flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all text-left"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${def.color} flex items-center justify-center text-2xl shadow-lg shrink-0 group-hover:scale-110 transition-transform`}>
                        {def.icon}
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-800 mb-0.5 group-hover:text-indigo-600 transition-colors">{def.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{def.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
             </div>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8 pb-20">
          {/* Automation Metadata Editor */}
          <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <input 
              type="text" 
              className="w-full bg-transparent border-none text-3xl font-black text-slate-800 placeholder:text-slate-200 outline-none mb-2 focus:ring-0"
              placeholder="Automation Name..."
              value={automation.name}
              onChange={(e) => setAutomation({...automation, name: e.target.value})}
            />
            <textarea 
              className="w-full bg-transparent border-none text-sm text-slate-500 placeholder:text-slate-200 outline-none resize-none focus:ring-0 leading-relaxed"
              placeholder="Describe what this rule does..."
              rows={2}
              value={automation.description}
              onChange={(e) => setAutomation({...automation, description: e.target.value})}
            />
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">IF</div>
              <h2 className="text-lg font-bold text-slate-800">Raw Data Conditions</h2>
            </div>
            <ConditionGroupBuilder 
              group={automation.rootCondition}
              fields={workingFields}
              dataset={workingData}
              onUpdate={(updated) => setAutomation({...automation, rootCondition: updated})}
            />
          </section>

          <section className="relative group">
            <div 
              onClick={toggleAggregation}
              className={`p-4 border-2 border-dashed rounded-3xl cursor-pointer transition-all flex items-center justify-between ${
                automation.useAggregation 
                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors ${automation.useAggregation ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Aggregation Analysis</h3>
                  <p className="text-[10px] opacity-70">Group results and apply threshold filters to totals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest">{automation.useAggregation ? 'Enabled' : 'Disabled'}</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${automation.useAggregation ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                   <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${automation.useAggregation ? 'left-6' : 'left-1'}`}></div>
                </div>
              </div>
            </div>

            {automation.useAggregation && (
              <div className="mt-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider">GROUP BY</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={automation.aggregation.groupBy}
                      onChange={(e) => setAutomation({...automation, aggregation: {...automation.aggregation, groupBy: e.target.value}})}
                    >
                      {workingFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider">MEASURE</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={automation.aggregation.measureField}
                      onChange={(e) => setAutomation({...automation, aggregation: {...automation.aggregation, measureField: e.target.value}})}
                    >
                      {workingFields.filter(f => f.type === 'number').map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wider">METHOD</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={automation.aggregation.method}
                      onChange={(e) => setAutomation({...automation, aggregation: {...automation.aggregation, method: e.target.value as any}})}
                    >
                      <option value="sum">Sum of</option>
                      <option value="average">Average of</option>
                      <option value="count">Count of</option>
                      <option value="max">Maximum of</option>
                      <option value="min">Minimum of</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">THEN</div>
              <h2 className="text-lg font-bold text-slate-800">Automated Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automation.actions.map(action => (
                <ActionCard 
                  key={action.id} 
                  action={action} 
                  onDelete={(id) => setAutomation({...automation, actions: automation.actions.filter(a => a.id !== id)})} 
                  onUpdate={(id, updates) => setAutomation({...automation, actions: automation.actions.map(a => a.id === id ? {...a, ...updates} : a)})} 
                />
              ))}
              <button 
                onClick={() => setShowActionLibrary(true)} 
                className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/20 transition-all group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-xs font-bold">New Action</span>
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
           <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden sticky top-24 flex flex-col h-[calc(100vh-140px)]">
             <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Preview</h3>
                  <p className="text-xs text-slate-500">Real-time pipeline result</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {automation.useAggregation && (
                    <button 
                      onClick={() => setViewMode('visualizer')} 
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'visualizer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >CHART</button>
                  )}
                  <button 
                    onClick={() => setViewMode('simulation')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'simulation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >RECORDS</button>
                  <button 
                    onClick={() => setViewMode('json')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >JSON</button>
                </div>
             </div>

             <div className="flex-1 overflow-auto p-6">
                {viewMode === 'visualizer' && automation.useAggregation ? (
                  <Visualizer data={filteredRawData} config={automation.aggregation} customResults={aggregatedResults} />
                ) : viewMode === 'json' ? (
                  <div className="h-full bg-slate-50 rounded-2xl p-4 border border-slate-100 font-mono text-[10px] overflow-auto text-slate-700 leading-relaxed shadow-inner">
                    <pre>{JSON.stringify(automation, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredRawData.length} matches found</span>
                       <span className="text-[10px] text-slate-300 italic">Top 20 results</span>
                    </div>
                    {filteredRawData.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        <span className="text-xs font-medium">No records match criteria</span>
                      </div>
                    ) : (
                      filteredRawData.slice(0, 20).map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                          <div className="flex justify-between text-[10px] font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                            <span className="truncate pr-4">{item.category || item.name || item.id || 'Record'}</span>
                            <span className="shrink-0">{item.sales ? `$${item.sales}` : (item.price ? `$${item.price}` : '')}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{item.date || item.createdAt || ''}</span>
                            <span>{item.region || item.status || ''}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
             </div>

             <div className="p-6 bg-slate-900 text-white">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impact Type</div>
                     <div className="text-lg font-black truncate">
                       {automation.useAggregation ? `${aggregatedResults.length} Nodes` : 'Direct Records'}
                     </div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Total Pass Rate
                     </div>
                     <div className="text-lg font-black text-emerald-400">
                       {workingData.length > 0 ? ((filteredRawData.length / workingData.length) * 100).toFixed(0) : '0'}%
                     </div>
                   </div>
                </div>

                {automation.useAggregation && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aggregation Pass Rate</div>
                      <div className="text-sm font-black text-indigo-400">
                        {totalGroupsBeforeThreshold > 0 
                          ? ((aggregatedResults.length / totalGroupsBeforeThreshold) * 100).toFixed(0) 
                          : '0'}% 
                        <span className="text-[10px] font-normal text-slate-500 ml-1">({aggregatedResults.length}/{totalGroupsBeforeThreshold} groups)</span>
                      </div>
                    </div>
                  </div>
                )}
             </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
