import { z } from 'zod';

export const participantHandicapSchema = z.object({
  playerId: z.string().min(1),
  playingHandicap: z.number().int(),
});

export type ParticipantHandicap = z.infer<typeof participantHandicapSchema>;

export type HandicapStrokeAllocation = {
  baselinePlayingHandicap: number;
  strokesByPlayerId: ReadonlyMap<string, number>;
};

export function allocateRelativeHandicapStrokes(
  participants: readonly ParticipantHandicap[],
): HandicapStrokeAllocation {
  if (participants.length < 2) {
    throw new Error('A handicap game needs at least two participants.');
  }

  const parsedParticipants = participants.map((participant) =>
    participantHandicapSchema.parse(participant),
  );
  const playerIds = new Set(parsedParticipants.map((participant) => participant.playerId));

  if (playerIds.size !== parsedParticipants.length) {
    throw new Error('A handicap game cannot contain the same player more than once.');
  }

  const baselinePlayingHandicap = Math.min(
    ...parsedParticipants.map((participant) => participant.playingHandicap),
  );
  const strokesByPlayerId = new Map(
    parsedParticipants.map((participant) => [
      participant.playerId,
      participant.playingHandicap - baselinePlayingHandicap,
    ]),
  );

  return {
    baselinePlayingHandicap,
    strokesByPlayerId,
  };
}

export function strokesOnHole(relativeStrokes: number, holeHandicapIndex: number): number {
  if (!Number.isInteger(relativeStrokes) || relativeStrokes < 0) {
    throw new Error('Relative strokes must be a non-negative integer.');
  }
  if (!Number.isInteger(holeHandicapIndex) || holeHandicapIndex < 1 || holeHandicapIndex > 18) {
    throw new Error('Hole handicap index must be between 1 and 18.');
  }

  const fullRounds = Math.floor(relativeStrokes / 18);
  const remainingStrokes = relativeStrokes % 18;

  return fullRounds + (holeHandicapIndex <= remainingStrokes ? 1 : 0);
}

export function netHoleScore(
  grossStrokes: number,
  relativeStrokes: number,
  holeHandicapIndex: number,
): number {
  if (!Number.isInteger(grossStrokes) || grossStrokes < 1) {
    throw new Error('Gross strokes must be a positive integer.');
  }

  return grossStrokes - strokesOnHole(relativeStrokes, holeHandicapIndex);
}
