/**
 * Component Registry - FIXED VERSION
 * Maps componentId strings from schema to actual React components
 * Now handles both props.text and children
 */
import React from 'react';

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

// Button Component
const ButtonComponent: React.FC<ComponentProps> = ({
  label,
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  ...otherProps
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStr = String(variant || 'primary');
  const variantClasses = variantStr === 'primary'
    ? 'bg-purple-600 text-white hover:bg-purple-700'
    : 'bg-gray-200 text-gray-800 hover:bg-gray-300';

  const { id, style, ...restProps } = otherProps;
  
  // Use children if label not provided
  const buttonText = label || children || 'Button';

  return (
    <button
      className={`${baseClasses} ${variantClasses}`}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      disabled={Boolean(disabled)}
      style={style as React.CSSProperties}
      {...restProps}
    >
      {String(buttonText)}
    </button>
  );
};

// Input Component
const InputComponent: React.FC<ComponentProps> = ({
  label,
  placeholder,
  value,
  onChange,
  required = false,
  type = 'text',
  name,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  
  // Use name prop if provided, otherwise fall back to id or generate from label
  const inputName = String(name || id || (label ? String(label).toLowerCase().replace(/\s+/g, '_') : ''));
  
  console.log('🔤 InputComponent render:', { id, name, inputName, label });

  return (
    <div className="mb-4">
      {label != null && String(label) && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {String(label)} {Boolean(required) && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        name={inputName}
        type={String(type || 'text') as React.HTMLInputTypeAttribute}
        defaultValue={value != null ? String(value) : undefined}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        placeholder={String(placeholder || '')}
        required={Boolean(required)}
        className="w-full px-4 py-2 border border-solid border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"   
        style={style as React.CSSProperties}
        {...restProps}
      />
    </div>
  );
};

// List Component - ENHANCED
const ListComponent: React.FC<ComponentProps> = ({
  source,
  data,
  renderItem,
  children,
  ...otherProps
}) => {
  console.log('📋 ListComponent received:', {
    source,
    data,
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

  // FIX: If no source specified, look for 'item' or 'items' key
  if (items.length === 0 && dataObj) {
    const possibleKeys = ['item', 'items', 'data', Object.keys(dataObj)[0]];
    for (const key of possibleKeys) {
      if (key && Array.isArray(dataObj[key])) {
        items = dataObj[key] as unknown[];
        console.log(`📋 Auto-detected data source: "${key}"`);
        break;
      }
    }
  }

  console.log('📋 ListComponent items:', {
    sourceStr,
    itemsCount: items.length,
    items: items.slice(0, 3),
  });

  const { id, style, ...restProps } = otherProps;

  if (items.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic py-4 bg-yellow-50 border border-solid border-yellow-200 rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No items to display
        {sourceStr && <div className="text-xs mt-1">Looking for data source: "{sourceStr}"</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3" style={style as React.CSSProperties} {...restProps}>
      {items.map((item: any, index: number) => (
        <div key={item?.id || index} className="p-4 bg-white border border-solid border-gray-200 rounded-lg hover:shadow-md transition-shadow">
          {renderItem && typeof renderItem === 'function' ? (
            renderItem(item) as React.ReactNode
          ) : (
            <div className="space-y-1">
              {/* Display all fields of the item */}
              {Object.entries(item || {}).map(([key, value]) => {
                // Skip rendering functions or complex objects
                if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
                  return null;
                }
                
                // Style the key-value pairs
                const isId = key.toLowerCase().includes('id');
                const isDate = key.toLowerCase().includes('date') || key.toLowerCase().includes('at');
                const isName = key.toLowerCase().includes('name') || key.toLowerCase().includes('title');
                
                return (
                  <div key={key} className="flex">
                    <span className={`font-medium mr-2 text-gray-600 ${isId ? 'text-xs' : ''}`}>
                      {key}:
                    </span>
                    <span className={`${isName ? 'font-semibold text-gray-900' : 'text-gray-700'} ${isDate ? 'text-xs text-gray-500' : ''}`}>
                      {isDate && value ? new Date(String(value)).toLocaleDateString() : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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
      <div className="text-gray-500 text-sm italic py-4 bg-yellow-50 border border-solid border-yellow-200 rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No appointments to display
      </div>
    );
  }

  return (
    <div className="space-y-4" style={style as React.CSSProperties} {...restProps}>
      {[...grouped.entries()].map(([date, groupItems]) => (
        <div key={date} className="bg-white border border-solid border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">{date}</h3>
          <div className="space-y-2">
            {groupItems.map((item, index) => (
              <div key={String(item.id || index)} className="flex items-center justify-between text-sm text-gray-800">
                <span className="font-medium">{String(item[titleField as string] || 'Appointment')}</span>
                <span className="text-gray-500">{String(item.location || item.address || '')}</span>
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
      <div className="text-gray-500 text-sm italic py-4 bg-yellow-50 border border-solid border-yellow-200 rounded p-4" style={style as React.CSSProperties} {...restProps}>
        No items to display
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={style as React.CSSProperties} {...restProps}>
      {[...columnMap.entries()].map(([columnId, columnItems]) => {
        const columnMeta = columnDefs.find((col: any) => String(col.id || col.value) === columnId);
        return (
          <div key={columnId} className="bg-white border border-solid border-gray-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {String(columnMeta?.title || columnMeta?.label || columnId || 'Column')}
            </div>
            <div className="space-y-2">
              {columnItems.map((item, index) => (
                <div key={String(item.id || index)} className="border border-solid border-gray-200 rounded-md p-2 text-sm">
                  <div className="font-semibold text-gray-900">
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

// Card Component
const CardComponent: React.FC<ComponentProps> = ({
  title,
  value,
  children,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;

  return (
    <div className="bg-white border border-solid border-gray-200 rounded-lg p-6 shadow-sm" style={style as React.CSSProperties} {...restProps}>   
      {title != null && String(title) && <h3 className="text-lg font-semibold mb-2">{String(title)}</h3>}
      {value !== undefined && <div className="text-2xl font-bold">{String(value)}</div>}
      {children as React.ReactNode}
    </div>
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
        className="w-full bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
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
      <div className="text-gray-500 text-sm italic py-4" style={style as React.CSSProperties} {...restProps}>
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" style={style as React.CSSProperties} {...restProps}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {cols.length > 0 ? (
              cols.map((col: any, idx: number) => (
                <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {String(col.label || col.name || col)}
                </th>
              ))
            ) : (
              Object.keys(items[0] || {}).map((key) => (
                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {key}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item: any, idx: number) => (
            <tr key={item?.id || idx} className="hover:bg-gray-50">
              {cols.length > 0 ? (
                cols.map((col: any, colIdx: number) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {String(item[col.field || col.key || col] || '')}
                  </td>
                ))
              ) : (
                Object.values(item || {}).map((value: any, valIdx: number) => (
                  <td key={valIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
    <div className="bg-white border border-solid border-gray-200 rounded-lg p-6 shadow-sm" style={style as React.CSSProperties} {...restProps}>   
      {title != null && String(title) && <h3 className="text-lg font-semibold mb-4">{String(title)}</h3>}
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium">Chart: {String(type || 'bar')}</div>
          <div className="text-xs mt-1">Chart visualization (placeholder)</div>
          {dataKeys.length > 0 && (
            <div className="text-xs mt-2 text-gray-400">
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
            className="px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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

const ModalComponent: React.FC<ComponentProps> = ({
  isOpen = false,
  onClose,
  title,
  children,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const open = Boolean(isOpen);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose && typeof onClose === 'function') {
      onClose(e);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      style={{ zIndex: 1000 }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={style as React.CSSProperties}
        {...restProps}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && String(title) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">{String(title)}</h2>
            {typeof onClose === 'function' ? (
              <button
                onClick={onClose as React.MouseEventHandler<HTMLButtonElement>}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <div className="p-6">
          {children as React.ReactNode}
        </div>
      </div>
    </div>
  );
};

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
      <div className="bg-gray-100 border border-solid border-gray-200 rounded-lg flex items-center justify-center" style={fallbackStyle} {...restProps}>
        <span className="text-gray-400 text-sm">No image source</span>
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
      <div className="bg-gray-100 border border-solid border-gray-200 rounded-lg flex items-center justify-center" style={fallbackStyle} {...restProps}>
        <span className="text-gray-400 text-sm">No video source</span>
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
      <div className="text-gray-500 text-sm italic py-4 bg-yellow-50 border border-solid border-yellow-200 rounded p-4" style={style as React.CSSProperties} {...restProps}>
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
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
              onClick={() => setSelectedIndex(index)}
            >
              {imgSrc ? (
                <img 
                  src={String(imgSrc)} 
                  alt={String(imgTitle)} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
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
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setSelectedIndex(null)}
          >
            ×
          </button>
          <button 
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
      className="flex flex-col h-96 bg-white border border-solid border-gray-200 rounded-lg overflow-hidden"
      style={style as React.CSSProperties}
      {...restProps}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center text-sm py-8">No messages yet</div>
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
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isCurrentUser && (
                    <div className="text-xs font-medium mb-1 opacity-70">{String(sender)}</div>
                  )}
                  <div className="text-sm">{String(message)}</div>
                  {timestamp && (
                    <div className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-gray-400'}`}>
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
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={String(placeholder)}
          className="flex-1 px-4 py-2 border border-solid border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      className="bg-gradient-to-br from-blue-50 to-green-50 border border-solid border-gray-200 rounded-lg overflow-hidden relative"
      style={{ height: mapHeight, ...(style as React.CSSProperties) }}
      {...restProps}
    >
      {/* Map placeholder background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 shadow-lg">
            <div className="text-sm font-medium text-gray-700">Map View</div>
            <div className="text-xs text-gray-500">
              Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
            </div>
            <div className="text-xs text-gray-500">Zoom: {String(zoom)}</div>
          </div>
        </div>
      </div>

      {/* Markers list */}
      {markers.length > 0 && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
            {markers.length} Location{markers.length !== 1 ? 's' : ''}
          </div>
          <div className="divide-y divide-gray-100">
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
        <button className="w-8 h-8 bg-white/90 backdrop-blur rounded shadow hover:bg-white flex items-center justify-center text-gray-600">
          +
        </button>
        <button className="w-8 h-8 bg-white/90 backdrop-blur rounded shadow hover:bg-white flex items-center justify-center text-gray-600">
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{String(title)}</h2>
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

// Divider Component
const DividerComponent: React.FC<ComponentProps> = ({
  orientation = 'horizontal',
  color,
  thickness = 1,
  spacing = 4,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  const isVertical = String(orientation) === 'vertical';
  const spacingSize = Number(spacing) * 4;
  const thicknessSize = Number(thickness);

  return (
    <div
      className={isVertical ? 'self-stretch' : 'w-full'}
      style={{
        [isVertical ? 'width' : 'height']: `${thicknessSize}px`,
        [isVertical ? 'marginLeft' : 'marginTop']: `${spacingSize}px`,
        [isVertical ? 'marginRight' : 'marginBottom']: `${spacingSize}px`,
        backgroundColor: color ? String(color) : '#e2e8f0',
        ...(style as React.CSSProperties),
      }}
      {...restProps}
    />
  );
};

// Badge Component
const BadgeComponent: React.FC<ComponentProps> = ({
  text,
  children,
  variant = 'default',
  color,
  ...otherProps
}) => {
  const { id, style, ...restProps } = otherProps;
  
  const variantStr = String(variant);
  const variantClasses: Record<string, string> = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const content = text ?? children;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variantStr] || variantClasses.default}`}
      style={{
        backgroundColor: color ? String(color) : undefined,
        ...(style as React.CSSProperties),
      }}
      {...restProps}
    >
      {content ? String(content) : ''}
    </span>
  );
};

// Component Registry Map
export const COMPONENT_REGISTRY: Record<string, React.FC<ComponentProps>> = {
  // Basic components
  text: TextComponent,
  button: ButtonComponent,
  input: InputComponent,
  
  // Data display components
  list: ListComponent,
  table: TableComponent,
  card: CardComponent,
  calendar: CalendarComponent,
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
};

export function getComponent(componentId: string): React.FC<ComponentProps> {
  const component = COMPONENT_REGISTRY[componentId];
  if (!component) {
    console.warn(`⚠️ Component '${componentId}' not found in registry. Available: ${Object.keys(COMPONENT_REGISTRY).join(', ')}. Using container.`);
    return ContainerComponent;
  }
  return component;
}
