
import { NativeAudio } from './native';

export { NativeAudio };

export * from './types';
export * from './AudioPlayer';
export * from './AudioRecorder';
export * from './hooks';
export * from './AudioQueue';
export { CacheManager } from './CacheManager';

// Helper to access native media methods
export async function getAllAudios(): Promise<import('./types').AudioAsset[]> {
  return NativeAudio.getAudios();
}

// Helper to grouping (JS side for simplicity)
export async function getAlbums(): Promise<import('./types').Album[]> {
  const audios = await getAllAudios();
  const albums: { [key: string]: import('./types').Album } = {};
  
  audios.forEach(audio => {
    const key = audio.album || 'Unknown';
    if (!albums[key]) {
      albums[key] = {
        name: key,
        artist: audio.artist,
        artwork: audio.artwork,
        songs: [],
      };
    }
    albums[key].songs.push(audio);
  });
  
  return Object.values(albums);
}

// Search helper
export async function searchAudios(query: string): Promise<import('./types').AudioAsset[]> {
  const audios = await getAllAudios();
  const lowerQuery = query.toLowerCase();
  return audios.filter(audio => 
    audio.title.toLowerCase().includes(lowerQuery) ||
    audio.artist.toLowerCase().includes(lowerQuery) ||
    audio.album.toLowerCase().includes(lowerQuery)
  );
}
