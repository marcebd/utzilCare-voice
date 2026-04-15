import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'stopped' | 'error';

interface UseRecorderReturn {
  status: RecorderStatus;
  elapsedSeconds: number;
  recordedBlob: Blob | null;
  recordedMime: string | null;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function useRecorder(): UseRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTicker();
    releaseStream();
    recorderRef.current = null;
    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordedMime(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setStatus('idle');
  }, [releaseStream, stopTicker]);

  const start = useCallback(async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMimeType();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        setRecordedBlob(blob);
        setRecordedMime(finalMime);
        setStatus('stopped');
        stopTicker();
        releaseStream();
      };

      recorder.onerror = () => {
        setErrorMessage('Recording failed. Try again.');
        setStatus('error');
        stopTicker();
        releaseStream();
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      tickRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      recorder.start();
      setStatus('recording');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Microphone access was denied. Allow it in your browser to record.'
            : err.message
          : 'Could not start recording.';
      setErrorMessage(msg);
      setStatus('error');
      releaseStream();
    }
  }, [releaseStream, stopTicker]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTicker();
      releaseStream();
    };
  }, [releaseStream, stopTicker]);

  return {
    status,
    elapsedSeconds,
    recordedBlob,
    recordedMime,
    errorMessage,
    start,
    stop,
    reset,
  };
}
