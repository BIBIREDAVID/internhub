import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const PAGE_SIZE = 25;

/**
 * Fetches a resource's full list from the API (dataset sizes here are small
 * — see TESTING.md's seed scale) and paginates it client-side by revealing a
 * growing `size` slice, mirroring the previous Firestore-paginated interface.
 * `params` is an object of query-string params (e.g. { role: "intern" })
 * that's appended to the request URL.
 */
export function usePaginatedCollection(resource, params = {}, pageSize = PAGE_SIZE, onError) {
  const [size, setSize] = useState(pageSize);
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/size for the new resource/params
    setLoading(true);
    setSize(pageSize);
    const search = new URLSearchParams(params).toString();
    const path = search ? `/${resource}?${search}` : `/${resource}`;
    api
      .get(path)
      .then((data) => {
        if (!cancelled) setAllDocs(data || []);
      })
      .catch((error) => {
        console.error(`${resource} load error:`, error);
        onError?.(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, paramsKey]);

  function loadMore() {
    setSize((current) => current + pageSize);
  }

  return {
    docs: allDocs.slice(0, size),
    loading,
    hasMore: size < allDocs.length,
    loadMore,
  };
}
