import NodeCache from 'node-cache'
import { PlayerData } from './bsleaderboard.js'

const leaderboardCache = new NodeCache({ stdTTL: 300 })

interface LeaderboardCachedPlayer {
    leaderboard: 'scoresaber' | 'beatleader'
    playerId: string
    playerData: PlayerData
}

export class Cache {
    // ScoreSaber & BeatLeade cache
    public static getPlayerData(
        leaderboard: 'scoresaber' | 'beatleader',
        playerId: string
    ) {
        const cachedPlayers = leaderboardCache.get('players') as
            | LeaderboardCachedPlayer[]
            | undefined
        if (!cachedPlayers) return undefined
        const cachedPlayer = cachedPlayers.find(
            (c) => c.leaderboard === leaderboard && c.playerId === playerId
        )
        if (!cachedPlayer) return undefined
        return cachedPlayer.playerData
    }

    public static setPlayerData(
        leaderboard: 'scoresaber' | 'beatleader',
        playerId: string,
        playerData: PlayerData
    ) {
        const cachedPlayers = leaderboardCache.get('players') as
            | LeaderboardCachedPlayer[]
            | undefined
        if (cachedPlayers) {
            const players = cachedPlayers.filter(
                (c) =>
                    !(c.leaderboard === leaderboard && c.playerId === playerId)
            )
            players.push({
                leaderboard,
                playerId,
                playerData
            })
            leaderboardCache.set('players', players)
        } else {
            leaderboardCache.set('players', [
                {
                    leaderboard,
                    playerId,
                    playerData
                }
            ])
        }
        return playerData
    }
}
