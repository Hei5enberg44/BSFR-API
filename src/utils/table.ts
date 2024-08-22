import { Guild } from 'discord.js'

export const getMemberOrUser = async (guild: Guild, memberId: string) => {
    const member = guild.members.cache.get(memberId)
    if (member) return member
    const user =
        guild.client.users.cache.get(memberId) ??
        (await guild.client.users.fetch(memberId))
    return user
}

export const sort = <T extends { [key: string]: any }>(
    data: T[],
    sortField: string,
    sortOrder: number
) => {
    data.sort((a, b) => {
        for (const key of sortField.split('.')) {
            if (!Object.hasOwn(a, key)) {
                a = '' as any
                break
            }
            if (!Object.hasOwn(b, key)) {
                b = '' as any
                break
            }
            a = a[key]
            b = b[key]
        }

        let fieldA = a as any
        let fieldB = b as any
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
            fieldA = fieldA.toLowerCase()
            fieldB = fieldB.toLowerCase()
        }
        if (sortOrder === 1)
            return fieldA === fieldB ? 0 : fieldA < fieldB ? -1 : 1
        else return fieldA === fieldB ? 0 : fieldA < fieldB ? 1 : -1
    })
}

export const filter = <T extends { [key: string]: any }>(
    data: T[],
    filterField: string,
    value: any,
    matchMode: string
): T[] => {
    return data.filter((d) => {
        let match = false

        for (const key of filterField.split('.')) {
            if (!Object.hasOwn(d, key)) {
                d = '' as any
                break
            }
            d = d[key]
        }

        const fieldValue = d as any

        if (typeof value === 'string') {
            // Filtre d'une chaîne de caractères
            if (typeof fieldValue === 'string') {
                const fieldString = fieldValue
                switch (matchMode) {
                    case 'contains':
                        match = fieldString.includes(value)
                        break
                    case 'startsWith':
                        match = fieldString.startsWith(value)
                        break
                    case 'notContains':
                        match = !fieldString.includes(value)
                        break
                    case 'endsWith':
                        match = fieldString.endsWith(value)
                        break
                    case 'equals':
                        match = fieldString === value
                        break
                    case 'notEquals':
                        match = fieldString !== value
                        break
                }
            }

            // Filtre d'une date
            if (fieldValue instanceof Date) {
                const fieldDate = new Date(fieldValue)
                const date = new Date(value)
                switch (matchMode) {
                    case 'dateIs':
                        fieldDate.setHours(0, 0, 0, 0)
                        match = fieldDate.getTime() === date.getTime()
                        break
                    case 'dateIsNot':
                        fieldDate.setHours(0, 0, 0, 0)
                        match = fieldDate.getTime() !== date.getTime()
                        break
                    case 'dateBefore':
                        match = fieldDate.getTime() <= date.getTime()
                        break
                    case 'dateAfter':
                        match = fieldDate.getTime() >= date.getTime()
                        break
                }
            }
        }

        if (typeof value === 'boolean') match = fieldValue == value

        if (typeof value === 'number') {
            const fieldNumber = fieldValue
            switch (matchMode) {
                case 'equals':
                    match = fieldNumber === value
                    break
                case 'notEquals':
                    match = fieldNumber !== value
                    break
                case 'lt':
                    match = fieldNumber < value
                    break
                case 'lte':
                    match = fieldNumber <= value
                    break
                case 'gt':
                    match = fieldNumber > value
                    break
                case 'gte':
                    match = fieldNumber >= value
                    break
            }
        }

        return match
    })
}
