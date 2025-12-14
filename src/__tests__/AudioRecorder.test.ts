import { AudioRecorder } from '../AudioRecorder';
import { NativeModules, NativeEventEmitter } from 'react-native';

// Ensure mocks exist (if running in parallel with other tests, this might need duplication or setup file)
// Since jest.mock is hoisted, we define it here too or assume shared env. 
// For safety in this separate file, we re-declare or rely on the previous mock if it was global (it isn't).
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.ReactNativeAudio = {
    // Player mocks (needed if imports share side effects, though Recorder shouldn't need them)
    // Recorder mocks:
    prepareRecorder: jest.fn().mockResolvedValue('/path/to/file'),
    startRecording: jest.fn().mockResolvedValue(null),
    stopRecording: jest.fn().mockResolvedValue('/path/to/file'),
    pauseRecording: jest.fn().mockResolvedValue(null),
    resumeRecording: jest.fn().mockResolvedValue(null),
  };
  return RN;
});

const mockAddListener = jest.fn().mockReturnValue({ remove: jest.fn() });
NativeEventEmitter.prototype.addListener = mockAddListener;

describe('AudioRecorder', () => {
  let recorder: AudioRecorder;

  beforeEach(() => {
    jest.clearAllMocks();
    recorder = new AudioRecorder();
  });

  it('should call native prepareRecorder', async () => {
    await recorder.prepare('/path.aac', { sampleRate: 44100 });
    expect(NativeModules.ReactNativeAudio.prepareRecorder).toHaveBeenCalledWith(
      '/path.aac',
      { sampleRate: 44100 }
    );
  });

  it('should call native startRecording', async () => {
    await recorder.start();
    expect(NativeModules.ReactNativeAudio.startRecording).toHaveBeenCalled();
  });

  it('should subscribe to metering', () => {
    const cb = jest.fn();
    recorder.onMetering(cb);
    expect(mockAddListener).toHaveBeenCalledWith('AudioRecorderEvent.Metering', expect.any(Function));
  });
});
