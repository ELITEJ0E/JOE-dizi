import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * JOE Music-style deferred scrubber:
 * - Pointer-captured touch/mouse drag previews in the DOM, no React renders per move.
 * - Actual player seek fires ONCE on pointerup; cancel reverts without seeking.
 * - Keyboard navigation remains accessible.
 */
export function useDeferredScrub(progressPercent: number, onSeek: (percent: number) => void) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const bounds = useRef({ left: 0, width: 1 });
  const lastPreview = useRef(progressPercent);
  const committed = useRef(progressPercent);
  const [dragging, setDragging] = useState(false);

  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const paint = useCallback((percent: number) => {
    const value = clamp(percent);
    lastPreview.current = value;
    trackRef.current?.style.setProperty('--seek-percent', value.toFixed(3) + '%');
    trackRef.current?.setAttribute('aria-valuenow', String(Math.round(value)));
    return value;
  }, []);

  useEffect(() => {
    committed.current = progressPercent;
    if (activePointer.current === null) paint(progressPercent);
  }, [progressPercent, paint]);

  const fromPointer = (clientX: number) =>
    clamp(((clientX - bounds.current.left) / bounds.current.width) * 100);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    bounds.current = { left: rect.left, width: rect.width };
    activePointer.current = event.pointerId;
    track.setPointerCapture(event.pointerId);
    paint(fromPointer(event.clientX));
    setDragging(true);
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    paint(fromPointer(event.clientX));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const percent = paint(fromPointer(event.clientX));
    activePointer.current = null;
    setDragging(false);
    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }
    // The ONLY player seek during a pointer interaction.
    onSeek(percent);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setDragging(false);
    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }
    paint(committed.current);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp': next = lastPreview.current + step; break;
      case 'ArrowLeft':
      case 'ArrowDown': next = lastPreview.current - step; break;
      case 'Home': next = 0; break;
      case 'End': next = 100; break;
      default: return;
    }
    event.preventDefault();
    onSeek(paint(next));
  };

  return {
    trackRef,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown },
    style: { '--seek-percent': clamp(progressPercent).toFixed(3) + '%' } as React.CSSProperties,
  };
}
