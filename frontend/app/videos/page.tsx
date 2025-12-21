'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileVideo, HardDrive, Calendar, Download, Plus, Film, Loader2, PlayCircle } from 'lucide-react';

import { useRouter } from 'next/navigation';

interface Video {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  thumbnailPath: string | null;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/videos');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium">Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Header - Matching UploadPage Style */}
        <div className="bg-gray-900 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Film className="text-blue-500" /> My Video Library
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage and download your uploaded content</p>
          </div>

          <Link
            href="/upload"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <Plus size={18} />
            Upload New
          </Link>
        </div>

        {/* Content Area */}
        <div className="p-8 bg-gray-50/50 min-h-[400px]">
          {videos.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-white text-center p-8">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <FileVideo className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No videos yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm">Upload your first video to see it appear here in your library.</p>
              <Link
                href="/upload"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-2"
              >
                Start Uploading <Plus size={16} />
              </Link>
            </div>
          ) : (
            // Video Grid
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center gap-5"
                >
                  {/* Icon / Thumbnail Placeholder */}
                  <div className="flex-shrink-0 w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-200">
                      {video.thumbnailPath ? (
                        <img
                          src={`http://localhost:8080/api/videos/${video.id}/thumbnail`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate pr-4">{video.title}</h3>
                      <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${video.status === 'READY'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                        {video.status}
                      </span>
                    </div>

                    {video.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-1">{video.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-400">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <FileVideo size={14} className="text-gray-500" />
                        <span className="truncate max-w-[150px]">{video.originalFilename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <HardDrive size={14} className="text-gray-500" />
                        <span>{formatFileSize(video.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <Calendar size={14} className="text-gray-500" />
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 pt-4 md:pt-0">
                    <a
                      href={`http://localhost:8080/api/videos/${video.id}/download`}
                      download
                      className="flex items-center justify-center gap-2 w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  </div>

                  <button
                    onClick={() => router.push(`/videos/${video.id}`)}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition text-sm"
                  >
                    {video.status === 'READY' ? 'Watch' : 'Details'}
                  </button>

                  {video.status === 'PROCESSING' && (
                    <Link
                      href={`/upload/progress/${video.id}`}
                      className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-md hover:bg-yellow-700 transition text-sm text-center"
                    >
                      View Progress
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}