import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { QRCodeSVG } from 'qrcode.react';
import {
  clearPendingScoreChanges,
  createPendingScoreChange,
  getPendingScoreChanges,
  queueScoreChange,
  removePendingScoreChange,
  type PendingScoreChange,
} from './lib/score-outbox';
import { Action, Card, StatusMessage, TextField } from './ui';

type PreviewPlayer = {
  id: string;
  identityId: string;
  name: string;
  teeLabel: string;
  ratingTable: 'men' | 'women';
  handicapIndex: number;
  playingHandicap: number;
  ready: boolean;
};

type GameStanding = {
  completedHoles: number;
  winsByPlayerId: Record<string, number>;
  carriedWins: number;
  status: 'active' | 'winner' | 'draw' | 'extension' | 'unresolved';
  holeResults: Array<{
    holeNumber: number;
    kind: 'winner' | 'tie';
    winnerId?: string;
    winsAwarded: number;
    carriedWinsAfterHole: number;
  }>;
};

type PreviewGame = {
  id?: string;
  startHole: number;
  holeCount: number;
  mode: 'scratch' | 'handicap';
  reward: string;
  participantIds: string[];
  holeTieRule: 'no-winner' | 'carry-forward';
  carryEligiblePlayerIds: string[];
  endTieRule: 'draw' | 'continue';
  standings: GameStanding;
};

type PreviewRound = {
  id: string;
  courseName: string;
  joinLink: string;
  invitationToken: string;
  invitationExpiresAt: string;
  invitationRevokedAt?: string;
  state: 'lobby' | 'active';
  creatorIdentityId?: string;
  players: PreviewPlayer[];
  scores: Record<string, Record<number, number>>;
  scoreRevisions: Record<string, Record<number, number>>;
  game: PreviewGame;
  standings: GameStanding;
  sideGames: PreviewGame[];
};

type CompletedPreviewRound = PreviewRound & {
  completedAt: string;
  outcome: {
    kind: 'winner' | 'draw' | 'unresolved';
    playerIds: string[];
    wins: number;
  };
};

type LiveConnection =
  | {
      kind: 'poll';
      pollIntervalMilliseconds: number;
    }
  | {
      kind: 'web-pubsub';
      url: string;
    };

type GuestSession = {
  sessionToken: string;
  identityId: string;
  displayName: string;
  expiresAt: string;
};

type InvitationLookup = {
  invitationToken: string;
  joinRequired: true;
};

class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const guestSessionStorageKey = 'vaylakaverit.guestSession';
const guestSessionInvalidEvent = 'vaylakaverit:guest-session-invalid';

function storedGuestSession(): GuestSession | null {
  const serializedSession = window.localStorage.getItem(guestSessionStorageKey);
  if (!serializedSession) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(serializedSession);
    if (
      typeof session === 'object' &&
      session !== null &&
      'sessionToken' in session &&
      'identityId' in session &&
      'displayName' in session &&
      'expiresAt' in session &&
      typeof session.sessionToken === 'string' &&
      typeof session.identityId === 'string' &&
      typeof session.displayName === 'string' &&
      typeof session.expiresAt === 'string'
    ) {
      return session as GuestSession;
    }
  } catch {
    // Invalid device data is discarded before it can be sent as an authorization credential.
  }

  window.localStorage.removeItem(guestSessionStorageKey);
  return null;
}

function saveGuestSession(session: GuestSession): void {
  window.localStorage.setItem(guestSessionStorageKey, JSON.stringify(session));
}

function clearStoredGuestSession(): void {
  window.localStorage.removeItem(guestSessionStorageKey);
}

