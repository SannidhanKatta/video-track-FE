import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const WS_URL = process.env.REACT_APP_WS_URL || '';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Socket.io instance
let socket: Socket | null = null;

export interface IInterval {
    start: number;
    end: number;
}

export interface IProgress {
    userId: string;
    videoId: string;
    intervals: IInterval[];
    lastPosition: number;
    totalWatched: number;
    lastWatchedAt: Date;
}

export const initializeSocket = () => {
    if (!socket) {
        socket = io(WS_URL, {
            path: '/socket.io',
            withCredentials: true
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getProgress = async (videoId: string, userId: string): Promise<IProgress> => {
    const response = await api.get(`/progress/${videoId}`, {
        headers: { 'user-id': userId },
    });
    return response.data;
};

export const updateProgress = async (
    videoId: string,
    userId: string,
    interval: IInterval,
    lastPosition: number
): Promise<IProgress> => {
    const response = await api.post(
        `/progress/${videoId}`,
        { interval, lastPosition },
        { headers: { 'user-id': userId } }
    );
    return response.data;
};

export const resetProgress = async (videoId: string, userId: string): Promise<void> => {
    await api.delete(`/progress/${videoId}`, {
        headers: { 'user-id': userId },
    });
};

export const emitProgressUpdate = (data: { videoId: string; userId: string; progress: IProgress }) => {
    if (socket) {
        socket.emit('progress-update', data);
    }
}; 