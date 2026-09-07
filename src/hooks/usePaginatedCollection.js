import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";

const PAGE_SIZE = 25;

/**
 * Subscribes to a collection with a growing `limit()` so large collections
 * aren't pulled in full up front. `constraints` are extra query constraints
 * (where/orderBy) that don't change across pages.
 */
export function usePaginatedCollection(collectionName, constraints = [], pageSize = PAGE_SIZE, onError) {
  const [size, setSize] = useState(pageSize);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const constraintsKey = useMemo(() => JSON.stringify(constraints.map(String)), [constraints]);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints, limit(size));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDocs(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setHasMore(snapshot.docs.length === size);
        setLoading(false);
      },
      (error) => {
        console.error(`${collectionName} pagination error:`, error);
        onError?.(error);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, size]);

  function loadMore() {
    setSize((current) => current + pageSize);
  }

  return { docs, loading, hasMore, loadMore };
}
