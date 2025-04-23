import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
    console.log('Starting Request:', {
        url: request.url || '',
        method: request.method,
        headers: request.headers,
        baseURL: request.baseURL || '',
        fullUrl: `${request.baseURL || ''}${request.url || ''}`
    });
    return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
    response => {
        console.log('Response:', response);
        return response;
    },
    error => {
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data
        });
        return Promise.reject(error);
    }
);

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
            withCredentials: true,
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket?.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
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