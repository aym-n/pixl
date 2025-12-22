'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/analytics/dashboard');
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights into your video platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Views"
            value={dashboard.totalViews.toLocaleString()}
            icon="👁️"
            color="bg-blue-500"
          />
          <StatCard
            title="Views (Last Hour)"
            value={dashboard.realtimeStats.viewsLastHour.toLocaleString()}
            icon="⏱️"
            color="bg-green-500"
          />
          <StatCard
            title="Active Sessions"
            value={dashboard.realtimeStats.activeSessions.toLocaleString()}
            icon="🔴"
            color="bg-red-500"
          />
          <StatCard
            title="Events Today"
            value={dashboard.realtimeStats.eventsToday.toLocaleString()}
            icon="📊"
            color="bg-purple-500"
          />
        </div>

        {/* Top Videos */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Top Videos by Views</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Video ID</th>
                  <th className="text-right py-3 px-4">Views</th>
                  <th className="text-right py-3 px-4">Unique Viewers</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topVideos.map((video, index) => (
                  <tr key={video.videoId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200'
                      } font-bold`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{video.videoId}</td>
                    <td className="py-3 px-4 text-right font-semibold">{video.views.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{video.uniqueViewers.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      
                      <a  href={`/analytics/video/${video.videoId}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Info */}
        <div className="text-center text-sm text-gray-500">
          Dashboard auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm font-medium">{title}</span>
        <span className={`${color} text-white w-10 h-10 rounded-full flex items-center justify-center text-xl`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}