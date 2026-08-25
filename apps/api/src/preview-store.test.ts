import { describe, expect, it } from 'vitest';
import {
  addPreviewSideGame,
  completePreviewRound,
  createPreviewRound,
  getCompletedPreviewRound,
  getPreviewRound,
  joinPreviewRound,
  listCompletedPreviewRounds,
  previewRoundStore,
  recordPreviewScore,
} from './preview-store.js';
import { hydrateRound, type Round } from './store/round-store.js';

function readyRound(roundId: string) {
  const round = getPreviewRound(roundId)!;
  for (const player of round.players) {
    previewRoundStore.updatePlayer({
      roundId,
      playerId: player.id,
      identityId: player.identityId,
      name: player.name,
      handicapIndex: player.handicapIndex,
      teeLabel: player.teeLabel,
      ratingTable: player.ratingTable,
      ready: true,
    });
  }
  return previewRoundStore.start(roundId)!;
}

describe('addPreviewSideGame', () => {
  it('adds a side game with its selected settings', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '');
    const elli = joinPreviewRound(round.id, 'Elli', 18)!.players[1]!;
    readyRound(round.id);
    for (let holeNumber = 1; holeNumber <= 6; holeNumber += 1) {
      recordPreviewScore(round.id, round.players[0]!.id, holeNumber, 4);
      recordPreviewScore(round.id, elli.id, holeNumber, 5);
    }

    const updatedRound = addPreviewSideGame(
      round.id,
      7,
      6,
      'handicap',
      'Kahvit',
      undefined,
      undefined,
      undefined,
      [round.players[0]!.id, elli.id],
    );

    expect(updatedRound?.sideGames).toHaveLength(1);
    expect(updatedRound?.sideGames[0]).toMatchObject({
      startHole: 7,
      holeCount: 6,
      mode: 'handicap',
      reward: 'Kahvit',
      participantIds: [round.players[0]!.id, elli.id],
    });
  });

  it('rejects a side game that extends beyond the last hole', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '');
    joinPreviewRound(round.id, 'Elli', 18);
    readyRound(round.id);

    expect(addPreviewSideGame(round.id, 17, 3, 'scratch', '')).toBeUndefined();
    expect(round.sideGames).toHaveLength(0);
  });

  it('persists carry-forward settings and awards the carried win only to an eligible player', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
    const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:elli')!.players[1]!;
    readyRound(round.id);

    addPreviewSideGame(round.id, 1, 2, 'scratch', '', 'carry-forward', [elli.id], 'draw');
    recordPreviewScore(round.id, round.players[0]!.id, 1, 4);
    recordPreviewScore(round.id, elli.id, 1, 4);
    recordPreviewScore(round.id, round.players[0]!.id, 2, 3);
    const updatedRound = recordPreviewScore(round.id, elli.id, 2, 5);

    expect(updatedRound?.sideGames[0]).toMatchObject({
      holeTieRule: 'carry-forward',
      carryEligiblePlayerIds: [elli.id],
      standings: {
        winsByPlayerId: { [round.players[0]!.id]: 0, [elli.id]: 2 },
        status: 'winner',
      },
    });
  });
});

describe('completePreviewRound', () => {
  it('moves the round to completed history with its scores, games, standings, and outcome', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', 'Kahvit');
    const secondPlayer = joinPreviewRound(round.id, 'Elli', 18)!.players[1]!;
    readyRound(round.id);
    addPreviewSideGame(round.id, 1, 3, 'handicap', 'Lounas');
    recordPreviewScore(round.id, round.players[0]!.id, 1, 4);
    recordPreviewScore(round.id, secondPlayer.id, 1, 5);

    const completedRound = completePreviewRound(round.id);

    expect(getPreviewRound(round.id)).toBeUndefined();
    expect(getCompletedPreviewRound(round.id)).toEqual(completedRound);
    expect(listCompletedPreviewRounds()).toContainEqual(completedRound);
    expect(completedRound).toMatchObject({
      id: round.id,
      courseName: 'Golf Talma Master',
      scores: {
        [round.players[0]!.id]: { 1: 4 },
        [secondPlayer.id]: { 1: 5 },
      },
      standings: {
        completedHoles: 1,
        winsByPlayerId: {
          [round.players[0]!.id]: 1,
          [secondPlayer.id]: 0,
        },
      },
      sideGames: [
        {
          startHole: 1,
          holeCount: 3,
          mode: 'handicap',
          reward: 'Lounas',
        },
      ],
      outcome: {
        kind: 'winner',
        playerIds: [round.players[0]!.id],
        wins: 1,
      },
    });

    expect(completedRound?.completedAt).toEqual(expect.any(String));
  });

  it('marks a game unresolved when the round ends during an extension', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
    const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:elli')!.players[1]!;
    readyRound(round.id);
    addPreviewSideGame(round.id, 1, 2, 'scratch', '', 'no-winner', [], 'continue');
    recordPreviewScore(round.id, round.players[0]!.id, 1, 4);
    recordPreviewScore(round.id, elli.id, 1, 5);
    recordPreviewScore(round.id, round.players[0]!.id, 2, 5);
    recordPreviewScore(round.id, elli.id, 2, 4);

    const completedRound = completePreviewRound(round.id);

    expect(completedRound?.sideGames[0]?.standings).toMatchObject({
      status: 'unresolved',
      outcome: { kind: 'unresolved' },
    });
  });
});

