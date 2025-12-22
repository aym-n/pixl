'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Hls from 'hls.js';

import { useAnalytics } from '@/hooks/useAnalytics';

interface Video {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

interface Quality {
  name: string;
  resolution: string;
  bandwidth: number;
}

export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoId = params.id as string;
  const { trackEvent } = useAnalytics(videoId);

  // Track when component mounts (view)
  useEffect(() => {
    trackEvent({ eventType: 'view' });
  }, [trackEvent]);

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  useEffect(() => {
    if (video && video.status === 'READY' && videoRef.current) {
      initializePlayer();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/videos/${videoId}`);
      const data = await response.json();
      setVideo(data);
    } catch (error) {
      console.error('Failed to fetch video:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePlayer = () => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;
    const hlsUrl = `http://localhost:8080/api/videos/${videoId}/stream/master.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualityLevels = data.levels.map((level: any, index: number) => ({
          name: getQualityName(level.height),
          resolution: `${level.width}x${level.height}`,
          bandwidth: level.bitrate,
          index: index,
        }));
        
        setQualities(qualityLevels);
      });

      // Track buffering
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === 'bufferStalledError') {
          trackEvent({
            eventType: 'buffer',
            videoTime: videoElement.currentTime,
            quality: currentQuality,
          });
        }
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl;
    }
  };

  const getQualityName = (height: number) => {
    if (height <= 360) return '360p';
    if (height <= 480) return '480p';
    if (height <= 720) return '720p';
    if (height <= 1080) return '1080p';
    return `${height}p`;
  };

  const changeQuality = (qualityIndex: number) => {
    if (!hlsRef.current) return;

    if (qualityIndex === -1) {
      hlsRef.current.currentLevel = -1;
      setCurrentQuality('auto');
    } else {
      hlsRef.current.currentLevel = qualityIndex;
      const newQuality = qualities[qualityIndex].name;
      setCurrentQuality(newQuality);
      
      // Track quality change
      trackEvent({
        eventType: 'quality_change',
        videoTime: videoRef.current?.currentTime || 0,
        quality: newQuality,
      });
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      
      // Track play
      trackEvent({
        eventType: 'play',
        videoTime: videoRef.current.currentTime,
        quality: currentQuality,
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      
      // Track pause
      trackEvent({
        eventType: 'pause',
        videoTime: videoRef.current.currentTime,
        quality: currentQuality,
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Track completion (90% watched)
      if (duration > 0 && videoRef.current.currentTime / duration > 0.9) {
        trackEvent({
          eventType: 'complete',
          videoTime: videoRef.current.currentTime,
          quality: currentQuality,
        });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      
      // Track seek
      trackEvent({
        eventType: 'seek',
        videoTime: time,
        quality: currentQuality,
      });
    }
  };

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  useEffect(() => {
    if (video && video.status === 'READY' && videoRef.current) {
      initializePlayer();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video]);




  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const vol = parseFloat(e.target.value);
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Video not found</div>
      </div>
    );
  }

  if (video.status !== 'READY') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Video is {video.status.toLowerCase()}</div>
          <button
            onClick={() => router.push('/videos')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="relative w-full max-w-6xl mx-auto">
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 mb-4 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
            }}
          />

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-blue-400">
                  {isMuted || volume === 0 ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {/* Playback Speed */}
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>

              {/* Quality Selector */}
              <select
                value={currentQuality}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'auto') {
                    changeQuality(-1);
                  } else {
                    const index = qualities.findIndex(q => q.name === value);
                    changeQuality(index);
                  }
                }}
                className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
              >
                <option value="auto">Auto</option>
                {qualities.map((quality, index) => (
                  <option key={index} value={quality.name}>
                    {quality.name}
                  </option>
                ))}
              </select>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-blue-400 transition"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-white text-3xl font-bold mb-2">{video.title}</h1>
        {video.description && (
          <p className="text-gray-400 mb-4">{video.description}</p>
        )}
        <div className="flex gap-4 text-sm text-gray-500">
          <span>📁 {video.originalFilename}</span>
          <span>💾 {(video.fileSize / 1024 / 1024).toFixed(2)} MB</span>
          <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
        </div>

        <button
          onClick={() => router.push('/videos')}
          className="mt-6 bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition"
        >
          ← Back to Videos
        </button>
      </div>
    </div>
  );
}