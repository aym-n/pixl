'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [videoId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/analytics/videos/${videoId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  if (!analytics) {
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
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Video Analytics</h1>
          <p className="text-gray-600 font-mono">{videoId}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Total Plays</h2>
                <p className="text-3xl font-bold text-gray-900">{analytics.watchStats.totalPlays.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Avg. Watch Time</h2>
                <p className="text-3xl font-bold text-gray-900">{(analytics.watchStats.avgWatchTime / 60).toFixed(2)} mins</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Completions</h2>
                <p className="text-3xl font-bold text-gray-900">{analytics.watchStats.completions.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Completion Rate</h2>
                <p className="text-3xl font-bold text-gray-900">{analytics.watchStats.completionRate.toFixed(2)}%</p>
            </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Views Over Time Line Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Views Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Distribution Pie Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quality Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.qualityDistribution}
                  dataKey="count"
                  nameKey="quality"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {analytics.qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}