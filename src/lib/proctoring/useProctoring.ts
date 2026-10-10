'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { detectEnvironment } from './capabilities';
import { INITIAL_SESSION_STATE, ProctorSession, type SessionState } from './session';
import type { Environment, MaybePromise, ProctorEvent, ProctorMode } from './types';

export interface UseProctoringOptions {
  /** Receives batches of at most 20 events every 5s and once more when proctoring stops. */
  onEvents: (batch: ProctorEvent[]) => MaybePromise<void>;
}

export interface StartProctoringOptions {
  /** Epoch ms when the attempt started on the server (use a serverNow-derived value when resuming). */
  originEpochMs?: number;
}

let cachedEnvironment: Environment | null = null;
const subscribeNever = () => () => undefined;
const getEnvironmentSnapshot = () => (cachedEnvironment ??= detectEnvironment());
const getEnvironmentServerSnapshot = () => null;

/**
 * Client-side proctoring for the quiz page. Attach `videoRef` to a `<video muted playsInline>`.
 * start() should be called from a user gesture (the consent click) and resolves with the mode to report
 * to the server: 'full', 'limited' (visibility only) or 'none' (camera denied, the quiz still continues).
 * All tracks, listeners, wake lock and the detector are released on stop() and on unmount.
 * No frames are recorded or sent.
 */
export function useProctoring({ onEvents }: UseProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ProctorSession | null>(null);
  const onEventsRef = useRef(onEvents);
  const [state, setState] = useState<SessionState>(INITIAL_SESSION_STATE);
  // null during SSR/hydration, detected on the client afterwards.
  const environment = useSyncExternalStore<Environment | null>(
    subscribeNever,
    getEnvironmentSnapshot,
    getEnvironmentServerSnapshot,
  );

  useEffect(() => {
    onEventsRef.current = onEvents;
  }, [onEvents]);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.stop();
  }, []);

  const start = useCallback(async (options: StartProctoringOptions = {}): Promise<ProctorMode> => {
    await sessionRef.current?.stop();
    const video = videoRef.current;
    const env = (cachedEnvironment = detectEnvironment());
    if (!video) {
      setState({ ...INITIAL_SESSION_STATE, error: 'no-video-element' });
      return 'none';
    }
    const session: ProctorSession = new ProctorSession({
      video,
      environment: env,
      originEpochMs: options.originEpochMs,
      onEvents: (batch) => onEventsRef.current(batch),
      onState: (patch) => {
        if (sessionRef.current === session) setState((prev) => ({ ...prev, ...patch }));
      },
    });
    sessionRef.current = session;
    return session.start();
  }, []);

  useEffect(
    () => () => {
      void sessionRef.current?.stop();
      sessionRef.current = null;
    },
    [],
  );

  return {
    videoRef,
    mode: state.mode,
    cameraActive: state.cameraActive,
    facesNow: state.facesNow,
    environment,
    error: state.error,
    start,
    stop,
  };
}
