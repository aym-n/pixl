'use client';
import { Download, Play, MoreVertical, BarChart3, ExternalLink, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

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

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) {
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

type VideoCardProps = {
    id: string;
    title: string;
    uploadDate: string;
    fileSize: number;
    status: string;
    description?: string;
    duration: number;
    views?: number;
};

export default function VideoCard({ id, title, uploadDate, fileSize, status, description, duration, views }: VideoCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const isReady = status === 'READY';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCardClick = () => {
        router.push(`/videos/${id}`);
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuItemClick = (e: React.MouseEvent, action: string) => {
        e.stopPropagation();
        setIsMenuOpen(false);

        if (action === 'download') {
            router.push(`http://localhost:8080/api/videos/${id}/download`);
        } else if (action === 'analytics') {
            router.push(`/analytics/video/${id}`);
        }
    };

    return (
        <div
            className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl cursor-pointer group hover:bg-gray-700/60 transition-all duration-200 border border-gray-700/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10"
        >
            {/* Thumbnail */}
            <div
                className="relative w-full bg-black rounded-t-xl overflow-hidden"
                style={{ aspectRatio: '16/9' }}
                onClick={handleCardClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <img
                    src={`http://localhost:8080/api/videos/${id}/thumbnail`}
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
                />

                <div
                    className={` absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'bg-black/50' : 'opacity-0 '} `}
                >
                    <div className="rounded-full p-3 transition-all border-5 border-white hover:border-white hover:scale-110">
                        <Play className="w-10 h-10 text-white fill-white" />
                    </div>
                </div>


                <div className="absolute bottom-2 right-2 bg-black bg-opacity-90 text-white text-xs font-semibold px-2 py-1 rounded">
                    {formatDuration(duration)}
                </div>

                <div className={`mt-2 ml-2 relative inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border shadow-lg transition-all duration-300 ${isReady ? "bg-green-900/50 border-green-100/10" : "bg-yellow-900/50 border-yellow-100/10"}`} >
                    <span
                        className={`w-2 h-2 rounded-full animate-pulse ${isReady ? "bg-green-400" : "bg-yellow-400"
                            }`}
                    />
                    <span className="text-xs text-white">
                        {isReady ? "Now Available" : "Under Processing"}
                    </span>
                </div>


            </div>

            {/* Video Info */}
            <div className="p-3">
                <div className="flex gap-3">
                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-white line-clamp-2 mb-1 leading-snug">
                            {title}
                        </h3>

                        {description && (
                            <p className="text-xs text-gray-400 line-clamp-1 mb-2">
                                {description}
                            </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{views !== undefined ? `${views.toLocaleString()} views` : '0 views'}</span>
                            <span>•</span>
                            <span>{formatDate(uploadDate)}</span>
                            <span>•</span>
                            <span>{formatFileSize(fileSize)}</span>
                        </div>
                    </div>

                    {/* Three Dot Menu */}
                    <div className="relative flex-shrink-0 z-50" ref={menuRef}>
                        <button
                            onClick={handleMenuClick}
                            className="p-1 hover:bg-gray-600/50 rounded-full transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-300" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 bottom-8 w-48 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 py-2 z-[100]">
                                <button
                                    onClick={(e) => handleMenuItemClick(e, 'download')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                                <button
                                    onClick={(e) => handleMenuItemClick(e, 'analytics')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    View Analytics
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(false);
                                        window.open(`/videos/${id}`, '_blank');
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open in New Tab
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}