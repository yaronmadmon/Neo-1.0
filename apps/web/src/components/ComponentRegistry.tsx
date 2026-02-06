/**
 * Component Registry - ENHANCED VERSION
 * Maps componentId strings from schema to actual React components
 * Now includes shadcn blocks and new UI components
 */
import React from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { Switch } from './Switch';
import { PersonCard } from './PersonCard';
import { ItemCard } from './ItemCard';

// New shadcn-based components
import { StatsCard, StatsCardGrid } from './StatsCard';
import { AreaChartCard } from './AreaChartCard';
import { SimpleDataTable, type ColumnDef } from './SimpleDataTable';
import { LoginForm } from './login-form';
import { ScheduleCalendar } from './ScheduleCalendar';

// Shadcn UI primitives
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Calendar } from './ui/calendar';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

// Lucide icons for dynamic icon mapping
import {
  Users,
  DollarSign,
  BarChart3,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  ShoppingCart,
  Package,
  Mail,
  Bell,
  Heart,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Folder,
  Settings,
  Home,
  type LucideIcon,
} from 'lucide-react';

// Layout components
import { SingleColumn } from './layouts/SingleColumn';
import { TwoColumn } from './layouts/TwoColumn';
import { ThreeColumn } from './layouts/ThreeColumn';
import { SidebarLayout, SidebarLeft, SidebarRight } from './layouts/SidebarLayout';
import { DashboardGrid, DashboardGridItem } from './layouts/DashboardGrid';
import { TopNavLayout, TopNavItem } from './layouts/TopNavLayout';
import { MasterDetailLayout, MasterListItem } from './layouts/MasterDetailLayout';

export interface ComponentProps {
  id?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

// Text Component - NOW HANDLES CHILDREN
const TextComponent: React.FC<ComponentProps> = ({ 
  text, 
  children, 
  variant = 'body', 
  ...otherProps 
}) => {
  const variantStr = String(variant || 'body');
  const className = variantStr === 'h1' ? 'text-3xl font-bold mb-4' :
                    variantStr === 'h2' ? 'text-2xl font-semibold mb-3' :
                    variantStr === 'h3' ? 'text-xl font-semibold mb-2' :
                    'text-base mb-2';

  const Component = variantStr === 'h1' ? 'h1' :
                    variantStr === 'h2' ? 'h2' :
                    variantStr === 'h3' ? 'h3' :
                    'p';

  const { id, style, ...restProps } = otherProps;
  
  // FIX: Use children if text prop is not provided
  const content = text != null ? String(text) : children;

  return (
    <Component className={className} style={style as React.CSSProperties} {...restProps}>
      {content}
    </Component>
  );      
};

// Button Component - using shadcn wrapper
const ButtonComponent = Button;

// Input Component - using shadcn wrapper
const InputComponent = Input;

// List Component - ENHANCED
const ListComponent: React.FC<ComponentProps> = ({
  source,
  data,
  renderItem,
  children,
  cardType,
  cardConfig,
  entityName,
  compact,
  limit,
  ...otherProps
}) => {
  console.log('📋 ListComponent received:', {
    source,
    data,
    cardType,
    cardConfig,
    dataType: typeof data,
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'no data',
    dataContent: data
  });

  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();

  let items: unknown[] = [];
  if (dataObj && sourceStr) {
    const sourceData = dataObj[sourceStr];
    items = Array.isArray(sourceData) ? sourceData : [];
  }

  // If no data found for source, try related key names (but NOT unrelated entities)
  if (items.length === 0 && dataObj && sourceStr) {
    // Try variations of the source name (singular/plural, common aliases)
    const sourceLower = sourceStr.toLowerCase();
    const possibleKeys = [
      sourceStr,
      `${sourceStr}s`,  // Add 's' for plural
      sourceStr.replace(/s$/, ''),  // Remove 's' for singular
      // Common entity aliases
      ...(sourceLower === 'inventory' ? ['material', 'materials', 'product', 'products', 'item', 'items'] : []),
      ...(sourceLower === 'material' || sourceLower === 'materials' ? ['inventory', 'product', 'products'] : []),
      ...(sourceLower === 'product' || sourceLower === 'products' ? ['inventory', 'material', 'materials', 'item', 'items'] : []),
    ];
    
    for (const key of possibleKeys) {
      if (key && dataObj[key] && Array.isArray(dataObj[key])) {
        items = dataObj[key] as unknown[];
        console.log(`📋 Found data via alias: "${key}" for source "${sourceStr}"`);
        break;
      }
    }
  }
  
  // Last resort for truly generic lists without a source - but ONLY for generic names
  if (items.length === 0 && dataObj && (!sourceStr || sourceStr === 'item' || sourceStr === 'items')) {
    const genericKeys = ['item', 'items', 'data'];
    for (const key of genericKeys) {
      if (key && Array.isArray(dataObj[key])) {
        items = dataObj[key] as unknown[];
        console.log(`📋 Using generic data source: "${key}"`);
        break;
      }
    }
  }

  console.log('📋 ListComponent items:', {
    sourceStr,
    itemsCount: items.length,
    items: items.slice(0, 3),
    cardType,
  });

  const { id, style, ...restProps } = otherProps;
  const config = cardConfig as Record<string, any> | undefined;

  // Helper to dispatch card actions
  // NOTE: This dispatches events that Preview/Studio components listen to
  // It does NOT navigate away from the current preview - internal navigation only
  const dispatchCardAction = (actionType: string, itemId: string, entityId?: string) => {
    const entity = entityId || sourceStr;
    
    // Dispatch event for Preview/Studio to handle internally
    const event = new CustomEvent('neo-card-action', {
      detail: {
        action: actionType,
        itemId,
        entityId: entity,
        source: 'card',
        // Include target page info for internal navigation
        targetPage: actionType.toLowerCase() === 'view' || actionType.toLowerCase() === 'edit'
          ? `${entity}-detail`
          : undefined,
        targetPageParams: { id: itemId },
      },
      bubbles: true,
    });
    window.dispatchEvent(event);
    
    console.log(`🎯 Card action: ${actionType} on ${itemId} (entity: ${entity})`);
  };

  // Filter out items that don't have meaningful data (just ID or empty objects)
  // WHY: Prevents rendering broken/skeleton-looking cards when data is incomplete
  const validItems = items.filter((item: any) => {
    if (!item || typeof item !== 'object') return false;
    
    // Check if item has at least one meaningful field (not just id/timestamps)
    const meaningfulFields = ['name', 'title', 'label', 'email', 'phone', 'status', 'description', 'subject'];
    const hasContent = meaningfulFields.some(field => 
      item[field] && String(item[field]).trim().length > 0
    );
    
    // Also accept items with at least 2 non-system fields with values
    if (!hasContent) {
      const systemFields = new Set(['id', '_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
      const contentFields = Object.entries(item).filter(([key, value]) => 
        !systemFields.has(key) && value !== null && value !== undefined && String(value).trim().length > 0
      );
      return contentFields.length >= 2;
    }
    
    return hasContent;
  });

  if (validItems.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic py-4 bg-muted/50 border border-solid border-border rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No items to display
        {sourceStr && <div className="text-xs mt-1">Looking for data source: "{sourceStr}"</div>}
      </div>
    );
  }

  // Helper to get field value from item
  const getFieldValue = (item: any, fieldId: string) => {
    return item?.[fieldId] ?? '';
  };

  // Render PersonCard for person-type entities
  const renderPersonCard = (item: any, index: number) => {
    const nameField = config?.nameField || 'name';
    const avatarField = config?.avatarField;
    const subtitleField = config?.subtitleField;
    const statusField = config?.statusField;
    const fieldMappings = config?.fieldMappings || [];

    // Build fields array for PersonCard
    const fields = fieldMappings
      .filter((m: any) => m && getFieldValue(item, m.field))
      .map((m: any) => ({
        icon: m.icon || '📝',
        value: String(getFieldValue(item, m.field)),
        type: m.type || 'text',
      }));

    // Build status if available
    const status = statusField && item[statusField] ? {
      label: String(item[statusField]),
      color: getPersonCardStatusColor(item[statusField]),
    } : undefined;

    return (
      <PersonCard
        key={item?.id || index}
        name={String(getFieldValue(item, nameField) || 'Unknown')}
        avatar={avatarField ? getFieldValue(item, avatarField) : undefined}
        subtitle={subtitleField ? String(getFieldValue(item, subtitleField)) : undefined}
        fields={fields}
        status={status}
        primaryAction={config?.primaryAction ? {
          ...config.primaryAction,
          onClick: () => dispatchCardAction(config.primaryAction.label || 'View', item.id),
        } : undefined}
        secondaryActions={config?.secondaryActions?.map((a: any) => ({
          ...a,
          onClick: () => dispatchCardAction(a.label, item.id),
        }))}
        onClick={() => dispatchCardAction('View', item.id)}
      />
    );
  };

  // Render ItemCard for item-type entities
  const renderItemCard = (item: any, index: number) => {
    const titleField = config?.titleField || 'name';
    const imageField = config?.imageField;
    const subtitleField = config?.subtitleField;
    const priceField = config?.priceField;
    const statusField = config?.statusField;
    const fieldMappings = config?.fieldMappings || [];

    // Build fields array for ItemCard
    const fields = fieldMappings
      .filter((m: any) => m && getFieldValue(item, m.field))
      .map((m: any) => ({
        label: m.label || m.field,
        value: String(getFieldValue(item, m.field)),
      }));

    // Build status if available
    const status = statusField && item[statusField] ? {
      label: String(item[statusField]),
      color: getItemCardStatusColor(item[statusField]),
    } : undefined;

    return (
      <ItemCard
        key={item?.id || index}
        title={String(getFieldValue(item, titleField) || 'Unknown')}
        image={imageField ? getFieldValue(item, imageField) : undefined}
        subtitle={subtitleField ? String(getFieldValue(item, subtitleField)) : undefined}
        price={priceField ? getFieldValue(item, priceField) : undefined}
        fields={fields}
        status={status}
        actions={config?.actions?.map((a: any) => ({
          ...a,
          onClick: () => dispatchCardAction(a.label, item.id),
        }))}
        onClick={() => dispatchCardAction('View', item.id)}
        compact={Boolean(compact)}
        hideImagePlaceholder={true}
      />
    );
  };

  // Render default card (shadcn-styled with smart field display)
  // IMPROVED: Better formatting for dates, phones, currency; cleaner layout
  const renderDefaultCard = (item: any, index: number) => {
    if (renderItem && typeof renderItem === 'function') {
      return (
        <div key={item?.id || index} className="p-4 bg-card border rounded-lg hover:shadow-md transition-all">
          {renderItem(item) as React.ReactNode}
        </div>
      );
    }

    // Fields to always hide (internal/system fields)
    const hiddenFields = new Set([
      'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
      '_id', '__v', 'password', 'hash', 'salt', 'token'
    ]);

    // Smart field extraction - filter out hidden and complex fields
    const entries = Object.entries(item || {}).filter(([key, value]) => 
      typeof value !== 'function' && 
      (typeof value !== 'object' || value === null) &&
      !hiddenFields.has(key) &&
      !key.startsWith('_')
    );
    
    // Find primary fields for structured display
    const nameEntry = entries.find(([key]) => 
      key.toLowerCase() === 'name' || 
      key.toLowerCase() === 'title' ||
      key.toLowerCase() === 'jobtitle' ||
      key.toLowerCase() === 'subject'
    );
    const statusEntry = entries.find(([key]) => 
      key.toLowerCase() === 'status' || key.toLowerCase() === 'state'
    );
    const emailEntry = entries.find(([key]) => 
      key.toLowerCase() === 'email' || key.toLowerCase().includes('email')
    );
    const phoneEntry = entries.find(([key]) => 
      key.toLowerCase() === 'phone' || key.toLowerCase().includes('phone')
    );
    const dateEntry = entries.find(([key]) => 
      key.toLowerCase().includes('date') || 
      key.toLowerCase().includes('time') ||
      key.toLowerCase() === 'scheduleddate' ||
      key.toLowerCase() === 'appointmentdate'
    );
    const amountEntry = entries.find(([key]) => 
      key.toLowerCase().includes('amount') || 
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('total') ||
      key.toLowerCase().includes('cost')
    );
    
    // Other fields - exclude ones we're showing specially, limit for clean UI
    const shownFields = new Set([
      nameEntry?.[0], statusEntry?.[0], emailEntry?.[0], 
      phoneEntry?.[0], dateEntry?.[0], amountEntry?.[0]
    ].filter(Boolean));
    
    const otherEntries = entries
      .filter(([key]) => !shownFields.has(key))
      .slice(0, 3); // Limit to 3 additional fields for cleaner cards
    
    // Smart value formatting
    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined || value === '') return '-';
      const keyLower = key.toLowerCase();
      const strValue = String(value);
      
      // Date formatting
      if (keyLower.includes('date') || keyLower.endsWith('at') || keyLower.includes('time')) {
        try { 
          const date = new Date(strValue);
          if (!isNaN(date.getTime())) {
            // If it has time component, show date and time
            if (keyLower.includes('time') || strValue.includes('T')) {
              return date.toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              });
            }
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch { /* fall through */ }
      }
      
      // Currency formatting
      if (keyLower.includes('amount') || keyLower.includes('price') || 
          keyLower.includes('cost') || keyLower.includes('total') ||
          keyLower.includes('rent') || keyLower.includes('fee')) {
        const num = parseFloat(strValue);
        if (!isNaN(num)) {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2 
          }).format(num);
        }
      }
      
