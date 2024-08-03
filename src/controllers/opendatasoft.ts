const API_URL = 'https://public.opendatasoft.com/api/explore/v2.1'

const wait = (s: number) => new Promise((res) => setTimeout(res, s * 1000))

export interface DatasetRecordsQueryParams {
    /**
     * Examples:
     *
     *  - `select=size` - Example of select, which only return the "size" field.
     *  - `select=size * 2 as bigger_size` - Example of a complex expression with a label, which returns a new field named "bigger_size" and containing the double of size field value.
     *
     *  A select expression can be used to add, remove or change the fields to return. An expression can be:
     *
     *  - a wildcard ('*'): all fields are returned.
     *  - A field name: only the specified field is returned.
     *  - An include/exclude function: All fields matching the include or exclude expression are included or excluded. This expression can contain wildcard.
     *  - A complex expression. The result of the expression is returned. A label can be set for this expression, and in that case, the field will be named after this label.
     */
    select?: string
    /**
     * A `where` filter is a text expression performing a simple full-text search that can also include logical operations (NOT, AND, OR...) and lots of other functions to perform complex and precise search operations.
     *
     * For more information, see [Opendatasoft Query Language (ODSQL)](https://help.opendatasoft.com/apis/ods-explore-v2/#section/Opendatasoft-Query-Language-(ODSQL)/Where-clause) reference documentation.
     */
    where?: string
    /**
     * Example: `group_by=city_field as city`
     *
     * A group by expression defines a grouping function for an aggregation. It can be:
     *
     * - a field name: group result by each value of this field
     * - a range function: group result by range
     * - a date function: group result by date
     *
     * It is possible to specify a custom name with the 'as name' notation.
     */
    group_by?: string
    /**
     * Example: `order_by=sum(age) desc, name asc`
     *
     * A comma-separated list of field names or aggregations to sort on, followed by an order (`asc` or `desc`).
     *
     * Results are sorted in ascending order by default. To sort results in descending order, use the `desc` keyword.
     */
    order_by?: string
    /**
     * Number of items to return.
     *
     * To use with the `offset` parameter to implement pagination.
     *
     * The maximum possible value depends on whether the query contains a `group_by` clause or not.
     *
     * For a query **without** a `group_by`:
     *
     * - the maximum value for `limit` is 100,
     * - `offset+limit` should be less than 10000
     *
     * For a query **with** a `group_by`:
     *
     * - the maximum value for `limit` is 20000,
     * - `offset+limit` should be less than 20000
     *
     * **Note:** If you need more results, please use the /exports endpoint.
     */
    limit?: number
    /**
     * Index of the first item to return (starting at 0).
     *
     * To use with the `limit` parameter to implement pagination.
     *
     * **Note:** the maximum value depends on the type of query, see the note on limit for the details
     */
    offset?: number
    /**
     * Example: `refine=modified:2020` - Return only the value `2020` from the `modified` facet.
     *
     * A facet filter used to limit the result set. Using this parameter, you can refine your query to display only the selected facet value in the response.
     *
     * Refinement uses the following syntax: `refine=<FACETNAME>:<FACETVALUE>`
     *
     * For date, and other hierarchical facets, when refining on one value, all second-level values related to that entry will appear in facets enumeration. For example, after refining on the year 2019, the related second-level month will appear. And when refining on August 2019, the third-level day will appear.
     *
     * **`refine` must not be confused with a `where` filter. Refining with a facet is equivalent to selecting an entry in the left navigation panel.**
     */
    refine?: string
    /**
     * Examples:
     *
     * - `exclude=city:Paris` - Exclude the value `Paris` from the `city` facet. Facets enumeration will display `Paris` as `excluded` without any count information.
     * - `exclude=modified:2019/12` - Exclude the value `2019/12` from the `modified` facet. Facets enumeration will display `2020` as `excluded` without any count information.
     *
     * A facet filter used to exclude a facet value from the result set. Using this parameter, you can filter your query to exclude the selected facet value in the response.
     *
     * `exclude` uses the following syntax: `exclude=<FACETNAME>:<FACETVALUE>`
     *
     * **`exclude` must not be confused with a `where` filter. Excluding a facet value is equivalent to removing an entry in the left navigation panel.**
     */
    exclude?: string
    /**
     * A language value.
     *
     * If specified, the `lang` value override the default language, which is "fr". The language is used to format string, for example in the `date_format` function.
     */
    lang?: string
    /**
     * Set the timezone for datetime fields.
     *
     * Timezone IDs are defined by the [Unicode CLDR project](https://github.com/unicode-org/cldr). The list of timezone IDs is available in [timezone.xml](https://github.com/unicode-org/cldr/blob/master/common/bcp47/timezone.xml).
     */
    timezone?: string
    /**
     * If set to `true`, this parameter will add HATEOAS links in the response.
     */
    include_links?: boolean
    /**
     * If set to `true`, this parameter will add application metadata to the response.
     */
    include_app_metas?: boolean
}

export interface DatasetRecordsQueryResult {
    total_count: number
    results: {
        name: string
        alternate_name: string[]
        coordinates: {
            lat: number
            lon: number
        }
        geoname_id: string
        country: string
        country_code: string
        timezone: string
        population: number
    }[]
}

export class OpenDataSoftAPI {
    /**
     * Envoi d'une requête à l'API de OpenDataSoft
     * @returns résultat de la requête
     */
    static async send<T>(url: string): Promise<T> {
        let data
        let error = false
        let retries = 0

        do {
            const res = await fetch(url)

            if (res.ok) {
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
                    if (retries < 5) await wait(3)
                    retries++
                }
                if (res.status === 429) {
                    await wait(60)
                }
                error = true
            }
        } while (error)
        return data
    }

    static async getDatasetRecords(
        datasetId: string,
        queryParams: DatasetRecordsQueryParams
    ) {
        const params: Record<string, string> = {}
        for (const [key, value] of Object.entries(queryParams)) {
            params[key] = value.toString()
        }
        const urlParams = new URLSearchParams(params).toString()
        const url = `${API_URL}/catalog/datasets/${datasetId}/records?${urlParams}`
        const results = await this.send<DatasetRecordsQueryResult>(url)
        return results
    }
}
