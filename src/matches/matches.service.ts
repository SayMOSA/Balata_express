import { FilterQuery, Types } from 'mongoose';
import { HttpError } from '../common/errors/http-error';
import { currentSeasonId, previousSeasonId } from '../common/utils/season';
import { Player } from '../players/player.model';
import { IMatch, Match, MatchType } from './match.model';
import { CreateMatchInput, MatchQuery } from './matches.schemas';
import {
  emptyRelation,
  IPlayerRelationDetail,
  PlayerSeasonStats,
  PlayerSeasonStatsDocument,
} from './stats.model';
import { SeasonSummary } from './seasonSummary.model';

const matchTypeRules: { type: MatchType; winnerPlayers: number; loserPlayers: number }[] = [
  { type: MatchType.DOMINO_INDIVIDUAL, winnerPlayers: 1, loserPlayers: 1 },
  { type: MatchType.DOMINO_PARTNERSHIP, winnerPlayers: 2, loserPlayers: 2 },
  { type: MatchType.DOMINO_TRIO, winnerPlayers: 1, loserPlayers: 2 },
  { type: MatchType.DOMINO_FOUR, winnerPlayers: 1, loserPlayers: 3 },
];

// بيجيب سجل إحصائيات اللاعب للموسم، وبينشئه لو مش موجود.
// (الأصل كان بيعمل findOne وبيقع بـ TypeError لو اللاعب مسجل في شهر قديم ومالوش سجل في الشهر الحالي)
const getOrCreateStats = async (playerId: Types.ObjectId, seasonId: string) => {
  let stats:any = await PlayerSeasonStats.findOneAndUpdate(
    { playerId, seasonId },
    { $setOnInsert: { playerId, seasonId } },
    { upsert: true, new: true },
  );
  if (!stats){
    stats = await PlayerSeasonStats.create({ playerId, seasonId });
  };
  stats.partnerStats ??= new Map<string, IPlayerRelationDetail>();
  return stats;
};

const relation = (stats: PlayerSeasonStatsDocument, otherId: string): IPlayerRelationDetail => {
  if (!stats.partnerStats.has(otherId)) {
    stats.partnerStats.set(otherId, emptyRelation());
  }
  return stats.partnerStats.get(otherId)!;
};

export class MatchesService {
  async createMatch(recordedBy: string, dto: CreateMatchInput) {
    const { winningTeam, losingTeam, winningPoints, losingPoints, matchType } = dto;

    const rule = matchTypeRules.find((r) => r.type == matchType);
    if (!rule || winningTeam.length !== rule.winnerPlayers || losingTeam.length !== rule.loserPlayers) {
      throw new HttpError(400, 'Invalid team sizes for the specified match type');
    }

    if (winningPoints < 0 || losingPoints < 0) {
      throw new HttpError(400, 'Match scores cannot be negative');
    }

    const hasIntersection = winningTeam.some((id:string) => losingTeam.includes(id));
    if (hasIntersection) {
      throw new HttpError(400, 'A player cannot be both winner and loser in the same match');
    }

    const winningObjectIds = winningTeam.map((id:string) => new Types.ObjectId(id));
    const losingObjectIds = losingTeam.map((id:string) => new Types.ObjectId(id));

    const found = await Player.find({ _id: { $in: [...winningObjectIds, ...losingObjectIds] } })
      .select('_id')
      .lean();
    const foundIds = new Set(found.map((p) => String(p._id)));
    const missing = [...winningTeam, ...losingTeam].find((id) => !foundIds.has(id));
    if (missing) {
      throw new HttpError(400, `Player with ID ${missing} does not exist`);
    }

    const seasonId = currentSeasonId();

    const match = await Match.create({
      winningTeam: winningObjectIds,
      losingTeam: losingObjectIds,
      winningPoints,
      losingPoints,
      matchType,
      recordedBy: new Types.ObjectId(recordedBy),
      seasonId,
    });

    const winnerUpdates = winningObjectIds.map(async (winnerId:Types.ObjectId) => {
      const player = await getOrCreateStats(winnerId, seasonId);

      player.matchesPlayed += 1;
      player.wins += 1;
      player.score += winningPoints;
      player.winRate = (player.wins / player.matchesPlayed) * 100;
      player.biggestWinPoints = Math.max(player.biggestWinPoints, winningPoints);
      player.currentStreak = !player.lastMatchResult ? 1 : player.currentStreak + 1;
      player.bestWinStreak = Math.max(player.bestWinStreak, player.currentStreak);
      player.lastMatchResult = true;

      for (const partnerId of winningTeam) {
        if (partnerId === String(winnerId)) continue;
        const rel = relation(player, partnerId);
        rel.partnerWins += 1;
        rel.totalMatchesAsPartner += 1;
      }
      for (const loserId of losingTeam) {
        relation(player, loserId).winAgainst += 1;
      }

      return player.save();
    });

    const loserUpdates = losingObjectIds.map(async (loserId:Types.ObjectId) => {
      const player = await getOrCreateStats(loserId, seasonId);

      player.matchesPlayed += 1;
      player.losses += 1;
      player.score += losingPoints;
      player.winRate = (player.wins / player.matchesPlayed) * 100;
      player.currentStreak = player.lastMatchResult ? 1 : player.currentStreak + 1;
      player.worstLossStreak = Math.max(player.worstLossStreak, player.currentStreak);
      player.lastMatchResult = false;
      player.onWhite += losingPoints === 0 ? 1 : 0;

      for (const partnerId of losingTeam) {
        if (partnerId === String(loserId)) continue;
        const rel = relation(player, partnerId);
        rel.partnerLosses += 1;
        rel.totalMatchesAsPartner += 1;
      }
      for (const winnerId of winningTeam) {
        relation(player, winnerId).lossesAgainst += 1;
      }

      return player.save();
    });

    try {
      await Promise.all([...winnerUpdates, ...loserUpdates]);
    } catch (e) {
      console.log(e);
    }

    return {
      message: 'Match recorded and stats updated successfully',
      matchId: match._id,
    };
  }

