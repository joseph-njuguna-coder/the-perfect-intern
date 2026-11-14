import { useEffect, useState } from 'react';
import { api } from './api.js';

/** Fetch-on-mount hook. Re-runs when `key` changes. */
export function useApi(path, query, key = JSON.stringify(query)) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { query })
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return state;
}
