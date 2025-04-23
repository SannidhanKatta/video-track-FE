# Video Progress Tracker

A modern web application built with React and TypeScript that tracks user progress across video content. The application features a responsive design, real-time progress tracking, and persistent storage of viewing history.

## Features

- 🎥 Real-time video progress tracking
- 📊 Visual progress indicators for each video
- 🔄 Automatic progress saving
- 📱 Responsive design for mobile and desktop
- ✨ Smooth animations and transitions
- 🎯 Accurate tracking of watched segments

## Technical Implementation

### Video Progress Tracking

The application implements a sophisticated system for tracking video progress that handles various user interactions and viewing patterns:

#### Tracking Watched Intervals

1. **Event-Based Tracking**: The system monitors video playback using the HTML5 Video API events:

   - `timeupdate`: Captures current playback position
   - `seeking`: Handles user navigation within the video
   - `play/pause`: Manages playback state changes

2. **Interval Collection**:
   - Each viewing session creates intervals representing watched segments
   - Intervals are stored as `[startTime, endTime]` pairs
   - Small gaps between intervals (< 1 second) are automatically merged to handle minor buffering

#### Progress Calculation

The progress calculation involves several key steps:

1. **Interval Merging Algorithm**:

   ```typescript
   // Pseudo-code representation of the merging logic
   function mergeIntervals(intervals) {
     if (intervals.length <= 1) return intervals;

     intervals.sort((a, b) => a[0] - b[0]);
     const merged = [intervals[0]];

     for (const current of intervals.slice(1)) {
       const last = merged[merged.length - 1];

       if (current[0] <= last[1] + 1) {
         // Merge overlapping or close intervals
         last[1] = Math.max(last[1], current[1]);
       } else {
         merged.push(current);
       }
     }

     return merged;
   }
   ```

2. **Progress Calculation**:
   - Total watched time is calculated from merged intervals
   - Progress percentage = (Total watched time / Video duration) × 100
   - Progress updates are debounced to prevent excessive state updates

### Challenges and Solutions

1. **Accurate Progress Tracking**

   - **Challenge**: Users might skip around the video or watch segments multiple times
   - **Solution**: Implemented a robust interval tracking system that merges overlapping segments and handles non-linear viewing patterns

2. **Performance Optimization**

   - **Challenge**: Frequent progress updates could cause performance issues
   - **Solution**: Implemented debouncing for progress updates and optimized the interval merging algorithm

3. **State Management**

   - **Challenge**: Maintaining consistent state across video interactions
   - **Solution**: Centralized state management with proper synchronization between the video player and progress tracking

4. **Mobile Responsiveness**
   - **Challenge**: Creating a seamless experience across devices
   - **Solution**: Implemented a responsive sidebar design with smooth transitions and touch-friendly controls

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- HTML5 Video API

## Future Improvements

1. Support for different video formats and sources
2. Offline viewing capabilities
3. Analytics dashboard for viewing patterns
4. Multi-user support with individual progress tracking
5. Integration with popular video platforms

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
