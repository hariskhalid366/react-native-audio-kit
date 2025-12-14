#import "ReactNativeAudio.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import "ReactNativeAudioSpec.h"
#endif

// Player model to hold instance data
@interface AudioPlayerInstance : NSObject
@property (nonatomic, strong) AVPlayer *player;
@property (nonatomic, strong) AVPlayerItem *playerItem;
@property (nonatomic, assign) NSInteger playerId;
@property (nonatomic, strong) id timeObserver;
@property (nonatomic, assign) BOOL isLooping;
@end

@implementation AudioPlayerInstance
@end

@interface ReactNativeAudio ()
#ifdef RCT_NEW_ARCH_ENABLED
<NativeReactNativeAudioSpec>
#endif
@end

@implementation ReactNativeAudio {
    NSMutableDictionary<NSNumber *, AudioPlayerInstance *> *_players;
    AVAudioRecorder *_recorder;
    NSString *_currentRecordingPath;
    BOOL _hasListeners;
}

RCT_EXPORT_MODULE()

- (void)invalidate {
    for (NSNumber *key in _players) {
        AudioPlayerInstance *instance = _players[key];
        [instance.player pause];
        if (instance.timeObserver) {
            [instance.player removeTimeObserver:instance.timeObserver];
        }
        @try {
            [instance.playerItem removeObserver:self forKeyPath:@"status"];
        } @catch (NSException * __unused exception) {}
        [[NSNotificationCenter defaultCenter] removeObserver:self name:AVPlayerItemDidPlayToEndTimeNotification object:instance.playerItem];
    }
    [_players removeAllObjects];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

- (instancetype)init {
    if (self = [super init]) {
        _players = [NSMutableDictionary new];
        
        // Setup Audio Session for playback and recording
        AVAudioSession *session = [AVAudioSession sharedInstance];
        // Default to PlayAndRecord for maximum compatibility, or Playback if only playing.
        // We start with Playback, and switch to PlayAndRecord when recording is requested.
        [session setCategory:AVAudioSessionCategoryPlayback 
                 withOptions:AVAudioSessionCategoryOptionAllowBluetooth | AVAudioSessionCategoryOptionDuckOthers
                       error:nil];
        [session setActive:YES error:nil];
        
        // Handle interruptions
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(handleInterruption:)
                                                     name:AVAudioSessionInterruptionNotification
                                                   object:session];
        
        // Handle route changes (Headphones unplugged)
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(handleRouteChange:)
                                                     name:AVAudioSessionRouteChangeNotification
                                                   object:session];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"AudioPlayerEvent.State", 
        @"AudioPlayerEvent.Progress", 
        @"AudioPlayerEvent.Error",
        @"AudioRecorderEvent.Metering",
        @"AudioPlayerEvent.RemotePlay",
        @"AudioPlayerEvent.RemotePause",
        @"AudioPlayerEvent.RemoteNext",
        @"AudioPlayerEvent.RemotePrevious"
    ];
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

// MARK: - Player Methods

- (void)cleanupPlayer:(NSNumber *)playerId {
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        if (instance.timeObserver) {
            [instance.player removeTimeObserver:instance.timeObserver];
            instance.timeObserver = nil;
        }
        @try {
            [instance.playerItem removeObserver:self forKeyPath:@"status"];
        } @catch (NSException * __unused exception) {}
        
        [[NSNotificationCenter defaultCenter] removeObserver:self name:AVPlayerItemDidPlayToEndTimeNotification object:instance.playerItem];
        
        // Remove Remote Commands if they belong to this player (simplified: remove all we added)
        // Since we don't track targets per player in this simple implementation, 
        // we'll rely on the fact that AudioQueue manages one active player usually.
        // Ideally we should track them.
    }
}

