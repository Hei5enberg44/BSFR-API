import { OpenDataSoftAPI, DatasetRecordsQueryParams } from './opendatasoft.js'
import { A_CitieModel } from '../models/agent.model.js'

export class City {
    /**
     * Récupère les villes d'origine des membres du serveur Discord
     * @returns {Promise<Array<{memberId: string, pays: string, commune: string, coordonnees_gps: string}>>} liste des villes
     */
    static async get() {
        const cities = await A_CitieModel.findAll({
            raw: true
        })
        return cities
    }

    static async getCityList(cityName: string) {
        const params: DatasetRecordsQueryParams = {
            select: 'geoname_id, name, country, coordinates',
            where: `name LIKE \'%${cityName.replace('\'', '\\\'')}%\'`,
            include_links: false,
            include_app_metas: false,
            offset: 0,
            limit: 50
        }
        const cities = await OpenDataSoftAPI.getDatasetRecords('geonames-all-cities-with-a-population-500', params)
        return cities.results.map(r => {
            return {
                id: r.geoname_id,
                name: `${r.name} (${r.country})`
            }
        })
    }

    static async getCityById(cityId: string) {
        const params: DatasetRecordsQueryParams = {
            select: 'geoname_id, name, country, coordinates',
            where: `geoname_id = '${cityId}'`,
            include_links: false,
            include_app_metas: false,
            offset: 0,
            limit: 50
        }
        const cities = await OpenDataSoftAPI.getDatasetRecords('geonames-all-cities-with-a-population-500', params)
        return cities.results
    }
}