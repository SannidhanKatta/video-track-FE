import React from 'react';

interface ProgressBarProps {
    progress: number;
    isLoading?: boolean;
    skippedAhead?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    isLoading = false,
    skippedAhead = false,
}) => {
    const progressValue = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="relative">
            {/* Progress Bar Container */}
            <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                {/* Main Progress Bar */}
                <div
                    className={`absolute h-full transition-all duration-300 ease-out ${skippedAhead ? 'bg-yellow-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                    style={{ width: `${progressValue}%` }}
                />

                {/* Progress Markers (every 10%) */}
                <div className="absolute inset-0 flex justify-between px-1">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div
                            key={index}
                            className={`w-px h-full ${progressValue >= (index + 1) * 10
                                    ? 'bg-white/20'
                                    : 'bg-gray-600/20'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Progress Labels */}
            <div className="mt-1 flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-2">
                    {isLoading ? (
                        <svg className="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <div className={`w-2 h-2 rounded-full ${skippedAhead ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    )}
                    <span>{Math.round(progressValue)}% completed</span>
                </div>
                {skippedAhead && (
                    <div className="text-xs text-yellow-500">
                        Please watch without skipping
                    </div>
                )}
            </div>
        </div>
    );
}; 