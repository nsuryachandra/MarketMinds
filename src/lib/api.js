const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api/v1'

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function buildUrl(path, params) {
  const url = new URL(`${apiBaseUrl}/${String(path).replace(/^\/+/, '')}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      if (Array.isArray(value)) {
        value.filter((item) => item !== undefined && item !== null && item !== '').forEach((item) => {
          url.searchParams.append(key, String(item))
        })
        return
      }
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

async function request(path, { method = 'GET', params, body, headers, signal } = {}) {
  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Could not reach the MarketMinds API.', {
      code: 'network_error',
      details: error.message,
    })
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      throw new ApiError('The API returned an invalid JSON response.', {
        status: response.status,
        code: 'invalid_json',
      })
    }
  }

  if (!response.ok) {
    const apiError = payload?.error
    throw new ApiError(apiError?.message || `API request failed with status ${response.status}.`, {
      status: response.status,
      code: apiError?.code || 'http_error',
      details: apiError?.details ?? null,
    })
  }

  return payload
}

export const marketApi = {
  getHealth(options = {}) {
    return request('/health', options)
  },
  getCategories(options = {}) {
    return request('/meta/categories', options)
  },
  getLocalities(options = {}) {
    return request('/meta/localities', options)
  },
  getDataSources(options = {}) {
    return request('/meta/data-sources', options)
  },
  interpretSearch({ query, locality_id } = {}, options = {}) {
    return request('/search/interpret', {
      ...options,
      method: 'POST',
      body: { query, locality_id },
    })
  },
  getOverview({ category, radius_m } = {}, options = {}) {
    return request('/market/overview', {
      ...options,
      params: { category, radius_m },
    })
  },
  getLocalityAnalysis({ locality, category, radius_m } = {}, options = {}) {
    return request('/market/locality', {
      ...options,
      params: { locality, category, radius_m },
    })
  },
  getAllLocalityAnalysis({ category, radius_m } = {}, options = {}) {
    return request('/market/localities', {
      ...options,
      params: { category, radius_m },
    })
  },
  getBusinessContext({ osm_id, category, radius_m } = {}, options = {}) {
    return request('/market/business', {
      ...options,
      params: { osm_id, category, radius_m },
    })
  },
  getBusinessCompetitors({ osm_id, category, radius_m, limit } = {}, options = {}) {
    return request('/market/business/competitors', {
      ...options,
      params: { osm_id, category, radius_m, limit },
    })
  },
  getCompetitors({ locality, category, radius_m, limit } = {}, options = {}) {
    return request('/market/competitors', {
      ...options,
      params: { locality, category, radius_m, limit },
    })
  },
  getTrends({ category, circle_no } = {}, options = {}) {
    return request('/market/trends', {
      ...options,
      params: { category, circle_no },
    })
  },
  compareLocalities({ localities, category, radius_m } = {}, options = {}) {
    return request('/market/location-comparison', {
      ...options,
      params: {
        localities: Array.isArray(localities) ? localities.join(',') : localities,
        category,
        radius_m,
      },
    })
  },
  estimateRisk(payload, options = {}) {
    return request('/market/risk', {
      ...options,
      method: 'POST',
      body: payload,
    })
  },
  estimateBusinessRisk(payload, options = {}) {
    return request('/market/business/risk', {
      ...options,
      method: 'POST',
      body: payload,
    })
  },
  estimateFinancials(payload, options = {}) {
    return request('/financial/estimate', {
      ...options,
      method: 'POST',
      body: payload,
    })
  },
  chatAssistant(payload, options = {}) {
    return request('/assistant/chat', {
      ...options,
      method: 'POST',
      body: payload,
    })
  },
}

export default marketApi
