import {
    Guild,
    OverwriteData,
    OverwriteType,
    PermissionFlagsBits
} from 'discord.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import yauzl from 'yauzl'
import tmp from 'tmp'
import WaveFormData from 'waveform-data'
import { Sequelize, Op } from 'sequelize'
import {
    R_RankedleModel,
    R_RankedleMapModel,
    R_RankedleSeasonModel,
    R_RankedleScoreModel,
    R_RankedleStatModel,
    R_RankedleMessageModel,
    RankedleMessageType,
    RankedleScoreDetail,
    RankedleScoreDetailStatus
} from '../models/rankedle.model.js'
import { Mime } from '../utils/mime.js'
import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }
import { DiscordClient } from './discord.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const RANKEDLE_PATH = path.resolve(__dirname, '../../rankedle')
const BIN_PATH = path.join(__dirname, '../../bin')
const EGG_PATH = path.join(RANKEDLE_PATH, 'song.egg')
const MP3_PATH = path.join(RANKEDLE_PATH, 'song.mp3')
const TRIMED_MP3_PATH = path.join(RANKEDLE_PATH, 'preview_full.mp3')
const WAVEFORM_PATH = path.join(RANKEDLE_PATH, 'waveform.json')
const BITRATE = 96
const RANGES = ['00:01', '00:02', '00:04', '00:07', '00:11', '00:16']
const POINTS = [8, 6, 4, 3, 2, 1, 0]

ffmpeg.setFfmpegPath(path.resolve(BIN_PATH, 'ffmpeg'))
ffmpeg.setFfprobePath(path.resolve(BIN_PATH, 'ffprobe'))

interface RankedleStat {
    seasonId: number
    memberId: string
    try1: number
    try2: number
    try3: number
    try4: number
    try5: number
    try6: number
    [key: string]: string | number
    played: number
    won: number
    currentStreak: number
    maxStreak: number
    points: number
}

interface RankedlePlayerStats {
    try1: number
    try2: number
    try3: number
    try4: number
    try5: number
    try6: number
    played: number
    won: number
    currentStreak: number
    maxStreak: number
}

interface RankedlePlayerRanking {
    memberId: string
    name: string
    avatar: string
    points: number
    rank: number
    stats: RankedlePlayerStats
}

class RankedleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'RankedleError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class Rankedle {
    private static async downloadSong(url: string) {
        try {
            const downloadRequest = await fetch(url)
            if (downloadRequest.ok) {
                const songZip = await downloadRequest.arrayBuffer()
                const zipBuffer = Buffer.from(songZip)
                const songTmp = tmp.fileSync()
                fs.writeFileSync(songTmp.name, zipBuffer)
                return songTmp
            } else {
                throw new RankedleError(`Song download failed (url: ${url})`)
            }
        } catch (error) {
            throw new RankedleError(`Song download failed (url: ${url})`)
        }
    }

    private static async extractEgg(songZip: string, outPath: string) {
        const songFile = fs.createWriteStream(outPath)

        return new Promise((res, rej) => {
            yauzl.open(songZip, { lazyEntries: true }, (err, zipFile) => {
                if (err) rej(err)
                zipFile.readEntry()
                zipFile.on('entry', (entry) => {
                    if (!/\.egg$/.test(entry.fileName)) {
                        zipFile.readEntry()
                    } else {
                        zipFile.openReadStream(entry, (err, readStream) => {
                            if (err) rej(err)
                            readStream.on('end', () => {
                                zipFile.readEntry()
                            })
                            readStream.pipe(songFile)
                        })
                    }
                })
                zipFile.on('end', () => {
                    res(songFile)
                })
            })
        })
    }

    private static async trimSilence(songPath: string, outPath: string) {
        return new Promise((res, rej) => {
            ffmpeg(songPath)
                .audioFilters(['silenceremove=1:0:-50dB'])
                .outputOptions([
                    '-codec:a libmp3lame',
                    '-b:a 128k',
                    '-map_metadata -1',
                    '-map 0:a'
                ])
                .audioBitrate(BITRATE)
                .output(outPath)
                .on('error', (err) => {
                    rej(err)
                })
                .on('end', () => {
                    res(true)
                })
                .run()
        })
    }

    private static async getSongMetaData(
        songPath: string
    ): Promise<ffmpeg.FfprobeData> {
        return new Promise((res, rej) => {
            ffmpeg.ffprobe(songPath, (err, data) => {
                if (err) rej(err)
                res(data)
            })
        })
    }

    private static async trim(
        songPath: string,
        outPath: string,
        from: number | string = 0,
        duration: number | string = 30
    ) {
        return new Promise((res, rej) => {
            ffmpeg(songPath)
                .addOutputOption(`-ss ${from}`)
                .addOutputOption(`-t ${duration}`)
                .addOption('-c copy')
                .output(outPath)
                .on('error', (err) => {
                    rej(err)
                })
                .on('end', () => {
                    res(true)
                })
                .run()
        })
    }

    private static async generateSongWaveform(
        songPath: string,
        outPath: string
    ) {
        return new Promise((res, rej) => {
            const command = path.resolve(BIN_PATH, 'audiowaveform')
            const args = [
                '-i',
                path.resolve(songPath),
                '--input-format',
                'mp3',
                '--output-format',
                'json',
                '-o',
                path.resolve(outPath)
            ]
            exec(`${command} ${args.join(' ')}`, (err, stdout, stderr) => {
                if (err) rej(err)
                res(stderr)
            })
        })
    }

    public static getSongWaveform(
        type: 'base' | 'unlocked' | 'progress' = 'base',
        barCount = 200,
        barWidth = 8,
        gap = 8
    ) {
        const waveformFile = fs.readFileSync(WAVEFORM_PATH)
        const waveformJson = JSON.parse(waveformFile.toString())
        const waveformData = WaveFormData.create(waveformJson)

        const normalizedData = this.getNormalizedData(waveformData, barCount)

        const imageWidth = (barWidth + gap) * normalizedData.length - gap
        const imageHeight = imageWidth / 8

        const canvas = createCanvas(imageWidth, imageHeight + 10)
        const ctx = canvas.getContext('2d')

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2')
        gradient.addColorStop(0.5, type === 'base' ? '#666666' : '#CCCCCC')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2')

        ctx.fillStyle = gradient

        let x = 0
        for (let i = 0; i < normalizedData.length; i++) {
            const dataVal = normalizedData[i] * imageHeight

            const startY = (imageHeight - dataVal) / 2

            ctx.roundRect(x, startY + 5, barWidth, dataVal, barWidth / 2)

            x += barWidth + gap
        }

        ctx.fill()

        if (type === 'base' || type === 'unlocked') {
            const waveformBuffer = canvas.toBuffer()
            return waveformBuffer
        } else if (type === 'progress') {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
            gradient.addColorStop(0, '#3398db')
            gradient.addColorStop(0.5, '#c666c7')
            gradient.addColorStop(1, '#e74d3c')

            ctx.fillStyle = gradient
            ctx.globalCompositeOperation = 'source-atop'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const progressBuffer = canvas.toBuffer()
            return progressBuffer
        }
    }

    private static getNormalizedData(
        waveformData: WaveFormData,
        samples: number
    ) {
        const channel = waveformData.channel(0)
        const blockSize = Math.floor(waveformData.length / samples)
        const filteredData = []
        for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i
            let sum = 0
            for (let j = 0; j < blockSize; j++) {
                sum = sum + Math.abs(channel.max_sample(blockStart + j))
            }
            filteredData.push(sum / blockSize)
        }

        return this.normalize(filteredData)
    }

    private static normalize(data: Array<number>) {
        const multiplier = Math.pow(Math.max(...data), -1)
        return data.map((n) => n * multiplier)
    }

    public static async generateRankedle(mapId = null) {
        try {
            await this.finish()

            // Create necessary repository
            if (!fs.existsSync(RANKEDLE_PATH)) {
                fs.mkdirSync(RANKEDLE_PATH)
            } else {
                // Empty Rankedle directory
                fs.readdirSync(RANKEDLE_PATH)
                    .filter((f) => f.match(/\.[mp3|json]$/))
                    .map((f) => fs.unlinkSync(f))
            }

            // Get random map from database
            const where = mapId ? { id: mapId } : {}
            const randomMap = await R_RankedleMapModel.findAll({
                where: { '$rankedle.id$': { [Op.eq]: null }, ...where },
                include: {
                    model: R_RankedleModel,
                    required: false
                },
                order: Sequelize.literal('rand()'),
                limit: 1,
                raw: true
            })

            if (randomMap.length === 1) {
                const mapId = randomMap[0].id
                const map = randomMap[0].map
                const downloadURL =
                    map.versions[map.versions.length - 1].downloadURL

                // Download zip and extract .egg
                const songZip = await this.downloadSong(downloadURL)
                await this.extractEgg(songZip.name, EGG_PATH)
                songZip.removeCallback()

                // Trim silence
                await this.trimSilence(EGG_PATH, MP3_PATH)

                // Get time range
                const dataTrimed = await this.getSongMetaData(MP3_PATH)
                const duration = Math.floor(dataTrimed.format.duration ?? 0)
                const start =
                    duration >= 30
                        ? Math.round(Math.random() * (duration - 30))
                        : 0

                // Trim song
                await this.trim(MP3_PATH, TRIMED_MP3_PATH, start)

                for (let i = 0; i < RANGES.length; i++) {
                    await this.trim(
                        TRIMED_MP3_PATH,
                        path.join(RANKEDLE_PATH, `preview_${i}.mp3`),
                        '00:00',
                        RANGES[i]
                    )
                }

                // Generate song waveform
                await this.generateSongWaveform(TRIMED_MP3_PATH, WAVEFORM_PATH)

                const seasonId = await this.getCurrentSeason()

                await R_RankedleModel.create({ mapId: mapId, seasonId })
            }
        } catch (error) {
            if (error instanceof Error)
                Logger.log(
                    'Rankedle',
                    'ERROR',
                    `Imposible de générer une Rankedle pour la map (${error.message})`
                )
        }
    }

    static async getCurrentSeason() {
        const seasons = await R_RankedleSeasonModel.findAll({
            order: [['id', 'desc']],
            limit: 1
        })
        // if(seasons.length === 0) {
        //     const dateStart = new Date()
        //     dateStart.setHours(0, 0, 0, 0)
        //     const dateEnd = new Date()
        //     dateEnd.setDate(dateEnd.getDate() + 100)
        //     dateEnd.setHours(0, 0, 0, 0)
        //     const season = await RankedleSeasons.create({
        //         dateStart,
        //         dateEnd
        //     })
        //     return season.id
        // }
        return seasons[0].id
    }

    static async getSongList(memberId: string, query: string) {
        const currentRankedle = await this.getCurrentRankedle()
        if (currentRankedle) {
            const userScore = await this.getUserScore(
                currentRankedle.id,
                memberId
            )
            const mapsToExclude = userScore?.details
                ? userScore.details
                      .filter((d) => d.status === 'fail' && d.mapId)
                      .map((d) => d.mapId as number)
                : []

            const searchQueryArray = []

            for (const q of query.split(' ')) {
                const search = q.trim()
                if (search !== '') {
                    const queryArray = [
                        {
                            [Op.or]: {
                                'map.metadata.songAuthorName': {
                                    [Op.like]: `%${search}%`
                                },
                                'map.metadata.songName': {
                                    [Op.like]: `%${search}%`
                                },
                                'map.metadata.songSubName': {
                                    [Op.like]: `%${search}%`
                                }
                            }
                        }
                    ]
                    searchQueryArray.push(...queryArray)
                }
            }

            const maps = await R_RankedleMapModel.findAll({
                where: {
                    [Op.and]: searchQueryArray,
                    id: {
                        [Op.notIn]: mapsToExclude
                    }
                },
                limit: 5,
                raw: true
            })

            return !maps
                ? []
                : maps.map((m) => {
                      return {
                          id: m.id,
                          name: `${m.map.metadata.songAuthorName} - ${m.map.metadata.songName}${m.map.metadata.songSubName !== '' ? ` ${m.map.metadata.songSubName}` : ''}`
                      }
                  })
        }

        return []
    }

    static async getCurrentRankedle() {
        const rankedle = await R_RankedleModel.findOne({
            where: { date: new Date() },
            order: [['id', 'desc']],
            raw: true
        })
        return rankedle
    }

    static async getLastRankedle() {
        const rankedle = await R_RankedleModel.findOne({
            order: [['id', 'desc']],
            limit: 1,
            raw: true
        })
        return rankedle
    }

    static async getRankedleList() {
        const rankedleList = await R_RankedleModel.findAll({
            order: [['id', 'desc']],
            raw: true
        })
        return rankedleList
    }

    static async getUserScore(rankedleId: number, memberId: string) {
        const score = await R_RankedleScoreModel.findOne({
            where: { rankedleId, memberId }
        })
        return score
    }

    static async getUserStats(
        memberId: string
    ): Promise<RankedlePlayerStats | null> {
        const seasonId = await this.getCurrentSeason()
        const stats = await R_RankedleStatModel.findOne({
            where: { memberId, seasonId },
            raw: true
        })
        return stats
            ? {
                  try1: stats.try1,
                  try2: stats.try2,
                  try3: stats.try3,
                  try4: stats.try4,
                  try5: stats.try5,
                  try6: stats.try6,
                  played: stats.played,
                  won: stats.won,
                  currentStreak: stats.currentStreak,
                  maxStreak: stats.maxStreak
              }
            : null
    }

    static isBanned(memberId: string) {
        const blacklist = ['1125101235087872010']
        return blacklist.includes(memberId)
    }

    public static async play(memberId: string) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        const rankedleScore = await this.getUserScore(rankedle.id, memberId)
        await this.setDateStart(rankedle.id, memberId, rankedleScore)

        const skips = rankedleScore ? rankedleScore.skips : 0
        const fileName = `preview_${skips < 6 && !rankedleScore?.success ? skips : 'full'}.mp3`
        const preview = path.join(RANKEDLE_PATH, fileName)

        const stat = fs.statSync(preview)
        const fileSize = stat.size

        const file = fs.createReadStream(preview)
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mp3',
            'Cache-Controle':
                'max-age=0, no-cache, no-store, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: 0,
            ETag: fileName
        }

        return { head, file }
    }

    static async setDateStart(
        rankedleId: number,
        memberId: string,
        score: R_RankedleScoreModel | null
    ) {
        if (!score) {
            await R_RankedleScoreModel.create({
                rankedleId,
                memberId,
                dateStart: new Date(),
                skips: 0,
                hint: false
            })
        }
    }

    static async setDateEnd(score: R_RankedleScoreModel) {
        if (!score.dateEnd) {
            score.dateEnd = new Date()
            score.save()
        }
    }

    static async getPlayerScore(memberId: string) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        const rankedleScore = await this.getUserScore(rankedle.id, memberId)
        return rankedleScore
    }

    static async blurImage(url: string) {
        const canvas = createCanvas(300, 300)
        const ctx = canvas.getContext(
            '2d'
        ) as unknown as CanvasRenderingContext2D
        const songCover = (await loadImage(url)) as unknown as CanvasImageSource
        ctx.filter = 'blur(20px)'
        ctx.drawImage(songCover, 0, 0, 300, 300)
        const image = await sharp(canvas.toBuffer())
            .blur(10)
            .webp({ quality: 100 })
            .toBuffer()
        return image
    }

    static async hintRedeem(memberId: string) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        const rankedleScore = await this.getUserScore(rankedle.id, memberId)
        if (rankedleScore?.skips !== 5) throw new Error('Action impossible')

        if (!rankedleScore.hint) {
            rankedleScore.hint = true
            await rankedleScore.save()
        }

        const mapData = (await R_RankedleMapModel.findOne({
            where: { id: rankedle.mapId },
            raw: true
        })) as R_RankedleMapModel
        const coverURL =
            mapData.map.versions[mapData.map.versions.length - 1].coverURL
        const coverBuffer = await this.blurImage(coverURL)
        const cover = coverBuffer.toString('base64')
        return cover
    }

    static async skip(guild: Guild, memberId: string) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        if (this.isBanned(memberId)) throw new Error('Action impossible')

        let score = await R_RankedleScoreModel.findOne({
            where: {
                rankedleId: rankedle.id,
                memberId
            }
        })

        const date = new Date()

        if (score) {
            if (score.success === null) {
                if (!score.dateStart) score.dateStart = date

                if (score.skips === 6) {
                    score.success = false
                    score.messageId = await this.getRandomMessage(
                        RankedleMessageType.LOSE
                    )
                } else {
                    score.skips++
                    const details: RankedleScoreDetail[] = [
                        ...(score.details ?? []),
                        {
                            status: RankedleScoreDetailStatus.SKIP,
                            text: `SKIP (${6 - score.skips + 1})`,
                            date: Math.round(date.getTime() / 1000)
                        }
                    ]
                    score.details = details
                }

                await score.save()
            }
        } else {
            score = await R_RankedleScoreModel.create({
                rankedleId: rankedle.id,
                memberId: memberId,
                dateStart: date,
                dateEnd: date,
                skips: 1,
                details: [
                    {
                        status: RankedleScoreDetailStatus.SKIP,
                        text: 'SKIP (6)',
                        date: Math.round(date.getTime() / 1000)
                    }
                ],
                hint: false,
                success: null
            })
        }

        if (score.dateEnd === null && score.success !== null) {
            await this.updatePlayerStats(rankedle, score)
            await this.updateRankedland(guild)
        }

        return score
    }

    static async submit(guild: Guild, memberId: string, mapId: number) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        if (this.isBanned(memberId)) throw new Error('Action impossible')

        const mapData = (await R_RankedleMapModel.findOne({
            where: { id: mapId }
        })) as R_RankedleMapModel

        const validMapData = (await R_RankedleMapModel.findOne({
            where: { id: rankedle.mapId }
        })) as R_RankedleMapModel

        const songName = `${mapData.map.metadata.songAuthorName} - ${mapData.map.metadata.songName}${mapData.map.metadata.songSubName !== '' ? ` ${mapData.map.metadata.songSubName}` : ''}`

        let score = await R_RankedleScoreModel.findOne({
            where: {
                rankedleId: rankedle.id,
                memberId: memberId
            }
        })

        const success =
            mapData.map.metadata.songAuthorName ===
                validMapData.map.metadata.songAuthorName &&
            mapData.map.metadata.songName === validMapData.map.metadata.songName

        const date = new Date()

        if (score) {
            if (score.success === null) {
                if (!score.dateStart) score.dateStart = date

                if (success && score.skips < 6) {
                    score.success = true
                    score.messageId =
                        score.skips === 0
                            ? await this.getRandomMessage(
                                  RankedleMessageType.FIRST_TRY
                              )
                            : await this.getRandomMessage(
                                  RankedleMessageType.WON
                              )
                } else {
                    if (score.skips === 6) {
                        score.success = false
                        score.messageId = await this.getRandomMessage(
                            RankedleMessageType.LOSE
                        )
                    } else {
                        score.skips++
                        const details: RankedleScoreDetail[] = [
                            ...(score.details ?? []),
                            {
                                status: RankedleScoreDetailStatus.FAIL,
                                text: songName,
                                mapId: mapData.id,
                                date: Math.round(date.getTime() / 1000)
                            }
                        ]
                        score.details = details
                    }
                }

                await score.save()
            }
        } else {
            const scoreData = {
                rankedleId: rankedle.id,
                memberId: memberId,
                dateStart: date,
                skips: success ? 0 : 1,
                details: success
                    ? null
                    : [
                          {
                              status: RankedleScoreDetailStatus.FAIL,
                              text: songName,
                              mapId: mapData.id,
                              date: Math.round(date.getTime() / 1000)
                          }
                      ],
                hint: false,
                success: success ? true : null,
                messageId: success
                    ? await this.getRandomMessage(RankedleMessageType.FIRST_TRY)
                    : null
            }
            score = await R_RankedleScoreModel.create(scoreData)
        }

        if (score.dateEnd === null && score.success !== null) {
            await this.updatePlayerStats(rankedle, score)
            await this.updateRankedland(guild)
        }

        return score
    }

    static async updatePlayerStats(
        rankedle: R_RankedleModel,
        score: R_RankedleScoreModel
    ) {
        await this.setDateEnd(score)

        const stats = await R_RankedleStatModel.findOne({
            where: {
                seasonId: rankedle.seasonId,
                memberId: score.memberId
            }
        })

        if (stats) {
            stats.played++
            if (score.success) {
                stats[`try${score.skips + 1}`]++
                stats.won++
                stats.currentStreak++
                if (stats.currentStreak > stats.maxStreak)
                    stats.maxStreak = stats.currentStreak
                stats.points += POINTS[score.skips]
            } else {
                stats.currentStreak = 0
            }
            await stats.save()
        } else {
            const stats: RankedleStat = {
                seasonId: rankedle.seasonId,
                memberId: score.memberId,
                try1: 0,
                try2: 0,
                try3: 0,
                try4: 0,
                try5: 0,
                try6: 0,
                played: 1,
                won: 0,
                currentStreak: 0,
                maxStreak: 0,
                points: 0
            }
            if (score.success) {
                stats[`try${score.skips + 1}`] = 1
                stats.won = 1
                stats.currentStreak = 1
                stats.maxStreak = 1
                stats.points += POINTS[score.skips]
            }
            await R_RankedleStatModel.create(stats)
        }
    }

    static async updateRankedland(guild: Guild) {
        const rankedle = await this.getCurrentRankedle()

        if (rankedle) {
            // Permissions par défaut du salon
            const permissions: OverwriteData[] = [
                {
                    id: config.discord.roles['everyone'],
                    type: OverwriteType.Role,
                    deny: PermissionFlagsBits.ViewChannel
                },
                {
                    id: config.discord.roles['Admin'],
                    type: OverwriteType.Role,
                    allow: PermissionFlagsBits.ViewChannel
                }
            ]

            // Ajout de chaque joueur ayant terminé le Rankedle du jour aux permissions du salon
            const scores = await this.getRankedleScores(rankedle.id)
            const finishedScores = scores.filter((s) => s.success !== null)
            for (const score of finishedScores) {
                permissions.push({
                    id: score.memberId,
                    type: OverwriteType.Member,
                    allow: PermissionFlagsBits.ViewChannel
                })
            }

            try {
                await DiscordClient.updateChannelPermissions(
                    guild,
                    config.discord.channels.rankedland,
                    permissions
                )
            } catch (error) {
                console.log(error)
                Logger.log(
                    'Rankedle',
                    'ERROR',
                    'Échec de mise à jour des permissions pour le channel #rankedland'
                )
            }
        }
    }

    static async getResult(rankedle: R_RankedleModel, memberId: string) {
        if (!rankedle) return null

        const rankedleScore = await this.getUserScore(rankedle.id, memberId)
        if (!rankedleScore || rankedleScore.success === null) return null

        const mapData = await R_RankedleMapModel.findOne({
            where: { id: rankedle.mapId },
            raw: true
        })

        if (!mapData) return null

        const scoreData = this.getRankedleScoreData(rankedleScore)

        return {
            score: scoreData,
            points: POINTS[rankedleScore.skips],
            map: {
                id: mapData.map.id,
                cover: mapData.map.versions[mapData.map.versions.length - 1]
                    .coverURL,
                songName: `${mapData.map.metadata.songAuthorName} - ${mapData.map.metadata.songName}${mapData.map.metadata.songSubName !== '' ? ` ${mapData.map.metadata.songSubName}` : ''}`,
                levelAuthorName: mapData.map.metadata.levelAuthorName
            },
            message: await this.getMessageById(
                rankedleScore.messageId as number
            )
        }
    }

    static async shareScore(memberId: string) {
        const rankedle = await this.getCurrentRankedle()
        if (!rankedle) throw new Error('Pas de Rankedle en cours')

        const rankedleScore = await this.getUserScore(rankedle.id, memberId)
        if (!rankedleScore || rankedleScore.success === null) return null

        const steps: Array<null | string> = [null, null, null, null, null, null]
        if (rankedleScore.details) {
            for (let i = 0; i < rankedleScore.details.length; i++) {
                const detail = rankedleScore.details[i]
                steps[i] = detail.status
            }
        }
        if (rankedleScore.success) steps[rankedleScore.skips] = 'success'

        let result = `Rankedle #${rankedle.id}\n\n`
        result +=
            [
                !rankedleScore.success
                    ? '🔇'
                    : rankedleScore.skips === 0
                      ? '🔊'
                      : '🔉',
                ...steps.map((s) =>
                    s === 'skip'
                        ? '⬛'
                        : s === 'fail'
                          ? '🟥'
                          : s === 'success'
                            ? '🟩'
                            : '⬜'
                )
            ].join(' ') + '\n\n'
        result += '<https://bsaber.fr/rankedle>'

        return result
    }

    static async getRandomMessage(type: RankedleMessageType) {
        const randomMessage = await R_RankedleMessageModel.findAll({
            where: { type },
            order: Sequelize.literal('rand()'),
            limit: 1,
            attributes: ['id'],
            raw: true
        })
        return randomMessage.length === 1 ? randomMessage[0].id : null
    }

    static async getMessageById(messageId: number) {
        const message = await R_RankedleMessageModel.findOne({
            where: { id: messageId },
            raw: true
        })
        const m: { content?: string; image: string | null } = {
            content: message?.content,
            image: null
        }
        if (message?.image) {
            const imageBuffer = Buffer.from(message.image)
            const imageMimeType = message.image
                ? await Mime.getMimeType(imageBuffer)
                : null
            m.image = imageMimeType
                ? `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`
                : null
        }
        return m
    }

    static async getRanking(guild: Guild) {
        const seasonId = await this.getCurrentSeason()
        const rankingList = await R_RankedleStatModel.findAll({
            where: { seasonId },
            order: [['points', 'desc']],
            raw: true
        })

        let rank = 0
        const ranking: RankedlePlayerRanking[] = []
        for (const player of rankingList) {
            const member = guild.members.cache.get(player.memberId)
            if (!member) continue

            rank =
                [...ranking].pop()?.points === player.points ? rank : rank + 1
            ranking.push({
                memberId: player.memberId,
                name: member.displayName,
                avatar: member.displayAvatarURL({
                    extension: 'webp',
                    size: 128
                }),
                points: player.points,
                rank,
                stats: {
                    try1: player.try1,
                    try2: player.try2,
                    try3: player.try3,
                    try4: player.try4,
                    try5: player.try5,
                    try6: player.try6,
                    played: player.played,
                    won: player.won,
                    currentStreak: player.currentStreak,
                    maxStreak: player.maxStreak
                }
            })
        }

        return ranking
    }

    static async finish() {
        const rankedle = await this.getLastRankedle()

        if (rankedle) {
            const scores = await this.getRankedleScores(rankedle.id)
            const unfinishedScores = scores.filter((s) => s.success === null)

            for (const score of unfinishedScores) {
                if (score.skips > 0) {
                    score.success = false
                    await score.save()
                }
                await this.updatePlayerStats(rankedle, score)
            }
        }
    }

    static async getRankedleScores(rankedleId: number) {
        const scores = await R_RankedleScoreModel.findAll({
            where: { rankedleId }
        })
        return scores
    }

    static async getRankedleHistory(
        memberId: string,
        first: number = 0,
        rows: number = 10
    ) {
        const history = []

        const currentRankedle = await this.getCurrentRankedle()

        const { count: total, rows: rankedles } =
            await R_RankedleModel.findAndCountAll({
                order: [['id', 'desc']],
                offset: first,
                limit: rows,
                raw: true
            })

        for (const rankedle of rankedles) {
            const mapData = await R_RankedleMapModel.findOne({
                where: { id: rankedle.mapId },
                raw: true
            })

            const rankedleScore = await R_RankedleScoreModel.findOne({
                where: {
                    rankedleId: rankedle.id,
                    memberId
                },
                raw: true
            })

            if (currentRankedle && rankedle.id === currentRankedle.id)
                if (!rankedleScore || rankedleScore.success === null) continue

            const scoreData = this.getRankedleScoreData(rankedleScore)

            history.push({
                id: rankedle.id,
                cover: mapData
                    ? mapData.map.versions[mapData.map.versions.length - 1]
                          .coverURL
                    : null,
                songName: mapData
                    ? `${mapData.map.metadata.songAuthorName} - ${mapData.map.metadata.songName}${mapData.map.metadata.songSubName !== '' ? ` ${mapData.map.metadata.songSubName}` : ''}`
                    : null,
                levelAuthorName: mapData
                    ? mapData.map.metadata.levelAuthorName
                    : null,
                score: scoreData,
                date: new Intl.DateTimeFormat('FR-fr').format(
                    new Date(rankedle.date as Date)
                )
            })
        }

        return {
            first,
            total,
            history
        }
    }

    private static getRankedleScoreData(
        rankedleScore: R_RankedleScoreModel | null
    ) {
        if (!rankedleScore) return null

        const success = rankedleScore.success ? true : false
        const skips = rankedleScore.skips

        const steps: Array<'skip' | 'fail' | 'success' | null> = [
            null,
            null,
            null,
            null,
            null,
            null
        ]
        if (rankedleScore.details) {
            for (let i = 0; i < rankedleScore.details.length; i++) {
                const detail = rankedleScore.details[i]
                steps[i] = detail.status
            }
        }
        if (rankedleScore.success) steps[rankedleScore.skips] = 'success'

        return {
            success,
            skips,
            steps
        }
    }

    // static async getSummary() {
    //     const globalStatsData = await R_RankedleStatModel.findAll({
    //         attributes: [
    //             'memberId',
    //             [ Sequelize.fn('sum', Sequelize.col('points')), 'totalPoints' ]
    //         ],
    //         group: 'memberId',
    //         raw: true
    //     })

    //     const globalStats = []
    //     for(const s of globalStatsData) {
    //         const user = await DiscordClient.getUser(s.memberId)
    //         if(!user) continue
    //         globalStats.push({
    //             ...s,
    //             player: {
    //                 name: DiscordClient.getNickname(user),
    //                 avatar: `${DiscordClient.getAvatar(user, 80)}`
    //             }
    //         })
    //     }

    //     // Classement général
    //     globalStats.sort((a, b) => b.points - a.points)

    //     let rank = 0
    //     const ranking: Array<{player: { name: string, avatar: string }, points: number, rank: number}> = []
    //     for(const stat of globalStats) {
    //         rank = ([...ranking].pop())?.points === stat.points ? rank : rank + 1
    //         ranking.push({
    //             player: stat.player,
    //             points: stat.points,
    //             rank
    //         })
    //     }

    //     let season = null

    //     const seasons = await R_RankedleSeasonModel.findAll({
    //         order: [
    //             [ 'id', 'asc' ]
    //         ],
    //         raw: true
    //     })
    //     const prevSeason = seasons.length > 1 ? seasons[seasons.length - 2] : null

    //     if(prevSeason) {
    //         const seasonId = prevSeason.id

    //         const seasonStatsData = await R_RankedleStatModel.findAll({
    //             where: { seasonId },
    //             raw: true
    //         })

    //         if(seasonStatsData.length > 0) {
    //             const seasonStats = []
    //             for(const s of seasonStatsData) {
    //                 const user = await DiscordClient.getUser(s.memberId)
    //                 if(!user) continue
    //                 seasonStats.push({
    //                     ...s,
    //                     player: {
    //                         name: DiscordClient.getNickname(user),
    //                         avatar: DiscordClient.getAvatar(user, 80)
    //                     }
    //                 })
    //             }

    //             const seasonScores = await R_RankedleScoreModel.findAll({
    //                 include: {
    //                     model: R_RankedleModel,
    //                     required: false,
    //                     attributes: []
    //                 },
    //                 attributes: [
    //                     'memberId',
    //                     [ Sequelize.fn('sum', Sequelize.col('skips')), 'totalSkips' ],
    //                     [ Sequelize.fn('sum', Sequelize.col('hint')), 'totalHints' ]
    //                 ],
    //                 where: {
    //                     '$rankedle.seasonId$': seasonId
    //                 },
    //                 group: 'memberId',
    //                 raw: true
    //             })

    //             const scores = []
    //             for(const s of seasonScores) {
    //                 const user = await DiscordClient.getUser(s.memberId)
    //                 scores.push({
    //                     ...s,
    //                     player: {
    //                         name: user ? DiscordClient.getNickname(user) : s.memberId,
    //                         avatar: user ? DiscordClient.getAvatar(user, 80) : ''
    //                     }
    //                 })
    //             }

    //             // Top 1
    //             seasonStats.sort((a, b) => b.points - a.points)
    //             const top1 = seasonStats[0].points > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].points
    //             } : null

    //             // Meilleure série
    //             seasonStats.sort((a, b) => b.maxStreak - a.maxStreak)
    //             const maxStreak = seasonStats[0].maxStreak > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].maxStreak
    //             } : null

    //             // Parties jouées
    //             seasonStats.sort((a, b) => b.played - a.played)
    //             const played = seasonStats[0].played > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].played
    //             } : null

    //             // Du premier coup
    //             seasonStats.sort((a, b) => b.try1 - a.try1)
    //             const firstTry = seasonStats[0].try1 > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].try1
    //             } : null

    //             // Nombre de victoires
    //             seasonStats.sort((a, b) => b.won - a.won)
    //             const wins = seasonStats[0].won > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].won
    //             } : null

    //             // Nombre de défaites
    //             seasonStats.sort((a, b) => (b.played - b.won) - (a.played - a.won))
    //             const loses = seasonStats[0].played - seasonStats[0].won > 0 ? {
    //                 player: seasonStats[0].player,
    //                 count: seasonStats[0].played - seasonStats[0].won
    //             } : null

    //             // Clics du bouton « PASSER »
    //             scores.sort((a, b) => b.totalSkips - a.totalSkips)
    //             const skips = scores[0].totalSkips > 0 ? {
    //                 player: scores[0].player,
    //                 count: scores[0].totalSkips
    //             } : null

    //             // Nombre d'indices demandés
    //             scores.sort((a, b) => b.totalHints - a.totalHints)
    //             const hints = scores[0].totalHints > 0 ? {
    //                 player: scores[0].player,
    //                 count: scores[0].totalHints
    //             } : null

    //             season = {
    //                 id: seasonId,
    //                 top1,
    //                 maxStreak,
    //                 played,
    //                 firstTry,
    //                 wins,
    //                 loses,
    //                 skips,
    //                 hints
    //             }
    //         }
    //     }

    //     return {
    //         global: {
    //             ranking
    //         },
    //         season
    //     }
    // }
}
