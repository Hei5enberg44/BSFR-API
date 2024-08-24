import {
    ChannelType,
    DiscordAPIError,
    Guild,
    MessageType,
    RESTJSONErrorCodes,
    TextChannel,
    VoiceChannel
} from 'discord.js'
import { CDNRoutes, ImageFormat } from 'discord.js'
import emojiRegex from 'emoji-regex'
import * as marked from 'marked'

interface GuildChannel {
    id: string
    name: string
    type: ChannelType
    position: number
    channels:
        | {
              id: string
              name: string
              type: ChannelType
              position: number
          }[]
        | null
}

interface MessageEmoji {
    id: string | null
    name: string
    animated: boolean
}

interface MessageGuildRole {
    id: string
    name: string
    color: string
}

interface MessageGuildUser {
    id: string
    name: string
}

interface MessageGuildChannel {
    id: string
    name: string
}

interface DMSettings {
    enables: boolean
}

export type AgentSettingData = DMSettings

export class Agent {
    public static getGuildChannels(guild: Guild): GuildChannel[] {
        const channels = guild.channels.cache.toJSON()
        let channelList = []

        for (const channel of channels) {
            if (
                (channel.type === ChannelType.GuildText ||
                    channel.type === ChannelType.GuildVoice) &&
                !channel.parentId
            ) {
                channelList.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    position: channel.position,
                    channels: null
                })
            }
            if (
                channel.type === ChannelType.GuildCategory &&
                !channel.parentId
            ) {
                if (!channelList.find((c) => c.id === channel.id)) {
                    const categoryChannels = (
                        channels.filter(
                            (c) =>
                                c.parentId === channel.id &&
                                (c.type === ChannelType.GuildText ||
                                    c.type === ChannelType.GuildVoice)
                        ) as (TextChannel | VoiceChannel)[]
                    ).sort((a, b) => a.position - b.position)
                    channelList.push({
                        id: channel.id,
                        name: channel.name,
                        type: channel.type,
                        position: channel.position,
                        channels: categoryChannels.map((c) => {
                            return {
                                id: c.id,
                                name: c.name,
                                type: c.type,
                                position: c.position
                            }
                        })
                    })
                }
            }
        }

        channelList.sort((a, b) => a.position - b.position)

        return channelList
    }

    public static async getChannelMessages(guild: Guild, channelId: string) {
        const channel = guild.channels.cache.get(channelId)
        if (!channel) throw new Error('Salon inconnu')

        try {
            let messages = (
                channel as TextChannel | VoiceChannel
            ).messages.cache
                .toJSON()
                .filter((m) => m.type !== MessageType.UserJoin)
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .splice(0, 20)

            if (messages.length === 0)
                messages = (
                    await (
                        channel as TextChannel | VoiceChannel
                    ).messages.fetch({
                        limit: 20
                    })
                )
                    .toJSON()
                    .filter((m) => m.type !== MessageType.UserJoin)

            return messages.map((m) => {
                let content = m.interaction
                    ? `/${m.interaction.commandName}`
                    : m.content

                // Parsing des rôles
                const roles = this.getMessageRoles(guild, content)
                for (const role of roles) {
                    content = content.replace(
                        new RegExp(`(<@&${role.id}>)`, 'g'),
                        `<span style="color:rgb(${role.color});background-color:rgba(${role.color}, 0.1);font-weight:500;border-radius:3px;padding:1px 3px;line-height:normal;">@${role.name}</span>`
                    )
                }

                // Parsing des utilisateurs
                const users = this.getMessageUsers(guild, content)
                for (const user of users) {
                    content = content.replace(
                        new RegExp(`(<@${user.id}>)`, 'g'),
                        `<span style="color:white;background-color:rgba(88,101,242,.3);font-weight:500;border-radius:3px;padding:1px 3px;line-height:normal">@${user.name}</span>`
                    )
                }

                // Parsing des salons
                const channels = this.getMessageChannels(guild, content)
                for (const channel of channels) {
                    content = content.replace(
                        new RegExp(`(<#${channel.id}>)`, 'g'),
                        `<span style="color:white;background-color:rgba(88,101,242,.3);font-weight:500;border-radius:3px;padding:1px 3px;line-height:normal;display:inline-flex;align-items:center;column-gap:0.25rem"><span class="pi pi-hashtag"></span><span>${channel.name}</span></span>`
                    )
                }

                // Parsing des emojis
                const emojis = this.getMessageEmojis(content)
                for (const emoji of emojis) {
                    if (emoji.id) {
                        const url = `https://cdn.discordapp.com${CDNRoutes.emoji(emoji.id, emoji.animated ? ImageFormat.GIF : ImageFormat.WebP)}`
                        content = content.replace(
                            new RegExp(
                                `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
                                'g'
                            ),
                            `<img src="${url}" width="22" height="22" style="vertical-align:top">`
                        )
                    } else {
                        content = content.replace(
                            new RegExp(emoji.name, 'g'),
                            `<em-emoji set="twitter" native="${emoji.name}" size="22"></em-emoji>`
                        )
                    }
                }

                // Conversion du markdown en HTML
                try {
                    content = marked
                        .parse(content, { async: false })
                        .replace(/^(.+)\n$/s, '$1')
                } catch (error) {}

                return {
                    id: m.id,
                    author: m.interaction
                        ? {
                              id: m.interaction.user.id,
                              name: m.interaction.user.displayName,
                              color: this.getMemberRoleColor(
                                  guild,
                                  m.interaction.user.id
                              ),
                              avatar: m.interaction.user.displayAvatarURL({
                                  extension: 'webp',
                                  size: 128
                              })
                          }
                        : {
                              id: m.author.id,
                              name: m.author.displayName,
                              color: this.getMemberRoleColor(
                                  guild,
                                  m.author.id
                              ),
                              avatar: m.author.displayAvatarURL({
                                  extension: 'webp',
                                  size: 128
                              })
                          },
                    content,
                    createdAt: m.createdAt
                }
            })
        } catch (error) {
            throw new Error('Échec de la récupération des messages du salon')
        }
    }

    private static getMessageEmojis(content: string) {
        const discordEmojis: MessageEmoji[] = []
        content.match(/<a?:[^:]+:\d+>/g)?.forEach((e) => {
            const splited = e.replace(/<|>/g, '').split(':')
            if (!discordEmojis.find((de) => de.id === splited[2])) {
                discordEmojis.push({
                    id: splited[2],
                    name: splited[1],
                    animated: splited[0] === 'a'
                })
            }
        })

        const nativeEmojis: MessageEmoji[] = []
        content.match(emojiRegex())?.forEach((e) => {
            if (!nativeEmojis.find((de) => de.name === e)) {
                nativeEmojis.push({
                    id: null,
                    name: e,
                    animated: false
                })
            }
        })
        return [...discordEmojis, ...nativeEmojis]
    }

    private static getMessageRoles(guild: Guild, content: string) {
        const roles: MessageGuildRole[] = []
        content.match(/<@&\d+>/g)?.forEach((role) => {
            const id = role.replace(/<@&(\d+)>/, '$1')
            if (!roles.find((r) => r.id === id)) {
                const guildRole = guild.roles.cache.get(id)
                if (guildRole) {
                    roles.push({
                        id: guildRole.id,
                        name: guildRole.name,
                        color: `${(guildRole.color >> 16) & 0xff},${(guildRole.color >> 8) & 0xff},${guildRole.color & 0xff}`
                    })
                }
            }
        })
        return roles
    }

    private static getMessageUsers(guild: Guild, content: string) {
        const users: MessageGuildUser[] = []
        content.match(/<@\d+>/g)?.forEach((user) => {
            const id = user.replace(/<@(\d+)>/, '$1')
            if (!users.find((u) => u.id === id)) {
                const guildMember = guild.members.cache.get(id)
                if (guildMember) {
                    users.push({
                        id: guildMember.id,
                        name: guildMember.displayName
                    })
                } else {
                    users.push({
                        id: id,
                        name: 'utilisateur-inconnu'
                    })
                }
            }
        })
        return users
    }

    private static getMessageChannels(guild: Guild, content: string) {
        const channels: MessageGuildChannel[] = []
        content.match(/<#\d+>/g)?.forEach((channel) => {
            const id = channel.replace(/<#(\d+)>/, '$1')
            if (!channels.find((u) => u.id === id)) {
                const guildChannel = guild.channels.cache.get(id)
                if (guildChannel) {
                    channels.push({
                        id: guildChannel.id,
                        name: guildChannel.name
                    })
                } else {
                    channels.push({
                        id: id,
                        name: 'inconnu'
                    })
                }
            }
        })
        return channels
    }

    private static getMemberRoleColor(guild: Guild, memberId: string) {
        const member = guild.members.cache.get(memberId)
        if (member) {
            const color = member.roles.color?.hexColor
            if (color) return color
        }
        return null
    }

    public static async sendMessage(
        guild: Guild,
        channelId: string,
        messageId: string | null,
        content: string,
        mention: boolean
    ) {
        const channel = guild.channels.cache.get(channelId) as
            | TextChannel
            | VoiceChannel
        if (!channel) throw new Error('Salon inconnu')

        try {
            if (messageId !== null) {
                const message = await channel.messages.fetch(messageId)
                await message.reply({
                    content,
                    allowedMentions: { repliedUser: mention }
                })
            } else {
                await channel.send({ content })
            }
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                if (error.code === RESTJSONErrorCodes.UnknownMessage) {
                    throw new Error(
                        "Le message auquel vous souhaitez répondre n'existe pas"
                    )
                }
            }
            throw error
        }
    }

    public static async sendReaction(
        guild: Guild,
        channelId: string,
        messageId: string,
        emoji: string,
        native: boolean
    ) {
        const channel = guild.channels.cache.get(channelId) as
            | TextChannel
            | VoiceChannel
        if (!channel) throw new Error('Salon inconnu')

        try {
            const message = await channel.messages.fetch(messageId)
            const reaction = native ? emoji : message.guild.emojis.cache.get(emoji)
            if(typeof reaction === 'undefined') throw Error('Impossible d\'envoyer la réaction')
            await message.react(reaction)
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                if (error.code === RESTJSONErrorCodes.UnknownMessage) {
                    throw new Error(
                        "Le message auquel vous souhaitez réagir n'existe pas"
                    )
                }
                if (error.code === RESTJSONErrorCodes.MaximumNumberOfReactionsReached) {
                    throw new Error(
                        "Le nombre maximum de réactions a été atteint (20)"
                    )
                }
                if (error.code === RESTJSONErrorCodes.ReactionWasBlocked) {
                    throw new Error(
                        "La réaction a été bloquée"
                    )
                }
                if (error.code === RESTJSONErrorCodes.UserCannotUseBurstReactions) {
                    throw new Error(
                        "Calmez vous !"
                    )
                }
            }
            throw error
        }
    }
}