describe('deleteIdentity', () => {
  it('anonymizes only the requesting player and preserves an active shared round', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:delete-active-aino');
    const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:delete-active-elli')!.players[1]!;
    readyRound(round.id);
    recordPreviewScore(round.id, round.players[0]!.id, 1, 4);
    recordPreviewScore(round.id, elli.id, 1, 5);

    const result = previewRoundStore.deleteIdentity('guest:delete-active-aino');

    expect(result).toEqual({ anonymizedRoundCount: 1 });
    expect(getPreviewRound(round.id)).toMatchObject({
      creatorIdentityId: undefined,
      players: [
        { id: round.players[0]!.id, identityId: undefined, name: 'Poistettu pelaaja' },
        { id: elli.id, identityId: 'guest:delete-active-elli', name: 'Elli' },
      ],
      scores: {
        [round.players[0]!.id]: { 1: 4 },
        [elli.id]: { 1: 5 },
      },
    });
  });

  it('anonymizes completed history without removing its scores or outcome', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:completed-aino');
    const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:completed-elli')!.players[1]!;
    readyRound(round.id);
    recordPreviewScore(round.id, round.players[0]!.id, 1, 4);
    recordPreviewScore(round.id, elli.id, 1, 5);
    completePreviewRound(round.id);

    const result = previewRoundStore.deleteIdentity('guest:completed-aino');

    expect(result).toEqual({ anonymizedRoundCount: 1 });
    expect(getCompletedPreviewRound(round.id)).toMatchObject({
      players: [
        { identityId: undefined, name: 'Poistettu pelaaja' },
        { identityId: 'guest:completed-elli', name: 'Elli' },
      ],
      scores: {
        [round.players[0]!.id]: { 1: 4 },
        [elli.id]: { 1: 5 },
      },
      outcome: { kind: 'winner', playerIds: [round.players[0]!.id] },
    });
  });
});

