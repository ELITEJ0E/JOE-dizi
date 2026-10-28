import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Youtube } from 'lucide-react';

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('YouTube player could not load.')), 15000);
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        window.clearTimeout(timeout);
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube player API is unavailable.'));
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('Failed to load YouTube player script.'));
        };
        document.head.appendChild(script);
      }
    }).catch((error) => {
      apiPromise = null;
      throw error;
    });
  }
  return apiPromise as Promise<YouTubeApi>;
}

interface YouTubeSyncPlayerProps {
  videoId: string;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  seekRequest: { seconds: number; token: number } | null;
  onTimeChange: (seconds: number, duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

/** Uses the official iframe player API; it never attempts to extract video audio. */
export const YouTubeSyncPlayer: React.FC<YouTubeSyncPlayerProps> = ({
  videoId, isPlaying, playbackSpeed, isLooping, seekRequest, onTimeChange, onPlayingChange
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const playingRef = useRef(isPlaying);
  const loopingRef = useRef(isLooping);
  const callbacks = useRef({ onTimeChange, onPlayingChange });
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  callbacks.current = { onTimeChange, onPlayingChange };
  loopingRef.current = isLooping;

  useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;
    readyRef.current = false;
    setReady(false);
    setError('');

    loadYouTubeApi().then((api) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new api.Player(mountRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            if (cancelled) return;
            readyRef.current = true;
            setReady(true);
            event.target.setPlaybackRate(playbackSpeed);
            callbacks.current.onTimeChange(event.target.getCurrentTime(), event.target.getDuration());
            if (playingRef.current) event.target.playVideo();
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            if (cancelled) return;
            if (event.data === 0 && loopingRef.current) {
              event.target.seekTo(0, true);
              event.target.playVideo();
              return;
            }
            if (event.data === 1 || event.data === 2 || event.data === 0) {
              callbacks.current.onPlayingChange(event.data === 1);
            }
          },
          onError: () => setError('This video cannot be played in the embedded YouTube player.'),
        },
      });
      poll = window.setInterval(() => {
        if (!readyRef.current || !playerRef.current) return;
        try {
          callbacks.current.onTimeChange(playerRef.current.getCurrentTime(), playerRef.current.getDuration());
        } catch { /* YouTube player may have been removed */ }
      }, 33); // Fast Jianpu events can last only 30–50 ms.
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load YouTube.');
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (poll !== undefined) window.clearInterval(poll);
      try { playerRef.current?.destroy(); } catch { /* iframe may already be gone */ }
      playerRef.current = null;
    };
    // A different video requires a fresh player. Other values are controlled below.
  }, [videoId]);

  useEffect(() => {
    playingRef.current = isPlaying;
    if (!readyRef.current || !playerRef.current) return;
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch { /* player is being replaced */ }
  }, [isPlaying]);

  useEffect(() => {
    if (readyRef.current) playerRef.current?.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed, ready]);

  useEffect(() => {
    if (seekRequest && readyRef.current) playerRef.current?.seekTo(seekRequest.seconds, true);
  }, [seekRequest, ready]);

  return (
    <div className="rounded-xl border border-[#1A2E33] bg-[#111D20] overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F5F4]">
          <Youtube className="w-4 h-4 text-red-400" /> YouTube synchronized player
        </div>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-[#36B39B] hover:text-[#B4F45A] inline-flex items-center gap-1">
          Open on YouTube <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="aspect-video w-full bg-black relative">
        <div ref={mountRef} className="w-full h-full" />
        {!ready && !error && <div className="absolute inset-0 grid place-items-center text-xs text-white/60 pointer-events-none">Loading video…</div>}
      </div>
      {error && <p role="alert" className="px-4 py-3 text-xs text-amber-300">{error} You can still attach a matching audio file for transcription.</p>}
    </div>
  );
};
