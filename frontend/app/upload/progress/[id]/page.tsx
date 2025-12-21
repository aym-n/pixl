'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

interface ProgressUpdate {
  videoId: string;
  status: string;
  message: string;
  progress: number | null;
  transcodeProgress: TranscodeProgress | null;
  timestamp: string;
}

interface TranscodeProgress {
  qualities: QualityProgress[];
  completedCount: number;
  totalCount: number;
  overallProgress: number;
}

interface QualityProgress {
  quality: string;
  status: string;
  progress: number | null;
  workerId: string | null;
}

export default function UploadProgressPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('UPLOADING');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [transcodeProgress, setTranscodeProgress] = useState<TranscodeProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Create WebSocket connection
    const socket = new SockJS('http://localhost:8080/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      debug: (str) => {
        console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
    });

    stompClient.onConnect = () => {
      console.log('✅ WebSocket connected');

      // Subscribe to video-specific progress
      stompClient.subscribe(`/topic/video/${videoId}`, (message) => {
        const update: ProgressUpdate = JSON.parse(message.body);
        console.log('📡 Progress update:', update);

        setUpdates((prev) => [...prev, update]);
        setCurrentStatus(update.status);

        if (update.progress !== null) {
          setOverallProgress(update.progress);
        }

        if (update.transcodeProgress) {
          setTranscodeProgress(update.transcodeProgress);
          setOverallProgress(update.transcodeProgress.overallProgress);
        }

        // Check if complete
        if (update.status === 'READY') {
          setIsComplete(true);
        }
      });
    };

    stompClient.onStompError = (frame) => {
      console.error('STOMP error:', frame);
    };

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [videoId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPLOADING':
        return 'bg-blue-500';
      case 'TRANSCODING':
        return 'bg-yellow-500';
      case 'GENERATING_HLS':
        return 'bg-purple-500';
      case 'READY':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'text-gray-500';
      case 'PROCESSING':
        return 'text-yellow-500';
      case 'COMPLETED':
        return 'text-green-500';
      case 'FAILED':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return '⏳';
      case 'PROCESSING':
        return '🔄';
      case 'COMPLETED':
        return '✅';
      case 'FAILED':
        return '❌';
      default:
        return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Processing Video</h1>
          <p className="text-gray-600">Video ID: {videoId}</p>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Status</h2>
              <p className={`text-lg font-medium ${
                isComplete ? 'text-green-600' : 'text-blue-600'
              }`}>
                {currentStatus.replace(/_/g, ' ')}
              </p>
            </div>
            {isComplete && (
              <button
                onClick={() => router.push(`/videos/${videoId}`)}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition font-semibold"
              >
                Watch Now 🎥
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {!isComplete && overallProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${getStatusColor(currentStatus)} transition-all duration-500`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Transcode Progress */}
        {transcodeProgress && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Transcoding Progress</h2>
            <div className="space-y-3">
              {transcodeProgress.qualities.map((quality, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getStatusIcon(quality.status)}
                    </span>
                    <div>
                      <div className="font-semibold">{quality.quality}</div>
                      <div className={`text-sm ${getQualityStatusColor(quality.status)}`}>
                        {quality.status}
                      </div>
                      {quality.workerId && (
                        <div className="text-xs text-gray-500">
                          Worker: {quality.workerId.substring(0, 8)}
                        </div>
                      )}
                    </div>
                  </div>
                  {quality.status === 'PROCESSING' && (
                    <div className="animate-spin text-2xl">🔄</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Completed: {transcodeProgress.completedCount} / {transcodeProgress.totalCount}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {updates.map((update, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded text-sm"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 ${getStatusColor(update.status)}`} />
                <div className="flex-1">
                  <div className="font-medium">{update.message}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/videos')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Videos
          </button>
        </div>
      </div>
    </div>
  );
}