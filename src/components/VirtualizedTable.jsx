// components/VirtualizedTable.jsx
// Virtual scrolling table for large datasets using react-window
import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * VirtualizedTable - A performant table for large datasets
 * Uses react-window for windowing (only renders visible rows)
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data items
 * @param {Array} props.columns - Column definitions [{key, header, width?, render?}]
 * @param {number} props.rowHeight - Height of each row in pixels (default: 56)
 * @param {number} props.height - Total height of the table (default: 600)
 * @param {Function} props.onRowClick - Optional row click handler
 * @param {Function} props.getRowClassName - Optional function to get row class
 */
const VirtualizedTable = memo(({
  data = [],
  columns = [],
  rowHeight = 56,
  height = 600,
  onRowClick,
  getRowClassName,
}) => {
  // Memoized row renderer
  const Row = useCallback(({ index, style }) => {
    const item = data[index];
    if (!item) return null;
    
    const rowClass = getRowClassName ? getRowClassName(item, index) : '';
    
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          cursor: onRowClick ? 'pointer' : 'default',
          background: index % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
          transition: 'background 0.15s',
        }}
        className={`virtual-row ${rowClass}`}
        onClick={() => onRowClick?.(item)}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'var(--bg-hover)'}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              flex: col.width ? `0 0 ${col.width}` : 1,
              padding: '0 16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.render ? col.render(item[col.key], item, index) : item[col.key]}
          </div>
        ))}
      </div>
    );
  }, [data, columns, onRowClick, getRowClassName]);

  return (
    <div className="virtualized-table">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '2px solid var(--border-color)',
          background: 'var(--bg-card)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          fontWeight: 600,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          height: 48,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              flex: col.width ? `0 0 ${col.width}` : 1,
              padding: '0 16px',
            }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual List */}
      {data.length > 0 ? (
        <List
          height={height}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
        >
          {Row}
        </List>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 200,
            color: 'var(--text-muted)',
          }}
        >
          No data available
        </div>
      )}

      {/* Styles */}
      <style>{`
        .virtualized-table {
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-card);
        }
        .virtual-row:hover {
          background: var(--bg-hover) !important;
        }
      `}</style>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
