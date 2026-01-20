
import { DataField, MockDataItem, ActionType, Operator, FieldType } from './types';

export const DATA_FIELDS: DataField[] = [
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'category', label: 'Category', type: 'string' },
  { name: 'region', label: 'Region', type: 'string' },
  { name: 'sales', label: 'Sales Amount ($)', type: 'number' },
  { name: 'units', label: 'Units Sold', type: 'number' },
  { name: 'customer_segment', label: 'Customer Segment', type: 'string' },
  { name: 'status', label: 'Order Status', type: 'string' },
];

export interface OperatorDef {
  label: string;
  value: Operator;
  types: FieldType[];
}

export const OPERATORS: OperatorDef[] = [
  { label: 'is exactly', value: 'equals', types: ['string', 'number', 'date'] },
  { label: 'is not', value: 'not_equals', types: ['string', 'number', 'date'] },
  { label: 'contains text', value: 'contains', types: ['string'] },
  { label: 'starts with', value: 'starts_with', types: ['string'] },
  { label: 'ends with', value: 'ends_with', types: ['string'] },
  { label: 'is greater than', value: 'greater_than', types: ['number', 'date'] },
  { label: 'is less than', value: 'less_than', types: ['number', 'date'] },
  { label: 'is in month', value: 'is_month', types: ['date'] },
  { label: 'is in year', value: 'is_year', types: ['date'] },
  { label: 'is checked', value: 'is_true', types: ['boolean'] },
  { label: 'is unchecked', value: 'is_false', types: ['boolean'] },
];

export const MONTHS = [
  { label: 'January', value: '0' },
  { label: 'February', value: '1' },
  { label: 'March', value: '2' },
  { label: 'April', value: '3' },
  { label: 'May', value: '4' },
  { label: 'June', value: '5' },
  { label: 'July', value: '6' },
  { label: 'August', value: '7' },
  { label: 'September', value: '8' },
  { label: 'October', value: '9' },
  { label: 'November', value: '10' },
  { label: 'December', value: '11' },
];

export const ACTION_DEFINITIONS: { type: ActionType; label: string; icon: string; description: string; color: string }[] = [
  { type: 'notify_slack', label: 'Notify Slack', icon: '💬', description: 'Send a message to a Slack channel', color: 'bg-emerald-500' },
  { type: 'send_email', label: 'Send Email', icon: '📧', description: 'Send a notification email to stakeholders', color: 'bg-blue-500' },
  { type: 'tag_record', label: 'Add Tag', icon: '🏷️', description: 'Apply a metadata tag to the record', color: 'bg-purple-500' },
  { type: 'calculate_bonus', label: 'Apply Discount', icon: '💰', description: 'Apply a custom discount logic', color: 'bg-amber-500' },
  { type: 'set_status', label: 'Update Status', icon: '⚙️', description: 'Change the record status automatically', color: 'bg-indigo-500' },
  { type: 'log_event', label: 'Log Event', icon: '📝', description: 'Record this match in the audit trail', color: 'bg-slate-500' },
  { type: 'call_webhook', label: 'Call Webhook', icon: '🔗', description: 'Trigger an external API or workflow URL', color: 'bg-rose-500' },
];

const generateMockData = (): MockDataItem[] => {
  const categories = ['Electronics', 'Home & Kitchen', 'Books', 'Toys', 'Clothing'];
  const regions = ['North America', 'Europe', 'Asia', 'South America', 'Australia'];
  const segments = ['Consumer', 'Corporate', 'Small Business'];
  const statuses: ('Complete' | 'Pending' | 'Cancelled')[] = ['Complete', 'Pending', 'Cancelled'];

  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    category: categories[Math.floor(Math.random() * categories.length)],
    region: regions[Math.floor(Math.random() * regions.length)],
    sales: parseFloat((Math.random() * 1000 + 50).toFixed(2)),
    units: Math.floor(Math.random() * 20) + 1,
    customer_segment: segments[Math.floor(Math.random() * segments.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    tags: [],
  }));
};

export const MOCK_DATA = generateMockData();