describe('recordPreviewScore', () => {
  it('uses looked-up playing handicaps rather than rounded Handicap Indexes', () => {
    const round = createPreviewRound(
      'Aino',
      17.6,
      'handicap',
      '',
      'guest:aino',
      undefined,
      undefined,
      '52',
      'men',
    );
    const elli = joinPreviewRound(round.id, 'Elli', 18.4, 'guest:elli', '52', 'men')!.players[1]!;
    readyRound(round.id);

    expect(round.players).toMatchObject([
      { teeLabel: '52', ratingTable: 'men', handicapIndex: 17.6, playingHandicap: 18 },
      { teeLabel: '52', ratingTable: 'men', handicapIndex: 18.4, playingHandicap: 19 },
    ]);

    recordPreviewScore(round.id, round.players[0]!.id, 4, 5);
    const updatedRound = recordPreviewScore(round.id, elli.id, 4, 5);

    expect(updatedRound?.standings.winsByPlayerId).toEqual({
      [round.players[0]!.id]: 0,
      [elli.id]: 1,
    });
  });

  it('accepts a replayed score change only once', () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '');
    joinPreviewRound(round.id, 'Elli', 18);
    readyRound(round.id);
    const playerId = round.players[0]!.id;

    const firstResult = recordPreviewScore(round.id, playerId, 1, 4, 'score-change-1');
    const replayedResult = recordPreviewScore(round.id, playerId, 1, 6, 'score-change-1');

    expect(firstResult?.scores[playerId]?.[1]).toBe(4);
    expect(replayedResult?.scores[playerId]?.[1]).toBe(4);
  });

  describe('course snapshots', () => {
    it('enforces Rock Golf nine-hole score and side-game limits', () => {
      const round = previewRoundStore.create({
        identityId: 'guest:rock-aino',
        name: 'Aino',
        handicapIndex: 18,
        teeLabel: 'O',
        ratingTable: 'men',
        courseId: 'rock-golf',
        layoutId: '9-holes',
        roundLength: 9,
        mode: 'scratch',
        reward: '',
      });
      const joined = previewRoundStore.join({
        roundId: round.id,
        invitationToken: round.invitationToken,
        identityId: 'guest:rock-elli',
        name: 'Elli',
        handicapIndex: 18,
        teeLabel: 'O',
        ratingTable: 'men',
      })!;
      readyRound(round.id);

      expect(round).toMatchObject({
        courseId: 'rock-golf',
        layoutId: '9-holes',
        roundLength: 9,
        courseSnapshot: {
          holes: expect.arrayContaining([
            expect.objectContaining({ number: 1, sourceHoleNumber: 1, pass: 1 }),
          ]),
        },
      });
      expect(
        previewRoundStore.score({
          roundId: round.id,
          playerId: joined.players[0]!.id,
          holeNumber: 10,
          strokes: 4,
        }),
      ).toBeUndefined();
      for (let holeNumber = 1; holeNumber <= 8; holeNumber += 1) {
        previewRoundStore.score({
          roundId: round.id,
          playerId: joined.players[0]!.id,
          holeNumber,
          strokes: 4,
        });
      }
      expect(
        previewRoundStore.addSideGame({
          roundId: round.id,
          startHole: 9,
          holeCount: 2,
          mode: 'scratch',
          reward: '',
        }),
      ).toBeUndefined();
    });

    it('keeps first- and second-pass Rock scores distinct in an 18-hole round', () => {
      const round = previewRoundStore.create({
        identityId: 'guest:rock-18-aino',
        name: 'Aino',
        handicapIndex: 18,
        teeLabel: 'O',
        ratingTable: 'men',
        courseId: 'rock-golf',
        layoutId: '18-holes',
        roundLength: 18,
        mode: 'scratch',
        reward: '',
      });
      const joined = previewRoundStore.join({
        roundId: round.id,
        invitationToken: round.invitationToken,
        identityId: 'guest:rock-18-elli',
        name: 'Elli',
        handicapIndex: 18,
        teeLabel: 'O',
        ratingTable: 'men',
      })!;
      readyRound(round.id);

      previewRoundStore.score({
        roundId: round.id,
        playerId: joined.players[0]!.id,
        holeNumber: 3,
        strokes: 4,
      });
      previewRoundStore.score({
        roundId: round.id,
        playerId: joined.players[0]!.id,
        holeNumber: 12,
        strokes: 5,
      });

      expect(round.courseSnapshot.holes[11]).toMatchObject({
        number: 12,
        sourceHoleNumber: 3,
        pass: 2,
      });
      expect(round.scores[joined.players[0]!.id]).toEqual({ 3: 4, 12: 5 });
    });

    it('hydrates serialized rounds without course fields as legacy Talma rounds', () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '');
      const legacyRound = structuredClone(round) as Round;
      delete (legacyRound as Partial<Round>).courseId;
      delete (legacyRound as Partial<Round>).courseVersion;
      delete (legacyRound as Partial<Round>).layoutId;
      delete (legacyRound as Partial<Round>).roundLength;
      delete (legacyRound as Partial<Round>).courseSnapshot;

      expect(hydrateRound(legacyRound)).toMatchObject({
        courseId: 'golf-talma-master',
        courseVersion: '2017-06',
        layoutId: '18-holes',
        roundLength: 18,
      });
    });
  });

  it('recalculates scratch and handicap games after an own score correction', () => {
    const round = createPreviewRound('Aino', 17.6, 'scratch', '', 'guest:correction-aino');
    const elli = joinPreviewRound(round.id, 'Elli', 18.4, 'guest:correction-elli')!.players[1]!;
    readyRound(round.id);
    addPreviewSideGame(round.id, 1, 4, 'handicap', '', undefined, undefined, undefined, [
      round.players[0]!.id,
      elli.id,
    ]);

    for (let holeNumber = 1; holeNumber <= 3; holeNumber += 1) {
      recordPreviewScore(round.id, round.players[0]!.id, holeNumber, 5);
      recordPreviewScore(round.id, elli.id, holeNumber, 5);
    }
    recordPreviewScore(round.id, round.players[0]!.id, 4, 5);
    recordPreviewScore(round.id, elli.id, 4, 5);
    expect(round.standings.winsByPlayerId).toEqual({
      [round.players[0]!.id]: 0,
      [elli.id]: 0,
    });
    expect(round.sideGames[0]?.standings.winsByPlayerId).toEqual({
      [round.players[0]!.id]: 0,
      [elli.id]: 1,
    });

    const corrected = recordPreviewScore(round.id, round.players[0]!.id, 4, 4, undefined, 1);
    expect(corrected?.scoreRevisions[round.players[0]!.id]?.[4]).toBe(2);
    expect(corrected?.standings.winsByPlayerId).toEqual({
      [round.players[0]!.id]: 1,
      [elli.id]: 0,
    });
    expect(corrected?.sideGames[0]?.standings.winsByPlayerId).toEqual({
      [round.players[0]!.id]: 0,
      [elli.id]: 0,
    });
  });
});
