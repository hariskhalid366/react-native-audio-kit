package com.reactlibrary;

import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.util.SparseArray;

public class ReactNativeAudioModule extends ReactNativeAudioSpec {

    private final ReactApplicationContext reactContext;
    private final SparseArray<PlayerInstance> players = new SparseArray<>();

    // Phase 2: Interruption Handling
    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                // Pause all active players
                for (int i = 0; i < players.size(); i++) {
                    int key = players.keyAt(i);
                    PlayerInstance instance = players.get(key);
                    if (instance != null && instance.player.isPlaying()) {
                        instance.player.pause();
                        WritableMap params = Arguments.createMap();
                        params.putString("reason", "noisy");
                        sendEvent("AudioPlayerEvent.Interruption." + key, params);
                        // We also send state update via listener, but this is specific
                    }
                }
            }
        }
    };
    private boolean receiverRegistered = false;
    private MediaRecorder recorder;
    private String currentRecordingPath;

    public ReactNativeAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    private void updateNoisyReceiver() {
        boolean anyPlaying = false;
        for (int i = 0; i < players.size(); i++) {
            if (players.valueAt(i).player.getPlayWhenReady()) {
                anyPlaying = true;
                break;
            }
        }

        if (anyPlaying && !receiverRegistered) {
            reactContext.registerReceiver(noisyReceiver, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
            receiverRegistered = true;
        } else if (!anyPlaying && receiverRegistered) {
            try {
                reactContext.unregisterReceiver(noisyReceiver);
            } catch (Exception e) {
                // ignore if already unregistered
            }
            receiverRegistered = false;
        }
    }

    @Override
    public String getName() {
        return "ReactNativeAudio";
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        // Cleanup all players
        new Handler(Looper.getMainLooper()).post(() -> {
            for (int i = 0; i < players.size(); i++) {
                PlayerInstance instance = players.valueAt(i);
                if (instance != null && instance.player != null) {
                    instance.progressHandler.removeCallbacks(instance.progressRunnable);
                    instance.player.release();
                }
            }
            players.clear();
            if (recorder != null) {
                recorder.release();
                recorder = null;
            }
        });
    }

    // MARK: - Player Architecture

    private static class PlayerInstance {
        final ExoPlayer player;
        final Handler progressHandler;
        final Runnable progressRunnable;
        androidx.media3.ui.PlayerNotificationManager notificationManager; // Notification Support
        boolean isLooping = false;

        PlayerInstance(ExoPlayer player, Handler handler, Runnable runnable) {
            this.player = player;
            this.progressHandler = handler;
            this.progressRunnable = runnable;
        }
    }

    @Override
    public void preparePlayer(double idVal, String url, ReadableMap options, Promise promise) {
        int id = (int) idVal;

        // Ensure UI thread for ExoPlayer creation
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                // Phase 1.2: Prevent Double Prepare Leak
                PlayerInstance existing = players.get(id);
                if (existing != null) {
                    if (existing.player != null)
                        existing.player.release();
                    if (existing.notificationManager != null)
                        existing.notificationManager.setPlayer(null);
                    players.remove(id);
                }

                ExoPlayer player = new ExoPlayer.Builder(reactContext).build();

                // Audio Attributes for Focus (Phase 7)
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(C.USAGE_MEDIA)
                        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                        .build();
                player.setAudioAttributes(audioAttributes, true); // true = handle audio focus

                MediaItem mediaItem = MediaItem.fromUri(Uri.parse(url));
                player.setMediaItem(mediaItem);

                if (options.hasKey("loop") && options.getBoolean("loop")) {
                    player.setRepeatMode(Player.REPEAT_MODE_ONE);
                }

                if (options.hasKey("volume")) {
                    player.setVolume((float) options.getDouble("volume"));
                }

                player.prepare();

                // Setup Listeners
                player.addListener(new Player.Listener() {
                    @Override
                    public void onPlaybackStateChanged(int playbackState) {
                        String stateName = "idle";
                        switch (playbackState) {
                            case Player.STATE_BUFFERING:
                                stateName = "buffering";
                                break;
                            case Player.STATE_READY:
                                stateName = player.getPlayWhenReady() ? "playing" : "paused";
                                break;
                            case Player.STATE_ENDED:
                                stateName = "ended";
                                break;
                            case Player.STATE_IDLE:
                                stateName = "idle";
                                break;
                        }

                        // Phase 2.2: State Consistency
                        // Avoid redundant updates is good, but simple mapping is safer.
                        // The instruction wants to replace the sendStateEvent and add
                        // updateNoisyReceiver
                        if (playbackState == Player.STATE_READY) {
                            sendStateEvent(id, player.getPlayWhenReady() ? "playing" : "idle");
                        } else {
                            sendStateEvent(id, stateName);
                        }

                        // Phase 2: Manage Receiver based on state
                        new Handler(Looper.getMainLooper()).post(() -> updateNoisyReceiver());
                    }

                    @Override
                    public void onIsPlayingChanged(boolean isPlaying) {
                        // Handled by onPlaybackStateChanged usually, but good for robust updates
                        // We can stick to onPlaybackStateChanged to avoid duplicate events
                        new Handler(Looper.getMainLooper()).post(() -> updateNoisyReceiver());
                    }

                    @Override
                    public void onPlayerError(PlaybackException error) {
                        sendErrorEvent(id, "decode", error.getMessage());
                    }
                });

                // Phase 3: Progress Loop
                Handler handler = new Handler(Looper.getMainLooper());
                Runnable runnable = new Runnable() {
                    @Override
                    public void run() {
                        if (player != null && player.isPlaying()) {
                            sendProgressEvent(id, player.getCurrentPosition() / 1000.0, player.getDuration() / 1000.0);
                            handler.postDelayed(this, 500);
                        }
                    }
                };

                players.put(id, new PlayerInstance(player, handler, runnable));
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("error", e.getMessage());
            }
        });
    }

    // ... (play, pause, stop methods remain same: Phase 1.1 is handled by null
    // check in them)

    @Override
    public void play(double idVal, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                instance.player.play();
                instance.progressHandler.post(instance.progressRunnable);
                updateNoisyReceiver();
                promise.resolve(null);
            } else {
                promise.reject("not_found", "Player not prepared (Phase 1.1)");
            }
        });
    }

    @Override
    public void pause(double idVal, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                instance.player.pause();
                instance.progressHandler.removeCallbacks(instance.progressRunnable);
                updateNoisyReceiver();
                promise.resolve(null);
            } else {
                // Phase 2.1: Illegal Transition - benign, resolve null or reject?
                // Request says: "No crash, either no-op or controlled error".
                // Rejecting is controlled.
                promise.resolve(null); // safely ignore pause on un-prepared player
            }
        });
    }

    @Override
    public void stop(double idVal, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                instance.player.stop();
                instance.player.seekTo(0);
                instance.progressHandler.removeCallbacks(instance.progressRunnable); // Phase 3.1
                updateNoisyReceiver();
                promise.resolve(null);
            } else {
                promise.resolve(null);
            }
        });
    }

    @Override
    public void seek(double idVal, double position, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                // Phase 3.2: Seek Bounds handled by ExoPlayer intrinsically
                long pos = (long) (position * 1000);
                instance.player.seekTo(pos);
                promise.resolve(null);
            } else {
                promise.reject("not_found", "Player not found");
            }
        });
    }

    // ... Volume/Rate methods ...

    @Override
    public void setVolume(double idVal, double volume, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                instance.player.setVolume((float) volume);
                promise.resolve(null);
            } else {
                promise.reject("not_found", "Player not found");
            }
        });
    }

    @Override
    public void setRate(double idVal, double rate, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                instance.player.setPlaybackSpeed((float) rate);
                promise.resolve(null);
            } else {
                promise.reject("not_found", "Player not found");
            }
        });
    }

    @Override
    public void setMetadata(double id, ReadableMap metadata, Promise promise) {
        // No-op or TODO: Metadata update for Notif
        promise.resolve(null);
    }

    @Override
    public void destroyPlayer(double idVal) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.remove(id);
            if (instance != null) {
                // Phase 1.3: Destroy Enforcement
                if (instance.notificationManager != null) {
                    instance.notificationManager.setPlayer(null); // Dismiss Notification
                    instance.notificationManager = null;
                }
                instance.progressHandler.removeCallbacks(instance.progressRunnable);
                instance.player.release();
                updateNoisyReceiver();
            }
        });
    }

    @Override
    public void setupNotification(double idVal, ReadableMap config, Promise promise) {
        int id = (int) idVal;
        new Handler(Looper.getMainLooper()).post(() -> {
            PlayerInstance instance = players.get(id);
            if (instance != null) {
                // Initialize Notification Manager if not exists
                if (instance.notificationManager == null) {
                    instance.notificationManager = new androidx.media3.ui.PlayerNotificationManager.Builder(
                            reactContext,
                            100 + id, // Notification ID
                            "CHANNEL_AUDIO" // Channel ID
                    )
                            .setMediaDescriptionAdapter(
                                    new androidx.media3.ui.PlayerNotificationManager.MediaDescriptionAdapter() {
                                        @Override
                                        public CharSequence getCurrentContentTitle(Player player) {
                                            return config.hasKey("title") ? config.getString("title") : "Unknown";
                                        }

                                        @Nullable
                                        @Override
                                        public android.app.PendingIntent createCurrentContentIntent(Player player) {
                                            return null;
                                        }

                                        @Nullable
                                        @Override
                                        public CharSequence getCurrentContentText(Player player) {
                                            return config.hasKey("artist") ? config.getString("artist") : "Unknown";
                                        }

                                        @Nullable
                                        @Override
                                        public android.graphics.Bitmap getCurrentLargeIcon(Player player,
                                                androidx.media3.ui.PlayerNotificationManager.BitmapCallback callback) {
                                            return null;
                                        }
                                    })
                            // Intercept actions to send events to JS
                            .setNotificationListener(
                                    new androidx.media3.ui.PlayerNotificationManager.NotificationListener() {
                                        @Override
                                        public void onNotificationPosted(int notificationId,
                                                android.app.Notification notification, boolean ongoing) {
                                            // Optional: start foreground service here if needed
                                        }
                                    })
                            .build();

                    instance.notificationManager
                            .setUseNextAction(config.hasKey("hasNext") && config.getBoolean("hasNext"));
                    instance.notificationManager
                            .setUsePreviousAction(config.hasKey("hasPrevious") && config.getBoolean("hasPrevious"));

                    ExoPlayer originalPlayer = instance.player;
                    Player forwardingPlayer = new androidx.media3.common.ForwardingPlayer(originalPlayer) {
                        @Override
                        public void seekToNext() {
                            WritableMap params = Arguments.createMap();
                            params.putInt("id", id);
                            sendEvent("AudioPlayerEvent.RemoteNext", params);
                        }

                        @Override
                        public void seekToPrevious() {
                            WritableMap params = Arguments.createMap();
                            params.putInt("id", id);
                            sendEvent("AudioPlayerEvent.RemotePrevious", params);
                        }

                        @Override
                        public void play() {
                            super.play();
                            WritableMap params = Arguments.createMap();
                            params.putInt("id", id);
                            sendEvent("AudioPlayerEvent.RemotePlay", params);
                        }

                        @Override
                        public void pause() {
                            super.pause();
                            WritableMap params = Arguments.createMap();
                            params.putInt("id", id);
                            sendEvent("AudioPlayerEvent.RemotePause", params);
                        }
                    };
                    instance.notificationManager.setPlayer(forwardingPlayer);
                } else {
                    // Update flags if manager exists
                    instance.notificationManager
                            .setUseNextAction(config.hasKey("hasNext") && config.getBoolean("hasNext"));
                    instance.notificationManager
                            .setUsePreviousAction(config.hasKey("hasPrevious") && config.getBoolean("hasPrevious"));
                }

                promise.resolve(null);
            } else {
                promise.resolve(null); // Fail silently or reject
            }
        });
    }

    // MARK: - Recorder

    @Override
    public void prepareRecorder(String path, ReadableMap options, Promise promise) {
        try {
            if (recorder != null) {
                recorder.release();
            }
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4); // Default AAC
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);

            if (options.hasKey("sampleRate")) {
                recorder.setAudioSamplingRate(options.getInt("sampleRate"));
            }
            if (options.hasKey("bitrate")) {
                recorder.setAudioEncodingBitRate(options.getInt("bitrate"));
            }
            if (options.hasKey("channels")) {
                recorder.setAudioChannels(options.getInt("channels"));
            }

            // Adjust path if file:// scheme
            String filePath = path.replace("file://", "");
            currentRecordingPath = filePath;
            recorder.setOutputFile(filePath);

            recorder.prepare();
            promise.resolve(filePath);
        } catch (IOException e) {
            promise.reject("recorder_error", e.getMessage());
        }
    }

    @Override
    public void startRecording(Promise promise) {
        if (recorder != null) {
            try {
                recorder.start();
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("error", "Failed to start recording: " + e.getMessage());
            }
        } else {
            promise.reject("no_recorder", "Recorder not prepared");
        }
    }

    @Override
    public void stopRecording(Promise promise) {
        if (recorder != null) {
            try {
                recorder.stop();
                recorder.release();
                recorder = null;
                promise.resolve(currentRecordingPath);
            } catch (Exception e) {
                promise.reject("error", "Failed to stop recording: " + e.getMessage());
            }
        } else {
            promise.reject("no_recorder", "Recorder not prepared");
        }
    }

    @Override
    public void pauseRecording(Promise promise) {
        // TODO: Implement
        promise.resolve(null);
    }

    @Override
    public void resumeRecording(Promise promise) {
        // TODO: Implement
        promise.resolve(null);
    }

    // MARK: - Helpers

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    // MARK: - Media Library

    @Override
    public void getAudios(Promise promise) {
        new Thread(() -> {
            try {
                WritableArray result = Arguments.createArray();
                android.content.ContentResolver resolver = reactContext.getContentResolver();
                Uri uri = android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                String selection = android.provider.MediaStore.Audio.Media.IS_MUSIC + " != 0";

                android.database.Cursor cursor = resolver.query(uri, null, selection, null, null);

                if (cursor != null) {
                    int idCol = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media._ID);
                    int titleCol = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.TITLE);
                    int artistCol = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.ARTIST);
                    int albumCol = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.ALBUM);
                    int durationCol = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DURATION);
                    // int dataCol =
                    // cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DATA); //
                    // Deprecated but useful for URI

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        String title = cursor.getString(titleCol);
                        String artist = cursor.getString(artistCol);
                        String album = cursor.getString(albumCol);
                        long durationMs = cursor.getLong(durationCol);

                        Uri contentUri = android.content.ContentUris.withAppendedId(
                                android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);

                        WritableMap map = Arguments.createMap();
                        map.putString("id", String.valueOf(id));
                        map.putString("uri", contentUri.toString());
                        map.putString("title", title != null ? title : "Unknown");
                        map.putString("artist", artist != null ? artist : "Unknown");
                        map.putString("album", album != null ? album : "Unknown");
                        map.putDouble("duration", durationMs / 1000.0);

                        // Artwork retrieval is complex (requires loadThumbnail), skipping for speed or
                        // use a placeholder/separate call

                        result.pushMap(map);
                    }
                    cursor.close();
                }
                promise.resolve(result);
            } catch (Exception e) {
                promise.reject("error", e.getMessage());
            }
        }).start();
    }

    private void sendStateEvent(int id, String state) {
        WritableMap params = Arguments.createMap();
        params.putString("state", state);
        sendEvent("AudioPlayerEvent.State." + id, params);
    }

    private void sendProgressEvent(int id, double position, double duration) {
        WritableMap params = Arguments.createMap();
        params.putDouble("position", position);
        params.putDouble("duration", duration);
        sendEvent("AudioPlayerEvent.Progress." + id, params);
    }

    private void sendErrorEvent(int id, String code, String message) {
        WritableMap params = Arguments.createMap();
        params.putString("error", code);
        params.putString("message", message);
        sendEvent("AudioPlayerEvent.Error." + id, params);
    }
}