async function request<T>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = body ? 'POST' : 'GET',
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(storedGuestSession()
        ? { authorization: `Bearer ${storedGuestSession()!.sessionToken}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String(payload.error)
        : 'Pyyntö epäonnistui.';
    if (response.status === 401) {
      clearStoredGuestSession();
      window.dispatchEvent(new Event(guestSessionInvalidEvent));
    }
    throw new ApiRequestError(message, response.status, payload);
  }
  return payload as T;
}

function scoreRequestCanBeQueued(error: unknown): boolean {
  return !(error instanceof ApiRequestError) || error.status >= 500;
}

function CameraQrScanner({
  onScan,
  onStatus,
}: {
  onScan: (value: string) => void;
  onStatus: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      onStatus('Kameraskannaus ei ole tuettu tässä selaimessa. Liitä liittymislinkki alle.');
      return undefined;
    }

    const reader = new BrowserQRCodeReader();
    let controls: { stop: () => void } | undefined;
    let active = true;

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || !active) {
          return;
        }

        active = false;
        controls?.stop();
        onScan(result.getText());
      })
      .then((scannerControls) => {
        controls = scannerControls;
        if (!active) {
          controls.stop();
        }
      })
      .catch((scanError: unknown) => {
        if (!active) {
          return;
        }

        onStatus(
          scanError instanceof DOMException && scanError.name === 'NotAllowedError'
            ? 'Kameran käyttö estettiin. Salli kameran käyttö tai liitä liittymislinkki alle.'
            : 'Kameraskannausta ei voitu aloittaa. Liitä liittymislinkki alle.',
        );
      });

    return () => {
      active = false;
      controls?.stop();
    };
  }, [onScan, onStatus]);

  return <video ref={videoRef} className="mt-3 w-full rounded-xl bg-black" muted playsInline />;
}

function App() {
  const [joinInvitationToken, setJoinInvitationToken] = useState(() =>
    new URLSearchParams(window.location.search).get('join'),
  );
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => storedGuestSession());
  const [name, setName] = useState(() => storedGuestSession()?.displayName ?? '');
  const [round, setRound] = useState<PreviewRound | null>(null);
  const [invitation, setInvitation] = useState<InvitationLookup | null>(null);
  const [completedRounds, setCompletedRounds] = useState<CompletedPreviewRound[]>([]);
  const [completedRound, setCompletedRound] = useState<CompletedPreviewRound | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [manualJoin, setManualJoin] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [holeNumber, setHoleNumber] = useState(1);
  const [strokes, setStrokes] = useState(5);
  const [sideGameHoles, setSideGameHoles] = useState(3);
  const [sideGameMode, setSideGameMode] = useState<'scratch' | 'handicap'>('scratch');
  const [sideGameReward, setSideGameReward] = useState('');
  const [sideGameHoleTieRule, setSideGameHoleTieRule] = useState<'no-winner' | 'carry-forward'>(
    'no-winner',
  );
  const [sideGameCarryEligiblePlayerIds, setSideGameCarryEligiblePlayerIds] = useState<string[]>(
    [],
  );
  const [sideGamePlayerIds, setSideGamePlayerIds] = useState<string[]>([]);
  const [sideGameEndTieRule, setSideGameEndTieRule] = useState<'draw' | 'continue'>('draw');
  const [pendingScoreChanges, setPendingScoreChanges] = useState<PendingScoreChange[]>([]);
  const [outboxVersion, setOutboxVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingData, setDeletingData] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string | null>(null);
  const [liveConnectionState, setLiveConnectionState] = useState<
    'connecting' | 'live' | 'polling' | 'reconnecting'
  >('connecting');
  const replayInProgress = useRef(false);
  const startHeadingRef = useRef<HTMLHeadingElement>(null);
  const guestNameRef = useRef<HTMLInputElement>(null);

  const joinUrl = round ? new URL(round.joinLink, window.location.origin).toString() : '';
  const canShareInvitation = round ? isInvitationValid(round) : false;
  const isRoundCreator =
    round?.players.find((player) => player.id === activePlayerId)?.identityId ===
    round?.creatorIdentityId;

  useEffect(() => {
    if (!guestSession) {
      setCompletedRounds([]);
      return undefined;
    }

    let active = true;

    void request<CompletedPreviewRound[]>('/api/preview/completed-rounds')
      .then((history) => {
        if (active) {
          setCompletedRounds(history);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [guestSession?.sessionToken]);

  useEffect(() => {
    if (!joinInvitationToken || round) {
      return undefined;
    }

    let active = true;
    void request<InvitationLookup>(
      `/api/preview/invitations/${encodeURIComponent(joinInvitationToken)}`,
    )
      .then((invitationResult) => {
        if (active) {
          setInvitation(invitationResult);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error ? requestError.message : 'Kutsulinkkiä ei voitu avata.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [joinInvitationToken, round]);

  useEffect(() => {
    const handleInvalidGuestSession = () => {
      setGuestSession(null);
      setRound(null);
      setCompletedRound(null);
      setActivePlayerId(null);
      setPendingScoreChanges([]);
      setError('Tämän selaimen vierasistunto on vanhentunut. Kirjoita nimi jatkaaksesi.');
      void clearPendingScoreChanges().catch(() => undefined);
      window.setTimeout(() => startHeadingRef.current?.focus(), 0);
    };

    window.addEventListener(guestSessionInvalidEvent, handleInvalidGuestSession);
    return () => window.removeEventListener(guestSessionInvalidEvent, handleInvalidGuestSession);
  }, []);

  useEffect(() => {
    if (!round || !activePlayerId) {
      return undefined;
    }

    const roundId = round.id;
    let active = true;
    let retryTimer: number | undefined;
    let pollingTimer: number | undefined;
    let socket: WebSocket | undefined;

    const refreshRound = async () => {
      try {
        const refreshedRound = await request<PreviewRound>(`/api/preview/rounds/${roundId}`);
        if (active) {
          setRound(refreshedRound);
        }
      } catch {
        // A reconnect retries the authoritative snapshot after a transient transport failure.
      }
    };

    const retry = () => {
      setLiveConnectionState('reconnecting');
      retryTimer = window.setTimeout(() => void connect(), 2000);
    };

    const connect = async () => {
      setLiveConnectionState('connecting');
      try {
        const connection = await request<LiveConnection>(`/api/rounds/${roundId}/live-connection`);
        if (!active) {
          return;
        }

        await refreshRound();
        if (connection.kind === 'poll') {
          setLiveConnectionState('polling');
          pollingTimer = window.setInterval(
            () => void refreshRound(),
            connection.pollIntervalMilliseconds,
          );
          return;
        }

        socket = new WebSocket(connection.url);
        socket.onmessage = () => void refreshRound();
        socket.onopen = () => setLiveConnectionState('live');
        socket.onclose = () => {
          if (active) {
            retry();
          }
        };
        socket.onerror = () => socket?.close();
      } catch {
        if (active) {
          retry();
        }
      }
    };

    void connect();

    return () => {
      active = false;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
      if (pollingTimer !== undefined) {
        window.clearInterval(pollingTimer);
      }
      socket?.close();
    };
  }, [round?.id, activePlayerId]);

  useEffect(() => {
    if (!round) {
      setPendingScoreChanges([]);
      return undefined;
    }

    let active = true;
    const roundId = round.id;

    async function refreshPendingChanges() {
      const changes = await getPendingScoreChanges(roundId);
      if (active) {
        setPendingScoreChanges(changes);
      }
      return changes;
    }

    async function replayPendingChanges() {
      if (replayInProgress.current || navigator.onLine === false) {
        return;
      }

      replayInProgress.current = true;
      try {
        let replayedChanges = false;
        while (true) {
          const [change] = await refreshPendingChanges();
          if (!change) {
            break;
          }

          const refreshedRound = await request<PreviewRound>(
            `/api/preview/rounds/${roundId}/scores`,
            {
              playerId: change.playerId,
              holeNumber: change.holeNumber,
              strokes: change.strokes,
              changeId: change.id,
              expectedRevision: change.expectedRevision,
            },
          );
          await removePendingScoreChange(change.id);
          replayedChanges = true;
          if (active) {
            setRound(refreshedRound);
          }
        }

        if (replayedChanges) {
          const refreshedRound = await request<PreviewRound>(`/api/preview/rounds/${roundId}`);
          if (active) {
            setRound(refreshedRound);
          }
        }
      } catch (syncError) {
        if (active && scoreRequestCanBeQueued(syncError)) {
          setError(
            'Tallentamattomia tuloksia ei voitu lähettää. Ne yritetään uudelleen yhteyden palattua.',
          );
        }
      } finally {
        replayInProgress.current = false;
      }
    }

    void refreshPendingChanges()
      .then((changes) => {
        if (changes.length > 0) {
          void replayPendingChanges();
        }
      })
      .catch(() => undefined);

    const handleOnline = () => {
      void replayPendingChanges();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);
    const retryInterval = window.setInterval(handleOnline, 5000);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
      window.clearInterval(retryInterval);
    };
  }, [round?.id, outboxVersion]);

  async function savePendingScore(change: PendingScoreChange) {
    await queueScoreChange(change);
    setPendingScoreChanges((changes) =>
      [...changes.filter((pendingChange) => pendingChange.id !== change.id), change].toSorted(
        (left, right) => left.createdAt.localeCompare(right.createdAt),
      ),
    );
    setOutboxVersion((version) => version + 1);
  }

  async function createRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const session = await ensureGuestSession();
      const createdRound = await request<PreviewRound>('/api/preview/rounds', {});
      setRound(createdRound);
      setActivePlayerId(
        createdRound.players.find((player) => player.identityId === session.identityId)?.id ?? null,
      );
      setCopied(false);
      window.setTimeout(() => startHeadingRef.current?.focus(), 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kierrosta ei voitu luoda.');
      window.setTimeout(() => guestNameRef.current?.focus(), 0);
    }
  }

  async function joinRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const invitationToken = joinInvitationToken ?? getInvitationTokenFromJoinLink(joinLink);

    if (!invitationToken) {
      setError('Anna voimassa oleva liittymislinkki.');
      return;
    }

    try {
      const session = await ensureGuestSession();
      const joinedRound = await request<PreviewRound>(
        `/api/preview/invitations/${encodeURIComponent(invitationToken)}/join`,
        {},
      );
      setRound(joinedRound);
      setInvitation(null);
      setCopied(false);
      setActivePlayerId(
        joinedRound.players.find((player) => player.identityId === session.identityId)?.id ?? null,
      );
      window.setTimeout(() => startHeadingRef.current?.focus(), 0);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Kierrokseen ei voitu liittyä.',
      );
      window.setTimeout(() => guestNameRef.current?.focus(), 0);
    }
  }

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!round || !activePlayerId) {
      return;
    }

    let change: PendingScoreChange;
    try {
      change = createPendingScoreChange(
        round.id,
        activePlayerId,
        holeNumber,
        strokes,
        round.scoreRevisions?.[activePlayerId]?.[holeNumber] ?? 0,
      );
    } catch (idError) {
      setError(idError instanceof Error ? idError.message : 'Tulosta ei voitu tallentaa.');
      return;
    }

    if (pendingScoreChanges.length > 0 || replayInProgress.current || navigator.onLine === false) {
      try {
        await savePendingScore(change);
      } catch (queueError) {
        setError(queueError instanceof Error ? queueError.message : 'Tulosta ei voitu tallentaa.');
      }
      return;
    }

    try {
      const correcting = round.scores[activePlayerId]?.[holeNumber] !== undefined;
      setRound(
        await request<PreviewRound>(`/api/preview/rounds/${round.id}/scores`, {
          playerId: activePlayerId,
          holeNumber,
          strokes,
          changeId: change.id,
          expectedRevision: change.expectedRevision,
        }),
      );
      setNotice(
        correcting
          ? `Reiän ${holeNumber} tulos korjattiin.`
          : `Reiän ${holeNumber} tulos tallennettiin.`,
      );
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 409) {
        const conflictedRound =
          typeof requestError.payload === 'object' &&
          requestError.payload !== null &&
          'round' in requestError.payload
            ? requestError.payload.round
            : undefined;
        if (conflictedRound) {
          setRound(conflictedRound as PreviewRound);
        }
      }
      if (!scoreRequestCanBeQueued(requestError)) {
        setError(
          requestError instanceof Error ? requestError.message : 'Tulosta ei voitu tallentaa.',
        );
        return;
      }

      try {
        await savePendingScore(change);
      } catch (queueError) {
        setError(queueError instanceof Error ? queueError.message : 'Tulosta ei voitu tallentaa.');
      }
    }
  }

  async function addSideGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!round) {
      return;
    }

    const upcomingHole = nextUpcomingHole(round);
    if (!upcomingHole) {
      setError('Sivupelejä ei voi enää aloittaa, koska kaikki reiät on pelattu.');
      return;
    }

    try {
      setRound(
        await request<PreviewRound>(`/api/preview/rounds/${round.id}/side-games`, {
          startHole: upcomingHole,
          holeCount: sideGameHoles,
          mode: sideGameMode,
          reward: sideGameReward,
          playerIds: sideGamePlayerIds,
          holeTieRule: sideGameHoleTieRule,
          carryEligiblePlayerIds: sideGameCarryEligiblePlayerIds,
          endTieRule: sideGameEndTieRule,
        }),
      );
      setSideGameReward('');
      setSideGameCarryEligiblePlayerIds([]);
      setSideGamePlayerIds([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sivupeliä ei voitu lisätä.');
    }
  }

  async function updateOwnLobbySettings(settings: {
    name: string;
    handicapIndex: number;
    teeLabel: string;
    ratingTable: 'men' | 'women';
  }) {
    if (!round || !activePlayerId) {
      return;
    }

    setError(null);
    try {
      setRound(
        await request<PreviewRound>(`/api/preview/rounds/${round.id}/players/${activePlayerId}`, {
          ...settings,
          ready: true,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Pelaaja-asetuksia ei voitu tallentaa.',
      );
    }
  }

  async function startRound() {
    if (!round) {
      return;
    }

    setError(null);
    try {
      setRound(await request<PreviewRound>(`/api/preview/rounds/${round.id}/start`, {}));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Kierrosta ei voitu aloittaa.',
      );
    }
  }

  async function completeRound() {
    if (!round) {
      return;
    }

    setError(null);

    try {
      const completed = await request<CompletedPreviewRound>(
        `/api/preview/rounds/${round.id}/complete`,
        {},
      );
      setCompletedRounds((history) => [
        completed,
        ...history.filter((historyRound) => historyRound.id !== completed.id),
      ]);
      setCompletedRound(completed);
      setRound(null);
      setActivePlayerId(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Kierrosta ei voitu päättää.',
      );
    }
  }

  async function openCompletedRound(roundId: string) {
    setError(null);

    try {
      setCompletedRound(
        await request<CompletedPreviewRound>(`/api/preview/completed-rounds/${roundId}`),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Kierroksen historiaa ei voitu avata.',
      );
    }
  }

  async function copyJoinLink() {
    if (!round || !canShareInvitation) {
      return;
    }

    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
  }

  async function revokeInvitation() {
    if (!round) {
      return;
    }

    setError(null);
    try {
      setRound(
        await request<PreviewRound>(`/api/preview/rounds/${round.id}/invitation/revoke`, {}),
      );
      setCopied(false);
      setNotice('Kutsulinkki on mitätöity. Vanhaa QR-koodia tai linkkiä ei voi enää avata.');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Kutsulinkkiä ei voitu mitätöidä.',
      );
    }
  }

  async function deleteData() {
    if (
      !window.confirm(
        'Poistetaanko tietosi? Nimesi ja tunnisteesi anonymisoidaan yhteisistä kierroksista. Muiden pelaajien kierrokset ja tulokset säilyvät. Toimintoa ei voi perua.',
      )
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    setDeletingData(true);
    try {
      await request<{ anonymizedRoundCount: number }>('/api/guest-data', undefined, 'DELETE');
      await clearPendingScoreChanges();
      clearStoredGuestSession();
      setGuestSession(null);
      setPendingScoreChanges([]);
      setRound(null);
      setCompletedRound(null);
      setActivePlayerId(null);
      setName('');
      setNotice(
        'Vierastietosi poistettiin. Yhteisissä kierroksissa nimesi anonymisoitiin ja muut tulokset säilyvät.',
      );
      window.setTimeout(() => startHeadingRef.current?.focus(), 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tietoja ei voitu poistaa.');
    } finally {
      setDeletingData(false);
    }
  }

  async function clearDeviceData() {
    if (
      !window.confirm(
        'Tyhjennetäänkö tämän laitteen tiedot? Vierasistunto ja tallentamattomat tulokset poistetaan tältä selaimelta. Yhteiset kierrokset säilyvät muille pelaajille.',
      )
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    setDeletingData(true);
    try {
      await request<{ cleared: true }>('/api/guest-session', undefined, 'DELETE');
      await clearPendingScoreChanges();
      clearStoredGuestSession();
      setGuestSession(null);
      setRound(null);
      setCompletedRound(null);
      setActivePlayerId(null);
      setPendingScoreChanges([]);
      setName('');
      setNotice('Tämän laitteen vierastiedot tyhjennettiin.');
      window.setTimeout(() => startHeadingRef.current?.focus(), 0);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Laitteen tietoja ei voitu tyhjentää.',
      );
    } finally {
      setDeletingData(false);
    }
  }

  async function ensureGuestSession(): Promise<GuestSession> {
    if (guestSession) {
      return guestSession;
    }

    const session = await request<GuestSession>('/api/guest-sessions', { displayName: name });
    saveGuestSession(session);
    setGuestSession(session);
    setName(session.displayName);
    return session;
  }

  const handleQrScan = useCallback((value: string) => {
    const invitationToken = getInvitationTokenFromJoinLink(value);
    if (!invitationToken) {
      setScannerStatus('QR-koodi ei sisältänyt Väyläkavereiden liittymislinkkiä.');
      return;
    }

    setJoinLink(value);
    setJoinInvitationToken(invitationToken);
    setScannerStatus('QR-koodi luettu. Anna nimesi ja liity kierrokseen.');
    setScanning(false);
  }, []);

  const handleScannerStatus = useCallback((message: string) => {
    setScannerStatus(message);
    setScanning(false);
  }, []);
  const upcomingHole = round ? nextUpcomingHole(round) : undefined;
  const selectedOwnScore =
    round && activePlayerId ? round.scores[activePlayerId]?.[holeNumber] : undefined;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-[#f7f8f4] px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-[#386354]">VÄYLÄKAVERIT</p>
          <h1
            className="mt-1 text-3xl font-bold tracking-tight text-[#073b2d]"
            ref={startHeadingRef}
            tabIndex={-1}
          >
            {completedRound
              ? 'Kierroksen historia'
              : round
                ? round.state === 'active'
                  ? 'Kierros käynnissä.'
                  : 'Kierroksen aula'
                : 'Pelaa kierros yhdessä.'}
          </h1>
        </div>
      </header>

      {completedRound ? (
        <CompletedRoundHistory round={completedRound} onBack={() => setCompletedRound(null)} />
      ) : !round ? (
        <>
          <Card className="mt-10 bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
            <p className="text-sm font-semibold text-[#d4e5d9]">
              {joinInvitationToken || manualJoin ? 'LIITY KIERROKSEEN' : 'LUO UUSI KIERROS'}
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              {joinInvitationToken || manualJoin
                ? 'Liity kaverin kierrokseen.'
                : 'Luo kierros ja kutsu kaveri mukaan.'}
            </h2>
            <p className="mt-3 text-base leading-7 text-[#d4e5d9]">
              Golf Talma Master, tii 52 ja pelaajat samalle kierrokselle liittymislinkillä.
            </p>
            {invitation ? (
              <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-[#d4e5d9]">
                <p className="font-semibold text-white">Liity kaverin kierrokseen.</p>
                <p className="mt-1">Näet kierroksen tiedot, kun olet liittynyt siihen.</p>
              </div>
            ) : null}
            <form
              className="mt-6 grid gap-3"
              onSubmit={joinInvitationToken || manualJoin ? joinRound : createRound}
            >
              {manualJoin && !joinInvitationToken ? (
                <>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-[#d4e5d9] px-4 py-3 font-bold text-white"
                    onClick={() => {
                      setScannerStatus(null);
                      setScanning(true);
                    }}
                  >
                    Skannaa QR-koodi kameralla
                  </button>
                  {scanning ? (
                    <CameraQrScanner onScan={handleQrScan} onStatus={handleScannerStatus} />
                  ) : null}
                  {scannerStatus ? <p className="text-sm text-[#d4e5d9]">{scannerStatus}</p> : null}
                  <label className="grid gap-2 text-sm font-semibold" htmlFor="join-link">
                    Liittymislinkki
                    <input
                      id="join-link"
                      className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                      value={joinLink}
                      onChange={(event) => setJoinLink(event.target.value)}
                      placeholder="Liitä kaverin linkki tähän"
                      required
                    />
                  </label>
                </>
              ) : null}
              <TextField
                id="player-name"
                inputRef={guestNameRef}
                label="Nimi kierrokselle"
                hint="Kirjoita nimi, jolla muut pelaajat tunnistavat sinut. Nimesi tallennetaan tälle selaimelle. Et tarvitse tiliä tai salasanaa."
                className="bg-white text-base text-[#13251f]"
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                placeholder="Esim. Aleksi"
                required
                value={name}
              />
              <Action type="submit">
                {joinInvitationToken || manualJoin ? 'Liity kierrokseen' : 'Luo kierros'}
              </Action>
              {!joinInvitationToken ? (
                <Action
                  tone="secondary"
                  onClick={() => {
                    setError(null);
                    setManualJoin((value) => !value);
                  }}
                >
                  {manualJoin ? 'Luo uusi kierros' : 'Liity kierrokseen'}
                </Action>
              ) : null}
            </form>
          </Card>

          {completedRounds.length > 0 ? (
            <section className="mt-5 rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-[#073b2d]">Aiemmat kierrokset</h2>
              <ul className="mt-3 grid gap-2">
                {completedRounds.map((historyRound) => (
                  <li key={historyRound.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-[#f1f5ef] px-3 py-3 text-left"
                      onClick={() => void openCompletedRound(historyRound.id)}
                    >
                      <span className="block font-semibold">{historyRound.courseName}</span>
                      <span className="mt-1 block text-sm text-[#476257]">
                        {formatCompletedDate(historyRound.completedAt)} ·{' '}
                        {formatOutcome(historyRound)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : round.state === 'lobby' ? (
        <RoundLobby
          round={round}
          activePlayerId={activePlayerId}
          copied={copied}
          onCopyJoinLink={copyJoinLink}
          canShareInvitation={canShareInvitation}
          onRevokeInvitation={revokeInvitation}
          onSaveSettings={updateOwnLobbySettings}
          onStartRound={startRound}
        />
      ) : (
        <section className="mt-8 grid gap-5">
          <article className="rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
            <p className="text-sm font-semibold text-[#d4e5d9]">{round.courseName.toUpperCase()}</p>
            <h2 className="mt-2 text-2xl font-bold">Reikäpeli</h2>
            <p className="mt-2 text-[#d4e5d9]">
              {gameModeName(round.game.mode)} · {round.players.length} / 4 pelaajaa
            </p>
            {round.game.reward ? (
              <p className="mt-1 text-[#d4e5d9]">Palkinto: {round.game.reward}</p>
            ) : null}
            <p className="mt-1 text-sm text-[#d4e5d9]">
              {gameSettingsName(round.game, round.players)} · {gameStatusName(round.game.standings)}
            </p>
            <p className="mt-1 text-sm text-[#d4e5d9]">
              {liveConnectionStateName(liveConnectionState)}
            </p>
            {canShareInvitation ? (
              <>
                <div className="mt-5 rounded-2xl bg-white p-4 text-center text-[#13251f]">
                  <QRCodeSVG
                    aria-label="Kierroksen liittymis-QR-koodi"
                    className="mx-auto h-auto w-full max-w-52"
                    includeMargin
                    level="M"
                    value={joinUrl}
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Skannaa QR-koodi liittyäksesi kierrokseen.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
                  onClick={copyJoinLink}
                >
                  {copied ? 'Liittymislinkki kopioitu' : 'Kopioi liittymislinkki'}
                </button>
                {isRoundCreator ? (
                  <button
                    type="button"
                    className="mt-3 min-h-12 w-full rounded-xl border border-[#d4e5d9] px-4 py-3 font-bold text-white"
                    onClick={() => void revokeInvitation()}
                  >
                    Mitätöi kutsulinkki
                  </button>
                ) : null}
              </>
            ) : (
              <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-[#d4e5d9]">
                Kutsulinkki ei ole enää voimassa.
              </p>
            )}
            <button
              type="button"
              className="mt-3 min-h-12 w-full rounded-xl border border-[#d4e5d9] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void completeRound()}
              disabled={pendingScoreChanges.length > 0}
            >
              Päätä kierros
            </button>
          </article>

          <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-[#073b2d]">Pelaajat</h2>
            <ul className="mt-3 grid gap-2">
              {round.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-xl bg-[#f1f5ef] px-3 py-3"
                >
                  <span className="font-semibold">{player.name}</span>
                  <span className="text-sm text-[#476257]">
                    Tii {player.teeLabel} · HCP {player.handicapIndex} · pelitasoitus{' '}
                    {player.playingHandicap}
                  </span>
                </li>
              ))}
            </ul>
            <HoleResults standing={round.standings} players={round.players} />
          </article>

          <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#073b2d]">Pelitilanne</h2>
              <span className="text-sm text-[#476257]">
                {round.standings.completedHoles} reikää
              </span>
            </div>
            <ul className="mt-3 grid gap-2">
              {round.players
                .toSorted(
                  (left, right) =>
                    (round.standings.winsByPlayerId[right.id] ?? 0) -
                    (round.standings.winsByPlayerId[left.id] ?? 0),
                )
                .map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-[#f1f5ef] px-3 py-3"
                  >
                    <span className="font-semibold">{player.name}</span>
                    <span className="text-sm font-bold text-[#245642]">
                      {round.standings.winsByPlayerId[player.id] ?? 0} voittoa
                    </span>
                  </li>
                ))}
            </ul>
          </article>

          <form
            className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm"
            onSubmit={submitScore}
          >
            <h2 className="text-xl font-bold text-[#073b2d]">
              {selectedOwnScore === undefined ? 'Merkitse oma tulos' : 'Korjaa omaa tulosta'}
            </h2>
            {selectedOwnScore !== undefined ? (
              <p className="mt-2 text-sm text-[#476257]">
                Reiälle {holeNumber} on tallennettu {selectedOwnScore} lyöntiä. Uusi tallennus
                korvaa vain tämän oman tuloksesi.
              </p>
            ) : null}
            {pendingScoreChanges.length > 0 ? (
              <p
                role="status"
                className="mt-3 rounded-xl bg-[#fff5c2] px-3 py-3 text-sm font-medium text-[#6d5100]"
              >
                {pendingScoreChanges.length}{' '}
                {pendingScoreChanges.length === 1 ? 'tulos odottaa' : 'tulosta odottaa'}{' '}
                tallennusta.
                {pendingScoreChanges.length === 1 ? ' Se lähetetään' : ' Ne lähetetään'}{' '}
                automaattisesti, kun yhteys palautuu.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="hole-number">
                Reikä
                <select
                  id="hole-number"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
                  value={holeNumber}
                  onChange={(event) => setHoleNumber(Number(event.target.value))}
                >
                  {Array.from({ length: 18 }, (_, index) => index + 1).map((hole) => (
                    <option key={hole} value={hole}>
                      {hole}
                      {activePlayerId && round.scores[activePlayerId]?.[hole] !== undefined
                        ? ` · ${round.scores[activePlayerId]![hole]} lyöntiä`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="strokes">
                Lyönnit
                <input
                  id="strokes"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] px-3"
                  type="number"
                  min="1"
                  value={strokes}
                  onChange={(event) => setStrokes(Number(event.target.value))}
                />
              </label>
            </div>
            <button
              type="submit"
              className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
            >
              Tallenna tulos
            </button>
          </form>

          <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
            <form onSubmit={addSideGame}>
              <h2 className="text-xl font-bold text-[#073b2d]">Lisää sivupeli</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="grid gap-2 text-sm font-semibold">
                  Alkaa reiältä
                  <output className="flex min-h-12 items-center rounded-xl border border-[#c9d6ca] bg-[#f1f5ef] px-3">
                    {upcomingHole ?? 'Ei tulevia reikiä'}
                  </output>
                </div>
                <label className="grid gap-2 text-sm font-semibold" htmlFor="side-game-holes">
                  Reikää
                  <input
                    id="side-game-holes"
                    className="min-h-12 rounded-xl border border-[#c9d6ca] px-3"
                    type="number"
                    min="1"
                    max={19 - (upcomingHole ?? 18)}
                    value={sideGameHoles}
                    onChange={(event) => setSideGameHoles(Number(event.target.value))}
                  />
                </label>
              </div>
              <label className="mt-3 grid gap-2 text-sm font-semibold" htmlFor="side-game-mode">
                Pelimuoto
                <select
                  id="side-game-mode"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
                  value={sideGameMode}
                  onChange={(event) =>
                    setSideGameMode(event.target.value === 'handicap' ? 'handicap' : 'scratch')
                  }
                >
                  <option value="scratch">Scratch-reikäpeli</option>
                  <option value="handicap">Tasoituksellinen reikäpeli</option>
                </select>
              </label>
              <label className="mt-3 grid gap-2 text-sm font-semibold" htmlFor="side-game-reward">
                Palkinto (valinnainen)
                <input
                  id="side-game-reward"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] px-3"
                  value={sideGameReward}
                  onChange={(event) => setSideGameReward(event.target.value)}
                  placeholder="Esim. voittajalle olut"
                />
              </label>
              <fieldset className="mt-3 grid gap-2">
                <legend className="text-sm font-semibold">Sivupelin pelaajat</legend>
                {round.players.map((player) => (
                  <label
                    key={player.id}
                    className="flex min-h-11 items-center gap-3 rounded-xl bg-[#f1f5ef] px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={sideGamePlayerIds.includes(player.id)}
                      onChange={(event) =>
                        setSideGamePlayerIds((playerIds) =>
                          event.target.checked
                            ? [...playerIds, player.id]
                            : playerIds.filter((playerId) => playerId !== player.id),
                        )
                      }
                    />
                    {player.name}
                  </label>
                ))}
              </fieldset>
              <label
                className="mt-3 grid gap-2 text-sm font-semibold"
                htmlFor="side-game-hole-tie-rule"
              >
                Tasatuloksen sääntö reiällä
                <select
                  id="side-game-hole-tie-rule"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
                  value={sideGameHoleTieRule}
                  onChange={(event) =>
                    setSideGameHoleTieRule(
                      event.target.value === 'carry-forward' ? 'carry-forward' : 'no-winner',
                    )
                  }
                >
                  <option value="no-winner">Tasatuloksesta ei voittoa</option>
                  <option value="carry-forward">Voitto siirtyy seuraavalle reiälle</option>
                </select>
              </label>
              {sideGameHoleTieRule === 'carry-forward' ? (
                <fieldset className="mt-3 grid gap-2">
                  <legend className="text-sm font-semibold">
                    Valitse pelaajat, jotka voivat ratkaista siirtyvän voiton
                  </legend>
                  {round.players.map((player) => (
                    <label
                      key={player.id}
                      className="flex min-h-11 items-center gap-3 rounded-xl bg-[#f1f5ef] px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={sideGameCarryEligiblePlayerIds.includes(player.id)}
                        onChange={(event) =>
                          setSideGameCarryEligiblePlayerIds((playerIds) =>
                            event.target.checked
                              ? [...playerIds, player.id]
                              : playerIds.filter((playerId) => playerId !== player.id),
                          )
                        }
                      />
                      {player.name}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              <label
                className="mt-3 grid gap-2 text-sm font-semibold"
                htmlFor="side-game-end-tie-rule"
              >
                Tasatulos pelin lopussa
                <select
                  id="side-game-end-tie-rule"
                  className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
                  value={sideGameEndTieRule}
                  onChange={(event) =>
                    setSideGameEndTieRule(event.target.value === 'continue' ? 'continue' : 'draw')
                  }
                >
                  <option value="draw">Merkitään tasapeliksi</option>
                  <option value="continue">Jatketaan reikä kerrallaan</option>
                </select>
              </label>
              <button
                type="submit"
                className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!upcomingHole || sideGamePlayerIds.length < 2}
              >
                Aloita sivupeli
              </button>
            </form>

            {round.sideGames.length > 0 ? (
              <>
                <h3 className="mt-6 text-lg font-bold text-[#073b2d]">Aktiiviset sivupelit</h3>
                <ul className="mt-3 grid gap-2">
                  {round.sideGames.map((game) => (
                    <li key={game.id} className="rounded-xl bg-[#f1f5ef] px-3 py-3 text-sm">
                      Reiät {game.startHole}–{game.startHole + game.holeCount - 1} ·{' '}
                      {gameModeName(game.mode)}
                      {game.reward ? ` · Palkinto: ${game.reward}` : ''}
                      <span className="mt-1 block text-[#476257]">
                        {gameSettingsName(game, round.players)} · {gameStatusName(game.standings)}
                      </span>
                      <p className="mt-1 text-[#476257]">
                        Pelaajat: {participantNames(game, round.players)}
                      </p>
                      <GameWins standing={game.standings} players={round.players} />
                      <HoleResults standing={game.standings} players={round.players} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </article>
        </section>
      )}

      {error ? (
        <StatusMessage className="mt-5" tone="error">
          {error}
        </StatusMessage>
      ) : null}
      {notice ? (
        <StatusMessage className="mt-5" tone="success">
          {notice}
        </StatusMessage>
      ) : null}

      <footer className="mt-auto pt-10 text-center text-sm text-[#62776c]">
        <p>Ensimmäinen kenttä: Golf Talma Master</p>
        {guestSession ? (
          <div className="mt-3 grid gap-3">
            <Action disabled={deletingData} onClick={() => void clearDeviceData()} tone="secondary">
              {deletingData ? 'Tyhjennetään tietoja…' : 'Tyhjennä tämän laitteen tiedot'}
            </Action>
            <Action disabled={deletingData} onClick={() => void deleteData()}>
              {deletingData ? 'Poistetaan tietoja…' : 'Poista vierastietoni'}
            </Action>
          </div>
        ) : null}
      </footer>
    </main>
  );
}

function isInvitationValid(
  round: Pick<PreviewRound, 'invitationExpiresAt' | 'invitationRevokedAt'>,
) {
  return !round.invitationRevokedAt && new Date(round.invitationExpiresAt).getTime() > Date.now();
}

function RoundLobby({
  round,
  activePlayerId,
  copied,
  onCopyJoinLink,
  canShareInvitation,
  onRevokeInvitation,
  onSaveSettings,
  onStartRound,
}: {
  round: PreviewRound;
  activePlayerId: string | null;
  copied: boolean;
  onCopyJoinLink: () => Promise<void>;
  canShareInvitation: boolean;
  onRevokeInvitation: () => Promise<void>;
  onSaveSettings: (settings: {
    name: string;
    handicapIndex: number;
    teeLabel: string;
    ratingTable: 'men' | 'women';
  }) => Promise<void>;
  onStartRound: () => Promise<void>;
}) {
  const currentPlayer = round.players.find((player) => player.id === activePlayerId);
  const [playerName, setPlayerName] = useState(currentPlayer?.name ?? '');
  const [handicapIndex, setHandicapIndex] = useState(currentPlayer?.handicapIndex ?? 18);
  const [teeLabel, setTeeLabel] = useState(currentPlayer?.teeLabel ?? '52');
  const [ratingTable, setRatingTable] = useState<'men' | 'women'>(
    currentPlayer?.ratingTable ?? 'men',
  );

  useEffect(() => {
    if (!currentPlayer) {
      return;
    }
    setPlayerName(currentPlayer.name);
    setHandicapIndex(currentPlayer.handicapIndex);
    setTeeLabel(currentPlayer.teeLabel);
    setRatingTable(currentPlayer.ratingTable);
  }, [
    currentPlayer?.handicapIndex,
    currentPlayer?.id,
    currentPlayer?.name,
    currentPlayer?.ratingTable,
    currentPlayer?.teeLabel,
  ]);

  const creatorPlayerId = round.creatorIdentityId
    ? round.players.find((player) => player.identityId === round.creatorIdentityId)?.id
    : undefined;
  const isCreator = creatorPlayerId === activePlayerId;
  const allReady =
    round.players.length >= 2 &&
    round.players.length <= 4 &&
    round.players.every((player) => player.ready);
  const joinUrl = new URL(round.joinLink, window.location.origin).toString();

  return (
    <section className="mt-8 grid gap-5">
      <article className="rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
        <p className="text-sm font-semibold text-[#d4e5d9]">{round.courseName.toUpperCase()}</p>
        <h2 className="mt-2 text-2xl font-bold">Vahvista ryhmä ennen aloitusta</h2>
        <p className="mt-2 text-[#d4e5d9]">
          {round.players.length} / 4 pelaajaa ·{' '}
          {round.players.filter((player) => player.ready).length} valmiina
        </p>
        {canShareInvitation ? (
          <>
            <div className="mt-5 rounded-2xl bg-white p-4 text-center text-[#13251f]">
              <QRCodeSVG
                aria-label="Kierroksen liittymis-QR-koodi"
                className="mx-auto h-auto w-full max-w-52"
                includeMargin
                level="M"
                value={joinUrl}
              />
              <p className="mt-3 text-sm font-semibold">
                Skannaa QR-koodi liittyäksesi kierrokseen.
              </p>
            </div>
            <button
              type="button"
              className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
              onClick={() => void onCopyJoinLink()}
            >
              {copied ? 'Liittymislinkki kopioitu' : 'Kopioi liittymislinkki'}
            </button>
            {isCreator ? (
              <button
                type="button"
                className="mt-3 min-h-12 w-full rounded-xl border border-[#d4e5d9] px-4 py-3 font-bold text-white"
                onClick={() => void onRevokeInvitation()}
              >
                Mitätöi kutsulinkki
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-[#d4e5d9]">
            Kutsulinkki ei ole enää voimassa.
          </p>
        )}
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Pelaajat ja valmius</h2>
        <ul className="mt-3 grid gap-2">
          {round.players.map((player) => (
            <li key={player.id} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">
                  {player.name}
                  {player.id === creatorPlayerId ? ' · luoja' : ''}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    player.ready ? 'bg-[#d4e5d9] text-[#245642]' : 'bg-[#fff5c2] text-[#6d5100]'
                  }`}
                >
                  {player.ready ? 'Valmis' : 'Odottaa vahvistusta'}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#476257]">
                Tii {player.teeLabel} · HCP {player.handicapIndex} ·{' '}
                {player.ratingTable === 'women' ? 'naisten taulukko' : 'miesten taulukko'} ·
                pelitasoitus {player.playingHandicap}
              </p>
            </li>
          ))}
        </ul>
      </article>

      {currentPlayer ? (
        <form
          className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveSettings({ name: playerName, handicapIndex, teeLabel, ratingTable });
          }}
        >
          <h2 className="text-xl font-bold text-[#073b2d]">Omat asetuksesi</h2>
          <p className="mt-2 text-sm text-[#476257]">
            Vahvista omat asetuksesi. Muut pelaajat voivat muuttaa vain omiaan.
          </p>
          <label className="mt-4 grid gap-2 text-sm font-semibold" htmlFor="lobby-player-name">
            Oma nimi
            <input
              id="lobby-player-name"
              className="min-h-12 rounded-xl border border-[#c9d6ca] px-3"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              required
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-semibold" htmlFor="lobby-handicap-index">
            Tasoitusindeksi
            <input
              id="lobby-handicap-index"
              className="min-h-12 rounded-xl border border-[#c9d6ca] px-3"
              type="number"
              step="0.1"
              value={handicapIndex}
              onChange={(event) => setHandicapIndex(Number(event.target.value))}
              required
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-semibold" htmlFor="lobby-tee-label">
            Tii
            <select
              id="lobby-tee-label"
              className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
              value={teeLabel}
              onChange={(event) => setTeeLabel(event.target.value)}
            >
              {['48', '52', '56', '60', '64'].map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-2 text-sm font-semibold" htmlFor="lobby-rating-table">
            Pelitasoitustaulukko
            <select
              id="lobby-rating-table"
              className="min-h-12 rounded-xl border border-[#c9d6ca] bg-white px-3"
              value={ratingTable}
              onChange={(event) => setRatingTable(event.target.value === 'women' ? 'women' : 'men')}
            >
              <option value="men">Miesten taulukko</option>
              <option value="women">Naisten taulukko</option>
            </select>
          </label>
          <button
            type="submit"
            className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
          >
            {currentPlayer.ready ? 'Päivitä ja vahvista asetukset' : 'Vahvista asetukset valmiiksi'}
          </button>
        </form>
      ) : null}

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Pelin valmius</h2>
        <p className="mt-2 text-[#476257]">{gameModeName(round.game.mode)}</p>
        <p className="mt-1 text-sm text-[#476257]">
          {gameSettingsName(round.game, round.players)}
          {round.game.reward ? ` · Palkinto: ${round.game.reward}` : ''}
        </p>
        {isCreator ? (
          <>
            <p className="mt-4 text-sm text-[#476257]">
              {allReady
                ? 'Kaikki asetukset on vahvistettu. Voit aloittaa kierroksen.'
                : 'Aloitus vaatii 2–4 pelaajaa ja jokaisen vahvistuksen.'}
            </p>
            <button
              type="button"
              className="mt-4 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!allReady}
              onClick={() => void onStartRound()}
            >
              Aloita kierros
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-[#476257]">
            Kierroksen luoja aloittaa, kun kaikkien asetukset ovat valmiit.
          </p>
        )}
      </article>
    </section>
  );
}

