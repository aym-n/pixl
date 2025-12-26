'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, ArrowLeft, BarChart3, PieChart as PieIcon, PlayCircle, Clock, CheckCircle2, Percent } from 'lucide-react';

import { Header } from '@/components/ui/header';
import VideoCard from '@/components/ui/VideoCard';

// Helper for human-readable time
const formatDuration = (seconds: number) => {
  if (seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
};

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  fileSize: number;
  status: string;
  createdAt: string;
  durationSeconds: number;
  viewsCount: number | null;
}

interface VideoAnalytics {
  videoId: string;
  views: number;
  watchStats: {
    totalPlays: number;
    avgWatchTime: number;
    completions: number;
    completionRate: number;
  };
  qualityDistribution: Array<{
    quality: string;
    count: number;
  }>;
  viewsOverTime: Array<{
    date: string;
    views: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function VideoAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [analyticsRes, videoRes] = await Promise.all([
          fetch(`http://localhost:8080/api/analytics/videos/${videoId}`),
          fetch(`http://localhost:8080/api/videos/${videoId}`)
        ]);
        
        const analyticsData = await analyticsRes.json();
        const videoData = await videoRes.json();
        
        setAnalytics(analyticsData);
        setVideo(videoData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium text-slate-400">Analyzing video performance...</p>
      </div>
    );
  }

  if (!analytics || !video) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 mb-16 relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Video Context</h2>
            <VideoCard
              id={video.id}
              title={video.title}
              uploadDate={video.createdAt}
              fileSize={video.fileSize}
              status={video.status}
              description={video.description}
              views={analytics.views}
              duration={video.durationSeconds}
            />
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatDetailCard 
                label="Total Plays" 
                value={analytics.watchStats.totalPlays.toLocaleString()} 
                icon={<PlayCircle className="text-blue-400" />} 
            />
            <StatDetailCard 
                label="Avg. Watch Time" 
                value={formatDuration(analytics.watchStats.avgWatchTime)} 
                icon={<Clock className="text-emerald-400" />} 
            />
            <StatDetailCard 
                label="Completions" 
                value={analytics.watchStats.completions.toLocaleString()} 
                icon={<CheckCircle2 className="text-purple-400" />} 
            />
            <StatDetailCard 
                label="Completion Rate" 
                value={`${analytics.watchStats.completionRate.toFixed(1)}%`} 
                icon={<Percent className="text-rose-400" />} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 border border-white/10 backdrop-blur-md rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-blue-400" size={20} />
              <h3 className="text-lg font-bold text-white">Views Over Time</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.viewsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 backdrop-blur-md rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="text-purple-400" size={20} />
              <h3 className="text-lg font-bold text-white">Quality Distribution</h3>
            </div>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.qualityDistribution}
                    dataKey="count"
                    nameKey="quality"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    stroke="none"
                  >
                    {analytics.qualityDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                    ))}
                  </Pie>
                  {/* Fixed Tooltip Visibility */}
                  <Tooltip 
                     wrapperStyle={{ zIndex: 100 }}
                     contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '12px',
                        color: '#f8fafc' 
                     }}
                     itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatDetailCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between hover:bg-white/10 transition-colors">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
      <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
        {icon}
      </div>
    </div>
  );
}