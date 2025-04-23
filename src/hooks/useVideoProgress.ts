import { useState, useEffect, useRef, useCallback } from 'react';
import { IInterval, IProgress, getProgress, updateProgress, emitProgressUpdate, initializeSocket } from '../services/api';

const PROGRESS_UPDATE_INTERVAL = 5000; // Reduced to 5 seconds for more frequent updates
const UI_UPDATE_INTERVAL = 1000; // UI update interval: 1 second
const MINIMUM_WATCH_TIME = 1; // 1 second
const SKIP_THRESHOLD = 10; // 10 seconds
const COMPLETION_THRESHOLD = 95; // 95% completion threshold

const DEBUG = true;

interface UseVideoProgressProps {
    videoId: string;
    userId: string;
    duration: number;
}

// Local storage key generator
const getLocalStorageKey = (userId: string, videoId: string) => `video_progress_${userId}_${videoId}`;

interface LocalStorageProgress {
    lastPosition: number;
    totalWatched: number;
    intervals: IInterval[];
    timestamp: number;
    isCompleted: boolean; // New field to track complete watches
}

export const useVideoProgress = ({ videoId, userId, duration }: UseVideoProgressProps) => {
    const [serverProgress, setServerProgress] = useState<IProgress | null>(null);
    const [localProgress, setLocalProgress] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [skippedAhead, setSkippedAhead] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const currentIntervalRef = useRef<IInterval | null>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const lastUIUpdateTimeRef = useRef<number>(Date.now());
    const isPlayingRef = useRef(false);
    const lastKnownPositionRef = useRef<number>(0);
    const intervalsRef = useRef<IInterval[]>([]);
    const totalWatchedRef = useRef<number>(0);
    const wasFullyWatchedRef = useRef(false);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debugLog = useCallback((message: string, data?: any) => {
        if (DEBUG) {
            console.log(`[Progress Debug] ${message}`, data || '');
        }
    }, []);

    // Calculate actual progress based on intervals
    const calculateProgress = useCallback(() => {
        if (!duration) return 0;

        // If video was fully watched without skipping, always return 100%
        if (wasFullyWatchedRef.current) {
            return 100;
        }

        let totalWatched = 0;
        const validIntervals = intervalsRef.current.filter(interval => {
            // Filter out invalid intervals
            if (interval.end <= interval.start) return false;
            if (interval.start >= duration) return false;
            if (interval.end - interval.start < MINIMUM_WATCH_TIME) return false;
            if (interval.end - interval.start > duration) return false;
            return true;
        });

        // Sort intervals by start time
        validIntervals.sort((a, b) => a.start - b.start);

        // Merge overlapping intervals and calculate total watched time
        const mergedIntervals: IInterval[] = [];
        for (const interval of validIntervals) {
            const clampedInterval = {
                start: Math.max(0, interval.start),
                end: Math.min(duration, interval.end)
            };

            if (mergedIntervals.length === 0) {
                mergedIntervals.push(clampedInterval);
                continue;
            }

            const lastInterval = mergedIntervals[mergedIntervals.length - 1];
            if (clampedInterval.start <= lastInterval.end + 0.1) {
                lastInterval.end = Math.max(lastInterval.end, clampedInterval.end);
            } else {
                mergedIntervals.push(clampedInterval);
            }
        }

        // Calculate total watched time from merged intervals
        totalWatched = mergedIntervals.reduce((total, interval) =>
            total + (interval.end - interval.start), 0);

        totalWatchedRef.current = totalWatched;
        const percentage = Math.min((totalWatched / duration) * 100, 100);

        // Check if video is fully watched
        if (percentage >= 99.5 && !skippedAhead) {
            wasFullyWatchedRef.current = true;
            setIsCompleted(true);
            return 100;
        }

        debugLog('Calculated progress', {
            totalWatched,
            duration,
            percentage,
            validIntervals,
            mergedIntervals,
            isCompleted: wasFullyWatchedRef.current
        });

        return percentage;
    }, [duration, skippedAhead, debugLog]);

    // Save progress to local storage
    const saveToLocalStorage = useCallback(() => {
        const data: LocalStorageProgress = {
            lastPosition: lastKnownPositionRef.current,
            totalWatched: totalWatchedRef.current,
            intervals: intervalsRef.current,
            timestamp: Date.now(),
            isCompleted: wasFullyWatchedRef.current
        };
        localStorage.setItem(getLocalStorageKey(userId, videoId), JSON.stringify(data));
        debugLog('Saved to local storage', data);
    }, [userId, videoId, debugLog]);

    // Reset progress
    const resetProgress = useCallback(() => {
        // Don't reset if video was fully watched
        if (wasFullyWatchedRef.current) {
            return;
        }

        intervalsRef.current = [];
        currentIntervalRef.current = null;
        totalWatchedRef.current = 0;
        lastKnownPositionRef.current = 0;
        setLocalProgress(0);
        setSkippedAhead(false);
        saveToLocalStorage();
        debugLog('Progress reset');
    }, [saveToLocalStorage, debugLog]);

    // Initialize socket connection
    useEffect(() => {
        initializeSocket();
    }, []);

    // Load initial progress
    useEffect(() => {
        const loadProgress = async () => {
            try {
                setIsLoading(true);
                setIsInitialized(false);
                debugLog('Loading initial progress');

                // Try to load from local storage first
                const localData = localStorage.getItem(getLocalStorageKey(userId, videoId));
                if (localData) {
                    try {
                        const parsed = JSON.parse(localData) as LocalStorageProgress;
                        lastKnownPositionRef.current = parsed.lastPosition;
                        intervalsRef.current = parsed.intervals;
                        wasFullyWatchedRef.current = parsed.isCompleted;
                        setIsCompleted(parsed.isCompleted);

                        // If video was fully watched, set progress to 100%
                        if (parsed.isCompleted) {
                            setLocalProgress(100);
                        } else {
                            const calculatedProgress = calculateProgress();
                            setLocalProgress(calculatedProgress);
                        }
                        debugLog('Loaded from local storage', { parsed, isCompleted: parsed.isCompleted });
                    } catch (e) {
                        console.error('Error parsing local storage data:', e);
                        setError('Failed to load saved progress');
                    }
                }

                // Load from server without blocking
                getProgress(videoId, userId)
                    .then(serverData => {
                        setServerProgress(serverData);
                        setError(null);

                        // Use server data if it's more recent and video wasn't fully watched locally
                        if (!localData || (!wasFullyWatchedRef.current && new Date(serverData.lastWatchedAt).getTime() > JSON.parse(localData).timestamp)) {
                            lastKnownPositionRef.current = serverData.lastPosition;
                            intervalsRef.current = serverData.intervals;
                            const calculatedProgress = calculateProgress();
                            setLocalProgress(calculatedProgress);
                            debugLog('Using server data', { serverData, calculatedProgress });
                        }
                    })
                    .catch(err => {
                        console.error('Error loading progress from server:', err);
                        setError('Failed to load progress from server');
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setIsInitialized(true);
                    });
            } catch (err) {
                console.error('Error in loadProgress:', err);
                setError('Failed to initialize progress tracking');
                setIsLoading(false);
                setIsInitialized(true);
            }
        };

        loadProgress();
    }, [userId, videoId, calculateProgress, debugLog]);

    // Handle play
    const handlePlay = useCallback((currentTime: number) => {
        debugLog('Video playing at', currentTime);
        isPlayingRef.current = true;

        // Only reset if video wasn't fully watched
        if (currentTime === 0 && lastKnownPositionRef.current > 0 && !wasFullyWatchedRef.current) {
            resetProgress();
        }

        currentIntervalRef.current = {
            start: currentTime,
            end: currentTime
        };
    }, [debugLog, resetProgress]);

    // Handle pause
    const handlePause = useCallback((currentTime: number) => {
        debugLog('Video paused at', currentTime);
        isPlayingRef.current = false;

        if (currentIntervalRef.current) {
            currentIntervalRef.current.end = currentTime;
            if (currentIntervalRef.current.end - currentIntervalRef.current.start >= MINIMUM_WATCH_TIME) {
                intervalsRef.current.push({ ...currentIntervalRef.current });
                const newProgress = calculateProgress();
                setLocalProgress(newProgress);
                saveToLocalStorage();
            }
            currentIntervalRef.current = null;
        }
    }, [calculateProgress, saveToLocalStorage, debugLog]);

    // Save progress to server
    const saveProgress = useCallback(async (currentTime: number) => {
        if (!currentIntervalRef.current) return;

        try {
            const serverProgress = await updateProgress(
                videoId,
                userId,
                currentIntervalRef.current,
                currentTime
            );

            // Update local state with server response
            setServerProgress(serverProgress);
            setError(null);

            // Save to local storage
            saveToLocalStorage();

            // Emit progress update for real-time sync
            emitProgressUpdate({
                videoId,
                userId,
                progress: serverProgress
            });

            debugLog('Progress saved to server', { serverProgress });
        } catch (err) {
            console.error('Error saving progress:', err);
            setError('Failed to save progress');
        }
    }, [videoId, userId, saveToLocalStorage, debugLog]);

    // Update progress tracking
    const handleTimeUpdate = useCallback((currentTime: number) => {
        if (!isPlayingRef.current || !duration) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        const timeSinceLastUIUpdate = now - lastUIUpdateTimeRef.current;

        // Update current interval
        if (currentIntervalRef.current) {
            currentIntervalRef.current.end = currentTime;
        } else {
            currentIntervalRef.current = {
                start: currentTime,
                end: currentTime
            };
        }

        // Check for skips
        const timeDiff = Math.abs(currentTime - lastKnownPositionRef.current);
        if (timeDiff > SKIP_THRESHOLD) {
            // End current interval and mark skip
            if (currentIntervalRef.current) {
                intervalsRef.current.push({ ...currentIntervalRef.current });
                currentIntervalRef.current = {
                    start: currentTime,
                    end: currentTime
                };
            }
            setSkippedAhead(true);
            debugLog('Skip detected', { timeDiff, currentTime, lastPosition: lastKnownPositionRef.current });
        }

        // Update UI more frequently
        if (timeSinceLastUIUpdate >= UI_UPDATE_INTERVAL) {
            const newProgress = calculateProgress();
            setLocalProgress(newProgress);
            lastUIUpdateTimeRef.current = now;
        }

        // Save to server less frequently
        if (timeSinceLastUpdate >= PROGRESS_UPDATE_INTERVAL) {
            // Save current interval
            if (currentIntervalRef.current &&
                currentIntervalRef.current.end - currentIntervalRef.current.start >= MINIMUM_WATCH_TIME) {
                intervalsRef.current.push({ ...currentIntervalRef.current });
                currentIntervalRef.current = {
                    start: currentTime,
                    end: currentTime
                };
            }

            // Calculate progress and save
            const newProgress = calculateProgress();
            setLocalProgress(newProgress);
            saveProgress(currentTime);
            lastUpdateTimeRef.current = now;
        }

        lastKnownPositionRef.current = currentTime;
    }, [duration, calculateProgress, saveProgress, debugLog]);

    // Cleanup function with proper ref handling
    useEffect(() => {
        const timeoutRef = updateTimeoutRef.current;
        return () => {
            if (timeoutRef) {
                clearTimeout(timeoutRef);
            }
        };
    }, []);

    return {
        progress: localProgress,
        isLoading,
        error,
        skippedAhead,
        lastPosition: lastKnownPositionRef.current,
        isInitialized,
        isCompleted,
        handlePlay,
        handlePause,
        handleTimeUpdate,
        resetProgress
    };
}; 