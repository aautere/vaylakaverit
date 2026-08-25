import {
  addSideGame,
  anonymizeIdentity,
  createRound,
  finishRound,
  isInvitationValid,
  joinRound,
  revokeInvitation,
  scoreRound,
  type AddSideGameInput,
  type CompletedRound,
  type CreateRoundInput,
  type DeleteIdentityResult,
  type EndTieRule,
  type GameMode,
  type HoleTieRule,
  type JoinRoundInput,
  type Round,
  type RoundStore,
  type RevokeInvitationInput,
  type ScoreRoundInput,
  type UpdateRoundPlayerInput,
  startRound,
  updateRoundPlayer,
} from './store/round-store.js';
import { randomUUID } from 'node:crypto';

export type PreviewRound = Round;
export type CompletedPreviewRound = CompletedRound;

export class PreviewRoundStore implements RoundStore {
  private readonly rounds = new Map<string, Round>();
  private readonly completedRounds = new Map<string, CompletedRound>();
  private readonly processedScoreChangeIds = new Map<string, Set<string>>();

  public create(input: CreateRoundInput): Round {
    const round = createRound(input);
    this.rounds.set(round.id, round);
    this.processedScoreChangeIds.set(round.id, new Set());
    return round;
  }

  public get(roundId: string): Round | undefined {
    return this.rounds.get(roundId);
  }

  public getByInvitationToken(invitationToken: string): Round | undefined {
    return [...this.rounds.values()].find(
      (round) => round.invitationToken === invitationToken && isInvitationValid(round),
    );
  }

  public revokeInvitation(input: RevokeInvitationInput): Round | undefined {
    const round = this.rounds.get(input.roundId);
    return round ? revokeInvitation(round, input) : undefined;
  }

  public join(input: JoinRoundInput): Round | undefined {
    const round = this.rounds.get(input.roundId);
    return round ? joinRound(round, input) : undefined;
  }

  public updatePlayer(input: UpdateRoundPlayerInput): Round | undefined {
    const round = this.rounds.get(input.roundId);
    return round ? updateRoundPlayer(round, input) : undefined;
  }

  public start(roundId: string): Round | undefined {
    const round = this.rounds.get(roundId);
    return round ? startRound(round) : undefined;
  }

  public score(input: ScoreRoundInput): Round | undefined {
    const round = this.rounds.get(input.roundId);
    if (!round) {
      return undefined;
    }

    const processedChanges = this.processedScoreChangeIds.get(input.roundId) ?? new Set<string>();
    this.processedScoreChangeIds.set(input.roundId, processedChanges);
    return scoreRound(round, input, processedChanges);
  }

  public addSideGame(input: AddSideGameInput): Round | undefined {
    const round = this.rounds.get(input.roundId);
    return round ? addSideGame(round, input) : undefined;
  }

  public finish(roundId: string): CompletedRound | undefined {
    const round = this.rounds.get(roundId);
    if (!round || round.state !== 'active') {
      return undefined;
    }

    const completedRound = finishRound(round);
    this.rounds.delete(roundId);
    this.processedScoreChangeIds.delete(roundId);
    this.completedRounds.set(roundId, completedRound);
    return completedRound;
  }

  public history(): CompletedRound[] {
    return [...this.completedRounds.values()].sort((left, right) =>
      right.completedAt.localeCompare(left.completedAt),
    );
  }

  public getHistory(roundId: string): CompletedRound | undefined {
    return this.completedRounds.get(roundId);
  }

  public deleteIdentity(identityId: string): DeleteIdentityResult {
    let anonymizedRoundCount = 0;

    for (const round of this.rounds.values()) {
      if (anonymizeIdentity(round, identityId)) {
        anonymizedRoundCount += 1;
      }
    }

    for (const round of this.completedRounds.values()) {
      if (anonymizeIdentity(round, identityId)) {
        anonymizedRoundCount += 1;
      }
    }

    return { anonymizedRoundCount };
  }
}

export const previewRoundStore = new PreviewRoundStore();

export function createPreviewRound(
  name: string,
  handicapIndex: number,
  mode: GameMode,
  reward: string,
  identityId = `guest:${randomUUID()}`,
  holeTieRule?: HoleTieRule,
  endTieRule?: EndTieRule,
  teeLabel?: string,
  ratingTable?: string,
): PreviewRound {
  return previewRoundStore.create({
    identityId,
    name,
    handicapIndex,
    mode,
    reward,
    holeTieRule,
    endTieRule,
    teeLabel,
    ratingTable,
  });
}

export function getPreviewRound(roundId: string): PreviewRound | undefined {
  return previewRoundStore.get(roundId);
}

export function joinPreviewRound(
  roundId: string,
  name: string,
  handicapIndex: number,
  identityId = `guest:${randomUUID()}`,
  teeLabel?: string,
  ratingTable?: string,
): PreviewRound | undefined {
  return previewRoundStore.join({
    roundId,
    invitationToken: previewRoundStore.get(roundId)?.invitationToken ?? '',
    identityId,
    name,
    handicapIndex,
    teeLabel,
    ratingTable,
  });
}

export function recordPreviewScore(
  roundId: string,
  playerId: string,
  holeNumber: number,
  strokes: number,
  changeId?: string,
  expectedRevision?: number,
): PreviewRound | undefined {
  return previewRoundStore.score({
    roundId,
    playerId,
    holeNumber,
    strokes,
    changeId,
    expectedRevision,
  });
}

export function addPreviewSideGame(
  roundId: string,
  startHole: number,
  holeCount: number,
  mode: GameMode,
  reward: string,
  holeTieRule?: HoleTieRule,
  carryEligiblePlayerIds?: string[],
  endTieRule?: EndTieRule,
  playerIds?: string[],
): PreviewRound | undefined {
  return previewRoundStore.addSideGame({
    roundId,
    startHole,
    holeCount,
    mode,
    reward,
    holeTieRule,
    carryEligiblePlayerIds,
    endTieRule,
    playerIds,
  });
}

export function completePreviewRound(roundId: string): CompletedPreviewRound | undefined {
  return previewRoundStore.finish(roundId);
}

export function listCompletedPreviewRounds(): CompletedPreviewRound[] {
  return previewRoundStore.history();
}

export function getCompletedPreviewRound(roundId: string): CompletedPreviewRound | undefined {
  return previewRoundStore.getHistory(roundId);
}
