import { Leaderboards, PlayerRanking } from './bsleaderboard.js'
import { CS_LeaderboardModel } from '../models/cubestalker.model.js'

export class Leaderboard {
    /**
     * Récupération du classement serveur d'un joueur
     * @param leaderboardName choix du leaderboard
     * @param playerId identifiant joueur
     * @returns classement serveur du joueur
     */
    static async getPlayerServerRanking(
        leaderboardName: Leaderboards,
        playerId: string
    ) {
        // Récupération du classement
        const ld = await CS_LeaderboardModel.findAll({
            where: { leaderboard: leaderboardName },
            order: [['pp', 'ASC']]
        })

        // Récupération des rangs Discord du membre
        const serverRankPP = ld
            .sort((a, b) => b.pp - a.pp)
            .findIndex(
                (ld) =>
                    ld.playerId === playerId &&
                    ld.leaderboard === leaderboardName
            )
        const serverRankAcc = ld
            .sort((a, b) => b.averageRankedAccuracy - a.averageRankedAccuracy)
            .findIndex(
                (ld) =>
                    ld.playerId === playerId &&
                    ld.leaderboard === leaderboardName
            )

        if (serverRankPP === -1 || serverRankAcc === -1) return null

        return {
            serverRankPP: serverRankPP + 1,
            serverRankAcc: serverRankAcc + 1,
            serverLdTotal: ld.length
        }
    }

    /**
     * Récupération des données de classement d'un joueur
     * @param leaderboardName choix du leaderboard
     * @param memberId identifiant Discord du membre
     * @returns classement serveur du joueur
     */
    static async getPlayer(
        leaderboardName: Leaderboards,
        memberId: string
    ): Promise<PlayerRanking | null> {
        // Récupération du classement
        const ld = await CS_LeaderboardModel.findAll({
            where: { leaderboard: leaderboardName },
            order: [['pp', 'ASC']]
        })

        // Récupération des données de classement du joueur
        const ldData = ld.find(
            (l) => l.memberId === memberId && l.leaderboard === leaderboardName
        )

        if (!ldData) return null

        return {
            pp: ldData.pp,
            rank: ldData.rank,
            countryRank: ldData.countryRank,
            averageRankedAccuracy: ldData.averageRankedAccuracy,
            serverRankPP: ldData.serverRankPP,
            serverRankAcc: ldData.serverRankAcc,
            serverLdTotal: ld.length
        }
    }
}
