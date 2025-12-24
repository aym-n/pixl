'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileVideo, Plus, Film, Loader2, ArrowUpRightIcon } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/header';
import VideoCard from '@/components/ui/VideoCard';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium">Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <Header />

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 mt-32 mb-16 w-full h-full relative justify-center items-center">

        <div className="rounded-2xl p-3 min-h-[400px] w-full h-full relative justify-center items-center ">
          {videos.length === 0 ? (
            <Empty className="py-20 px-6 text-center bg-white border border-white/10 rounded-2xl max-w-lg mx-auto">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Film className="w-16 h-16 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No Videos Yet</EmptyTitle>
                <EmptyDescription>
                  You haven&apos;t uploaded any videos yet. Get started by uploading
                  your first video.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Link href="/upload">
                    <Button className="inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Upload Video
                    </Button>
                  </Link>
                </div>
              </EmptyContent>
            </Empty>
          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  uploadDate={video.createdAt}
                  fileSize={video.fileSize}
                  status={video.status}
                  description={video.description}
                  views={100}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}