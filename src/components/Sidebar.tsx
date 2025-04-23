import React from 'react';

// Import the shared Video interface
interface Video {
    id: string;
    title: string;
    url: string;
    duration: string;
    progress: number;
    isCompleted: boolean;
}

interface SidebarProps {
    videos: Video[];
    currentVideo: Video;
    onSelectVideo: (video: Video) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    videos,
    currentVideo,
    onSelectVideo,
    isOpen,
    onClose,
}) => {
    const videosWatched = videos.filter(v => v.isCompleted).length;
    const totalVideos = videos.length;
    const overallProgress = Math.round((videosWatched / totalVideos) * 100);

    return (
        <>
            {/* Overlay for mobile - closes sidebar when clicking outside */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed md:static inset-y-0 right-0 w-80 bg-[#1a1a1a] transform transition-transform duration-300 ease-in-out z-50 
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
                    md:translate-x-0 flex flex-col`}
            >
                {/* Close button - Only visible on mobile */}
                <button
                    onClick={onClose}
                    className="md:hidden absolute top-4 left-4 p-2 text-gray-400 hover:text-white"
                    aria-label="Close Sidebar"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>

                {/* Videos List */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Videos ({totalVideos})</h2>
                        <div className="text-sm text-gray-400">
                            {videosWatched} of {totalVideos} Complete ({overallProgress}%)
                        </div>
                    </div>

                    <div className="space-y-2">
                        {videos.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => {
                                    onSelectVideo(video);
                                    // Close sidebar on mobile when selecting a video
                                    if (window.innerWidth < 768) {
                                        onClose();
                                    }
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${currentVideo.id === video.id
                                    ? 'bg-blue-500/20 border border-blue-500/50'
                                    : 'hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className={video.isCompleted ? 'text-blue-500' : 'text-gray-400'}>
                                                {video.isCompleted ? '✓' : '○'}
                                            </span>
                                            <h3 className="text-sm font-medium text-white truncate">
                                                {video.title}
                                            </h3>
                                        </div>
                                        <div className="mt-2">
                                            {/* Progress Bar */}
                                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-300"
                                                    style={{ width: `${video.progress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-xs">
                                                <span className="text-gray-400">
                                                    {Math.round(video.progress)}% complete
                                                </span>
                                                <span className="text-gray-500">
                                                    Duration: {video.duration}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}; 