import { OpenDataSoftAPI, DatasetRecordsQueryParams } from './opendatasoft.js'

export class City {
    private static dataset = 'geonames-all-cities-with-a-population-500'

    static async getCityList(cityName: string) {
        const params: DatasetRecordsQueryParams = {
            select: 'geoname_id, name, country, coordinates',
            where: `name LIKE \'%${cityName.replace("'", "\\'")}%\'`,
            include_links: false,
            include_app_metas: false,
            offset: 0,
            limit: 50
        }
        const cities = await OpenDataSoftAPI.getDatasetRecords(
            this.dataset,
            params
        )
        return cities.results.map((r) => {
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
        const cities = await OpenDataSoftAPI.getDatasetRecords(
            this.dataset,
            params
        )
        return cities.results
    }
}
