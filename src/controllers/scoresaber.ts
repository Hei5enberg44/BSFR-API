import { components as ScoreSaberAPI } from '../api/scoresaber.js'
import { PlayerData, PlayerScore } from './bsleaderboard.js'
import { CS_ScoreSaberPlayerScoreModel } from '../models/cubestalker.model.js'
import { Cache } from './cache.js'
import Logger from '../utils/logger.js'

type Player = ScoreSaberAPI['schemas']['Player']
type PlayerScoreCollection = ScoreSaberAPI['schemas']['PlayerScoreCollection']

class ScoreSaberError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SCORESABER_ERROR'
        Error.captureStackTrace(this, this.constructor)
        Logger.log('ScoreSaber', 'ERROR', message)
    }
}

export class ScoreSaber {
    private static SCORESABER_URL = 'https://scoresaber.com'
    private static SCORESABER_API_URL = `${this.SCORESABER_URL}/api/`
    private static PLAYER_URL = `${this.SCORESABER_API_URL}player/`
    private static LEADERBOARD_URL = `${this.SCORESABER_API_URL}leaderboard/`

    private static async wait(s: number) {
        return new Promise((res) => setTimeout(res, s * 1000))
    }

    /**
     * Envoi d'une requête à l'API de ScoreSaber
     * @param url url de la requête
     * @param log true|false pour logger la requête
     * @returns résultat de la requête
     */
    private static async send<T>(
        url: string,
        log: boolean = false
    ): Promise<T> {
        let data
        let error = false
        let retries = 0

        do {
            if (log)
                Logger.log('ScoreSaber', 'INFO', `Envoi de la requête "${url}"`)
            const res = await fetch(url)

            if (res.ok) {
                if (log)
                    Logger.log(
                        'ScoreSaber',
                        'INFO',
                        'Requête envoyée avec succès'
                    )
                data = await res.json()

                error = false
            } else {
                if (res.status === 400)
                    throw Error('Erreur 400 : Requête invalide')
                if (res.status === 404)
                    throw Error('Erreur 404 : Page introuvable')
                if (res.status === 422)
                    throw Error(
                        'Erreur 422 : La ressource demandée est introuvable'
                    )
                if (res.status === 503)
                    throw Error('Erreur 503 : Service non disponible')
                if (res.status === 500) {
                    Logger.log(
                        'ScoreSaber',
                        'ERROR',
                        'Erreur 500, nouvel essai dans 3 secondes'
                    )
                    if (retries < 5) await this.wait(3)
                    retries++
                }
                if (res.status === 429) {
                    Logger.log(
                        'ScoreSaber',
                        'ERROR',
                        'Erreur 429, nouvel essai dans 60 secondes'
                    )
                    await this.wait(60)
                }

                error = true
            }
        } while (error)

        return data
    }

    /**
     * Récuparation des données ScoreSaber d'un joueur
     * @param playerId identifiant ScoreSaber du joueur
     * @returns données ScoreSaber du joueur
     */
    static async getPlayerData(playerId: string): Promise<PlayerData> {
        try {
            const cachedPlayer = Cache.getPlayerData('scoresaber', playerId)
            if (cachedPlayer) return cachedPlayer

            const playerInfos = await this.send<Player>(
                `${this.PLAYER_URL}${playerId}/full`
            )
            const playerTopScore = await this.send<PlayerScoreCollection>(
                `${this.PLAYER_URL}${playerId}/scores?sort=top&page=1&limit=1`
            )

            const scoreStats = playerInfos.scoreStats
            const topScore = playerTopScore.playerScores.find(
                (ps) => ps.score.pp !== 0
            )

            let topPP = null
            if (topScore) {
                const difficulty =
                    topScore.leaderboard.difficulty.difficultyRaw.split('_')[1]
                topPP = {
                    rank: topScore.score.rank,
                    pp: topScore.score.pp,
                    score: topScore.score.modifiedScore,
                    acc:
                        (topScore.score.modifiedScore /
                            topScore.leaderboard.maxScore) *
                        100,
                    fc: topScore.score.fullCombo,
                    stars: topScore.leaderboard.stars,
                    name:
                        topScore.leaderboard.songAuthorName +
                        ' - ' +
                        topScore.leaderboard.songName +
                        (topScore.leaderboard.songSubName != ''
                            ? ' ' + topScore.leaderboard.songSubName
                            : ''),
                    difficulty: difficulty,
                    author: topScore.leaderboard.levelAuthorName,
                    cover: topScore.leaderboard.coverImage,
                    replay: null
                }
            }

            const player = {
                id: playerInfos.id,
                name: playerInfos.name,
                avatar: playerInfos.profilePicture,
                profileCover: null,
                url: `${this.SCORESABER_URL}/u/${playerInfos.id}`,
                rank: playerInfos.rank,
                countryRank: playerInfos.countryRank,
                pp: playerInfos.pp,
                country: playerInfos.country,
                history: playerInfos.histories,
                banned: playerInfos.banned,
                averageRankedAccuracy: scoreStats
                    ? scoreStats.averageRankedAccuracy
                    : 0,
                topPP
            }

            return Cache.setPlayerData('scoresaber', playerId, player)
        } catch (error) {
            throw new ScoreSaberError(
                'Une erreur est survenue lors de la récupération du profil ScoreSaber'
            )
        }
    }

