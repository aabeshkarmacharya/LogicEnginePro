
import { RuleAutomation, AutomationVersion } from '../types';

const STORAGE_KEY = 'logic_engine_history';

/**
 * Simulates a backend call to save a rule version.
 * Uses localStorage for persistence in this demo.
 */
export async function saveAutomationVersion(automation: RuleAutomation): Promise<AutomationVersion[]> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  const history = getAutomationHistory();
  const nextVersion = history.length > 0 ? history[0].version + 1 : 1;
  
  const newVersion: AutomationVersion = {
    version: nextVersion,
    timestamp: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(automation)) // Deep copy
  };

  const updatedHistory = [newVersion, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
}

export function getAutomationHistory(): AutomationVersion[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function clearAutomationHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
