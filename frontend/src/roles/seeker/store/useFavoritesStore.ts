import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api.js';

export interface FavoriteItem {
  partnerId: string;
  name?: string;
  avatarUrl?: string;
  verified?: boolean;
  openListing?: {
    _id?: string;
    startAt?: string;
    city?: string;
    area?: string;
    basePricePaise?: number;
  };
}

let globalFavorites: FavoriteItem[] = [];
let listeners: Array<() => void> = [];

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export async function fetchFavoritesApi(): Promise<FavoriteItem[]> {
  try {
    const res = await api.get<FavoriteItem[]>('/seeker/favorites');
    if (res.success && Array.isArray(res.data)) {
      globalFavorites = res.data;
      notify();
      return res.data;
    }
  } catch (err) {
    console.error('Failed to load favorites', err);
  }
  return globalFavorites;
}

export async function addFavoriteApi(partnerId: string, sourceListingId?: string): Promise<boolean> {
  try {
    const res = await api.post('/seeker/favorites', { partnerId, sourceListingId });
    if (res.success) {
      if (!globalFavorites.some((f) => f.partnerId === partnerId)) {
        globalFavorites = [...globalFavorites, { partnerId }];
        notify();
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to add favorite', err);
  }
  return false;
}

export async function removeFavoriteApi(partnerId: string): Promise<boolean> {
  try {
    const res = await api.delete(`/seeker/favorites/${partnerId}`);
    if (res.success) {
      globalFavorites = globalFavorites.filter((f) => f.partnerId !== partnerId);
      notify();
      return true;
    }
  } catch (err) {
    console.error('Failed to remove favorite', err);
  }
  return false;
}

export function useFavoritesStore() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(globalFavorites);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setFavorites([...globalFavorites]);
    listeners.push(handleUpdate);
    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    await fetchFavoritesApi();
    setLoading(false);
  }, []);

  const addFavorite = useCallback(async (partnerId: string, sourceListingId?: string) => {
    return await addFavoriteApi(partnerId, sourceListingId);
  }, []);

  const removeFavorite = useCallback(async (partnerId: string) => {
    return await removeFavoriteApi(partnerId);
  }, []);

  return {
    favorites,
    loading,
    loadFavorites,
    addFavorite,
    removeFavorite,
  };
}