RCT_EXPORT_METHOD(preparePlayer:(double)idVal url:(NSString *)urlStr options:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    if (!urlStr) {
        reject(@"error", @"URL cannot be null", nil);
        return;
    }
    
    // Fix Phase 1.2: Double Prepare Leak/Crash
    if (_players[playerId]) {
        [self cleanupPlayer:playerId];
        [_players removeObjectForKey:playerId];
    }

    NSURL *url;
    if ([urlStr hasPrefix:@"http"] || [urlStr hasPrefix:@"file://"]) {
        url = [NSURL URLWithString:urlStr];
    } else {
        // Assume local file path
        url = [NSURL fileURLWithPath:urlStr];
    }

    AudioPlayerInstance *instance = [AudioPlayerInstance new];
    instance.playerId = [playerId integerValue];
    instance.playerItem = [AVPlayerItem playerItemWithURL:url];
    instance.player = [AVPlayer playerWithPlayerItem:instance.playerItem];
    
    // Looping option
    if (options[@"loop"]) {
        instance.isLooping = [options[@"loop"] boolValue];
        [[NSNotificationCenter defaultCenter] addObserver:self 
                                                 selector:@selector(playerItemDidReachEnd:) 
                                                     name:AVPlayerItemDidPlayToEndTimeNotification 
                                                   object:instance.playerItem];
    }

    // Volume
    if (options[@"volume"]) {
        instance.player.volume = [options[@"volume"] floatValue];
    }
    
    // Rate
    if (options[@"rate"]) {
        instance.player.rate = [options[@"rate"] floatValue];
    }

    // Observing status
    [instance.playerItem addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionNew context:(__bridge void *)instance];
    
    // Time Observer
    __weak typeof(self) weakSelf = self;
    __weak typeof(instance) weakInstance = instance;
    instance.timeObserver = [instance.player addPeriodicTimeObserverForInterval:CMTimeMake(1, 2) queue:NULL usingBlock:^(CMTime time) {
        // Send progress every 0.5s
        if (weakSelf && weakInstance) {
            [weakSelf sendProgressEvent:playerId 
                               position:CMTimeGetSeconds(time) 
                               duration:CMTimeGetSeconds(weakInstance.playerItem.duration)];
        }
    }];

    [_players setObject:instance forKey:playerId];
    resolve(nil);
}

