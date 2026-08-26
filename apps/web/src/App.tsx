import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
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
import { apiUrl } from './lib/api-url';
import { Action, Card, StatusMessage } from './ui';

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
  games?: PreviewGame[];
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

class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const previewGuestStorageKey = 'vaylakaverit.previewGuestId';

function previewGuestId(): string {
  const storedGuestId = window.localStorage.getItem(previewGuestStorageKey);
  if (storedGuestId) {
    return storedGuestId;
  }

  const guestId = crypto.randomUUID();
  window.localStorage.setItem(previewGuestStorageKey, guestId);
  return guestId;
}

async function request<T>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = body ? 'POST' : 'GET',
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      'x-preview-guest-id': previewGuestId(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String(payload.error)
        : 'Pyyntö epäonnistui.';
    throw new ApiRequestError(message, response.status, payload);
  }
  return payload as T;
}

function scoreRequestCanBeQueued(error: unknown): boolean {
  return !(error instanceof ApiRequestError) || error.status >= 500;
}

function unavailableInvitationMessage(): string {
  return 'Liittymislinkki ei ole enää voimassa. Pyydä kierroksen luojalta uusi linkki.';
}

function offlineInvitationMessage(): string {
  return 'Liittyminen vaatii verkkoyhteyden. Yhdistä verkkoon ja yritä uudelleen.';
}

function invitationRequestErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return unavailableInvitationMessage();
    }

    if (error.status === 400 || error.status === 409) {
      return 'Kierrokseen ei voi enää liittyä, koska se on aloitettu tai ryhmä on täynnä.';
    }
  }

  return navigator.onLine === false
    ? offlineInvitationMessage()
    : 'Kutsulinkkiä ei voitu avata. Yritä uudelleen.';
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

type StartGameDraft = {
  id: string;
  mode: 'scratch' | 'handicap';
  reward: string;
  holeTieRule: 'no-winner' | 'carry-forward';
  endTieRule: 'draw' | 'continue';
};

function createStartGameDraft(): StartGameDraft {
  return {
    id: crypto.randomUUID(),
    mode: 'scratch',
    reward: '',
    holeTieRule: 'no-winner',
    endTieRule: 'draw',
  };
}

function fullRoundGames(round: Pick<PreviewRound, 'game' | 'games'>): PreviewGame[] {
  return round.games && round.games.length > 0 ? round.games : [round.game];
}

