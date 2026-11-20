import { useCallback, useEffect, useRef, useState } from 'react'

export function useApiResource(fetcher, deps = [], { enabled = true } = {}) {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const dependencyKey = JSON.stringify(deps)
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null })
      return undefined
    }
    const controller = new AbortController()
    let active = true
    setState((current) => ({ data: current.data, loading: true, error: null }))
    Promise.resolve()
      .then(() => fetcherRef.current({ signal: controller.signal }))
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return
        setState({ data: null, loading: false, error })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [dependencyKey, enabled, reloadToken])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  return {
    ...state,
    reload,
  }
}

export default useApiResource
