import { AudioQueue, getAllAudios, getAlbums } from '../index';
import { NativeAudio } from '../native';
import { AudioPlayer } from '../AudioPlayer';
import { AudioAsset } from '../types';

// Mock React Native
jest.mock('react-native', () => {
    return {
      NativeModules: {
        ReactNativeAudio: {
          getAudios: jest.fn(),
          preparePlayer: jest.fn().mockResolvedValue(null),
          play: jest.fn().mockResolvedValue(null),
          pause: jest.fn().mockResolvedValue(null),
          stop: jest.fn().mockResolvedValue(null),
          setMetadata: jest.fn().mockResolvedValue(null),
          setVolume: jest.fn().mockResolvedValue(null),
          setRate: jest.fn().mockResolvedValue(null),
          destroyPlayer: jest.fn(),
          setupNotification: jest.fn().mockResolvedValue(null),
          addListener: jest.fn(),
          removeListeners: jest.fn(),
        },
      },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(() => ({ remove: jest.fn() })),
        removeListeners: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      Platform: {
        OS: 'android',
        select: jest.fn((objs) => objs.android),
      },
    };
});

// We don't need to mock ../native if we mock NativeModules, 
// BUT src/native.ts might cache the value. 
// Ideally we should mock ../native too if it's doing something special, 
// but it just re-exports NativeModules.ReactNativeAudio.
// However, since we mock react-native *here*, indices might have already loaded? 
// Jest hoisting handles this.
// Let's keep the NativeAudio mock just in case, but map it to NativeModules.
jest.mock('../native', () => ({
    NativeAudio: require('react-native').NativeModules.ReactNativeAudio
}));

// Mock AudioPlayer
jest.mock('../AudioPlayer', () => {
    return {
        AudioPlayer: jest.fn().mockImplementation(() => ({
            id: 1,
            prepare: jest.fn().mockResolvedValue(null),
            play: jest.fn().mockResolvedValue(null),
            stop: jest.fn().mockResolvedValue(null),
            destroy: jest.fn(),
            setMetadata: jest.fn().mockResolvedValue(null),
            setupNotification: jest.fn().mockResolvedValue(null), // Added missing method
            onStateChange: jest.fn(),
        }))
    }
});

describe('Media Helpers', () => {
  it('getAllAudios calls native method', async () => {
    await getAllAudios();
    expect(NativeAudio.getAudios).toHaveBeenCalled();
  });

  it('getAlbums groups audios by album', async () => {
    const mockAudios: AudioAsset[] = [
      { id: '1', uri: 'u1', title: 'T1', artist: 'A1', album: 'Alb1', duration: 100 },
      { id: '2', uri: 'u2', title: 'T2', artist: 'A1', album: 'Alb1', duration: 100 },
      { id: '3', uri: 'u3', title: 'T3', artist: 'A2', album: 'Alb2', duration: 100 },
    ];
    (NativeAudio.getAudios as jest.Mock).mockResolvedValue(mockAudios);

    const albums = await getAlbums();
    expect(albums).toHaveLength(2);
    expect(albums.find(a => a.name === 'Alb1')?.songs).toHaveLength(2);
    expect(albums.find(a => a.name === 'Alb2')?.songs).toHaveLength(1);
  });
});

describe('AudioQueue', () => {
  let queue: AudioQueue;

  beforeEach(() => {
    queue = new AudioQueue();
  });

  it('adds tracks to queue', () => {
    const tracks: AudioAsset[] = [{ id: '1', uri: 'u1', title: 'T1', artist: 'A', album: 'L', duration: 10 }];
    queue.add(tracks);
    expect(queue.getQueue()).toEqual(tracks);
  });

  it('plays specific index', async () => {
    const tracks: AudioAsset[] = [
        { id: '1', uri: 'u1', title: 'T1', artist: 'A', album: 'L', duration: 10 },
        { id: '2', uri: 'u2', title: 'T2', artist: 'A', album: 'L', duration: 10 }
    ];
    await queue.playList(tracks, 1);
    expect(queue.getCurrentTrack()?.id).toBe('2');
    expect(AudioPlayer).toHaveBeenCalled();
  });

  it('advances to next track', async () => {
     const tracks: AudioAsset[] = [
        { id: '1', uri: 'u1', title: 'T1', artist: 'A', album: 'L', duration: 10 },
        { id: '2', uri: 'u2', title: 'T2', artist: 'A', album: 'L', duration: 10 }
    ];
    await queue.playList(tracks, 0);
    await queue.next();
    expect(queue.getCurrentTrack()?.id).toBe('2');
  });
});
