import React, { useState, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { Sidebar } from './components/Sidebar';

interface Video {
  id: string;
  title: string;
  url: string;
  duration: string;
  progress: number;
  isCompleted: boolean;
}

// Video Preloader Component
const VideoPreloader: React.FC<{ video: Video; onDurationChange: (id: string, duration: number) => void }> = ({ video, onDurationChange }) => {
  useEffect(() => {
    // First try to load from localStorage
    const savedDuration = localStorage.getItem(`video-duration-${video.id}`);
    if (savedDuration) {
      const duration = parseFloat(savedDuration);
      if (!isNaN(duration) && duration > 0) {
        onDurationChange(video.id, duration);
        return; // Don't try to load metadata if we have valid cached duration
      }
    }

    const videoElement = document.createElement('video');
    videoElement.crossOrigin = "anonymous";
    videoElement.preload = "metadata";

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout;

    const tryLoadMetadata = () => {
      const handleLoadedMetadata = () => {
        if (videoElement.duration && videoElement.duration !== Infinity) {
          onDurationChange(video.id, videoElement.duration);
          localStorage.setItem(`video-duration-${video.id}`, videoElement.duration.toString());
          cleanup();
        }
      };

      const handleError = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying metadata load for ${video.title}, attempt ${retryCount}`);
          retryTimeout = setTimeout(() => {
            cleanup();
            tryLoadMetadata();
          }, 1000 * retryCount);
        } else {
          console.warn(`Failed to load metadata for ${video.title} after ${maxRetries} attempts`);
          cleanup();
        }
      };

      const cleanup = () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        if (document.body.contains(videoElement)) {
          document.body.removeChild(videoElement);
        }
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
      };

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);

      // Set src after adding event listeners
      videoElement.src = video.url;
      document.body.appendChild(videoElement);
    };

    tryLoadMetadata();

    return () => {
      if (document.body.contains(videoElement)) {
        document.body.removeChild(videoElement);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [video.url, video.id, video.title, onDurationChange]);

  return null;
};

// Demo videos data with empty initial durations
const DEMO_VIDEOS: Video[] = [
  {
    id: 'video-1',
    title: 'Big Buck Bunny - A Funny Rabbit Story',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '0:00',
    progress: 0,
    isCompleted: false
  },
  {
    id: 'video-2',
    title: 'Elephants Dream - The World\'s First Open Movie',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '0:00',
    progress: 0,
    isCompleted: false
  },
  {
    id: 'video-3',
    title: 'For Bigger Blazes - Chrome Speed Test',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '0:00',
    progress: 0,
    isCompleted: false
  },
  {
    id: 'video-4',
    title: 'For Bigger Escapes - Chrome Speed Test',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '0:00',
    progress: 0,
    isCompleted: false
  },
  {
    id: 'video-5',
    title: 'For Bigger Fun - Chrome Speed Test',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '0:00',
    progress: 0,
    isCompleted: false
  }
];

// For demo purposes, we'll use a hardcoded user ID
const DEMO_USER_ID = 'user123';

function App() {
  const [videos, setVideos] = useState<Video[]>(DEMO_VIDEOS);
  const [currentVideo, setCurrentVideo] = useState<Video>(videos[0]);

  // Clear stored progress for all videos
  useEffect(() => {
    const clearStoredProgress = () => {
      DEMO_VIDEOS.forEach(video => {
        localStorage.removeItem(`video-progress-${DEMO_USER_ID}-${video.id}`);
      });
    };

    // Clear stored progress
    clearStoredProgress();
  }, []); // Run only once on component mount

  // Load initial progress and durations from local storage
  useEffect(() => {
    const loadSavedData = () => {
      const updatedVideos = videos.map(video => {
        const savedProgress = localStorage.getItem(`video-progress-${DEMO_USER_ID}-${video.id}`);
        const savedDuration = localStorage.getItem(`video-duration-${video.id}`);

        const updates: Partial<Video> = {};
        let hasUpdates = false;

        if (savedProgress) {
          try {
            const { progress, isCompleted } = JSON.parse(savedProgress);
            if (video.progress !== progress || video.isCompleted !== isCompleted) {
              updates.progress = progress || 0;
              updates.isCompleted = isCompleted || false;
              hasUpdates = true;
            }
          } catch (e) {
            console.error(`Error parsing progress for video ${video.id}:`, e);
          }
        }

        if (savedDuration && video.duration === '0:00') {
          try {
            const duration = parseFloat(savedDuration);
            if (!isNaN(duration) && duration > 0) {
              updates.duration = formatDuration(duration);
              hasUpdates = true;
            }
          } catch (e) {
            console.error(`Error parsing duration for video ${video.id}:`, e);
          }
        }

        return hasUpdates ? { ...video, ...updates } : video;
      });

      // Only update state if there are actual changes
      const hasChanges = updatedVideos.some((video, index) => {
        const oldVideo = videos[index];
        return video.progress !== oldVideo.progress ||
          video.isCompleted !== oldVideo.isCompleted ||
          video.duration !== oldVideo.duration;
      });

      if (hasChanges) {
        setVideos(updatedVideos);
        // Update current video if it's the same as one in the list
        const updatedCurrentVideo = updatedVideos.find(v => v.id === currentVideo.id);
        if (updatedCurrentVideo && (
          updatedCurrentVideo.progress !== currentVideo.progress ||
          updatedCurrentVideo.isCompleted !== currentVideo.isCompleted ||
          updatedCurrentVideo.duration !== currentVideo.duration
        )) {
          setCurrentVideo(updatedCurrentVideo);
        }
      }
    };

    loadSavedData();

    // Set up an interval to periodically check for updates
    const intervalId = setInterval(loadSavedData, 5000);

    return () => clearInterval(intervalId);
  }, [videos, currentVideo]);

  // Update video progress
  const handleVideoProgress = (videoId: string, progress: number, isCompleted: boolean) => {
    // Don't update if progress is 100% but video hasn't been actually watched
    const currentVideoData = videos.find(v => v.id === videoId);
    if (currentVideoData && progress === 100 && !currentVideoData.isCompleted) {
      // Check if this is an artificial 100% (immediate jump to end)
      const storedProgress = localStorage.getItem(`video-progress-${DEMO_USER_ID}-${videoId}`);
      if (!storedProgress || JSON.parse(storedProgress).progress < 95) {
        // Reset progress if it's an artificial jump
        setVideos(prevVideos =>
          prevVideos.map(video =>
            video.id === videoId
              ? { ...video, progress: 0, isCompleted: false }
              : video
          )
        );
        if (currentVideo.id === videoId) {
          setCurrentVideo(prev => ({ ...prev, progress: 0, isCompleted: false }));
        }
        localStorage.setItem(`video-progress-${DEMO_USER_ID}-${videoId}`, JSON.stringify({ progress: 0, isCompleted: false }));
        return;
      }
    }

    // Update progress normally for legitimate progress updates
    setVideos(prevVideos =>
      prevVideos.map(video =>
        video.id === videoId
          ? { ...video, progress, isCompleted }
          : video
      )
    );

    // Also update currentVideo if it's the one being updated
    if (currentVideo.id === videoId) {
      setCurrentVideo(prev => ({ ...prev, progress, isCompleted }));
    }

    // Save to local storage
    localStorage.setItem(`video-progress-${DEMO_USER_ID}-${videoId}`, JSON.stringify({ progress, isCompleted }));
  };

  // Handle duration change for any video
  const handleDurationChange = (videoId: string, duration: number) => {
    if (!duration || duration === Infinity || isNaN(duration)) {
      console.error(`Invalid duration received for video ${videoId}:`, duration);
      return;
    }

    const formattedDuration = formatDuration(duration);

    setVideos(prevVideos =>
      prevVideos.map(video =>
        video.id === videoId
          ? { ...video, duration: formattedDuration }
          : video
      )
    );

    // Also update currentVideo if it's the one being updated
    if (currentVideo.id === videoId) {
      setCurrentVideo(prev => ({ ...prev, duration: formattedDuration }));
    }

    // Save to local storage
    localStorage.setItem(`video-duration-${videoId}`, duration.toString());
  };

  // Format seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#121212] flex">
      {/* Preload all video durations */}
      {videos.map(video => (
        <VideoPreloader
          key={video.id}
          video={video}
          onDurationChange={handleDurationChange}
        />
      ))}

      {/* Sidebar */}
      <Sidebar
        videos={videos}
        currentVideo={currentVideo}
        onSelectVideo={(video: Video) => setCurrentVideo(video)}
      />

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">{currentVideo.title}</h1>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
            <VideoPlayer
              videoUrl={currentVideo.url}
              videoId={currentVideo.id}
              userId={DEMO_USER_ID}
              onProgress={(progress, isCompleted) =>
                handleVideoProgress(currentVideo.id, progress, isCompleted)
              }
              onDurationChange={(duration) => handleDurationChange(currentVideo.id, duration)}
            />
          </div>

          <div className="p-4 mt-4 rounded-lg border bg-blue-900/20 border-blue-700/50">
            <div className="text-blue-400">
              <p>Watch the video to track your progress. Progress is saved automatically.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
