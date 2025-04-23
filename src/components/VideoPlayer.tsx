import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoProgress } from '../hooks/useVideoProgress';
import { ProgressBar } from './ProgressBar';

interface VideoPlayerProps {
    videoUrl: string;
    videoId: string;
    userId: string;
    onProgress: (progress: number, isCompleted: boolean) => void;
    onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoUrl,
    videoId,
    userId,
    onProgress,
    onDurationChange,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isSeeking, setIsSeeking] = useState<boolean>(false);
    const hasSetInitialPosition = useRef<boolean>(false);
    const durationSetRef = useRef<boolean>(false);

    const {
        progress,
        isLoading,
        error,
        skippedAhead,
        handlePlay,
        handlePause,
        handleTimeUpdate,
        lastPosition,
        isInitialized,
        isCompleted,
        resetProgress
    } = useVideoProgress({
        videoId,
        userId,
        duration,
    });

    // Reset state when video changes
    useEffect(() => {
        hasSetInitialPosition.current = false;
        durationSetRef.current = false;
        setDuration(0);
        setCurrentTime(0);
    }, [videoId]);

    // Handle initial video position
    useEffect(() => {
        if (videoRef.current && isInitialized && !hasSetInitialPosition.current) {
            const setPosition = () => {
                if (videoRef.current) {
                    if (lastPosition > 0 && !isCompleted) {
                        videoRef.current.currentTime = lastPosition;
                        setCurrentTime(lastPosition);
                    }
                    hasSetInitialPosition.current = true;
                }
            };

            // Check if metadata is loaded
            if (videoRef.current.readyState >= 1) {
                setPosition();
            } else {
                // Wait for metadata to load
                const handleMetadata = () => {
                    setPosition();
                    videoRef.current?.removeEventListener('loadedmetadata', handleMetadata);
                };
                videoRef.current.addEventListener('loadedmetadata', handleMetadata);
                return () => {
                    videoRef.current?.removeEventListener('loadedmetadata', handleMetadata);
                };
            }
        }
    }, [isInitialized, lastPosition, isCompleted, videoId]);

    // Save position before unload or component unmount
    useEffect(() => {
        const video = videoRef.current;

        const handleBeforeUnload = () => {
            if (video && !isSeeking) {
                handlePause(video.currentTime);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Also save position when component unmounts
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (video && !isSeeking) {
                handlePause(video.currentTime);
            }
        };
    }, [handlePause, isSeeking]);

    const onPlay = useCallback(() => {
        if (!videoRef.current) return;
        handlePlay(videoRef.current.currentTime);
    }, [handlePlay]);

    const onPause = useCallback(() => {
        if (!videoRef.current) return;
        handlePause(videoRef.current.currentTime);
    }, [handlePause]);

    const onTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        handleTimeUpdate(time);
    }, [handleTimeUpdate]);

    // Add event listeners when the video element is ready
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handleLoadedMetadata = () => {
            if (videoElement.duration && videoElement.duration !== Infinity && !durationSetRef.current) {
                const videoDuration = videoElement.duration;
                setDuration(videoDuration);
                onDurationChange(videoDuration);
                durationSetRef.current = true;
            }
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('durationchange', handleLoadedMetadata);
        videoElement.addEventListener('play', onPlay);
        videoElement.addEventListener('pause', onPause);
        videoElement.addEventListener('timeupdate', onTimeUpdate);

        return () => {
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('durationchange', handleLoadedMetadata);
            videoElement.removeEventListener('play', onPlay);
            videoElement.removeEventListener('pause', onPause);
            videoElement.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [onPlay, onPause, onTimeUpdate, onDurationChange]);

    const onSeeking = useCallback(() => {
        setIsSeeking(true);
    }, []);

    const onSeeked = useCallback(() => {
        setIsSeeking(false);
        if (videoRef.current) {
            handleTimeUpdate(videoRef.current.currentTime);
        }
    }, [handleTimeUpdate]);

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Subscribe to progress updates
    useEffect(() => {
        if (duration > 0) {
            onProgress(progress, isCompleted);
        }
    }, [progress, isCompleted, onProgress, duration]);

    if (error) {
        return (
            <div className="flex justify-center items-center w-full aspect-video bg-red-900/20">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden relative w-full bg-black rounded-lg">
            <video
                ref={videoRef}
                className="w-full aspect-video"
                src={videoUrl}
                onTimeUpdate={onTimeUpdate}
                onPlay={onPlay}
                onPause={onPause}
                onSeeking={onSeeking}
                onSeeked={onSeeked}
                controls
                playsInline
            />

            {/* Progress Display */}
            <div className="p-4 bg-gray-800">
                <ProgressBar
                    progress={duration > 0 ? progress : 0}
                    isLoading={isLoading || duration === 0}
                    skippedAhead={skippedAhead}
                    isCompleted={isCompleted}
                />
                <div className="text-white text-sm mt-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
        </div>
    );
}; 