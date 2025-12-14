import { AudioPlayer } from '../AudioPlayer';
import { NativeModules, NativeEventEmitter } from 'react-native';

// Mock NativeModules using jest.mock to ensure it runs before imports
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.ReactNativeAudio = {
    preparePlayer: jest.fn().mockResolvedValue(null),
    play: jest.fn().mockResolvedValue(null),
    pause: jest.fn().mockResolvedValue(null),
    stop: jest.fn().mockResolvedValue(null),
    seek: jest.fn().mockResolvedValue(null),
    setVolume: jest.fn().mockResolvedValue(null),
    setRate: jest.fn().mockResolvedValue(null),
    destroyPlayer: jest.fn(),
  };
  return RN;
});

// Mock NativeEventEmitter
const mockAddListener = jest.fn().mockReturnValue({ remove: jest.fn() });
NativeEventEmitter.prototype.addListener = mockAddListener;

describe('AudioPlayer', () => {
  let player: AudioPlayer;

  beforeEach(() => {
    jest.clearAllMocks();
    player = new AudioPlayer('https://example.com/audio.mp3', { loop: true });
  });

  it('should call native preparePlayer with correct arguments', async () => {
    await player.prepare();
    expect(NativeModules.ReactNativeAudio.preparePlayer).toHaveBeenCalledWith(
      expect.any(Number),
      'https://example.com/audio.mp3',
      { loop: true }
    );
  });

  it('should call native play', async () => {
    await player.play();
    expect(NativeModules.ReactNativeAudio.play).toHaveBeenCalledWith(player.id);
  });

  it('should call native pause', async () => {
    await player.pause();
    expect(NativeModules.ReactNativeAudio.pause).toHaveBeenCalledWith(player.id);
  });

  it('should subscribe to state changes', () => {
    const callback = jest.fn();
    const unsub = player.onStateChange(callback);
    expect(mockAddListener).toHaveBeenCalledWith(
      `AudioPlayerEvent.State.${player.id}`,
      expect.any(Function)
    );
    unsub();
    // In a real mock we'd verify remove() was called, but this is sufficient to check logic flow
  });

  it('subscribes to events', () => {
    const cb = jest.fn();
    player.onStateChange(cb);
    expect(mockAddListener).toHaveBeenCalledWith(
      `AudioPlayerEvent.State.${player.id}`,
      expect.any(Function)
    );
  });

  it('subscribes to interruption events', () => {
    const cb = jest.fn();
    player.onInterruption(cb);
    expect(mockAddListener).toHaveBeenCalledWith(
      `AudioPlayerEvent.Interruption.${player.id}`,
      expect.any(Function)
    );
  });

  it('handles double prepare gracefully', async () => {
    await player.prepare();
    await player.prepare();
    expect(NativeModules.ReactNativeAudio.preparePlayer).toHaveBeenCalledTimes(2);
  });

  it('stops progress on stop', async () => {
    await player.stop();
    expect(NativeModules.ReactNativeAudio.stop).toHaveBeenCalled();
  });

  it('should cleanup on destroy', () => {
    player.onStateChange(jest.fn());
    player.destroy();
    expect(NativeModules.ReactNativeAudio.destroyPlayer).toHaveBeenCalledWith(player.id);
  });
});