// ... play, pause, stop, seek ... 
RCT_EXPORT_METHOD(play:(double)idVal resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        [instance.player play];
        [self sendStateEvent:playerId state:@"playing"];
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(pause:(double)idVal resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        [instance.player pause];
        [self sendStateEvent:playerId state:@"paused"];
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(stop:(double)idVal resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
     AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        [instance.player pause];
        [instance.player seekToTime:kCMTimeZero];
        [self sendStateEvent:playerId state:@"idle"];
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(seek:(double)idVal position:(double)position resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        [instance.player seekToTime:CMTimeMakeWithSeconds(position, 1000)];
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(setVolume:(double)idVal volume:(double)volume resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        instance.player.volume = (float)volume;
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(setRate:(double)idVal rate:(double)rate resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        instance.player.rate = (float)rate;
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(setMetadata:(double)idVal metadata:(NSDictionary *)metadata resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    // ... same as before
    NSMutableDictionary *nowPlayingInfo = [[NSMutableDictionary alloc] init];
    if (metadata[@"title"]) [nowPlayingInfo setObject:metadata[@"title"] forKey:MPMediaItemPropertyTitle];
    if (metadata[@"artist"]) [nowPlayingInfo setObject:metadata[@"artist"] forKey:MPMediaItemPropertyArtist];
    if (metadata[@"album"]) [nowPlayingInfo setObject:metadata[@"album"] forKey:MPMediaItemPropertyAlbumTitle];
    
    AudioPlayerInstance *instance = _players[playerId];
    if (instance && instance.playerItem) {
         [nowPlayingInfo setObject:[NSNumber numberWithDouble:CMTimeGetSeconds(instance.playerItem.currentTime)] forKey:MPNowPlayingInfoPropertyElapsedPlaybackTime];
         [nowPlayingInfo setObject:[NSNumber numberWithDouble:CMTimeGetSeconds(instance.playerItem.duration)] forKey:MPMediaItemPropertyPlaybackDuration];
         [nowPlayingInfo setObject:[NSNumber numberWithFloat:instance.player.rate] forKey:MPNowPlayingInfoPropertyPlaybackRate];
    }
    [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = nowPlayingInfo;
    resolve(nil);
}

RCT_EXPORT_METHOD(destroyPlayer:(double)idVal) {
    NSNumber *playerId = @(idVal);
    if (_players[playerId]) {
        [self cleanupPlayer:playerId];
        [_players removeObjectForKey:playerId];
        
        // Phase 1.3: Clear Info Center if this was the last player?
        // Ideally we only clear if we own it. 
        // For standard "stop" behavior:
        [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = nil;
        
        // Phase 4: Clear Remote Commands
        MPRemoteCommandCenter *commandCenter = [MPRemoteCommandCenter sharedCommandCenter];
        [commandCenter.playCommand removeTarget:nil];
        [commandCenter.pauseCommand removeTarget:nil];
        [commandCenter.nextTrackCommand removeTarget:nil];
        [commandCenter.previousTrackCommand removeTarget:nil];
        
        // Disable them
        [commandCenter.playCommand setEnabled:NO];
        [commandCenter.pauseCommand setEnabled:NO];
        [commandCenter.nextTrackCommand setEnabled:NO];
        [commandCenter.previousTrackCommand setEnabled:NO];
    }
}

// MARK: - Recorder Methods

RCT_EXPORT_METHOD(setupNotification:(double)idVal config:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (!instance) {
        resolve(nil);
        return;
    }
    
    // Remote Commands
    MPRemoteCommandCenter *commandCenter = [MPRemoteCommandCenter sharedCommandCenter];
    
    // Clear previous targets to avoid duplicates
    [commandCenter.playCommand removeTarget:nil];
    [commandCenter.pauseCommand removeTarget:nil];
    [commandCenter.nextTrackCommand removeTarget:nil];
    [commandCenter.previousTrackCommand removeTarget:nil];
    
    // Play/Pause
    [commandCenter.playCommand setEnabled:YES];
    [commandCenter.playCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent * _Nonnull event) {
        [self sendEventWithName:@"AudioPlayerEvent.RemotePlay" body:@{@"id": playerId}];
        return MPRemoteCommandHandlerStatusSuccess;
    }];
    
    [commandCenter.pauseCommand setEnabled:YES];
    [commandCenter.pauseCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent * _Nonnull event) {
        [self sendEventWithName:@"AudioPlayerEvent.RemotePause" body:@{@"id": playerId}];
        return MPRemoteCommandHandlerStatusSuccess;
    }];
    
    // Next/Prev
    BOOL hasNext = [config[@"hasNext"] boolValue];
    [commandCenter.nextTrackCommand setEnabled:hasNext];
    if (hasNext) {
        [commandCenter.nextTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent * _Nonnull event) {
             [self sendEventWithName:@"AudioPlayerEvent.RemoteNext" body:@{@"id": playerId}];
             return MPRemoteCommandHandlerStatusSuccess;
        }];
    }
    
    BOOL hasPrev = [config[@"hasPrevious"] boolValue];
    [commandCenter.previousTrackCommand setEnabled:hasPrev];
    if (hasPrev) {
         [commandCenter.previousTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent * _Nonnull event) {
             [self sendEventWithName:@"AudioPlayerEvent.RemotePrevious" body:@{@"id": playerId}];
             return MPRemoteCommandHandlerStatusSuccess;
         }];
    }
    
    // Metadata & Artwork
    NSMutableDictionary *nowPlayingInfo = [[NSMutableDictionary alloc] init];
    nowPlayingInfo[MPMediaItemPropertyTitle] = config[@"title"] ?: @"";
    nowPlayingInfo[MPMediaItemPropertyArtist] = config[@"artist"] ?: @"";
    nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = @(CMTimeGetSeconds(instance.playerItem.duration));
    nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = @(CMTimeGetSeconds(instance.playerItem.currentTime));
    nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = @(instance.player.rate);
    
    if (config[@"artwork"]) {
        NSString *urlStr = config[@"artwork"];
        NSURL *url = [NSURL URLWithString:urlStr];
        // Async load
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            NSData *data = [NSData dataWithContentsOfURL:url];
            if (data) {
                UIImage *image = [UIImage imageWithData:data];
                if (image) {
                    MPMediaItemArtwork *artwork = [[MPMediaItemArtwork alloc] initWithBoundsSize:image.size requestHandler:^UIImage * _Nonnull(CGSize size) {
                        return image;
                    }];
                    dispatch_async(dispatch_get_main_queue(), ^{
                        NSMutableDictionary *currentInfo = [[MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo mutableCopy];
                        currentInfo[MPMediaItemPropertyArtwork] = artwork;
                        [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = currentInfo;
                    });
                }
            }
        });
    }
    
    [MPNowPlayingInfoCenter defaultCenter].nowPlayingInfo = nowPlayingInfo;
    resolve(nil);
}

RCT_EXPORT_METHOD(prepareRecorder:(NSString *)path options:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    
    // Switch session to Record
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryPlayAndRecord error:nil];
    [session setActive:YES error:nil];
    
    NSURL *url = [NSURL fileURLWithPath:path];
    _currentRecordingPath = path;
    
    NSMutableDictionary *settings = [NSMutableDictionary dictionary];
    [settings setValue:[NSNumber numberWithInt:kAudioFormatMPEG4AAC] forKey:AVFormatIDKey]; // Default AAC
    [settings setValue:[NSNumber numberWithFloat:44100.0] forKey:AVSampleRateKey];
    [settings setValue:[NSNumber numberWithInt:2] forKey:AVNumberOfChannelsKey];
    
    // Override with options
    if (options[@"sampleRate"]) {
         [settings setValue:options[@"sampleRate"] forKey:AVSampleRateKey];
    }
    if (options[@"channels"]) {
         [settings setValue:options[@"channels"] forKey:AVNumberOfChannelsKey];
    }
    
    NSError *error;
    _recorder = [[AVAudioRecorder alloc] initWithURL:url settings:settings error:&error];
    
    if (error) {
        reject(@"recorder_error", error.localizedDescription, error);
        return;
    }
    
    _recorder.meteringEnabled = YES;
    [_recorder prepareToRecord];
    resolve(path);
}

RCT_EXPORT_METHOD(startRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    if (_recorder) {
        BOOL success = [_recorder record];
        if (success) {
            resolve(nil);
        } else {
            reject(@"error", @"Failed to start recording", nil);
        }
    } else {
         reject(@"no_recorder", @"Recorder not prepared", nil);
    }
}

RCT_EXPORT_METHOD(stopRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    if (_recorder) {
        [_recorder stop];
        resolve(_currentRecordingPath);
    } else {
        reject(@"no_recorder", @"Recorder not prepared", nil);
    }
}

RCT_EXPORT_METHOD(pauseRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    // TODO: Implement
    resolve(nil);
}

RCT_EXPORT_METHOD(resumeRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    // TODO: Implement
    resolve(nil);
}

// MARK: - Media Library

RCT_EXPORT_METHOD(getAudios:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    MPMediaQuery *query = [MPMediaQuery songsQuery];
    NSArray<MPMediaItem *> *items = [query items];
    NSMutableArray *result = [NSMutableArray array];
    
    for (MPMediaItem *item in items) {
        NSMutableDictionary *song = [NSMutableDictionary dictionary];
        
        NSString *title = [item valueForProperty:MPMediaItemPropertyTitle] ?: @"Unknown";
        NSString *artist = [item valueForProperty:MPMediaItemPropertyArtist] ?: @"Unknown";
        NSString *album = [item valueForProperty:MPMediaItemPropertyAlbumTitle] ?: @"Unknown";
        NSNumber *duration = [item valueForProperty:MPMediaItemPropertyPlaybackDuration] ?: @0;
        NSURL *assetURL = [item valueForProperty:MPMediaItemPropertyAssetURL];
        
        if (assetURL) {
            song[@"id"] = [NSString stringWithFormat:@"%llu", item.persistentID];
            song[@"uri"] = [assetURL absoluteString];
            song[@"title"] = title;
            song[@"artist"] = artist;
            song[@"album"] = album;
            song[@"duration"] = duration;
            
            [result addObject:song];
        }
    }
    
    resolve(result);
}

// MARK: - KVO & Notifications

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context {
    if (context && [keyPath isEqualToString:@"status"]) {
         AudioPlayerInstance *instance = (__bridge AudioPlayerInstance *)context;
         AVPlayerItem *item = (AVPlayerItem *)object;
         if (item.status == AVPlayerItemStatusReadyToPlay) {
             [self sendStateEvent:@(instance.playerId) state:@"idle"]; // Ready
         } else if (item.status == AVPlayerItemStatusFailed) {
             [self sendErrorEvent:@(instance.playerId) error:@"decode" message:item.error.localizedDescription];
         }
    }
}

- (void)playerItemDidReachEnd:(NSNotification *)notification {
    AVPlayerItem *item = notification.object;
    // Find player for this item
    for (NSNumber *key in _players) {
        AudioPlayerInstance *instance = _players[key];
        if (instance.playerItem == item) {
             if (instance.isLooping) {
                 [instance.player seekToTime:kCMTimeZero];
                 [instance.player play];
             } else {
                 [self sendStateEvent:key state:@"ended"];
             }
             break;
        }
    }
}

- (void)handleRouteChange:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSInteger reason = [[userInfo objectForKey:AVAudioSessionRouteChangeReasonKey] integerValue];
    
    // Headphone unplugged = OldDeviceUnavailable
    if (reason == AVAudioSessionRouteChangeReasonOldDeviceUnavailable) {
        for (NSNumber *key in _players) {
            AudioPlayerInstance *instance = _players[key];
            if (instance.player.rate > 0) {
                 [instance.player pause];
                 [self sendStateEvent:key state:@"paused"];
                 
                 if (_hasListeners) {
                    [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.Interruption.%@", key]
                                       body:@{@"reason": @"noisy"}];
                 }
            }
        }
    }
}

- (void)handleInterruption:(NSNotification *)notification {
    NSDictionary *info = notification.userInfo;
    AVAudioSessionInterruptionType type = [info[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
    
    if (type == AVAudioSessionInterruptionTypeBegan) {
        // Pause all players
        for (NSNumber *key in _players) {
            AudioPlayerInstance *instance = _players[key];
            if (instance.player.rate > 0) {
                 [instance.player pause];
                 [self sendStateEvent:key state:@"paused"];
                 
                 if (_hasListeners) {
                    [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.Interruption.%@", key]
                                       body:@{@"reason": @"call"}];
                 }
            }
        }
    } else if (type == AVAudioSessionInterruptionTypeEnded) {
        // Interruption ended, check if we should resume
        AVAudioSessionInterruptionOptions options = [info[AVAudioSessionInterruptionOptionKey] unsignedIntegerValue];
        if (options & AVAudioSessionInterruptionOptionShouldResume) {
             // We could auto-resume here, but safer to let JS decide or emit 'resume' event.
             // For now, let's emit an event saying "interruption ended, safe to resume"
             for (NSNumber *key in _players) {
                if (_hasListeners) {
                   // Optional: [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.Interruption.%@", key] body:@{@"reason": @"end"}];
                }
             }
        }
    }
}

// MARK: - Helpers

- (void)sendStateEvent:(NSNumber *)playerId state:(NSString *)state {
    if (_hasListeners) {
        [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.State.%@", playerId] 
                           body:@{@"state": state}];
    }
}

- (void)sendProgressEvent:(NSNumber *)playerId position:(double)pos duration:(double)dur {
    if (_hasListeners && !isnan(dur)) {
         [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.Progress.%@", playerId] 
                            body:@{@"position": @(pos), @"duration": @(dur)}];
    }
}

- (void)sendErrorEvent:(NSNumber *)playerId error:(NSString *)code message:(NSString *)msg {
     if (_hasListeners) {
        [self sendEventWithName:[NSString stringWithFormat:@"AudioPlayerEvent.Error.%@", playerId] 
                           body:@{@"error": code, @"message": msg ?: @"Unknown"}];
    }
}

// MARK: - Cache Management

RCT_EXPORT_METHOD(setCacheConfig:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    // iOS cache configuration would use AVAssetDownloadTask
    resolve(nil);
}

RCT_EXPORT_METHOD(getCacheStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSDictionary *status = @{
        @"sizeBytes": @0,
        @"itemCount": @0
    };
    resolve(status);
}

RCT_EXPORT_METHOD(clearCache:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    // Cache clearing logic
    resolve(nil);
}

// MARK: - Equalizer

RCT_EXPORT_METHOD(enableEqualizer:(double)idVal enabled:(BOOL)enabled resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        // Equalizer enable/disable using AVAudioEngine
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(setEqualizerBand:(double)idVal bandIndex:(double)bandIndex gain:(double)gain resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        // Set equalizer band gain
        resolve(nil);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

RCT_EXPORT_METHOD(getEqualizerBands:(double)idVal resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    NSNumber *playerId = @(idVal);
    AudioPlayerInstance *instance = _players[playerId];
    if (instance) {
        NSMutableArray *bands = [NSMutableArray array];
        // Return equalizer bands (typically 5-10 bands)
        for (int i = 0; i < 5; i++) {
            [bands addObject:@{
                @"frequency": @(60 * pow(2, i)),
                @"gain": @0.0
            }];
        }
        resolve(bands);
    } else {
        reject(@"not_found", @"Player not found", nil);
    }
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeReactNativeAudioSpecJSI>(params);
}
#endif

@end
