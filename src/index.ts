
import { NativeAudio } from './native';

export { NativeAudio };
export * from './events';

export * from './types';
export * from './AudioPlayer';
export * from './AudioRecorder';
export * from './hooks';
export * from './AudioQueue';

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
        songs: []
      };
    }
    albums[key].songs.push(audio);
  });
  
  return Object.values(albums);
}
