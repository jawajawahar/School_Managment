import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  badge?: string;
  group?: string;
}

export interface CustomSelectProps {
  options?: SelectOption[];
  children?: React.ReactNode;
  value?: string | number;
  onChange?: (value: any) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options: optionsProp,
  children,
  value = '',
  onChange,
  icon,
  disabled = false,
  className = '',
  placeholder = 'Select option',
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Extract options from props or children
  const extractText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node) && (node.props as any)?.children) {
      return extractText((node.props as any).children);
    }
    return String(node);
  };

  let options: SelectOption[] = [];
  if (optionsProp && optionsProp.length > 0) {
    options = optionsProp;
  } else if (children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const props = (child as any).props || {};
        if (child.type === 'option' || props.value !== undefined) {
          const val = props.value ?? props.children ?? '';
          const lbl = extractText(props.children) || String(val);
          options.push({ value: val, label: lbl });
        }
      }
    });
  }

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Recalculate fixed screen position for portal popover
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Estimate total menu height needed (around 240px)
    const estimatedHeight = 240;
    const dropUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const width = Math.max(rect.width, 180);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);

    if (dropUp) {
      const maxHeight = Math.min(260, Math.max(120, spaceAbove - 16));
      setDropdownStyle({
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + 6}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 999999,
      });
    } else {
      const maxHeight = Math.min(260, Math.max(120, spaceBelow - 16));
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 999999,
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handleSelectOption = (optValue: string | number) => {
    if (!onChange) return;
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div className={cn('relative inline-block w-full', className)} title={title}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) updatePosition();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2.5 bg-surface border border-border rounded-xl px-3.5 py-2.5 font-semibold text-xs sm:text-sm text-ink shadow-xs transition-all',
          disabled
            ? 'opacity-60 cursor-not-allowed bg-surface-muted'
            : 'hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer',
          isOpen && 'border-brand ring-2 ring-brand/15'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {icon}
          <span className="truncate block flex-1">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-ink-faint shrink-0 transition-transform duration-200 ml-1', isOpen && 'rotate-180 text-brand')}
        />
      </button>

      {/* Popover Menu via Portal */}
      {isOpen && !disabled && createPortal(
        <div
          ref={popoverRef}
          style={dropdownStyle}
          className="bg-surface border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fade-in flex flex-col overflow-hidden"
        >
          {/* Search Filter for long lists */}
          {options.length > 5 && (
            <div className="p-1 border-b border-border mb-1 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full bg-surface-muted border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto space-y-0.5 flex-1 min-h-0">
            {filteredOptions.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-ink-faint italic">No matching options</div>
            ) : (() => {
              const renderOptionItem = (option: SelectOption) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectOption(option.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-sans transition-all cursor-pointer',
                      isSelected
                        ? 'bg-brand text-white font-semibold shadow-xs'
                        : 'text-ink hover:bg-surface-muted font-medium hover:text-brand'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-mono-data font-semibold',
                            isSelected ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-muted'
                          )}
                        >
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[3]" />}
                  </button>
                );
              };

              const hasGroups = filteredOptions.some((opt) => Boolean(opt.group));
              if (!hasGroups) {
                return filteredOptions.map(renderOptionItem);
              }

              const groupsMap: { [key: string]: SelectOption[] } = {};
              filteredOptions.forEach((opt) => {
                const g = opt.group || 'Other';
                if (!groupsMap[g]) groupsMap[g] = [];
                groupsMap[g].push(opt);
              });

              return Object.entries(groupsMap).map(([groupTitle, groupOpts]) => (
                <div key={groupTitle} className="space-y-0.5">
                  <div className="px-2.5 py-1 mt-1.5 mb-0.5 font-bold text-[10px] text-ink-muted uppercase tracking-wider bg-surface-muted/90 rounded-lg flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs border-b border-border/40">
                    <span>{groupTitle}</span>
                    <span className="text-[9px] font-mono-data font-semibold text-brand px-1.5 py-0.2 rounded bg-brand-tint/60">
                      {groupOpts.length}
                    </span>
                  </div>
                  {groupOpts.map(renderOptionItem)}
                </div>
              ));
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
