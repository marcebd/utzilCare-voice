import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 96;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 2;
const HEIGHT_FRACTION = 0.88;

interface WaveformScrubberProps {
  src: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  ariaLabel: string;
}

type DecodeState = 'idle' | 'decoding' | 'ready' | 'error';

interface AudioContextCtor {
  new (): AudioContext;
}

function getAudioContextClass(): AudioContextCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

async function computePeaks(url: string, bars: number): Promise<number[]> {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Audio fetch failed (${response.status}).`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContextClass();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / bars));
    const peaks: number[] = new Array(bars).fill(0);
    let globalMax = 0;

    for (let i = 0; i < bars; i++) {
      const start = blockSize * i;
      const end = Math.min(channelData.length, start + blockSize);
      let max = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(channelData[j] ?? 0);
        if (v > max) max = v;
      }
      peaks[i] = max;
      if (max > globalMax) globalMax = max;
    }

    if (globalMax > 0) {
      for (let i = 0; i < peaks.length; i++) {
        peaks[i] = (peaks[i] ?? 0) / globalMax;
      }
    }
    return peaks;
  } finally {
    await ctx.close();
  }
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  progress: number,
  colors: { played: string; unplayed: string },
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const totalGap = BAR_GAP * (peaks.length - 1);
  const barWidth = Math.max(1, (cssWidth - totalGap) / peaks.length);
  const progressX = progress * cssWidth;
  const centerY = cssHeight / 2;

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i] ?? 0;
    const x = i * (barWidth + BAR_GAP);
    const rawHeight = peak * cssHeight * HEIGHT_FRACTION;
    const barHeight = Math.max(MIN_BAR_HEIGHT, rawHeight);
    const y = centerY - barHeight / 2;
    const barCenter = x + barWidth / 2;
    ctx.fillStyle = barCenter <= progressX ? colors.played : colors.unplayed;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

export default function WaveformScrubber({
  src,
  currentTime,
  duration,
  onSeek,
  ariaLabel,
}: WaveformScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [state, setState] = useState<DecodeState>('idle');

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setState('decoding');
    computePeaks(src, BAR_COUNT)
      .then((result) => {
        if (cancelled) return;
        setPeaks(result);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[waveform] decode failed', err);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const progress = duration > 0 ? currentTime / duration : 0;
    drawWaveform(canvas, peaks, progress, {
      played: '#166534',
      unplayed: '#d6d3d1',
    });
  }, [peaks, currentTime, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const onResize = () => {
      const progress = duration > 0 ? currentTime / duration : 0;
      drawWaveform(canvas, peaks, progress, {
        played: '#166534',
        unplayed: '#d6d3d1',
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [peaks, currentTime, duration]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const fraction = Math.min(1, Math.max(0, x / rect.width));
    onSeek(fraction * duration);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const stepSmall = 2;
    const stepLarge = 10;
    let delta = 0;
    switch (event.key) {
      case 'ArrowRight':
        delta = stepSmall;
        break;
      case 'ArrowLeft':
        delta = -stepSmall;
        break;
      case 'PageUp':
        delta = stepLarge;
        break;
      case 'PageDown':
        delta = -stepLarge;
        break;
      case 'Home':
        event.preventDefault();
        onSeek(0);
        return;
      case 'End':
        event.preventDefault();
        onSeek(duration);
        return;
      default:
        return;
    }
    event.preventDefault();
    const next = Math.min(duration, Math.max(0, currentTime + delta));
    onSeek(next);
  };

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, Math.round(duration))}
      aria-valuenow={Math.round(currentTime)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className="block h-16 w-full cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 focus:ring-offset-white"
    >
      {state === 'decoding' || state === 'idle' ? (
        <div className="flex h-full items-center justify-center text-xs text-stone-400">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400"
            aria-hidden="true"
          />
          <span className="ml-2 font-mono uppercase tracking-[0.18em]">
            Loading audio
          </span>
        </div>
      ) : state === 'error' ? (
        <div className="flex h-full items-center justify-center text-xs text-stone-500">
          <span className="font-mono uppercase tracking-[0.18em]">
            Waveform unavailable
          </span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}
