import { useEffect, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { PlayerOptions, PlaybackState, AudioErrorDetails } from './types';

export function useAudioPlayer(url: string, options: PlayerOptions = {}) {
  const [player] = useState(() => new AudioPlayer(url, options));
  const [state, setState] = useState<PlaybackState>(PlaybackState.Idle);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<AudioErrorDetails | null>(null);

  useEffect(() => {
    player.prepare();

    const unsubState = player.onStateChange(setState);
    const unsubProgress = player.onProgress((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
    });
    const unsubError = player.onError((code, msg) => {
      setError({ code, message: msg });
      setState(PlaybackState.Error);
    });

    return () => {
      unsubState();
      unsubProgress();
      unsubError();
      if (options.autoDestroy !== false) {
        player.destroy();
      }
    };
  }, [player, options.autoDestroy]);

  return {
    player,
    state,
    position,
    duration,
    error,
    play: () => player.play(),
    pause: () => player.pause(),
    stop: () => player.stop(),
    seek: (pos: number) => player.seek(pos),
  };
}
