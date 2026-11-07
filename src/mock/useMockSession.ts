'use client';
import { useSyncExternalStore } from 'react';
import { mockSession } from './session';
export function useMockSession() { return useSyncExternalStore(mockSession.subscribe, mockSession.getSnapshot, mockSession.getServerSnapshot); }
