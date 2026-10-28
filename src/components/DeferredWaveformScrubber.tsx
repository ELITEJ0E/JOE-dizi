import React, { useCallback } from 'react';
import { useDeferredScrub } from '../hooks/useDeferredScrub';

const HEIGHTS = [
  12,18,28,45,60,35,75,90,80,50,65,85,95,70,55,40,
  30,48,70,85,60,92,100,75,50,65,80,45,30,20,35,55,
  70,85,95,65,40,55,75,90,80,60,45,30,20,15,25,40
];
interface Props {
  progressPercent: number;
  durationSeconds: number;
  onSeek: (percent: number) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
}
function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return Math.floor(safe / 60).toString().padStart(2,'0')
    + ':' + Math.floor(safe % 60).toString().padStart(2,'0');
}
/** Low-overhead waveform seek: drag preview updates CSS, release commits once. */
export const DeferredWaveformScrubber: React.FC<Props> = ({
  progressPercent, durationSeconds, onSeek, disabled = false, className = '', ariaLabel,
}) => {
  const preview = useCallback(
    (percent: number) => formatTime(percent / 100 * durationSeconds),
    [durationSeconds]
  );
  const scrub = useDeferredScrub(progressPercent, onSeek, preview);
  return (
    <div
      ref={scrub.trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPercent)}
      aria-valuetext={preview(progressPercent)}
      aria-disabled={disabled || undefined}
      {...(!disabled ? scrub.handlers : {})}
      className={`joe-deferred-scrub relative min-w-0 h-7 flex-1 rounded-lg border border-[#1A2E33] bg-[#111D20] flex items-center overflow-visible touch-none select-none cursor-ew-resize focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B4F45A] ${scrub.dragging ? 'scrubbing' : ''} ${className}`}
      title={ariaLabel}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 left-0 bg-[#B4F45A]/10"
          style={{width:'var(--seek-percent,0%)'}}/>
        <div className="absolute inset-0 flex items-center gap-[2px] px-1.5">
          {HEIGHTS.map((height,index)=><i key={index} className="flex-1 min-w-0 rounded-full bg-[#2A3C41]" style={{height:Math.max(17,height*.7)+'%'}}/>)}
        </div>
        <div className="absolute inset-0 flex items-center gap-[2px] px-1.5"
          style={{clipPath:'inset(0 calc(100% - var(--seek-percent, 0%)) 0 0)'}}>
          {HEIGHTS.map((height,index)=><i key={index} className="flex-1 min-w-0 rounded-full bg-[#B4F45A]" style={{height:Math.max(17,height*.7)+'%'}}/>)}
        </div>
      </div>
      <span className="absolute inset-y-0 w-[2px] bg-[#B4F45A] pointer-events-none shadow-[0_0_8px_#B4F45A]"
        style={{left:'var(--seek-percent,0%)'}} />
      <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-2.5 rounded-md border border-[#0B1014] bg-[#B4F45A] pointer-events-none opacity-0 group-hover:opacity-100"
        style={{left:'var(--seek-percent,0%)'}} />
    </div>
  );
};