      // Phone formatting
      if (keyLower.includes('phone')) {
        const digits = strValue.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        }
        if (digits.length === 11 && digits.startsWith('1')) {
          return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
        }
      }
      
      // Boolean formatting
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      // Truncate long values
      return strValue.length > 50 ? strValue.substring(0, 47) + '...' : strValue;
    };

    const formatLabel = (key: string): string => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    const getStatusColor = (status: string): string => {
      const s = String(status).toLowerCase().replace(/[_-]/g, '');
      // Green - positive/complete states (uses --success token)
      if (['active', 'completed', 'paid', 'approved', 'done', 'confirmed', 'delivered', 'checkedin', 'instock'].some(x => s.includes(x))) {
        return 'bg-[hsl(var(--success-bg,142_76%_95%))] text-[hsl(var(--success,142_71%_45%))] dark:bg-[hsl(var(--success)/0.2)] dark:text-[hsl(var(--success))]';
      }
      // Yellow - in-progress/waiting states (uses --warning token)
      if (['pending', 'waiting', 'processing', 'scheduled', 'inprogress', 'new', 'draft', 'booked'].some(x => s.includes(x))) {
        return 'bg-[hsl(var(--warning-bg,45_93%_95%))] text-[hsl(var(--warning,45_93%_47%))] dark:bg-[hsl(var(--warning)/0.2)] dark:text-[hsl(var(--warning))]';
      }
      // Blue - informational states (uses --info token)
      if (['trial', 'frozen', 'reserved', 'sent'].some(x => s.includes(x))) {
        return 'bg-[hsl(var(--info-bg,201_96%_95%))] text-[hsl(var(--info,201_96%_32%))] dark:bg-[hsl(var(--info)/0.2)] dark:text-[hsl(var(--info))]';
      }
      // Red - negative states (uses --destructive/error token)
      if (['cancelled', 'rejected', 'failed', 'expired', 'inactive', 'overdue', 'noshow', 'outofstock'].some(x => s.includes(x))) {
        return 'bg-[hsl(var(--error-bg,0_84%_95%))] text-[hsl(var(--error,0_84%_60%))] dark:bg-[hsl(var(--destructive)/0.2)] dark:text-[hsl(var(--destructive))]';
      }
      return 'bg-muted text-muted-foreground';
    };

    // Format status label (convert snake_case to Title Case)
    const formatStatus = (status: string): string => {
      return String(status)
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
      <div 
        key={item?.id || index} 
        className="bg-card border rounded-lg overflow-hidden hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
        onClick={() => dispatchCardAction('View', item?.id)}
      >
        {/* Header with name and status */}
        <div className="px-4 py-3 border-b bg-muted/20 group-hover:bg-muted/40 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate text-foreground">
                {nameEntry ? String(nameEntry[1]) : `Item ${index + 1}`}
              </h3>
              {/* Show date/time if available as subtitle */}
              {dateEntry && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatValue(dateEntry[0], dateEntry[1])}
                </p>
              )}
            </div>
            {statusEntry && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(String(statusEntry[1]))}`}>
                {formatStatus(String(statusEntry[1]))}
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          {/* Contact info row */}
          {(emailEntry || phoneEntry) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {emailEntry && (
                <a 
                  href={`mailto:${emailEntry[1]}`} 
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" 
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-xs">✉️</span>
                  <span className="truncate max-w-[180px]">{String(emailEntry[1])}</span>
                </a>
              )}
              {phoneEntry && (
                <a 
                  href={`tel:${phoneEntry[1]}`} 
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" 
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-xs">📞</span>
                  <span>{formatValue(phoneEntry[0], phoneEntry[1])}</span>
                </a>
              )}
            </div>
          )}
          
          {/* Amount highlight if present */}
          {amountEntry && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{formatLabel(amountEntry[0])}</span>
              <span className="font-semibold text-foreground">{formatValue(amountEntry[0], amountEntry[1])}</span>
            </div>
          )}
          
          {/* Other fields - compact display */}
          {otherEntries.length > 0 && (
            <div className="pt-1 border-t border-dashed space-y-1">
              {otherEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{formatLabel(key)}</span>
                  <span className="text-foreground truncate ml-2 max-w-[60%] text-right">{formatValue(key, value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Determine grid class based on card type and compact mode
  // Compact mode (inside dashboard widgets) uses fewer columns to prevent cramped cards
  const gridClass = cardType === 'personCard' || cardType === 'itemCard'
    ? compact 
      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'  // Fewer columns in compact mode
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'space-y-3';

  // Apply limit if specified
  const displayItems = limit ? validItems.slice(0, Number(limit)) : validItems;

  return (
    <div className={gridClass} style={style as React.CSSProperties} {...restProps}>
      {displayItems.map((item: any, index: number) => {
        if (cardType === 'personCard') {
          return renderPersonCard(item, index);
        }
        if (cardType === 'itemCard') {
          return renderItemCard(item, index);
        }
        return renderDefaultCard(item, index);
      })}
    </div>
  );
};

// Helper function to get status color for PersonCard (subset of colors)
function getPersonCardStatusColor(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  const statusLower = String(status).toLowerCase();
  if (['active', 'completed', 'paid', 'approved', 'done', 'checked_in'].some(s => statusLower.includes(s))) {
    return 'green';
  }
  if (['pending', 'waiting', 'in_progress', 'processing', 'new', 'scheduled'].some(s => statusLower.includes(s))) {
    return 'yellow';
  }
  if (['cancelled', 'rejected', 'failed', 'overdue', 'inactive'].some(s => statusLower.includes(s))) {
    return 'red';
  }
  return 'gray';
}

// Helper function to get status color for ItemCard (includes more colors)
function getItemCardStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' {
  const statusLower = String(status).toLowerCase();
  if (['active', 'completed', 'paid', 'approved', 'done', 'in_stock'].some(s => statusLower.includes(s))) {
    return 'green';
  }
  if (['pending', 'waiting', 'in_progress', 'processing'].some(s => statusLower.includes(s))) {
    return 'yellow';
  }
  if (['cancelled', 'rejected', 'failed', 'overdue', 'out_of_stock'].some(s => statusLower.includes(s))) {
    return 'red';
  }
  if (['new', 'scheduled', 'upcoming'].some(s => statusLower.includes(s))) {
    return 'blue';
  }
  if (['premium', 'featured', 'special'].some(s => statusLower.includes(s))) {
    return 'purple';
  }
  return 'gray';
}

// Calendar Component (simple grouped list)
const CalendarComponent: React.FC<ComponentProps> = ({
  source,
  data,
  dateField = 'date',
  titleField = 'title',
  ...otherProps
}) => {
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  const items = dataObj && sourceStr ? (dataObj[sourceStr] || []) : [];

  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items as Array<Record<string, unknown>>) {
    const rawDate = item[dateField as string];
    const dateKey = rawDate ? new Date(String(rawDate)).toLocaleDateString() : 'Unscheduled';
    const list = grouped.get(dateKey) || [];
    list.push(item);
    grouped.set(dateKey, list);
  }

  const { id, style, ...restProps } = otherProps;

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic py-4 bg-muted/50 border border-solid border-border rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No appointments to display
      </div>
    );
  }

  return (
    <div className="space-y-4" style={style as React.CSSProperties} {...restProps}>
      {[...grouped.entries()].map(([date, groupItems]) => (
        <div key={date} className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{date}</h3>
          <div className="space-y-2">
            {groupItems.map((item, index) => (
              <div key={String(item.id || index)} className="flex items-center justify-between text-sm text-foreground">
                <span className="font-medium">{String(item[titleField as string] || 'Appointment')}</span>
                <span className="text-muted-foreground">{String(item.location || item.address || '')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Kanban Component (simple grouped columns)
const KanbanComponent: React.FC<ComponentProps> = ({
  source,
  data,
  columnField = 'status',
  columns = [],
  titleField = 'name',
  ...otherProps
}) => {
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  const items = dataObj && sourceStr ? (dataObj[sourceStr] || []) : [];

  const columnDefs = Array.isArray(columns) ? columns : [];
  const columnMap = new Map<string, Array<Record<string, unknown>>>();

  for (const col of columnDefs) {
    const id = String((col as any).id || (col as any).value || '');
    if (id) columnMap.set(id, []);
  }

  for (const item of items as Array<Record<string, unknown>>) {
    const columnId = String(item[columnField as string] || '');
    if (!columnMap.has(columnId)) columnMap.set(columnId, []);
    columnMap.get(columnId)?.push(item);
  }

  const { id, style, ...restProps } = otherProps;

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic py-4 bg-muted/50 border border-solid border-border rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No items to display
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={style as React.CSSProperties} {...restProps}>
      {[...columnMap.entries()].map(([columnId, columnItems]) => {
        const columnMeta = columnDefs.find((col: any) => String(col.id || col.value) === columnId);
        return (
          <div key={columnId} className="bg-card border rounded-lg p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {String(columnMeta?.title || columnMeta?.label || columnId || 'Column')}
            </div>
            <div className="space-y-2">
              {columnItems.map((item, index) => (
                <div key={String(item.id || index)} className="border border-solid border-border rounded-md p-2 text-sm">
                  <div className="font-semibold text-foreground">
                    {String(item[titleField as string] || 'Item')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Card Component - using shadcn wrapper
const CardComponent = Card;

// PersonCard Component - for person-type entities
const PersonCardComponent: React.FC<ComponentProps> = ({
  name,
  avatar,
  subtitle,
  fields,
  primaryAction,
  secondaryActions,
  status,
  tags,
  onClick,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <PersonCard
      name={String(name || 'Unknown')}
      avatar={avatar as string | undefined}
      subtitle={subtitle as string | undefined}
      fields={Array.isArray(fields) ? fields as any[] : undefined}
      primaryAction={primaryAction as any}
      secondaryActions={Array.isArray(secondaryActions) ? secondaryActions as any[] : undefined}
      status={status as any}
      tags={Array.isArray(tags) ? tags as string[] : undefined}
      onClick={onClick as (() => void) | undefined}
      className={className as string | undefined}
      style={style as React.CSSProperties | undefined}
    />
  );
};

// ItemCard Component - for non-person entities
const ItemCardComponent: React.FC<ComponentProps> = ({
  title,
  image,
  subtitle,
  price,
  currency,
  fields,
  status,
  actions,
  tags,
  onClick,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <ItemCard
      title={String(title || 'Unknown')}
      image={image as string | undefined}
      subtitle={subtitle as string | undefined}
      price={price as number | string | undefined}
      currency={currency as string | undefined}
      fields={Array.isArray(fields) ? fields as any[] : undefined}
      status={status as any}
      actions={Array.isArray(actions) ? actions as any[] : undefined}
      tags={Array.isArray(tags) ? tags as string[] : undefined}
      onClick={onClick as (() => void) | undefined}
      className={className as string | undefined}
      style={style as React.CSSProperties | undefined}
    />
  );
};

// Form Component
const FormComponent: React.FC<ComponentProps> = ({
  children,
  onSubmit,
  submitLabel = 'Submit',
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log('📋 FormComponent handleSubmit called, id:', id);
    console.log('📋 onSubmit prop exists:', typeof onSubmit === 'function');
    
    // Don't prevent default here - let the SchemaRenderer's onSubmit handle it
    // This allows the SchemaRenderer to extract form data before the form resets
    if (onSubmit && typeof onSubmit === 'function') {
      console.log('📋 Calling onSubmit prop...');
      onSubmit(e);
    } else {
      // Only prevent default if no onSubmit handler
      e.preventDefault();
      console.warn('📋 No onSubmit handler provided to form');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" style={style as React.CSSProperties} {...restProps}>
      {children as React.ReactNode}
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground font-semibold py-2 px-6 rounded-md hover:bg-primary/90 transition-colors"
      >
        {String(submitLabel || 'Submit')}
      </button>
    </form>
  );
};

// Container Component (default layout)
const ContainerComponent: React.FC<ComponentProps> = ({ children, ...otherProps }) => {
  const { id, style, ...restProps } = otherProps;

  return (
    <div className="space-y-4" style={style as React.CSSProperties} {...restProps}>
      {children as React.ReactNode}
    </div>
  );
};

// Table Component
const TableComponent: React.FC<ComponentProps> = ({
  columns,
  source,
  data,
  ...otherProps
}) => {
  const dataObj = data as Record<string, unknown[]> | undefined;
  const sourceStr = String(source || '');
  const items = (dataObj && typeof dataObj === 'object' && sourceStr)
    ? (dataObj[sourceStr] || [])
    : [];

  const cols = Array.isArray(columns) ? columns : [];
  const { id, style, ...restProps } = otherProps;

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic py-4" style={style as React.CSSProperties} {...restProps}>
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" style={style as React.CSSProperties} {...restProps}>
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            {cols.length > 0 ? (
              cols.map((col: any, idx: number) => (
                <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {String(col.label || col.name || col)}
                </th>
              ))
            ) : (
              Object.keys(items[0] || {}).map((key) => (
                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {key}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {items.map((item: any, idx: number) => (
            <tr key={item?.id || idx} className="hover:bg-muted/50">
              {cols.length > 0 ? (
                cols.map((col: any, colIdx: number) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {String(item[col.field || col.key || col] || '')}
                  </td>
                ))
              ) : (
                Object.values(item || {}).map((value: any, valIdx: number) => (
                  <td key={valIdx} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {String(value)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Dashboard, Chart, Navigation, Modal, Image, Video (unchanged from original)
const DashboardComponent: React.FC<ComponentProps> = ({
  children,
  columns = 3,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const gridCols = Number(columns) || 3;
  const gridClass = gridCols === 1 ? 'grid-cols-1' :
                    gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
                    gridCols === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-6`} style={style as React.CSSProperties} {...restProps}>
      {children as React.ReactNode}
    </div>
  );
};