function App() {
  const [joinInvitationToken, setJoinInvitationToken] = useState(() =>
    new URLSearchParams(window.location.search).get('join'),
  );
  const [name, setName] = useState('');
  const [round, setRound] = useState<PreviewRound | null>(null);
  const [invitationRound, setInvitationRound] = useState<PreviewRound | null>(null);
  const [completedRounds, setCompletedRounds] = useState<CompletedPreviewRound[]>([]);
  const [completedRound, setCompletedRound] = useState<CompletedPreviewRound | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [manualJoin, setManualJoin] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [handicapIndex, setHandicapIndex] = useState(18);
  const [teeLabel, setTeeLabel] = useState('52');
  const [ratingTable, setRatingTable] = useState<'men' | 'women'>('men');
  const [startGames, setStartGames] = useState<StartGameDraft[]>(() => [createStartGameDraft()]);
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
  const [creatingRound, setCreatingRound] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [liveConnectionState, setLiveConnectionState] = useState<
    'connecting' | 'live' | 'polling' | 'reconnecting'
  >('connecting');
  const replayInProgress = useRef(false);
  const startGameHeadingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const addStartGameRef = useRef<HTMLButtonElement>(null);
  const lobbyHeadingRef = useRef<HTMLHeadingElement>(null);

  const joinUrl = round ? new URL(round.joinLink, window.location.origin).toString() : '';
  const canShareInvitation = round ? isInvitationValid(round) : false;
  const isRoundCreator =
    round?.players.find((player) => player.id === activePlayerId)?.identityId ===
    round?.creatorIdentityId;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!joinInvitationToken || round) {
      return undefined;
    }

    let active = true;
    setError(null);
    if (navigator.onLine === false) {
      setInvitationLoading(false);
      setError(offlineInvitationMessage());
      return undefined;
    }

    setInvitationLoading(true);
    void request<PreviewRound>(
      `/api/preview/invitations/${encodeURIComponent(joinInvitationToken)}`,
    )
      .then((invitedRound) => {
        if (active) {
          setInvitationRound(invitedRound);
          setInvitationLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setInvitationLoading(false);
          setError(invitationRequestErrorMessage(requestError));
        }
      });

    return () => {
      active = false;
    };
  }, [joinInvitationToken, round]);

  useEffect(() => {
    if (round?.state === 'lobby') {
      lobbyHeadingRef.current?.focus();
    }
  }, [round?.id, round?.state]);

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
    setNotice(null);
    if (startGames.length === 0) {
      setError('Valitse vähintään yksi peli.');
      return;
    }

    try {
      setCreatingRound(true);
      const createdRound = await request<PreviewRound>('/api/preview/rounds', {
        name,
        handicapIndex,
        teeLabel,
        ratingTable,
        games: startGames.map(({ id: _id, ...game }) => game),
      });
      setRound(createdRound);
      setActivePlayerId(createdRound.players[0]?.id ?? null);
      setCopied(false);
      setNotice('Kierros ja pelit luotiin.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kierrosta ei voitu luoda.');
    } finally {
      setCreatingRound(false);
    }
  }

  function addStartGame() {
    const game = createStartGameDraft();
    setStartGames((games) => [...games, game]);
    requestAnimationFrame(() => startGameHeadingRefs.current.get(game.id)?.focus());
  }

  function removeStartGame(gameId: string) {
    const gameIndex = startGames.findIndex((game) => game.id === gameId);
    const precedingGameId = startGames[gameIndex - 1]?.id;
    setStartGames((games) => games.filter((game) => game.id !== gameId));
    requestAnimationFrame(() => {
      if (precedingGameId) {
        startGameHeadingRefs.current.get(precedingGameId)?.focus();
      } else {
        addStartGameRef.current?.focus();
      }
    });
  }

  function updateStartGame(gameId: string, update: Partial<Omit<StartGameDraft, 'id'>>) {
    setStartGames((games) =>
      games.map((game) => (game.id === gameId ? { ...game, ...update } : game)),
    );
  }

  async function joinRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const invitationToken = joinInvitationToken ?? getInvitationTokenFromJoinLink(joinLink);

    if (!invitationToken) {
      setError('Anna voimassa oleva liittymislinkki.');
      return;
    }

    if (navigator.onLine === false) {
      setError(offlineInvitationMessage());
      return;
    }

    setJoining(true);
    try {
      const joinedRound = await request<PreviewRound>(
        `/api/preview/invitations/${encodeURIComponent(invitationToken)}/join`,
        {
          name,
          handicapIndex,
          teeLabel,
          ratingTable,
        },
      );
      setRound(joinedRound);
      setInvitationRound(null);
      setCopied(false);
      setNotice('Liityit kierrokseen. Vahvista seuraavaksi omat asetuksesi.');
      setActivePlayerId(
        joinedRound.players.find((player) => player.identityId === `guest:${previewGuestId()}`)
          ?.id ?? null,
      );
    } catch (requestError) {
      setError(invitationRequestErrorMessage(requestError));
    } finally {
      setJoining(false);
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
      await request<{ anonymizedRoundCount: number }>('/api/account', undefined, 'DELETE');
      await clearPendingScoreChanges();
      window.localStorage.removeItem(previewGuestStorageKey);
      setPendingScoreChanges([]);
      setRound(null);
      setCompletedRound(null);
      setActivePlayerId(null);
      setName('');
      setNotice(
        'Tietosi on poistettu. Yhteisissä kierroksissa nimesi on anonymisoitu ja muut tulokset säilyvät.',
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tietoja ei voitu poistaa.');
    } finally {
      setDeletingData(false);
    }
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
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#073b2d]">
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
          <section
            aria-busy={invitationLoading || joining}
            className="mt-10 rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15"
          >
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
            {invitationLoading ? (
              <p role="status" className="mt-4 text-sm font-semibold text-[#d4e5d9]">
                Avataan kierrosta…
              </p>
            ) : null}
            {invitationRound ? (
              <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-[#d4e5d9]">
                <p className="font-semibold text-white">{invitationRound.courseName}</p>
                <p className="mt-1">
                  {invitationRound.players.length} / 4 pelaajaa ·{' '}
                  {invitationRound.standings.completedHoles} reikää pelattu
                </p>
                <p className="mt-2">
                  Katselet kierrosta kutsulinkillä. Liity tallentaaksesi tuloksia.
                </p>
                <PublicRoundView round={invitationRound} />
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
              <label className="grid gap-2 text-sm font-semibold" htmlFor="player-name">
                Oma nimi
                <input
                  id="player-name"
                  className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Esim. Aleksi"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="handicap-index">
                Tasoitusindeksi
                <input
                  id="handicap-index"
                  className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                  type="number"
                  step="0.1"
                  value={handicapIndex}
                  onChange={(event) => setHandicapIndex(Number(event.target.value))}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="tee-label">
                Tii
                <select
                  id="tee-label"
                  className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
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
              <label className="grid gap-2 text-sm font-semibold" htmlFor="rating-table">
                Pelitasoitustaulukko
                <select
                  id="rating-table"
                  className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                  value={ratingTable}
                  onChange={(event) =>
                    setRatingTable(event.target.value === 'women' ? 'women' : 'men')
                  }
                >
                  <option value="men">Miesten taulukko</option>
                  <option value="women">Naisten taulukko</option>
                </select>
              </label>
              {!joinInvitationToken && !manualJoin ? (
                <Card className="grid gap-3 bg-white/10 p-4 text-white">
                  <div>
                    <h3 className="text-lg font-bold">Pelit alusta</h3>
                    <p className="mt-1 text-sm text-[#d4e5d9]">
                      Voit pelata useaa peliä samanaikaisesti. Jokainen peli lasketaan erikseen.
                    </p>
                  </div>
                  {startGames.map((game, index) => (
                    <section
                      key={game.id}
                      className="grid gap-3 rounded-xl bg-white/10 p-3"
                      aria-labelledby={`start-game-${game.id}-heading`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4
                          id={`start-game-${game.id}-heading`}
                          ref={(heading) => {
                            if (heading) {
                              startGameHeadingRefs.current.set(game.id, heading);
                            } else {
                              startGameHeadingRefs.current.delete(game.id);
                            }
                          }}
                          tabIndex={-1}
                          className="font-bold"
                        >
                          Peli {index + 1}
                        </h4>
                        {index > 0 ? (
                          <Action
                            tone="secondary"
                            className="text-sm"
                            aria-label={`Poista peli ${index + 1}`}
                            onClick={() => removeStartGame(game.id)}
                          >
                            Poista peli
                          </Action>
                        ) : null}
                      </div>
                      <label
                        className="grid gap-2 text-sm font-semibold"
                        htmlFor={`start-game-${game.id}-mode`}
                      >
                        Pelimuoto
                        <select
                          id={`start-game-${game.id}-mode`}
                          className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                          value={game.mode}
                          onChange={(event) =>
                            updateStartGame(game.id, {
                              mode: event.target.value === 'handicap' ? 'handicap' : 'scratch',
                            })
                          }
                        >
                          <option value="scratch">Scratch-reikäpeli</option>
                          <option value="handicap">Tasoituksellinen reikäpeli</option>
                        </select>
                      </label>
                      <label
                        className="grid gap-2 text-sm font-semibold"
                        htmlFor={`start-game-${game.id}-reward`}
                      >
                        Palkinto (valinnainen)
                        <input
                          id={`start-game-${game.id}-reward`}
                          className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                          value={game.reward}
                          onChange={(event) =>
                            updateStartGame(game.id, { reward: event.target.value })
                          }
                          placeholder="Esim. voittajalle olut"
                        />
                      </label>
                      <label
                        className="grid gap-2 text-sm font-semibold"
                        htmlFor={`start-game-${game.id}-hole-tie-rule`}
                      >
                        Tasatuloksen sääntö reiällä
                        <select
                          id={`start-game-${game.id}-hole-tie-rule`}
                          className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                          value={game.holeTieRule}
                          onChange={(event) =>
                            updateStartGame(game.id, {
                              holeTieRule:
                                event.target.value === 'carry-forward'
                                  ? 'carry-forward'
                                  : 'no-winner',
                            })
                          }
                        >
                          <option value="no-winner">Tasatuloksesta ei voittoa</option>
                          <option value="carry-forward">Voitto siirtyy seuraavalle reiälle</option>
                        </select>
                      </label>
                      {game.holeTieRule === 'carry-forward' ? (
                        <p className="text-sm text-[#d4e5d9]">
                          Kierroksen luoja on valittu ratkaisemaan siirtyvän voiton.
                        </p>
                      ) : null}
                      <label
                        className="grid gap-2 text-sm font-semibold"
                        htmlFor={`start-game-${game.id}-end-tie-rule`}
                      >
                        Tasatulos pelin lopussa
                        <select
                          id={`start-game-${game.id}-end-tie-rule`}
                          className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                          value={game.endTieRule}
                          onChange={(event) =>
                            updateStartGame(game.id, {
                              endTieRule: event.target.value === 'continue' ? 'continue' : 'draw',
                            })
                          }
                        >
                          <option value="draw">Merkitään tasapeliksi</option>
                          <option value="continue">Jatketaan reikä kerrallaan</option>
                        </select>
                      </label>
                    </section>
                  ))}
                  <Action ref={addStartGameRef} tone="secondary" onClick={addStartGame}>
                    Lisää peli
                  </Action>
                </Card>
              ) : null}
              {creatingRound ? (
                <StatusMessage tone="info">Luodaan kierrosta ja pelejä…</StatusMessage>
              ) : null}
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
                disabled={creatingRound || invitationLoading || joining}
              >
                {joining
                  ? 'Liitytään kierrokseen…'
                  : joinInvitationToken || manualJoin
                    ? 'Liity kierrokseen'
                    : creatingRound
                      ? 'Luodaan kierrosta ja pelejä…'
                      : 'Luo kierros'}
              </button>
              {!joinInvitationToken ? (
                <button
                  type="button"
                  className="min-h-12 rounded-xl border border-[#d4e5d9] px-4 py-3 font-bold text-white"
                  onClick={() => {
                    setError(null);
                    setManualJoin((value) => !value);
                  }}
                >
                  {manualJoin ? 'Luo uusi kierros' : 'Liity kierrokseen'}
                </button>
              ) : null}
            </form>
          </section>

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
          headingRef={lobbyHeadingRef}
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
            <h2 className="mt-2 text-2xl font-bold">Reikäpelit</h2>
            <p className="mt-2 text-[#d4e5d9]">
              {fullRoundGames(round).length} peliä · {round.players.length} / 4 pelaajaa
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-[#d4e5d9]">
              {fullRoundGames(round).map((game, index) => (
                <li key={game.id ?? index} className="rounded-xl bg-white/10 px-3 py-2">
                  <span className="font-semibold">Peli {index + 1}: </span>
                  {gameModeName(game.mode)} · {gameStatusName(game.standings)}
                  {game.reward ? ` · Palkinto: ${game.reward}` : ''}
                </li>
              ))}
            </ul>
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
              <h2 className="text-xl font-bold text-[#073b2d]">Pelitilanteet</h2>
            </div>
            <div className="mt-3 grid gap-3">
              {fullRoundGames(round).map((game, index) => (
                <section key={game.id ?? index} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
                  <h3 className="font-semibold">
                    Peli {index + 1} · {gameModeName(game.mode)}
                  </h3>
                  <p className="mt-1 text-sm text-[#476257]">
                    {game.standings.completedHoles} reikää · {gameStatusName(game.standings)}
                  </p>
                  <GameWins standing={game.standings} players={round.players} />
                </section>
              ))}
            </div>
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
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-[#fee8e5] px-4 py-3 text-sm font-medium text-[#8a2e22]"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-[#d4e5d9] px-4 py-3 text-sm font-medium text-[#245642]"
        >
          {notice}
        </p>
      ) : null}

      <footer className="mt-auto pt-10 text-center text-sm text-[#62776c]">
        <p>Ensimmäinen kenttä: Golf Talma Master</p>
        <button
          type="button"
          className="mt-3 min-h-11 font-semibold text-[#245642] underline disabled:opacity-60"
          disabled={deletingData}
          onClick={() => void deleteData()}
        >
          {deletingData ? 'Poistetaan tietoja…' : 'Poista tietoni'}
        </button>
      </footer>
    </main>
  );
}

function isInvitationValid(
  round: Pick<PreviewRound, 'invitationExpiresAt' | 'invitationRevokedAt'>,
) {
  return !round.invitationRevokedAt && new Date(round.invitationExpiresAt).getTime() > Date.now();
}

function PublicRoundView({ round }: { round: PreviewRound }) {
  return (
    <div className="mt-4 rounded-xl bg-white/10 px-3 py-3 text-sm">
      <p className="font-semibold text-white">Kierroksen tilanne</p>
      <ul className="mt-2 grid gap-1">
        {round.players.map((player) => (
          <li key={player.id} className="flex justify-between gap-3">
            <span>{player.name}</span>
            <span>{round.standings.winsByPlayerId[player.id] ?? 0} voittoa</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[#d4e5d9]">
        Tämä on vain luku -näkymä. Liity kierrokseen, jos haluat tallentaa oman tuloksesi.
      </p>
    </div>
  );
}

function RoundLobby({
  round,
  activePlayerId,
  headingRef,
  copied,
  onCopyJoinLink,
  canShareInvitation,
  onRevokeInvitation,
  onSaveSettings,
  onStartRound,
}: {
  round: PreviewRound;
  activePlayerId: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
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
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold">
          Vahvista ryhmä ennen aloitusta
        </h2>
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
        <h2 className="text-xl font-bold text-[#073b2d]">Pelien valmius</h2>
        <div className="mt-3 grid gap-2">
          {fullRoundGames(round).map((game, index) => (
            <section key={game.id ?? index} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
              <h3 className="font-semibold">
                Peli {index + 1} · {gameModeName(game.mode)}
              </h3>
              <p className="mt-1 text-sm text-[#476257]">
                {gameSettingsName(game, round.players)}
                {game.reward ? ` · Palkinto: ${game.reward}` : ''}
              </p>
            </section>
          ))}
        </div>
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
        <div className="mt-3 grid gap-2">
          {fullRoundGames(round).map((game, index) => (
            <section key={game.id ?? index} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
              <h3 className="font-semibold">Peli {index + 1}</h3>
              <p className="mt-1 text-sm text-[#476257]">{gameModeName(game.mode)}</p>
              <p className="mt-1 text-sm text-[#476257]">
                {gameSettingsName(game, round.players)} · {gameStatusName(game.standings)}
              </p>
              <p className="mt-1 text-sm text-[#476257]">
                Pelaajat: {participantNames(game, round.players)}
              </p>
              {game.reward ? (
                <p className="mt-1 text-sm text-[#476257]">Palkinto: {game.reward}</p>
              ) : null}
            </section>
          ))}
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
        <h2 className="text-xl font-bold text-[#073b2d]">Lopputilanteet</h2>
        <div className="mt-3 grid gap-3">
          {fullRoundGames(round).map((game, index) => (
            <section key={game.id ?? index} className="rounded-xl bg-[#f1f5ef] px-3 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Peli {index + 1}</h3>
                <span className="text-sm text-[#476257]">
                  {game.standings.completedHoles} reikää
                </span>
              </div>
              <GameWins standing={game.standings} players={round.players} />
            </section>
          ))}
        </div>
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
