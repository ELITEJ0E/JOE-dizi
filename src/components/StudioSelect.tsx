import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface StudioSelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface StudioSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly StudioSelectOption<T>[];
  label: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

/** Accessible, keyboard-operable listbox. Its popover is portaled so it never
 * gets cut off by the scrolling score, sidebar, or mobile timeline. */
export function StudioSelect<T extends string>({
  value, onChange, options, label, disabled = false, className = '', compact = false
}: StudioSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 180, maxHeight: 280 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = options.findIndex(option => option.value === value);
  const selected = options[selectedIndex];

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 170), window.innerWidth - 24);
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const above = availableBelow < 190 && rect.top > availableBelow;
    const maxHeight = Math.min(304, Math.max(100, above ? rect.top - 20 : availableBelow));
    setPosition({
      top: above ? Math.max(12, rect.top - maxHeight - 8) : rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      maxHeight,
    });
  };

  const openList = (index = selectedIndex) => {
    if (disabled) return;
    setHighlighted(Math.max(0, index));
    setOpen(true);
  };
  const closeList = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    if (options[index]) onChange(options[index].value);
    closeList();
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) && !listRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-option-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, highlighted]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList(selectedIndex);
        else setHighlighted(index => Math.min(options.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList(selectedIndex);
        else setHighlighted(index => Math.max(0, index - 1));
        break;
      case 'Home':
        if (open) { event.preventDefault(); setHighlighted(0); }
        break;
      case 'End':
        if (open) { event.preventDefault(); setHighlighted(options.length - 1); }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) choose(highlighted);
        else openList();
        break;
      case 'Escape':
        if (open) { event.preventDefault(); closeList(); }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => open ? closeList() : openList()}
        onKeyDown={handleKeyDown}
        className={`inline-flex max-w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#264049] bg-[#111D20] text-[#F3F5F4] shadow-sm outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#36B39B] hover:bg-[#18292D] focus-visible:ring-2 focus-visible:ring-[#B4F45A]/60 disabled:opacity-40 disabled:cursor-not-allowed ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'} ${className}`}
      >
        <span className="truncate text-left">{selected?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#94A3A7] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-option-${highlighted}`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="fixed z-[110] overflow-y-auto overscroll-contain rounded-xl border border-[#31545B] bg-[#122126]/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl outline-none studio-select-enter"
          style={position}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-option-${index}`}
              data-option-index={index}
              role="option"
              aria-selected={option.value === value}
              onPointerMove={() => setHighlighted(index)}
              onClick={() => choose(index)}
              className={`flex min-h-9 items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors duration-150 ${highlighted === index ? 'bg-[#24443E] text-[#B4F45A]' : 'text-[#F3F5F4] hover:bg-[#1B3034]'}`}
            >
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                {option.description && <span className="mt-0.5 block text-[10px] leading-snug text-[#A1B1B2]">{option.description}</span>}
              </span>
              {option.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-[#B4F45A]" />}
            </div>
          ))}
        </div>, document.body
      )}
    </>
  );
}
