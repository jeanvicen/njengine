// @ts-nocheck
import { useEffect, useState, useCallback, useMemo } from 'react';
import { P2PRoom } from '@/lib/multiplayer';

const SESSION_KEY = 'ps_session';
const MIN_SESSION_LENGTH = 32;
const roomClients = new Map();

function isValidSession(value) {
    return typeof value === 'string' &&
        value.length >= MIN_SESSION_LENGTH &&
        value.length <= 64 &&
        /^[A-Za-z0-9_-]+$/.test(value);
}

function createRandomToken() {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const getOrCreateInstanceSession = () => {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (isValidSession(stored)) return stored;

    const sid = createRandomToken();
    window.sessionStorage.setItem(SESSION_KEY, sid);
    return sid;
};

function publish(client) {
    const state = { ...client.state };
    for (const listener of client.listeners) listener(state);
}

function updateState(client, patch) {
    client.state = { ...client.state, ...patch };
    publish(client);
}

function applyMessage(client, message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'ACTION') {
        updateState(client, { action: message.payload });
    } else if (message.type === 'JOYSTICK') {
        updateState(client, { joystick: message.payload });
    }
}

async function startRoom(client, session) {
    if (client.started || client.disposed) return;
    client.started = true;

    if (
        typeof window === 'undefined' ||
        !window.isSecureContext ||
        typeof window.RTCPeerConnection !== 'function' ||
        !window.crypto?.getRandomValues
    ) {
        updateState(client, { status: 'unavailable' });
        return;
    }

    const room = `ps_${session}`;
    const peerId = createRandomToken();
    const controller = new AbortController();
    client.abortController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const params = new URLSearchParams({
        room,
        peer: peerId,
        name: 'NJengines',
        since: '0',
    });

    try {
        // Probe the DB-backed signaling endpoint once before joining. An
        // unavailable relay then stays a quiet UI state instead of producing
        // repeated console errors from background reconnect attempts.
        const response = await fetch(`/api/rtc?${params}`, {
            signal: controller.signal,
            headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Signaling endpoint unavailable');
        const roster = await response.json();
        if (!Array.isArray(roster.peers) || !Array.isArray(roster.signals)) {
            throw new Error('Invalid signaling response');
        }
        if (client.disposed) {
            void fetch('/api/rtc', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ op: 'leave', room, peer: peerId }),
                keepalive: true,
            }).catch(() => {});
            return;
        }

        updateState(client, { available: true, status: 'waiting' });
        const p2p = new P2PRoom({
            room,
            selfId: peerId,
            name: 'NJengines',
            onPeersChanged: (peers) => {
                const connected = peers.some((peer) => peer.connectionState === 'connected');
                const failed = peers.some((peer) => peer.connectionState === 'failed');
                updateState(client, {
                    available: true,
                    connected,
                    status: connected ? 'connected' : failed ? 'connection-failed' : 'waiting',
                });
            },
            onMessage: (_from, message) => applyMessage(client, message),
            onConnected: () => {
                updateState(client, {
                    available: true,
                    status: client.state.connected ? 'connected' : 'waiting',
                });
            },
        });
        client.room = p2p;
        await p2p.join();
        if (client.disposed) p2p.close();
    } catch {
        if (!client.disposed) {
            updateState(client, {
                available: false,
                connected: false,
                status: 'unavailable',
            });
        }
    } finally {
        window.clearTimeout(timeout);
        if (client.abortController === controller) client.abortController = null;
    }
}

function closeClient(client, roomKey) {
    client.disposed = true;
    client.abortController?.abort();
    client.room?.close();
    client.room = null;
    roomClients.delete(roomKey);
}

// Multiple components on a page call this hook. Keep one P2PRoom per session
// in this module (module instances are page-scoped) and fan its events out to
// every hook consumer instead of opening duplicate peer connections.
function subscribeToRoom(session, listener) {
    const roomKey = `ps_${session}`;
    let client = roomClients.get(roomKey);
    if (!client) {
        client = {
            room: null,
            abortController: null,
            started: false,
            disposed: false,
            listeners: new Set(),
            state: {
                action: null,
                joystick: { dx: 0, dy: 0 },
                connected: false,
                available: false,
                status: 'connecting',
            },
        };
        roomClients.set(roomKey, client);
    }

    client.listeners.add(listener);
    listener({ ...client.state });
    void startRoom(client, session);

    return () => {
        client.listeners.delete(listener);
        if (client.listeners.size === 0 && roomClients.get(roomKey) === client) {
            closeClient(client, roomKey);
        }
    };
}

// One hook now binds to the same per-page room whether it is used by the
// desktop showcase or by the phone controller.
export function useDualSenseWS(customSession) {
    const [state, setState] = useState({
        action: null,
        joystick: { dx: 0, dy: 0 },
        connected: false,
        available: false,
        status: 'connecting',
    });

    const session = useMemo(() => {
        if (isValidSession(customSession)) return customSession;
        if (typeof window === 'undefined') return '';
        const querySession = new URLSearchParams(window.location.search).get('session');
        return isValidSession(querySession) ? querySession : getOrCreateInstanceSession();
    }, [customSession]);

    useEffect(() => {
        if (!session) return undefined;
        return subscribeToRoom(session, setState);
    }, [session]);

    const sendAction = useCallback((payload) => {
        const client = roomClients.get(`ps_${session}`);
        // Button down/up events must arrive in order and must not be dropped.
        client?.room?.send({ type: 'ACTION', payload });
    }, [session]);

    const sendJoystick = useCallback((payload) => {
        const client = roomClients.get(`ps_${session}`);
        // Joystick positions are replaceable state; stale updates may drop.
        client?.room?.broadcast({ type: 'JOYSTICK', payload });
    }, [session]);

    return {
        action: state.action,
        sendAction,
        joystick: state.joystick,
        sendJoystick,
        session,
        connected: state.connected,
        available: state.available,
        status: state.status,
    };
}
