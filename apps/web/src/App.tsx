import { useEffect, useMemo, useState, type FormEvent } from 'react';

type PreviewPlayer = {
  id: string;
  name: string;
  teeLabel: string;
  handicapIndex: number;
};

type PreviewRound = {
  id: string;
  courseName: string;
  joinLink: string;
  players: PreviewPlayer[];
  scores: Record<string, Record<number, number>>;
  game: {
    mode: 'scratch' | 'handicap';
    reward: string;
  };
  standings: {
    completedHoles: number;
    winsByPlayerId: Record<string, number>;
  };
};

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String(payload.error)
        : 'Pyyntö epäonnistui.';
    throw new Error(message);
  }
  return payload as T;
}

function App() {
  const joinRoundId = useMemo(() => new URLSearchParams(window.location.search).get('join'), []);
  const [name, setName] = useState('');
  const [round, setRound] = useState<PreviewRound | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [manualJoin, setManualJoin] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [handicapIndex, setHandicapIndex] = useState(18);
  const [gameMode, setGameMode] = useState<'scratch' | 'handicap'>('scratch');
  const [reward, setReward] = useState('');
  const [holeNumber, setHoleNumber] = useState(1);
  const [strokes, setStrokes] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!round) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        setRound(await request<PreviewRound>(`/api/preview/rounds/${round.id}`));
      } catch {
        // The preview server may have been restarted; the next user action will show the error.
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [round]);

  async function createRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const createdRound = await request<PreviewRound>('/api/preview/rounds', {
        name,
        handicapIndex,
        mode: gameMode,
        reward,
      });
      setRound(createdRound);
      setActivePlayerId(createdRound.players[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kierrosta ei voitu luoda.');
    }
  }

  async function joinRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const roundId = joinRoundId ?? getRoundIdFromJoinLink(joinLink);

    if (!roundId) {
      setError('Anna voimassa oleva liittymislinkki.');
      return;
    }

    try {
      const joinedRound = await request<PreviewRound>(`/api/preview/rounds/${roundId}/join`, {
        name,
        handicapIndex,
      });
      setRound(joinedRound);
      setActivePlayerId(joinedRound.players.at(-1)?.id ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Kierrokseen ei voitu liittyä.',
      );
    }
  }

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!round || !activePlayerId) {
      return;
    }

    try {
      setRound(
        await request<PreviewRound>(`/api/preview/rounds/${round.id}/scores`, {
          playerId: activePlayerId,
          holeNumber,
          strokes,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Tulosta ei voitu tallentaa.',
      );
    }
  }

  async function copyJoinLink() {
    if (!round) {
      return;
    }

    await navigator.clipboard.writeText(`${window.location.origin}/?join=${round.id}`);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-[#f7f8f4] px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-[#386354]">VÄYLÄKAVERIT</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#073b2d]">
            {round ? 'Kierros käynnissä.' : 'Pelaa kierros yhdessä.'}
          </h1>
        </div>
        <span
          aria-label="Esikatselutila"
          className="rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-semibold text-[#245642]"
        >
          Esikatselu
        </span>
      </header>

      {!round ? (
        <section className="mt-10 rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
          <p className="text-sm font-semibold text-[#d4e5d9]">
            {joinRoundId || manualJoin ? 'LIITY KIERROKSEEN' : 'LUO UUSI KIERROS'}
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            {joinRoundId || manualJoin
              ? 'Liity kaverin kierrokseen.'
              : 'Luo kierros ja kutsu kaveri mukaan.'}
          </h2>
          <p className="mt-3 text-base leading-7 text-[#d4e5d9]">
            Golf Talma Master, tii 52 ja paikallinen vieraskäyttäjä ilman Azurea.
          </p>
          <form
            className="mt-6 grid gap-3"
            onSubmit={joinRoundId || manualJoin ? joinRound : createRound}
          >
            {manualJoin && !joinRoundId ? (
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
            {!joinRoundId && !manualJoin ? (
              <>
                <label className="grid gap-2 text-sm font-semibold" htmlFor="game-mode">
                  Pelimuoto
                  <select
                    id="game-mode"
                    className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                    value={gameMode}
                    onChange={(event) =>
                      setGameMode(event.target.value === 'handicap' ? 'handicap' : 'scratch')
                    }
                  >
                    <option value="scratch">Scratch-reikäpeli</option>
                    <option value="handicap">Tasoituksellinen reikäpeli</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold" htmlFor="reward">
                  Palkinto (valinnainen)
                  <input
                    id="reward"
                    className="min-h-12 rounded-xl bg-white px-3 text-base text-[#13251f]"
                    value={reward}
                    onChange={(event) => setReward(event.target.value)}
                    placeholder="Esim. voittajalle olut"
                  />
                </label>
              </>
            ) : null}
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
            >
              {joinRoundId || manualJoin ? 'Liity kierrokseen' : 'Aloita kierros'}
            </button>
            {!joinRoundId ? (
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
      ) : (
        <section className="mt-8 grid gap-5">
          <article className="rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
            <p className="text-sm font-semibold text-[#d4e5d9]">{round.courseName.toUpperCase()}</p>
            <h2 className="mt-2 text-2xl font-bold">Reikäpeli · preview</h2>
            <p className="mt-2 text-[#d4e5d9]">
              {round.game.mode === 'handicap' ? 'Tasoituksellinen' : 'Scratch'} ·{' '}
              {round.players.length} / 4 pelaajaa
            </p>
            {round.game.reward ? (
              <p className="mt-1 text-[#d4e5d9]">Palkinto: {round.game.reward}</p>
            ) : null}
            <button
              type="button"
              className="mt-5 min-h-12 w-full rounded-xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c]"
              onClick={copyJoinLink}
            >
              {copied ? 'Liittymislinkki kopioitu' : 'Kopioi liittymislinkki'}
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
                    Tii {player.teeLabel} · HCP {player.handicapIndex}
                  </span>
                </li>
              ))}
            </ul>
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
            <h2 className="text-xl font-bold text-[#073b2d]">Merkitse oma tulos</h2>
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

      <footer className="mt-auto pt-10 text-center text-sm text-[#62776c]">
        Ensimmäinen kenttä: Golf Talma Master
      </footer>
    </main>
  );
}

export default App;

function getRoundIdFromJoinLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.searchParams.get('join');
  } catch {
    return null;
  }
}