const ChartComponent: React.FC<ComponentProps> = ({
  type = 'bar',
  data,
  title,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const chartData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const dataKeys = chartData && typeof chartData === 'object' ? Object.keys(chartData) : [];

  return (
    <div className="bg-card border rounded-lg p-6" style={style as React.CSSProperties} {...restProps}>   
      {title != null && String(title) && <h3 className="text-lg font-semibold mb-4 text-foreground">{String(title)}</h3>}
      <div className="h-64 flex items-center justify-center bg-muted rounded-md border-2 border-dashed border-border">
        <div className="text-center text-muted-foreground">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium">Chart: {String(type || 'bar')}</div>
          <div className="text-xs mt-1">Chart visualization (placeholder)</div>
          {dataKeys.length > 0 && (
            <div className="text-xs mt-2 text-muted-foreground/70">
              Data points: {dataKeys.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NavigationComponent: React.FC<ComponentProps> = ({
  items,
  children,
  orientation = 'horizontal',
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const navItems = Array.isArray(items) ? items : [];
  const isVertical = String(orientation) === 'vertical';

  const baseClasses = isVertical
    ? 'flex flex-col space-y-2'
    : 'flex flex-row space-x-4';

  return (
    <nav className={baseClasses} style={style as React.CSSProperties} {...restProps}>
      {navItems.length > 0 ? (
        navItems.map((item: any, idx: number) => (
          <a
            key={item?.id || idx}
            href={item?.href || item?.route || '#'}
            className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            onClick={(e) => {
              if (item?.onClick && typeof item.onClick === 'function') {
                e.preventDefault();
                item.onClick(e);
              }
            }}
          >
            {String(item?.label || item?.text || item?.name || 'Link')}
          </a>
        ))
      ) : (
        children as React.ReactNode
      )}
    </nav>
  );
};

// Modal Component - using shadcn wrapper
const ModalComponent = Modal;

const ImageComponent: React.FC<ComponentProps> = ({
  src,
  alt,
  width,
  height,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const imageSrc = String(src || '');

  if (!imageSrc) {
    const fallbackStyle: React.CSSProperties = {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      ...(style && typeof style === 'object' && !Array.isArray(style) ? style as React.CSSProperties : {}),
    };
    return (
      <div className="bg-muted border border-solid border-border rounded-lg flex items-center justify-center" style={fallbackStyle} {...restProps}>
        <span className="text-muted-foreground text-sm">No image source</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={String(alt || '')}
      width={width ? Number(width) : undefined}
      height={height ? Number(height) : undefined}
      className="max-w-full h-auto rounded-lg"
      style={style as React.CSSProperties}
      {...restProps}
    />
  );
};

const VideoComponent: React.FC<ComponentProps> = ({
  src,
  poster,
  autoplay = false,
  controls = true,
  width,
  height,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const videoSrc = String(src || '');

  if (!videoSrc) {
    const fallbackStyle: React.CSSProperties = {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      ...(style && typeof style === 'object' && !Array.isArray(style) ? style as React.CSSProperties : {}),
    };
    return (
      <div className="bg-muted border border-solid border-border rounded-lg flex items-center justify-center" style={fallbackStyle} {...restProps}>
        <span className="text-muted-foreground text-sm">No video source</span>
      </div>
    );
  }

  return (
    <video
      src={videoSrc}
      poster={poster ? String(poster) : undefined}
      autoPlay={Boolean(autoplay)}
      controls={Boolean(controls)}
      width={width ? Number(width) : undefined}
      height={height ? Number(height) : undefined}
      className="max-w-full h-auto rounded-lg"
      style={style as React.CSSProperties}
      {...restProps}
    >
      Your browser does not support the video tag.
    </video>
  );
};

// Gallery Component - Image grid with lightbox
const GalleryComponent: React.FC<ComponentProps> = ({
  source,
  data,
  columns = 3,
  gap = 4,
  imageField = 'image',
  titleField = 'title',
  ...otherProps
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  let items: unknown[] = [];
  
  if (dataObj && sourceStr) {
    const sourceData = dataObj[sourceStr];
    items = Array.isArray(sourceData) ? sourceData : [];
  }

  // Auto-detect source if not specified
  if (items.length === 0 && dataObj) {
    const possibleKeys = ['images', 'photos', 'gallery', 'items', Object.keys(dataObj)[0]];
    for (const key of possibleKeys) {
      if (key && Array.isArray(dataObj[key])) {
        items = dataObj[key] as unknown[];
        break;
      }
    }
  }

  const { id, style, ...restProps } = otherProps;
  const colCount = Number(columns) || 3;
  const gapSize = Number(gap) || 4;

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic py-4 bg-muted/50 border border-solid border-border rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No images to display
      </div>
    );
  }

  return (
    <>
      <div 
        className={`grid gap-${gapSize}`}
        style={{
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: `${gapSize * 4}px`,
          ...(style as React.CSSProperties),
        }}
        {...restProps}
      >
        {items.map((item: any, index: number) => {
          const imgSrc = item[imageField as string] || item.src || item.url || '';
          const imgTitle = item[titleField as string] || item.name || '';
          
          return (
            <div 
              key={item?.id || index} 
              className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
              onClick={() => setSelectedIndex(index)}
            >
              {imgSrc ? (
                <img 
                  src={String(imgSrc)} 
                  alt={String(imgTitle)} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {imgTitle && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm truncate block">{String(imgTitle)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setSelectedIndex(null)}
          >
            ×
          </button>
          <button 
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 disabled:opacity-50"
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.max(0, selectedIndex - 1)); }}
            disabled={selectedIndex === 0}
          >
            ‹
          </button>
          <img 
            src={String((items[selectedIndex] as any)[imageField as string] || (items[selectedIndex] as any).src || '')}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 disabled:opacity-50"
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1)); }}
            disabled={selectedIndex === items.length - 1}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
};

// Chat Component - Message list with input
const ChatComponent: React.FC<ComponentProps> = ({
  source,
  data,
  messageField = 'message',
  senderField = 'sender',
  timestampField = 'timestamp',
  currentUser = 'me',
  onSend,
  placeholder = 'Type a message...',
  ...otherProps
}) => {
  const [newMessage, setNewMessage] = React.useState('');
  
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  let messages: unknown[] = [];
  
  if (dataObj && sourceStr) {
    const sourceData = dataObj[sourceStr];
    messages = Array.isArray(sourceData) ? sourceData : [];
  }

  // Auto-detect source
  if (messages.length === 0 && dataObj) {
    const possibleKeys = ['messages', 'chat', 'conversation', Object.keys(dataObj)[0]];
    for (const key of possibleKeys) {
      if (key && Array.isArray(dataObj[key])) {
        messages = dataObj[key] as unknown[];
        break;
      }
    }
  }

  const { id, style, ...restProps } = otherProps;

  const handleSend = () => {
    if (newMessage.trim() && onSend && typeof onSend === 'function') {
      onSend({ message: newMessage.trim() });
      setNewMessage('');
    }
  };

  return (
    <div 
      className="flex flex-col h-96 bg-card border rounded-lg overflow-hidden"
      style={style as React.CSSProperties}
      {...restProps}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-muted-foreground text-center text-sm py-8">No messages yet</div>
        ) : (
          messages.map((msg: any, index: number) => {
            const sender = msg[senderField as string] || 'Unknown';
            const message = msg[messageField as string] || '';
            const timestamp = msg[timestampField as string];
            const isCurrentUser = String(sender).toLowerCase() === String(currentUser).toLowerCase();

            return (
              <div 
                key={msg?.id || index}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isCurrentUser 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {!isCurrentUser && (
                    <div className="text-xs font-medium mb-1 opacity-70">{String(sender)}</div>
                  )}
                  <div className="text-sm">{String(message)}</div>
                  {timestamp && (
                    <div className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(String(timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={String(placeholder)}
          className="flex-1 px-4 py-2 border border-input rounded-full focus-visible:ring-2 focus-visible:ring-ring text-sm"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Map Component - Interactive map with markers
const MapComponent: React.FC<ComponentProps> = ({
  source,
  data,
  latField = 'lat',
  lngField = 'lng',
  titleField = 'title',
  center,
  zoom = 13,
  height = 400,
  ...otherProps
}) => {
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  let markers: unknown[] = [];
  
  if (dataObj && sourceStr) {
    const sourceData = dataObj[sourceStr];
    markers = Array.isArray(sourceData) ? sourceData : [];
  }

  // Auto-detect source
  if (markers.length === 0 && dataObj) {
    const possibleKeys = ['markers', 'locations', 'places', 'points', Object.keys(dataObj)[0]];
    for (const key of possibleKeys) {
      if (key && Array.isArray(dataObj[key])) {
        markers = dataObj[key] as unknown[];
        break;
      }
    }
  }

  const { id, style, ...restProps } = otherProps;
  const mapHeight = Number(height) || 400;

  // Parse center coordinates
  let centerLat = 40.7128;
  let centerLng = -74.0060;
  if (center && typeof center === 'object') {
    const c = center as Record<string, unknown>;
    centerLat = Number(c.lat || c.latitude) || centerLat;
    centerLng = Number(c.lng || c.longitude || c.lon) || centerLng;
  } else if (markers.length > 0) {
    // Use first marker as center
    const first = markers[0] as Record<string, unknown>;
    centerLat = Number(first[latField as string] || first.lat || first.latitude) || centerLat;
    centerLng = Number(first[lngField as string] || first.lng || first.longitude || first.lon) || centerLng;
  }

  // For now, show a placeholder with marker info since we don't have a map library
  // In production, this would integrate with Mapbox, Google Maps, or Leaflet
  return (
    <div 
      className="bg-muted/30 border border-solid border-border rounded-lg overflow-hidden relative"
      style={{ height: mapHeight, ...(style as React.CSSProperties) }}
      {...restProps}
    >
      {/* Map placeholder background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <div className="bg-background/90 backdrop-blur rounded-md border px-4 py-2">
            <div className="text-sm font-medium text-foreground">Map View</div>
            <div className="text-xs text-muted-foreground">
              Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Zoom: {String(zoom)}</div>
          </div>
        </div>
      </div>

      {/* Markers list */}
      {markers.length > 0 && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-md border max-h-48 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            {markers.length} Location{markers.length !== 1 ? 's' : ''}
          </div>
          <div className="divide-y divide-border">
            {markers.slice(0, 5).map((marker: any, index: number) => (
              <div key={marker?.id || index} className="px-3 py-2 text-sm flex items-center gap-2">
                <span className="text-red-500">📍</span>
                <span className="truncate max-w-32">
                  {String(marker[titleField as string] || marker.name || `Location ${index + 1}`)}
                </span>
              </div>
            ))}
            {markers.length > 5 && (
              <div className="px-3 py-2 text-xs text-gray-500">
                +{markers.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zoom controls placeholder */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button 
          type="button"
          onClick={() => console.log('Map zoom in - not yet implemented')}
          className="w-8 h-8 bg-white/90 backdrop-blur rounded shadow hover:bg-white flex items-center justify-center text-gray-600"
          title="Zoom in (not implemented)"
        >
          +
        </button>
        <button 
          type="button"
          onClick={() => console.log('Map zoom out - not yet implemented')}
          className="w-8 h-8 bg-white/90 backdrop-blur rounded shadow hover:bg-white flex items-center justify-center text-gray-600"
          title="Zoom out (not implemented)"
        >
          −
        </button>
      </div>
    </div>
  );
};

// Section Component - Layout container with optional title
const SectionComponent: React.FC<ComponentProps> = ({
  title,
  children,
  layout = 'stack',
  columns,
  gap = 4,
  padding = 4,
  background,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  
  const layoutStr = String(layout);
  const gapSize = Number(gap) * 4;
  const paddingSize = Number(padding) * 4;
  
  let layoutStyle: React.CSSProperties = {};
  
  switch (layoutStr) {
    case 'row':
      layoutStyle = { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' };
      break;
    case 'grid':
      const colCount = Number(columns) || 3;
      layoutStyle = { display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)` };
      break;
    case 'stack':
    default:
      layoutStyle = { display: 'flex', flexDirection: 'column' };
      break;
  }

  return (
    <section
      className="rounded-lg"
      style={{
        padding: `${paddingSize}px`,
        gap: `${gapSize}px`,
        backgroundColor: background ? String(background) : undefined,
        ...layoutStyle,
        ...(style as React.CSSProperties),
      }}
      {...restProps}
    >
      {title != null && String(title) && (
        <h2 className="text-xl font-semibold text-foreground mb-4">{String(title)}</h2>
      )}
      {children as React.ReactNode}
    </section>
  );
};

// Row Component - Horizontal flex container
const RowComponent: React.FC<ComponentProps> = ({
  children,
  gap = 4,
  align = 'center',
  justify = 'start',
  wrap = true,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  
  const gapSize = Number(gap) * 4;
  const alignMap: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };
  const justifyMap: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  return (
    <div
      className="flex"
      style={{
        flexDirection: 'row',
        gap: `${gapSize}px`,
        alignItems: alignMap[String(align)] || 'center',
        justifyContent: justifyMap[String(justify)] || 'flex-start',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...(style as React.CSSProperties),
      }}
      {...restProps}
    >
      {children as React.ReactNode}
    </div>
  );
};

// Grid Component - CSS Grid container
const GridComponent: React.FC<ComponentProps> = ({
  children,
  columns = 3,
  gap = 4,
  minChildWidth,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  
  const colCount = Number(columns) || 3;
  const gapSize = Number(gap) * 4;
  
  let gridTemplateColumns = `repeat(${colCount}, 1fr)`;
  if (minChildWidth) {
    gridTemplateColumns = `repeat(auto-fill, minmax(${String(minChildWidth)}, 1fr))`;
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns,
        gap: `${gapSize}px`,
        ...(style as React.CSSProperties),
      }}
      {...restProps}
    >
      {children as React.ReactNode}
    </div>
  );
};

// Divider Component - using shadcn wrapper
const DividerComponent = Divider as React.FC<ComponentProps>;

// Badge Component - using shadcn wrapper
const BadgeComponent = Badge as React.FC<ComponentProps>;

// ============================================================
// NEW SHADCN-BASED WRAPPER COMPONENTS
// ============================================================

// Icon map for converting string icon names to Lucide components
const STATS_ICON_MAP: Record<string, LucideIcon> = {
  // Common stats/KPI icons
  users: Users,
  user: Users,
  members: Users,
  people: Users,
  dollar: DollarSign,
  money: DollarSign,
  revenue: DollarSign,
  currency: DollarSign,
  payment: DollarSign,
  payments: DollarSign,
  chart: BarChart3,
  analytics: BarChart3,
  stats: BarChart3,
  graph: BarChart3,
  bar: BarChart3,
  calendar: CalendarIcon,
  schedule: CalendarIcon,
  date: CalendarIcon,
  trending: TrendingUp,
  growth: TrendingUp,
  increase: TrendingUp,
  up: TrendingUp,
  decline: TrendingDown,
  decrease: TrendingDown,
  down: TrendingDown,
  activity: Activity,
  pulse: Activity,
  cart: ShoppingCart,
  shopping: ShoppingCart,
  orders: ShoppingCart,
  package: Package,
  inventory: Package,
  products: Package,
  mail: Mail,
  email: Mail,
  messages: Mail,
  bell: Bell,
  notifications: Bell,
  alerts: Bell,
  heart: Heart,
  likes: Heart,
  favorites: Heart,
  star: Star,
  rating: Star,
  reviews: Star,
  clock: Clock,
  time: Clock,
  duration: Clock,
  check: CheckCircle,
  complete: CheckCircle,
  success: CheckCircle,
  done: CheckCircle,
  alert: AlertCircle,
  warning: AlertCircle,
  error: AlertCircle,
  file: FileText,
  document: FileText,
  documents: FileText,
  folder: Folder,
  files: Folder,
  settings: Settings,
  config: Settings,
  home: Home,
  dashboard: Home,
  // Emoji mappings
  '📊': BarChart3,
  '📈': TrendingUp,
  '📉': TrendingDown,
  '👤': Users,
  '👥': Users,
  '💰': DollarSign,
  '💵': DollarSign,
  '📅': CalendarIcon,
  '🛒': ShoppingCart,
  '📦': Package,
  '✉️': Mail,
  '🔔': Bell,
  '❤️': Heart,
  '⭐': Star,
  '⏰': Clock,
  '✅': CheckCircle,
  '⚠️': AlertCircle,
  '📄': FileText,
  '📁': Folder,
  '⚙️': Settings,
  '🏠': Home,
};

/**
 * Convert a string icon name to a rendered Lucide icon element
 */
function getStatsIcon(icon: unknown): React.ReactNode | undefined {
  if (!icon) return undefined;
  
  // If it's already a React element, return it as-is
  if (React.isValidElement(icon)) {
    return icon;
  }
  
  // If it's a string, look it up in the icon map
  if (typeof icon === 'string') {
    const iconKey = icon.toLowerCase().trim();
    const IconComponent = STATS_ICON_MAP[iconKey];
    if (IconComponent) {
      return <IconComponent className="size-4" />;
    }
    // If no match found but it's an emoji, return it as-is
    if (/\p{Emoji}/u.test(icon)) {
      return icon;
    }
    // No match found, return undefined (don't render raw string)
    return undefined;
  }
  
  return undefined;
}

// Stats Card Component - KPI display with data aggregation
const StatsCardComponent: React.FC<ComponentProps> = ({
  title,
  value,
  change,
  description,
  subDescription,
  icon,
  currency,
  currencySymbol,
  onClick,
  // Data aggregation props
  data,
  source,
  field,
  aggregation,
  format,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  // Convert string icon to Lucide component
  const resolvedIcon = getStatsIcon(icon);
  
  // Compute aggregated value from data if source and aggregation are provided
  let computedValue: string | number = value as string | number;
  
  if (data && source && aggregation) {
    const sourceData = (data as Record<string, unknown[]>)?.[String(source)];
    
    if (Array.isArray(sourceData) && sourceData.length > 0) {
      switch (aggregation) {
        case 'count':
          computedValue = sourceData.length;
          break;
        case 'sum':
          if (field) {
            computedValue = sourceData.reduce((sum: number, item: any) => {
              const val = parseFloat(item?.[field as string]) || 0;
              return sum + val;
            }, 0);
          }
          break;
        case 'avg':
        case 'average':
          if (field) {
            const total = sourceData.reduce((sum: number, item: any) => {
              const val = parseFloat(item?.[field as string]) || 0;
              return sum + val;
            }, 0);
            computedValue = sourceData.length > 0 ? total / sourceData.length : 0;
          }
          break;
        case 'min':
          if (field) {
            computedValue = Math.min(...sourceData.map((item: any) => parseFloat(item?.[field as string]) || 0));
          }
          break;
        case 'max':
          if (field) {
            computedValue = Math.max(...sourceData.map((item: any) => parseFloat(item?.[field as string]) || 0));
          }
          break;
        default:
          // Keep the static value
          break;
      }
    } else {
      // No data for this source - show 0 for count, or keep the original value
      if (aggregation === 'count') {
        computedValue = 0;
      }
    }
  }
  
  // Format the computed value
  const isCurrency = format === 'currency' || Boolean(currency);
  const symbol = currencySymbol as string || '$';
  
  let displayValue: string | number = computedValue;
  if (isCurrency && typeof computedValue === 'number') {
    displayValue = `${symbol}${computedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  return (
    <StatsCard
      title={String(title || 'Stat')}
      value={displayValue}
      change={change as number | undefined}
      description={description as string | undefined}
      subDescription={subDescription as string | undefined}
      icon={resolvedIcon}
      currency={false} // Already formatted above
      currencySymbol={currencySymbol as string | undefined}
      onClick={onClick as (() => void) | undefined}
      className={className as string | undefined}
    />
  );
};

// Stats Card Grid Component
const StatsCardGridComponent: React.FC<ComponentProps> = ({
  children,
  columns,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <StatsCardGrid
      columns={columns as 1 | 2 | 3 | 4 | undefined}
      className={className as string | undefined}
    >
      {children as React.ReactNode}
    </StatsCardGrid>
  );
};

// Activity Feed Component - shows recent changes across entities
// WHY: Activity feeds make dashboards feel "alive" by showing real-time updates
const ActivityFeedComponent: React.FC<ComponentProps> = ({
  data,
  source,
  sources,
  limit = 5,
  title = 'Recent Activity',
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  // Collect items from all sources
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  
  // Get source list - can be a single source or array of sources
  const sourceList = Array.isArray(sources) 
    ? sources.map(String)
    : source 
      ? [String(source)]
      : dataObj 
        ? Object.keys(dataObj).slice(0, 3)  // Default to first 3 entities
        : [];
  
  // Aggregate items from all sources with metadata
  interface ActivityItem {
    id: string;
    entityType: string;
    entityName: string;
    action: string;
    timestamp: Date;
    displayName: string;
    icon: string;
  }
  
  const activities: ActivityItem[] = [];
  
  for (const sourceKey of sourceList) {
    const items = dataObj?.[sourceKey];
    if (!Array.isArray(items)) continue;
    
    // Get entity display name (capitalize, singularize)
    const entityName = sourceKey.charAt(0).toUpperCase() + 
      sourceKey.slice(1).replace(/s$/, '');
    
    // Get icon based on entity type
    const icon = getActivityIcon(sourceKey);
    
    for (const item of items.slice(0, Number(limit))) {
      const record = item as Record<string, unknown>;
      const itemId = String(record.id || record._id || Math.random());
      const itemName = String(record.name || record.title || `${entityName} #${itemId.slice(-4)}`);
      
      // Try to get timestamp
      const createdAt = record.createdAt || record.created_at || record.timestamp;
      const timestamp = createdAt ? new Date(String(createdAt)) : new Date();
      
      activities.push({
        id: `${sourceKey}-${itemId}`,
        entityType: sourceKey,
        entityName,
        action: 'created',
        timestamp,
        displayName: itemName,
        icon,
      });
    }
  }
  
  // Sort by timestamp (newest first) and limit
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const displayedActivities = activities.slice(0, Number(limit));
  
  // Format time ago
  const timeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  if (displayedActivities.length === 0) {
    return (
      <div 
        className={`bg-card border rounded-lg p-4 ${className || ''}`}
        style={style as React.CSSProperties}
        {...restProps}
      >
        <h3 className="font-semibold text-lg mb-3">{String(title)}</h3>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }
  
  return (
    <div 
      className={`bg-card border rounded-lg p-4 ${className || ''}`}
      style={style as React.CSSProperties}
      {...restProps}
    >
      <h3 className="font-semibold text-lg mb-3">{String(title)}</h3>
      <div className="space-y-3">
        {displayedActivities.map((activity) => (
          <div 
            key={activity.id}
            className="flex items-center gap-3 text-sm"
          >
            <span className="text-lg flex-shrink-0">{activity.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium">{activity.displayName}</span>
              <span className="text-muted-foreground"> was {activity.action}</span>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {timeAgo(activity.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper to get activity icon based on entity type
function getActivityIcon(entityType: string): string {
  const typeLower = entityType.toLowerCase();
  
  if (['member', 'client', 'customer', 'patient', 'user', 'employee'].some(k => typeLower.includes(k))) {
    return '👤';
  }
  if (['invoice', 'payment', 'order'].some(k => typeLower.includes(k))) {
    return '💰';
  }
  if (['appointment', 'booking', 'reservation', 'job'].some(k => typeLower.includes(k))) {
    return '📅';
  }
  if (['product', 'item', 'inventory'].some(k => typeLower.includes(k))) {
    return '📦';
  }
  if (['task', 'project', 'ticket'].some(k => typeLower.includes(k))) {
    return '✅';
  }
  if (['message', 'note', 'comment'].some(k => typeLower.includes(k))) {
    return '💬';
  }
  
  return '📋';
}

// Area Chart Component
const AreaChartComponent: React.FC<ComponentProps> = ({
  title,
  description,
  data,
  source,
  xAxisKey,
  dataKeys,
  dataLabels,
  colors,
  showGrid,
  height,
  trendPercent,
  trendDescription,
  footerText,
  stacked,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  // Handle data from source if provided
  let chartData: { [key: string]: string | number }[] = [];
  if (Array.isArray(data)) {
    chartData = data.map(item => {
      const mapped: { [key: string]: string | number } = {};
      if (item && typeof item === 'object') {
        Object.entries(item).forEach(([k, v]) => {
          if (typeof v === 'string' || typeof v === 'number') {
            mapped[k] = v;
          }
        });
      }
      return mapped;
    });
  } else if (data && typeof data === 'object' && source) {
    const sourceData = (data as Record<string, unknown[]>)[String(source)];
    if (Array.isArray(sourceData)) {
      chartData = sourceData.map(item => {
        const mapped: { [key: string]: string | number } = {};
        if (item && typeof item === 'object') {
          Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
            if (typeof v === 'string' || typeof v === 'number') {
              mapped[k] = v;
            }
          });
        }
        return mapped;
      });
    }
  }
  
  // Default data keys if not provided
  const keys = Array.isArray(dataKeys) ? dataKeys.map(String) : ['value'];
  
  return (
    <AreaChartCard
      title={String(title || 'Chart')}
      description={description as string | undefined}
      data={chartData}
      xAxisKey={String(xAxisKey || 'name')}
      dataKeys={keys}
      dataLabels={dataLabels as Record<string, string> | undefined}
      colors={colors as Record<string, string> | undefined}
      showGrid={showGrid !== false}
      height={height as number | undefined}
      trendPercent={trendPercent as number | undefined}
      trendDescription={trendDescription as string | undefined}
      footerText={footerText as string | undefined}
      stacked={Boolean(stacked)}
      className={className as string | undefined}
    />
  );
};

// Data Table Component (using SimpleDataTable)
// ENHANCED: Supports format hints for dates, currency, phone, email, badges
const DataTableComponent: React.FC<ComponentProps> = ({
  data,
  source,
  columns,
  searchable,
  searchPlaceholder,
  paginated,
  pageSize,
  onRowClick,
  emptyMessage,
  compact,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  // Handle data from source
  let tableData: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    tableData = data;
  } else if (data && typeof data === 'object' && source) {
    const sourceData = (data as Record<string, unknown[]>)[String(source)];
    if (Array.isArray(sourceData)) {
      tableData = sourceData as Record<string, unknown>[];
    }
  }
  
  // Hidden fields to filter out
  const hiddenFields = new Set(['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', '_id']);
  
  // Cell renderer that formats values based on format hint
  const createCellRenderer = (format?: string, fieldName?: string) => {
    return (value: unknown, _row: Record<string, unknown>) => {
      if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground">-</span>;
      }
      
      const strValue = String(value);
      const fieldLower = (fieldName || '').toLowerCase();
      
      // Badge format for status fields - uses semantic color tokens
      if (format === 'badge' || fieldLower === 'status' || fieldLower === 'state') {
        const statusLower = strValue.toLowerCase().replace(/[_-]/g, '');
        let badgeClass = 'bg-muted text-muted-foreground';
        
        if (['active', 'completed', 'paid', 'approved', 'done', 'confirmed', 'delivered'].some(s => statusLower.includes(s))) {
          badgeClass = 'bg-[hsl(var(--success-bg,142_76%_95%))] text-[hsl(var(--success,142_71%_45%))] dark:bg-[hsl(var(--success)/0.2)] dark:text-[hsl(var(--success))]';
        } else if (['pending', 'waiting', 'processing', 'scheduled', 'new', 'draft', 'booked'].some(s => statusLower.includes(s))) {
          badgeClass = 'bg-[hsl(var(--warning-bg,45_93%_95%))] text-[hsl(var(--warning,45_93%_47%))] dark:bg-[hsl(var(--warning)/0.2)] dark:text-[hsl(var(--warning))]';
        } else if (['cancelled', 'rejected', 'failed', 'expired', 'inactive', 'overdue'].some(s => statusLower.includes(s))) {
          badgeClass = 'bg-[hsl(var(--error-bg,0_84%_95%))] text-[hsl(var(--error,0_84%_60%))] dark:bg-[hsl(var(--destructive)/0.2)] dark:text-[hsl(var(--destructive))]';
        } else if (['trial', 'frozen', 'reserved', 'sent'].some(s => statusLower.includes(s))) {
          badgeClass = 'bg-[hsl(var(--info-bg,201_96%_95%))] text-[hsl(var(--info,201_96%_32%))] dark:bg-[hsl(var(--info)/0.2)] dark:text-[hsl(var(--info))]';
        }
        
        const displayValue = strValue.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{displayValue}</span>;
      }
      
      // Date format
      if (format === 'date' || fieldLower.includes('date') || fieldLower.endsWith('at')) {
        try {
          const date = new Date(strValue);
          if (!isNaN(date.getTime())) {
            const hasTime = strValue.includes('T') || fieldLower.includes('time');
            if (hasTime) {
              return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch { /* fall through */ }
      }
      
      // Currency format
      if (format === 'currency' || ['amount', 'price', 'cost', 'total', 'rent', 'fee'].some(k => fieldLower.includes(k))) {
        const num = parseFloat(strValue);
        if (!isNaN(num)) {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }).format(num);
        }
      }
      
      // Phone format
      if (format === 'phone' || fieldLower.includes('phone')) {
        const digits = strValue.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        }
      }
      
      // Email format - make it a link
      if (format === 'email' || fieldLower.includes('email')) {
        return (
          <a 
            href={`mailto:${strValue}`} 
            className="text-primary hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {strValue}
          </a>
        );
      }
      
      // Boolean format
      if (typeof value === 'boolean') {
        return value ? 
          <span className="text-green-600">✓ Yes</span> : 
          <span className="text-muted-foreground">No</span>;
      }
      
      // Default - truncate long values
      return strValue.length > 40 ? strValue.substring(0, 37) + '...' : strValue;
    };
  };
  
  // Build columns from props or auto-generate
  let tableColumns: ColumnDef<Record<string, unknown>>[] = [];
  if (Array.isArray(columns) && columns.length > 0) {
    tableColumns = columns
      .filter((col: any) => !hiddenFields.has(String(col.id || col.field || col.key)))
      .map((col: any) => {
        const fieldName = String(col.field || col.key || col.accessor || col.id);
        return {
          id: String(col.id || fieldName),
          header: String(col.header || col.label || col.name || fieldName)
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .trim()
            .replace(/^\w/, c => c.toUpperCase()),
          accessor: fieldName as keyof Record<string, unknown>,
          sortable: col.sortable !== false,
          align: col.align,
          width: col.width,
          cell: createCellRenderer(col.format, fieldName),
        };
      });
  } else if (tableData.length > 0) {
    // Auto-generate columns from first data item - exclude hidden fields
    tableColumns = Object.keys(tableData[0])
      .filter(key => !hiddenFields.has(key) && !key.startsWith('_'))
      .slice(0, 6) // Limit to 6 columns
      .map(key => ({
        id: key,
        header: key
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .trim()
          .replace(/^\w/, c => c.toUpperCase()),
        accessor: key as keyof Record<string, unknown>,
        sortable: true,
        cell: createCellRenderer(undefined, key),
      }));
  }
  
  // Row click handler that dispatches card action event
  const handleRowClick = (row: Record<string, unknown>) => {
    if (onRowClick && typeof onRowClick === 'function') {
      (onRowClick as (row: Record<string, unknown>) => void)(row);
    } else {
      // Default behavior: dispatch view action
      const event = new CustomEvent('neo-card-action', {
        detail: {
          action: 'View',
          itemId: row.id,
          entityId: source || 'item',
          source: 'table',
        },
        bubbles: true,
      });
      window.dispatchEvent(event);
    }
  };
  
  return (
    <SimpleDataTable
      data={tableData}
      columns={tableColumns}
      getRowKey={(row, index) => (row.id as string | number) || index}
      searchable={searchable !== false}
      searchPlaceholder={searchPlaceholder as string | undefined}
      paginated={paginated !== false}
      defaultPageSize={pageSize as number | undefined}
      onRowClick={handleRowClick}
      emptyMessage={emptyMessage as string | undefined}
      compact={Boolean(compact)}
      className={className as string | undefined}
    />
  );
};

// Login Form Component
const LoginFormComponent: React.FC<ComponentProps> = ({
  onSubmit,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <LoginForm className={className as string | undefined} />
  );
};

// Schedule Calendar Component - Full calendar with month/week/day views
// WHY: The basic CalendarComponent only shows a grouped list. This is a proper
// scheduling calendar needed for production tasks, delivery scheduling, catering, etc.
const ScheduleCalendarComponent: React.FC<ComponentProps> = ({
  data,
  source,
  dateField = 'date',
  titleField = 'title',
  timeField = 'time',
  endTimeField = 'endTime',
  typeField = 'type',
  statusField = 'status',
  customerField = 'customer',
  locationField = 'location',
  colorField = 'color',
  primaryColor,
  onEventClick,
  onAddEvent,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  // Extract events from data source
  const dataObj = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown[]>)
    : undefined;
  const sourceStr = String(source || '').trim();
  
  let items: unknown[] = [];
  if (dataObj && sourceStr) {
    const sourceData = dataObj[sourceStr];
    items = Array.isArray(sourceData) ? sourceData : [];
  }
  
  // If no source specified, try common event-related entity names
  if (items.length === 0 && dataObj) {
    const eventKeys = ['events', 'appointments', 'schedules', 'tasks', 'deliveries', 'bookings', 'orders', 'productions'];
    for (const key of eventKeys) {
      if (dataObj[key] && Array.isArray(dataObj[key])) {
        items = dataObj[key] as unknown[];
        break;
      }
    }
  }
  
  // Transform items to CalendarEvent format
  const events = items.map((item: any, index: number) => ({
    id: String(item.id || index),
    title: String(item[titleField as string] || item.name || item.title || 'Event'),
    date: item[dateField as string] 
      ? (typeof item[dateField as string] === 'string' 
          ? item[dateField as string].split('T')[0] 
          : new Date(item[dateField as string]).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0],
    time: item[timeField as string] || undefined,
    endTime: item[endTimeField as string] || undefined,
    type: item[typeField as string] || undefined,
    status: item[statusField as string] || undefined,
    customer: item[customerField as string] || item.customerName || undefined,
    location: item[locationField as string] || item.address || undefined,
    color: item[colorField as string] || getEventColor(item[typeField as string] || item[statusField as string]),
  }));
  
  // Handle event click - dispatch card action
  const handleEventClick = (event: any) => {
    if (onEventClick && typeof onEventClick === 'function') {
      (onEventClick as (e: any) => void)(event);
    } else {
      // Default: dispatch card action for viewing
      const cardEvent = new CustomEvent('neo-card-action', {
        detail: {
          action: 'View',
          itemId: event.id,
          entityId: sourceStr || 'event',
          source: 'calendar',
        },
        bubbles: true,
      });
      window.dispatchEvent(cardEvent);
    }
  };
  
  // Handle add event
  const handleAddEvent = (date: Date) => {
    if (onAddEvent && typeof onAddEvent === 'function') {
      (onAddEvent as (d: Date) => void)(date);
    } else {
      // Default: dispatch add action
      const addEvent = new CustomEvent('neo-card-action', {
        detail: {
          action: 'Add',
          entityId: sourceStr || 'event',
          source: 'calendar',
          params: { date: date.toISOString() },
        },
        bubbles: true,
      });
      window.dispatchEvent(addEvent);
    }
  };
  
  return (
    <ScheduleCalendar
      events={events}
      onEventClick={handleEventClick}
      onAddEvent={handleAddEvent}
      primaryColor={primaryColor as string | undefined}
    />
  );
};

// Helper to get event color based on type or status
function getEventColor(typeOrStatus?: string): string {
  if (!typeOrStatus) return '#6366f1'; // default indigo
  
  const value = String(typeOrStatus).toLowerCase();
  
  // Status-based colors
  if (['completed', 'done', 'delivered', 'paid'].some(s => value.includes(s))) return '#10b981'; // green
  if (['pending', 'new', 'waiting'].some(s => value.includes(s))) return '#f59e0b'; // amber
  if (['in_progress', 'processing', 'production'].some(s => value.includes(s))) return '#3b82f6'; // blue
  if (['cancelled', 'failed', 'rejected'].some(s => value.includes(s))) return '#ef4444'; // red
  if (['scheduled', 'confirmed', 'booked'].some(s => value.includes(s))) return '#8b5cf6'; // purple
  
  // Type-based colors
  if (['delivery', 'shipping'].some(s => value.includes(s))) return '#06b6d4'; // cyan
  if (['catering', 'event'].some(s => value.includes(s))) return '#ec4899'; // pink
  if (['meeting', 'call'].some(s => value.includes(s))) return '#3b82f6'; // blue
  if (['production', 'prep', 'baking'].some(s => value.includes(s))) return '#f97316'; // orange
  if (['pickup', 'takeout'].some(s => value.includes(s))) return '#84cc16'; // lime
  
  return '#6366f1'; // default indigo
}

// Progress Bar Component
const ProgressBarComponent: React.FC<ComponentProps> = ({
  value,
  max = 100,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  const percentage = ((Number(value) || 0) / Number(max)) * 100;
  
  return (
    <Progress 
      value={percentage} 
      className={className as string | undefined}
    />
  );
};

// Slider Component
const SliderComponent: React.FC<ComponentProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <Slider
      defaultValue={[Number(value) || 0]}
      min={Number(min)}
      max={Number(max)}
      step={Number(step)}
      onValueChange={(vals: number[]) => onChange && (onChange as (v: number) => void)(vals[0])}
      className={className as string | undefined}
    />
  );
};

// Accordion Component
const AccordionComponent: React.FC<ComponentProps> = ({
  items,
  type = 'single',
  collapsible = true,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  const accordionItems = Array.isArray(items) ? items : [];
  
  return (
    <Accordion 
      type={type === 'multiple' ? 'multiple' : 'single'} 
      collapsible={type !== 'multiple' ? Boolean(collapsible) : undefined}
      className={className as string | undefined}
    >
      {accordionItems.map((item: any, index: number) => (
        <AccordionItem key={item.id || index} value={String(item.id || index)}>
          <AccordionTrigger>{String(item.title || item.header || `Item ${index + 1}`)}</AccordionTrigger>
          <AccordionContent>{String(item.content || item.body || '')}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

// Tabs Component
const TabsComponent: React.FC<ComponentProps> = ({
  tabs,
  defaultValue,
  children,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  const tabItems = Array.isArray(tabs) ? tabs : [];
  
  return (
    <Tabs 
      defaultValue={String(defaultValue || tabItems[0]?.id || '0')}
      className={className as string | undefined}
    >
      <TabsList>
        {tabItems.map((tab: any, index: number) => (
          <TabsTrigger key={tab.id || index} value={String(tab.id || index)}>
            {String(tab.label || tab.title || `Tab ${index + 1}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabItems.map((tab: any, index: number) => (
        <TabsContent key={tab.id || index} value={String(tab.id || index)}>
          {tab.content as React.ReactNode}
        </TabsContent>
      ))}
    </Tabs>
  );
};

// Layout wrapper components
const SingleColumnLayout: React.FC<ComponentProps> = ({
  children,
  maxWidth,
  padding,
  centered,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <SingleColumn
      maxWidth={maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | undefined}
      padding={padding as 'none' | 'sm' | 'md' | 'lg' | undefined}
      centered={centered !== false}
      className={className as string | undefined}
    >
      {children as React.ReactNode}
    </SingleColumn>
  );
};

const TwoColumnLayout: React.FC<ComponentProps> = ({
  left,
  right,
  ratio,
  gap,
  padding,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <TwoColumn
      left={left as React.ReactNode}
      right={right as React.ReactNode}
      ratio={ratio as '1:1' | '1:2' | '2:1' | '1:3' | '3:1' | undefined}
      gap={gap as 'none' | 'sm' | 'md' | 'lg' | undefined}
      padding={padding as 'none' | 'sm' | 'md' | 'lg' | undefined}
      className={className as string | undefined}
    />
  );
};

const DashboardGridLayout: React.FC<ComponentProps> = ({
  children,
  columns,
  gap,
  padding,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <DashboardGrid
      columns={columns as 1 | 2 | 3 | 4 | 6 | undefined}
      gap={gap as 'none' | 'sm' | 'md' | 'lg' | undefined}
      padding={padding as 'none' | 'sm' | 'md' | 'lg' | undefined}
      className={className as string | undefined}
    >
      {children as React.ReactNode}
    </DashboardGrid>
  );
};

const TopNavLayoutComponent: React.FC<ComponentProps> = ({
  children,
  nav,
  secondaryNav,
  navHeight,
  maxWidth,
  padding,
  navStyle,
  sticky,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <TopNavLayout
      nav={nav as React.ReactNode}
      secondaryNav={secondaryNav as React.ReactNode}
      navHeight={navHeight as 'sm' | 'md' | 'lg' | undefined}
      maxWidth={maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | undefined}
      padding={padding as 'none' | 'sm' | 'md' | 'lg' | undefined}
      navStyle={navStyle as 'solid' | 'transparent' | 'blur' | undefined}
      sticky={sticky !== false}
      className={className as string | undefined}
    >
      {children as React.ReactNode}
    </TopNavLayout>
  );
};

const MasterDetailLayoutComponent: React.FC<ComponentProps> = ({
  master,
  detail,
  hasSelection,
  onBack,
  masterWidth,
  gap,
  padding,
  showDivider,
  emptyDetail,
  masterHeader,
  detailHeader,
  ...otherProps
}) => {
  const { id, style, className, ...restProps } = otherProps;
  
  return (
    <MasterDetailLayout
      master={master as React.ReactNode}
      detail={detail as React.ReactNode}
      hasSelection={Boolean(hasSelection)}
      onBack={onBack as (() => void) | undefined}
      masterWidth={masterWidth as 'narrow' | 'medium' | 'wide' | undefined}
      gap={gap as 'none' | 'sm' | 'md' | 'lg' | undefined}
      padding={padding as 'none' | 'sm' | 'md' | 'lg' | undefined}
      showDivider={showDivider !== false}
      emptyDetail={emptyDetail as React.ReactNode}
      masterHeader={masterHeader as React.ReactNode}
      detailHeader={detailHeader as React.ReactNode}
      className={className as string | undefined}
    />
  );
};

// Component Registry Map
export const COMPONENT_REGISTRY: Record<string, React.FC<ComponentProps>> = {
  // Basic components
  text: TextComponent,
  button: ButtonComponent,
  input: InputComponent,
  textarea: Textarea as React.FC<ComponentProps>,
  select: Select as React.FC<ComponentProps>,
  checkbox: Checkbox as React.FC<ComponentProps>,
  switch: Switch as React.FC<ComponentProps>,
  
  // Data display components
  list: ListComponent,
  table: TableComponent,
  card: CardComponent,
  personCard: PersonCardComponent,
  itemCard: ItemCardComponent,
  calendar: CalendarComponent,
  scheduleCalendar: ScheduleCalendarComponent,  // Full calendar with month/week/day views
  fullCalendar: ScheduleCalendarComponent,      // Alias
  eventCalendar: ScheduleCalendarComponent,     // Alias
  kanban: KanbanComponent,
  gallery: GalleryComponent,
  chart: ChartComponent,
  
  // Interactive components
  form: FormComponent,
  chat: ChatComponent,
  map: MapComponent,
  
  // Layout components
  container: ContainerComponent,
  section: SectionComponent,
  row: RowComponent,
  grid: GridComponent,
  dashboard: DashboardComponent,
  divider: DividerComponent,
  
  // Navigation & overlay
  navigation: NavigationComponent,
  modal: ModalComponent,
  
  // Media components
  image: ImageComponent,
  video: VideoComponent,
  
  // UI elements
  badge: BadgeComponent,
  
  // ============================================================
  // NEW SHADCN-BASED COMPONENTS
  // ============================================================
  
  // Stats & KPIs
  statsCard: StatsCardComponent,
  statsCardGrid: StatsCardGridComponent,
  kpiCard: StatsCardComponent, // alias
  
  // Charts
  areaChart: AreaChartComponent,
  lineChart: AreaChartComponent, // alias (area chart can be used as line)
  
  // Enhanced Data Display
  dataTable: DataTableComponent,
  advancedTable: DataTableComponent, // alias
  
  // Activity Feed
  activityFeed: ActivityFeedComponent,
  recentActivity: ActivityFeedComponent, // alias
  
  // Auth
  loginForm: LoginFormComponent,
  
  // UI Primitives
  progress: ProgressBarComponent,
  progressBar: ProgressBarComponent, // alias
  slider: SliderComponent,
  accordion: AccordionComponent,
  tabs: TabsComponent,
  
  // Layout wrappers
  singleColumn: SingleColumnLayout,
  twoColumn: TwoColumnLayout,
  dashboardGrid: DashboardGridLayout,
  topNav: TopNavLayoutComponent,
  topNavLayout: TopNavLayoutComponent, // alias
  masterDetail: MasterDetailLayoutComponent,
  masterDetailLayout: MasterDetailLayoutComponent, // alias
  listDetail: MasterDetailLayoutComponent, // alias
};

export function getComponent(componentId: string): React.FC<ComponentProps> {
  const component = COMPONENT_REGISTRY[componentId];
  if (!component) {
    console.warn(`⚠️ Component '${componentId}' not found in registry. Available: ${Object.keys(COMPONENT_REGISTRY).join(', ')}. Using container.`);
    return ContainerComponent;
  }
  return component;
}
