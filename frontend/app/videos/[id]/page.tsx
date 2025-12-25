'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight, MoreVertical, Download, BarChart3, Eye, Calendar, FileText, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/hooks/useAnalytics';

interface Video {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  viewsCount: number | null;
  thumbnailPath?: string;
}

interface Quality {
  name: string;
  index: number;
}

export default function VideoPlayerPage() {
  const { id } = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const { trackEvent } = useAnalytics(id as string);

  useEffect(() => {
    trackEvent({ eventType: 'view' });
  }, [trackEvent]);


  useEffect(() => {
    fetch(`http://localhost:8080/api/videos/${id}`)
      .then(res => res.json())
      .then(data => {
        console.log('Fetched video data:', data);
        setVideo(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!video || video.status !== 'READY' || !videoRef.current) return;

    const videoEl = videoRef.current;
    const hlsUrl = `http://localhost:8080/api/videos/${id}/stream/master.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(
          data.levels.map((l: any, i: number) => ({
            name: `${l.height}p`,
            index: i,
          }))
        );
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.details === 'bufferStalledError') {
          setBuffering(true);
          trackEvent({
            eventType: 'buffer',
            videoTime: videoEl.currentTime,
            quality: currentQuality,
          });
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setBuffering(false);
      });
    } else {
      videoEl.src = hlsUrl;
    }

    return () => hlsRef.current?.destroy();
  }, [video, id]);

  const changeQuality = (qualityIndex: number) => {
    if (!hlsRef.current) return;

    if (qualityIndex === -1) {
      hlsRef.current.currentLevel = -1;
      setCurrentQuality('auto');
    } else {
      hlsRef.current.currentLevel = qualityIndex;
      const newQuality = qualities[qualityIndex].name;
      setCurrentQuality(newQuality);

      trackEvent({
        eventType: 'quality_change',
        videoTime: videoRef.current?.currentTime || 0,
        quality: newQuality,
      });
    }
    setShowSettings(false);
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSettings(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);

      trackEvent({
        eventType: 'play',
        videoTime: videoRef.current.currentTime,
        quality: currentQuality,
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);

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

      trackEvent({
        eventType: 'seek',
        videoTime: time,
        quality: currentQuality,
      });
    }
  };

  const skipPercentage = (percent: number) => {
    if (videoRef.current && duration > 0) {
      const skipAmount = duration * (percent / 100);
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + skipAmount));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

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
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    window.open(`http://localhost:8080/api/videos/${id}/download`, '_blank');
    setShowMoreMenu(false);
  };

  const handleShowAnalytics = () => {
    router.push(`/analytics/${id}`);
    setShowMoreMenu(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isHovering) {
          setShowControls(false);
        }
      }, 3000);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="text-white text-xl">Loading video...</div>
        </div>
      </div>
    );
  }

  if (!video || video.status !== 'READY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Video unavailable</div>
          <Button onClick={() => router.push('/videos')} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
            Back to Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3">
      <div
        ref={containerRef}
        className="relative w-full bg-black group rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          if (isPlaying) setShowControls(false);
        }}
      >
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          poster={video.thumbnailPath}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'} pointer-events-none z-10`}>
          <div className="flex items-center justify-between p-6 pointer-events-auto">
            <Button
              onClick={() => router.push('/videos')}
              className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </Button>
            <div className="text-white text-lg font-semibold">{video.title}</div>

            <div className="w-20"></div>

          </div>
        </div>

        {!isPlaying && !buffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              onClick={togglePlay}
              className="w-24 h-24 flex items-center justify-center rounded-full backdrop-blur-md border-5 border-white hover:scale-110 transition-all duration-300"
            >
              <Play className="w-10 h-10 text-white fill-white" />
            </button>
          </div>
        )}

        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>

          <div className="px-6 pt-3 pointer-events-auto">
            <div className="relative group/progress">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 appearance-none bg-transparent cursor-pointer relative z-10 opacity-0"
                style={{
                  background: 'transparent',
                }}
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/30 rounded-full pointer-events-none">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 pointer-events-none ease-in-out"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 pb-4 pt-2 pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:scale-110 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="white" />
                ) : (
                  <Play className="w-8 h-8" fill="white" />
                )}
              </button>

              <button
                onClick={() => skipPercentage(-1)}
                className="text-white hover:scale-110 transition-transform"
                title="Rewind 1%"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              <button
                onClick={() => skipPercentage(1)}
                className="text-white hover:scale-110 transition-transform"
                title="Forward 1%"
              >
                <ChevronRight className="w-7 h-7" />
              </button>

              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="text-white hover:scale-110 transition-transform">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="accent-cyan-500 w-0 group-hover/volume:w-20 opacity-0 group-hover/volume:opacity-100 h-1 transition-all duration-300 cursor-pointer appearance-none bg-white/30 rounded-full"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
              </div>

              <span className="text-white text-sm font-medium ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMoreMenu(!showMoreMenu)
                    setShowSettings(false)
                  }}
                  className="text-white hover:scale-110 transition-transform"
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {showMoreMenu && (
                  <div className="absolute bottom-12 right-0 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg p-2 min-w-[200px]">
                    <button
                      onClick={handleDownload}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={handleShowAnalytics}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettings(!showSettings)
                    setShowMoreMenu(false)
                  }}
                  className="text-white hover:scale-110 transition-transform"
                >
                  <Settings className="w-6 h-6" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-12 right-0 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg p-2 min-w-[180px]">
                    <div className="text-white text-sm font-semibold px-3 py-2 border-b border-white/10">
                      Quality
                    </div>
                    <button
                      onClick={() => changeQuality(-1)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded ${currentQuality === 'auto' ? 'text-blue-400' : 'text-white'}`}
                    >
                      Auto {currentQuality === 'auto' && '✓'}
                    </button>
                    {qualities.map((quality) => (
                      <button
                        key={quality.index}
                        onClick={() => changeQuality(quality.index)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded ${currentQuality === quality.name ? 'text-blue-400' : 'text-white'}`}
                      >
                        {quality.name} {currentQuality === quality.name && '✓'}
                      </button>
                    ))}

                    <div className="text-white text-sm font-semibold px-3 py-2 border-t border-b border-white/10 mt-2">
                      Speed
                    </div>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded ${playbackRate === rate ? 'text-blue-400' : 'text-white'}`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`} {playbackRate === rate && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:scale-110 transition-transform"
                >
                  <Maximize className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">

          <div className="p-6 border-b border-white/10">
            <h1 className="text-white text-2xl font-bold mb-4">{video.title}</h1>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-slate-300">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">{video.viewsCount ? video.viewsCount.toLocaleString() : 0} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(video.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-full hover:text-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={handleShowAnalytics}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-blue-300 rounded-full"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div
              className={`bg-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors ${showDescription ? '' : 'max-h-24 overflow-hidden relative'
                }`}
              onClick={() => setShowDescription(!showDescription)}
            >
              {video.description ? (
                <p className={`text-slate-300 leading-relaxed whitespace-pre-wrap ${showDescription ? '' : 'line-clamp-2'}`}>
                  {video.description}
                </p>
              ) : (
                <p className="text-slate-500 italic">No description</p>
              )}

              {!showDescription && video.description && video.description.length > 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/5 to-transparent flex items-end justify-center pb-2">
                  <span className="text-white text-sm font-medium">Show more</span>
                </div>
              )}

              {showDescription && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-slate-300">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-xs text-slate-500">Filename</div>
                        <div className="font-medium">{video.originalFilename}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <HardDrive className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-xs text-slate-500">File Size</div>
                        <div className="font-medium">{(video.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="mt-4 text-white text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(false);
                    }}
                  >
                    Show less
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}