function CompletedRoundHistory({
  round,
  onBack,
}: {
  round: CompletedPreviewRound;
  onBack: () => void;
}) {
  const standings = [...round.players].toSorted(
    (left, right) =>
      (round.standings.winsByPlayerId[right.id] ?? 0) -
      (round.standings.winsByPlayerId[left.id] ?? 0),
  );

  return (
    <section className="mt-8 grid gap-5">
      <article className="rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
        <p className="text-sm font-semibold text-[#d4e5d9]">{round.courseName.toUpperCase()}</p>
        <h2 className="mt-2 text-2xl font-bold">Kierros päättyi</h2>
        <p className="mt-2 text-[#d4e5d9]">{formatCompletedDate(round.completedAt)}</p>
        <p className="mt-4 text-lg font-semibold">{formatOutcome(round)}</p>
        <button
          type="button"
          className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
          onClick={onBack}
        >
          Takaisin kierroksiin
        </button>
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Pelaajat</h2>
        <ul className="mt-3 grid gap-2">
          {round.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl bg-[#f1f5ef] px-3 py-3"
            >
              <span className="font-semibold">{player.name}</span>
              <span className="text-sm text-[#476257]">
                Tii {player.teeLabel} · HCP {player.handicapIndex} · pelitasoitus{' '}
                {player.playingHandicap}
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Peliasetukset</h2>
        <div className="mt-3 rounded-xl bg-[#f1f5ef] px-3 py-3">
          <h3 className="font-semibold">Pääpeli</h3>
          <p className="mt-1 text-sm text-[#476257]">{gameModeName(round.game.mode)}</p>
          <p className="mt-1 text-sm text-[#476257]">
            {gameSettingsName(round.game, round.players)} · {gameStatusName(round.game.standings)}
          </p>
          <p className="mt-1 text-sm text-[#476257]">
            Pelaajat: {participantNames(round.game, round.players)}
          </p>
          {round.game.reward ? (
            <p className="mt-1 text-sm text-[#476257]">Palkinto: {round.game.reward}</p>
          ) : null}
        </div>

        <h3 className="mt-5 text-lg font-bold text-[#073b2d]">Sivupelit</h3>
        {round.sideGames.length === 0 ? (
          <p className="mt-2 text-sm text-[#476257]">Sivupelejä ei lisätty.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {round.sideGames.map((game) => (
              <li key={game.id} className="rounded-xl bg-[#f1f5ef] px-3 py-3 text-sm">
                Reiät {game.startHole}–{game.startHole + game.holeCount - 1} ·{' '}
                {gameModeName(game.mode)}
                {game.reward ? ` · Palkinto: ${game.reward}` : ''}
                <span className="mt-1 block text-[#476257]">
                  {gameSettingsName(game, round.players)} · {gameStatusName(game.standings)}
                </span>
                <span className="mt-1 block text-[#476257]">
                  Pelaajat: {participantNames(game, round.players)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Syötetyt tulokset</h2>
        <div className="mt-3 grid gap-3">
          {round.players.map((player) => {
            const scores = Object.entries(round.scores[player.id] ?? {}).toSorted(
              ([leftHole], [rightHole]) => Number(leftHole) - Number(rightHole),
            );

            return (
              <section key={player.id} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
                <h3 className="font-semibold">{player.name}</h3>
                {scores.length === 0 ? (
                  <p className="mt-1 text-sm text-[#476257]">Ei merkittyjä tuloksia.</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {scores.map(([holeNumber, strokes]) => (
                      <li key={holeNumber} className="rounded-lg bg-white px-2 py-2">
                        Reikä {holeNumber}: {strokes} lyöntiä
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#073b2d]">Lopputilanne</h2>
          <span className="text-sm text-[#476257]">{round.standings.completedHoles} reikää</span>
        </div>
        <ul className="mt-3 grid gap-2">
          {standings.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl bg-[#f1f5ef] px-3 py-3"
            >
              <span className="font-semibold">{player.name}</span>
              <span className="text-sm font-bold text-[#245642]">
                {round.standings.winsByPlayerId[player.id] ?? 0} voittoa
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#073b2d]">Lopputulos</h2>
        <p className="mt-2 text-[#476257]">{formatOutcome(round)}</p>
      </article>
    </section>
  );
}

function gameModeName(mode: 'scratch' | 'handicap'): string {
  return mode === 'handicap' ? 'Tasoituksellinen reikäpeli' : 'Scratch-reikäpeli';
}

function gameSettingsName(game: PreviewGame, players: PreviewPlayer[]): string {
  const holeTieRule =
    game.holeTieRule === 'carry-forward'
      ? `Tasatulos siirtyy (${eligiblePlayerNames(game, players)})`
      : 'Tasatuloksesta ei voittoa';
  const endTieRule =
    game.endTieRule === 'continue' ? 'tasatilanne jatkuu' : 'tasatilanne on tasapeli';
  return `${holeTieRule}; lopussa ${endTieRule}`;
}

function eligiblePlayerNames(game: PreviewGame, players: PreviewPlayer[]): string {
  const names = game.carryEligiblePlayerIds
    .map((playerId) => players.find((player) => player.id === playerId)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : 'valitut pelaajat';
}

function participantNames(game: PreviewGame, players: PreviewPlayer[]): string {
  const names = (game.participantIds ?? players.map((player) => player.id))
    .map((playerId) => players.find((player) => player.id === playerId)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : 'kaikki pelaajat';
}

function GameWins({ standing, players }: { standing: GameStanding; players: PreviewPlayer[] }) {
  const playerIds = Object.keys(standing.winsByPlayerId);
  if (playerIds.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 grid gap-1 text-[#476257]">
      {playerIds
        .toSorted(
          (left, right) =>
            (standing.winsByPlayerId[right] ?? 0) - (standing.winsByPlayerId[left] ?? 0),
        )
        .map((playerId) => (
          <li key={playerId}>
            {players.find((player) => player.id === playerId)?.name ?? 'Poistettu pelaaja'}:{' '}
            {standing.winsByPlayerId[playerId] ?? 0} voittoa
          </li>
        ))}
    </ul>
  );
}

function HoleResults({ standing, players }: { standing: GameStanding; players: PreviewPlayer[] }) {
  if (standing.holeResults.length === 0) {
    return (
      <p className="mt-3 text-sm text-[#476257]">Ei vielä valmiita reikäkohtaisia tuloksia.</p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2 text-sm">
      {standing.holeResults.map((result) => {
        const winner = result.winnerId
          ? players.find((player) => player.id === result.winnerId)?.name
          : undefined;
        return (
          <li key={result.holeNumber} className="rounded-lg bg-white px-3 py-2 text-[#476257]">
            Reikä {result.holeNumber}:{' '}
            {winner
              ? `${winner} voitti${result.winsAwarded > 1 ? ` ${result.winsAwarded} voittoa` : ''}`
              : 'tasatulos'}
            {result.carriedWinsAfterHole > 0
              ? ` · ${result.carriedWinsAfterHole} voittoa siirtyy`
              : ''}
          </li>
        );
      })}
    </ul>
  );
}

function liveConnectionStateName(
  state: 'connecting' | 'live' | 'polling' | 'reconnecting',
): string {
  switch (state) {
    case 'live':
      return 'Live-yhteys toiminnassa';
    case 'polling':
      return 'Päivitykset tarkistetaan automaattisesti';
    case 'reconnecting':
      return 'Yhteyttä palautetaan…';
    default:
      return 'Yhdistetään live-päivityksiin…';
  }
}

function nextUpcomingHole(round: PreviewRound): number | undefined {
  const scoredHoleNumbers = Object.values(round.scores).flatMap((scores) =>
    Object.keys(scores).map(Number),
  );
  const lastPlayedHole = Math.max(0, ...scoredHoleNumbers);
  return lastPlayedHole < 18 ? lastPlayedHole + 1 : undefined;
}

function gameStatusName(standings: GameStanding): string {
  switch (standings.status) {
    case 'winner':
      return 'Peli ratkesi';
    case 'draw':
      return 'Tasapeli';
    case 'extension':
      return `Jatkuu seuraavalla reiällä${standings.carriedWins > 0 ? ' (siirtyvä voitto)' : ''}`;
    case 'unresolved':
      return 'Ratkaisematta';
    default:
      return `Kesken${standings.carriedWins > 0 ? ' (siirtyvä voitto)' : ''}`;
  }
}

function formatCompletedDate(completedAt: string): string {
  return new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(completedAt));
}

function formatOutcome(round: CompletedPreviewRound): string {
  const playerNames = round.outcome.playerIds
    .map((playerId) => round.players.find((player) => player.id === playerId)?.name)
    .filter((name): name is string => Boolean(name));
  const names = playerNames.join(' ja ');

  if (round.outcome.kind === 'winner') {
    return `${names || 'Voittaja'} voitti ${round.outcome.wins} reiällä.`;
  }

  if (round.outcome.kind === 'unresolved') {
    return 'Peli jäi ratkaisematta kierroksen päättyessä.';
  }

  return `${names || 'Pelaajat'} jakoivat voiton ${round.outcome.wins} reiällä.`;
}

export default App;

function getInvitationTokenFromJoinLink(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    return url.searchParams.get('join');
  } catch {
    return null;
  }
}