    /**
     * Récupère la liste des scores d'un joueur par rapport à son identifiant ScoreSaber
     * @param scoreSaberId identifiant ScoreSaber du joueur
     * @returns liste des scores du joueur
     */
    static async getPlayerScores(scoreSaberId: string): Promise<PlayerScore[]> {
        try {
            const cachedPlayerScores =
                await CS_ScoreSaberPlayerScoreModel.findAll({
                    where: {
                        leaderboard: 'scoresaber',
                        playerId: scoreSaberId
                    }
                })

            let nextPage = null

            do {
                const data: PlayerScoreCollection =
                    await this.send<PlayerScoreCollection>(
                        `${this.PLAYER_URL}${scoreSaberId}/scores?sort=recent&limit=100&page=${nextPage ?? 1}`
                    )
                const playerScores = data.playerScores
                const metadata = data.metadata

                nextPage =
                    metadata.page + 1 <=
                    Math.ceil(metadata.total / metadata.itemsPerPage)
                        ? metadata.page + 1
                        : null

                for (const playerScore of playerScores) {
                    const cachedScore = cachedPlayerScores.find(
                        (cs) =>
                            cs.playerScore.leaderboard.id ===
                            playerScore.leaderboard.id
                    )
                    if (cachedScore) {
                        if (
                            playerScore.score.baseScore !==
                            cachedScore.playerScore.score.baseScore
                        ) {
                            cachedScore.playerScore = playerScore
                            await cachedScore.save()
                        } else {
                            nextPage = null
                            break
                        }
                    } else {
                        await CS_ScoreSaberPlayerScoreModel.create({
                            leaderboard: 'scoresaber',
                            playerId: scoreSaberId,
                            playerScore: playerScore
                        })
                    }
                }
            } while (nextPage)

            const playerScores = await CS_ScoreSaberPlayerScoreModel.findAll({
                where: {
                    leaderboard: 'scoresaber',
                    playerId: scoreSaberId
                }
            })

            const scores = playerScores
                .map((ps) => {
                    return {
                        rank: ps.playerScore.score.rank,
                        scoreId: ps.playerScore.score.id,
                        score: ps.playerScore.score.modifiedScore,
                        unmodififiedScore: ps.playerScore.score.baseScore,
                        modifiers: ps.playerScore.score.modifiers,
                        pp: ps.playerScore.score.pp,
                        weight: ps.playerScore.score.weight,
                        timeSet: ps.playerScore.score.timeSet,
                        badCuts: ps.playerScore.score.badCuts,
                        missedNotes: ps.playerScore.score.missedNotes,
                        maxCombo: ps.playerScore.score.maxCombo,
                        fullCombo: ps.playerScore.score.fullCombo,
                        leaderboardId: ps.playerScore.leaderboard.id,
                        songHash: ps.playerScore.leaderboard.songHash,
                        songName: ps.playerScore.leaderboard.songName,
                        songSubName: ps.playerScore.leaderboard.songSubName,
                        songAuthorName:
                            ps.playerScore.leaderboard.songAuthorName,
                        levelAuthorName:
                            ps.playerScore.leaderboard.levelAuthorName,
                        difficulty:
                            ps.playerScore.leaderboard.difficulty.difficulty,
                        difficultyRaw:
                            ps.playerScore.leaderboard.difficulty.difficultyRaw,
                        gameMode:
                            ps.playerScore.leaderboard.difficulty.gameMode,
                        maxScore: ps.playerScore.leaderboard.maxScore,
                        ranked: ps.playerScore.leaderboard.ranked,
                        stars: ps.playerScore.leaderboard.stars
                    }
                })
                .sort((a: PlayerScore, b: PlayerScore) => {
                    return (
                        new Date(b.timeSet).getTime() -
                        new Date(a.timeSet).getTime()
                    )
                })

            return scores
        } catch (error) {
            throw new ScoreSaberError(
                'Une erreur est survenue lors de la récupération des scores du joueur'
            )
        }
    }
}
