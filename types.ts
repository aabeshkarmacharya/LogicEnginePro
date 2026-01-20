
export type FieldType = 'string' | 'number' | 'date' | 'boolean';

export interface DataField {
  name: string;
  label: string;
  type: FieldType;
}

export type Operator = 
  | 'equals' 
  | 'contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'not_equals' 
  | 'starts_with'
  | 'ends_with'
  | 'is_month'
  | 'is_year'
  | 'is_true'
  | 'is_false';

export interface FilterRule {
  id: string;
  type: 'rule';
  field: string;
  operator: Operator;
  value: any;
  valueType?: 'static' | 'field';
}

export interface ConditionGroup {
  id: string;
  type: 'group';
  logic: 'AND' | 'OR';
  children: (FilterRule | ConditionGroup)[];
}

export type ConditionNode = FilterRule | ConditionGroup;

export type ActionType = 
  | 'notify_slack' 
  | 'send_email' 
  | 'tag_record' 
  | 'calculate_bonus' 
  | 'set_status'
  | 'log_event'
  | 'call_webhook';

export interface ActionConfig {
  id: string;
  type: ActionType;
  params: Record<string, any>;
}

export interface AggregationFilter {
  id: string;
  method: 'sum' | 'average' | 'count' | 'max' | 'min';
  field: string;
  operator: Operator;
  value: any;
}

export interface AggregationConfig {
  groupBy?: string;
  measureField?: string;
  method: 'sum' | 'average' | 'count' | 'max' | 'min';
  filters: AggregationFilter[];
}

export interface RuleAutomation {
  id: string;
  name: string;
  description: string;
  rootCondition: ConditionGroup;
  useAggregation: boolean;
  aggregation: AggregationConfig;
  actions: ActionConfig[];
  isActive: boolean;
}

export interface AutomationVersion {
  version: number;
  timestamp: string;
  data: RuleAutomation;
}

export interface MockDataItem {
  id: number;
  date: string;
  category: string;
  region: string;
  sales: number;
  units: number;
  customer_segment: string;
  status: 'Complete' | 'Pending' | 'Cancelled';
  tags?: string[];
}
