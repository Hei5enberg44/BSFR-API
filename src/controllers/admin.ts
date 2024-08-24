import { Guild } from 'discord.js'
import { Op } from 'sequelize'
import {
    A_BanModel,
    A_BirthdayMessageModel,
    A_BirthdayModel,
    A_MuteModel,
    A_TwitchModel
} from '../models/agent.model.js'
import { getMemberOrUser, sort, filter } from '../utils/table.js'
import { CS_CardModel } from '../models/cubestalker.model.js'

type FilterMetadata = {
    [s: string]: {
        value: any
        matchMode: string
    }
}

export class Admin {
    public static async getBirthdays(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const birthdays = await A_BirthdayModel.findAll({
            raw: true
        })

        let birthdayList = []
        for (const birthday of birthdays) {
            const member = guild.members.cache.get(birthday.memberId)
            if (!member) continue

            birthdayList.push({
                member: {
                    id: birthday.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                date: birthday.date
            })
        }

        // Tris
        if (sortField !== '') sort(birthdayList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    birthdayList = filter(birthdayList, field, value, matchMode)
            }
        } catch (error) {}

        return {
            first,
            total: birthdayList.length,
            birthdays: birthdayList.splice(first, rows)
        }
    }

    public static async getMutes(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const mutes = await A_MuteModel.findAll({
            raw: true
        })

        let muteList = []
        for (const mute of mutes) {
            const member = await getMemberOrUser(guild, mute.memberId)
            const author = await getMemberOrUser(guild, mute.mutedBy)

            muteList.push({
                member: {
                    id: mute.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                author: {
                    id: mute.mutedBy,
                    name: author.displayName,
                    avatar: author.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                reason: mute.reason,
                muteDate: mute.muteDate,
                unmuteDate: mute.unmuteDate
            })
        }

        // Tris
        if (sortField !== '') sort(muteList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    muteList = filter(muteList, field, value, matchMode)
            }
        } catch (error) {}

        return {
            first,
            total: muteList.length,
            mutes: muteList.splice(first, rows)
        }
    }

    public static async getBans(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const bans = await A_BanModel.findAll({
            raw: true
        })

        let banList = []
        for (const ban of bans) {
            const member = await getMemberOrUser(guild, ban.memberId)
            const author = await getMemberOrUser(guild, ban.bannedBy)
            const approver = ban.approvedBy
                ? await getMemberOrUser(guild, ban.approvedBy)
                : null

            banList.push({
                member: {
                    id: ban.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                author: {
                    id: ban.bannedBy,
                    name: author.displayName,
                    avatar: author.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                ...(approver && {
                    approver: {
                        id: ban.approvedBy,
                        name: approver.displayName,
                        avatar: approver.displayAvatarURL({
                            extension: 'webp',
                            size: 128
                        })
                    }
                }),
                reason: ban.reason,
                banDate: ban.banDate,
                unbanDate: ban.unbanDate
            })
        }

        // Tris
        if (sortField !== '') sort(banList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    banList = filter(banList, field, value, matchMode)
            }
        } catch (error) {}

        return {
            first,
            total: banList.length,
            bans: banList.splice(first, rows)
        }
    }

    public static async getBirthdayMessages(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const birthdayMessages = await A_BirthdayMessageModel.findAll({
            raw: true
        })

        let birthdayMessageList = []
        for (const birthdayMessage of birthdayMessages) {
            const member = guild.members.cache.get(birthdayMessage.memberId)
            if (!member) continue

            birthdayMessageList.push({
                id: birthdayMessage.id,
                message: birthdayMessage.message,
                member: {
                    id: birthdayMessage.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                date: birthdayMessage.date
            })
        }

        // Tris
        if (sortField !== '') sort(birthdayMessageList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    birthdayMessageList = filter(
                        birthdayMessageList,
                        field,
                        value,
                        matchMode
                    )
            }
        } catch (error) {}

        return {
            first,
            total: birthdayMessageList.length,
            birthdayMessages: birthdayMessageList.splice(first, rows)
        }
    }

    public static async addBirthdayMessage(memberId: string, message: string) {
        await A_BirthdayMessageModel.create({
            memberId,
            message: message.trim()
        })
    }

    public static async modifyBirthdayMessage(id: number, message: string) {
        const birthdayMessage = await A_BirthdayMessageModel.findOne({
            where: { id }
        })
        if (birthdayMessage) {
            birthdayMessage.message = message.trim()
            await birthdayMessage.save()
        }
    }

    public static async deleteBirthdayMessage(id: number) {
        await A_BirthdayMessageModel.destroy({
            where: { id }
        })
    }

    public static async getTwitchChannels(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const twitchChannels = await A_TwitchModel.findAll({
            raw: true
        })

        let twitchChannelList = []
        for (const twitchChannel of twitchChannels) {
            const member = guild.members.cache.get(twitchChannel.memberId)
            if (!member) continue

            twitchChannelList.push({
                member: {
                    id: twitchChannel.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                channelName: twitchChannel.channelName,
                live: twitchChannel.live
            })
        }

        // Tris
        if (sortField !== '') sort(twitchChannelList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    twitchChannelList = filter(
                        twitchChannelList,
                        field,
                        value,
                        matchMode
                    )
            }
        } catch (error) {}

        return {
            first,
            total: twitchChannelList.length,
            twitchChannels: twitchChannelList.splice(first, rows)
        }
    }

    public static async getCubeStalkerRequests(
        guild: Guild,
        first: number,
        rows: number,
        sortField: string,
        sortOrder: number,
        filters: string
    ) {
        const requests = await CS_CardModel.findAll({
            where: { status: { [Op.ne]: 0 } },
            raw: true
        })

        let requestList = []
        for (const request of requests) {
            const member = guild.members.cache.get(request.memberId)
            if (!member) continue

            requestList.push({
                id: request.id,
                member: {
                    id: request.memberId,
                    name: member.displayName,
                    avatar: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    })
                },
                status: request.status
            })
        }

        // Tris
        if (sortField !== '') sort(requestList, sortField, sortOrder)

        // Filtres
        try {
            const _filters: FilterMetadata = JSON.parse(filters)
            for (const [field, { value, matchMode }] of Object.entries(
                _filters
            )) {
                if (value !== null)
                    requestList = filter(requestList, field, value, matchMode)
            }
        } catch (error) {}

        return {
            first,
            total: requestList.length,
            requests: requestList.splice(first, rows)
        }
    }

    public static async getCubeStalkerRequest(guild: Guild, id: number) {
        const request = await CS_CardModel.findOne({
            where: { id, status: { [Op.ne]: 0 } },
            raw: true
        })
        if (request) {
            const member = guild.members.cache.get(request.memberId)

            if (member) {
                return {
                    id: request.id,
                    member: {
                        id: member.id,
                        name: member.displayName,
                        avatar: member.displayAvatarURL({
                            extension: 'webp',
                            size: 128
                        })
                    },
                    status: request.status
                }
            }
        }
        return null
    }
}
