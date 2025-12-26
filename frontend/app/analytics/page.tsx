'use client';

import { useEffect, useState } from 'react';
import { Loader2, Eye, Clock, Activity, BarChart3, TrendingUp } from 'lucide-react';

import { Header } from '@/components/ui/header';
import VideoCard from '@/components/ui/VideoCard';

interface Video {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  viewsCount: number | null;
  durationSeconds: number;
  thumbnailPath?: string | null;
}

interface DashboardData {
  totalViews: number;
  topVideos: Array<{
    videoId: string;
    views: number;
    uniqueViewers: number;
  }>;
  realtimeStats: {
    viewsLastHour: number;
    activeSessions: number;
    eventsToday: number;
  };
}

export default function AnalyticsDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Fetch both analytics and the full video list
        const [dashRes, videoRes] = await Promise.all([
          fetch('http://localhost:8080/api/analytics/dashboard'),
          fetch('http://localhost:8080/api/videos')
        ]);
        
        const dashData = await dashRes.json();
        const videoData = await videoRes.json();
        
        setDashboard(dashData);
        setVideos(videoData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to find video metadata for a specific ranked video ID
  const getFullVideoDetails = (videoId: string) => {
    return videos.find(v => v.id === videoId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium text-slate-400">Loading platform data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden text-slate-200">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 mb-16 relative z-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Platform Insights
          </h1>
          <p className="text-slate-400 mt-2">Real-time engagement and top-performing content</p>
        </div>

        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <StatCard title="Total Views" value={dashboard?.totalViews.toLocaleString() ?? '0'} icon={<Eye size={20} />} borderColor="border-blue-500/30" iconColor="text-blue-400" />
          <StatCard title="Last Hour" value={dashboard?.realtimeStats.viewsLastHour.toLocaleString() ?? '0'} icon={<Clock size={20} />} borderColor="border-emerald-500/30" iconColor="text-emerald-400" />
          <StatCard title="Active Now" value={dashboard?.realtimeStats.activeSessions.toLocaleString() ?? '0'} icon={<Activity size={20} />} borderColor="border-rose-500/30" iconColor="text-rose-400" />
          <StatCard title="Total Events" value={dashboard?.realtimeStats.eventsToday.toLocaleString() ?? '0'} icon={<BarChart3 size={20} />} borderColor="border-purple-500/30" iconColor="text-purple-400" />
        </div>

        {/* Top Videos using VideoCard Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Top Performing Content</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard?.topVideos.map((stat, index) => {
              const videoDetails = getFullVideoDetails(stat.videoId);
              
              if (!videoDetails) return null;

              return (
                <div key={stat.videoId} className="relative group">
                  {/* Rank Badge Overlay */}
                  <div className="absolute -top-3 -left-3 z-20 w-10 h-10 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>

                  {/* The Original VideoCard Component */}
                  <VideoCard
                    id={videoDetails.id}
                    title={videoDetails.title}
                    uploadDate={videoDetails.createdAt}
                    fileSize={videoDetails.fileSize}
                    status={videoDetails.status}
                    description={videoDetails.description}
                    views={stat.views}
                    duration={videoDetails.durationSeconds}
                  />
                  
                  {/* Secondary Stat Footer for Analytics Context */}
                  <div className="mt-2 px-2 flex justify-between text-xs text-slate-500">
                    <span>ID: {stat.videoId}</span>
                    <span className="text-blue-400 font-medium">{stat.uniqueViewers.toLocaleString()} unique viewers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
           <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live dashboard updates every 30s
        </div>
      </main>
    </div>
  );
}

// Reusable StatCard
function StatCard({ title, value, icon, borderColor, iconColor }: any) {
  return (
    <div className={`bg-slate-900/40 border ${borderColor} backdrop-blur-sm rounded-2xl p-5 transition-all hover:bg-slate-900/60`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className={`${iconColor} bg-white/5 p-2 rounded-lg`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}