  async getMatches(query: MatchQuery) {
    const { page, limit, playerId, playerStatus } = query;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IMatch> = {};

    if (playerId) {
      const playerObjectId = new Types.ObjectId(playerId);

      if (playerStatus === 'winner') {
        filter.winningTeam = playerObjectId;
      } else if (playerStatus === 'loser') {
        filter.losingTeam = playerObjectId;
      } else {
        filter.$or = [{ winningTeam: playerObjectId }, { losingTeam: playerObjectId }];
      }
    }

    const [data, total] = await Promise.all([
      Match.find(filter)
        .skip(skip)
        .limit(limit)
        .populate('winningTeam losingTeam recordedBy', 'name nickname'),
      Match.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSeasonSummary(seasonId: string) {
    const summary = await SeasonSummary.findOne({ seasonId }).populate([
      { path: 'highestWinRatePlayers.playerId', select: 'name nickname avatarUrl' },
      { path: 'mostWinsPlayer.player', select: 'name nickname avatarUrl' },
      { path: 'mostMatchesPlayer.player', select: 'name nickname avatarUrl' },
      { path: 'mostLosingPlayer.player', select: 'name nickname avatarUrl' },
    ]);

    if (!summary) {
      throw new HttpError(404, 'Season summary not found');
    }

    return summary;
  }

  async handleMonthlySeasonSummary() {
    const seasonId:string = previousSeasonId();

    const totalActivePlayers = await PlayerSeasonStats.countDocuments({ seasonId });
    const totalSeasonMatches = await Match.countDocuments({ seasonId });

    if (totalActivePlayers === 0 || totalSeasonMatches === 0) {
      return;
    }

    const averageMatchesPerPlayer = Math.round(totalSeasonMatches / totalActivePlayers);

    const topWins = await PlayerSeasonStats.findOne({ seasonId }).sort({ wins: -1 });
    const topLoses = await PlayerSeasonStats.findOne({ seasonId }).sort({ losses: -1 });
    const topMatches = await PlayerSeasonStats.findOne({ seasonId }).sort({ matchesPlayed: -1 });
    const topWinRate = await PlayerSeasonStats.find({ seasonId, matchesPlayed: { $gte: 10 } })
      .sort({ winRate: -1 })
      .limit(3)
      .lean();

    if (!topWins || !topMatches || !topLoses || topWinRate.length === 0) {
      return;
    }

    const formattedTopWinRates = topWinRate.map((p) => ({
      playerId: p.playerId,
      winRate: p.winRate,
    }));

    await SeasonSummary.create({
      seasonId,
      highestWinRatePlayers: formattedTopWinRates,
      mostWinsPlayer: {player: topWins.playerId , count:topWins.wins},
      mostMatchesPlayer: {player: topMatches.playerId , count:topMatches.wins},
      mostLosingPlayer: {player: topLoses.playerId , count:topLoses.losses},
      totalSeasonMatches,
      totalActivePlayers,
      averageMatchesPerPlayer,
    });
    await Match.deleteMany({ seasonId });
  }
}

export const matchesService = new MatchesService();
