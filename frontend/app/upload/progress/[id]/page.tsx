'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  ArrowLeft, 
  Activity, 
  Layers, 
  Cpu, 
  ChevronRight 
} from 'lucide-react';

import { Header } from '@/components/ui/header';

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
    const socket = new SockJS('http://localhost:8080/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
    });

    stompClient.onConnect = () => {
      stompClient.subscribe(`/topic/video/${videoId}`, (message) => {
        const update: ProgressUpdate = JSON.parse(message.body);
        setUpdates((prev) => [update, ...prev]); // Newest first
        setCurrentStatus(update.status);

        if (update.progress !== null) setOverallProgress(update.progress);
        if (update.transcodeProgress) {
          setTranscodeProgress(update.transcodeProgress);
          setOverallProgress(update.transcodeProgress.overallProgress);
        }
        if (update.status === 'READY') setIsComplete(true);
      });
    };

    stompClient.activate();
    return () => { stompClient.deactivate(); };
  }, [videoId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPLOADING': return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      case 'TRANSCODING': return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
      case 'GENERATING_HLS': return 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
      case 'READY': return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'FAILED': return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden text-slate-200">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <Header />

      <main className="max-w-4xl mx-auto px-4 mt-32 mb-16 relative z-10">
        <button onClick={() => router.push('/videos')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group text-sm">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </button>

        {/* Status Hero Card */}
        <div className="bg-slate-900/50 border border-white/10 backdrop-blur-md rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Live Processing
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {isComplete ? 'Processing Complete' : 'Optimizing Video'}
              </h1>
              <p className="text-slate-400 font-mono text-sm">{videoId}</p>
            </div>

            {isComplete ? (
              <button
                onClick={() => router.push(`/videos/${videoId}`)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
              >
                <Play fill="currentColor" size={20} /> Watch Video
              </button>
            ) : (
              <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-slate-400 text-xs mb-1 uppercase font-bold tracking-tighter">Current Phase</div>
                <div className="text-white font-semibold flex items-center gap-2">
                   <Loader2 className="animate-spin text-blue-400" size={16} />
                   {currentStatus.replace(/_/g, ' ')}
                </div>
              </div>
            )}
          </div>

          {/* Large Progress Bar */}
          {!isComplete && (
            <div className="mt-10">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400 font-medium">Pipeline Progress</span>
                <span className="text-white font-bold">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/5">
                <div
                  className={`h-full ${getStatusColor(currentStatus)} transition-all duration-700 ease-out`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Quality Grid */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Layers size={20} className="text-purple-400" /> Transcoding Mesh
            </h3>
            {transcodeProgress?.qualities.map((quality, index) => (
              <div key={index} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-slate-900/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl bg-slate-950 border border-white/5 ${quality.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {quality.status === 'COMPLETED' ? <CheckCircle2 size={20} /> : 
                     quality.status === 'PROCESSING' ? <Loader2 size={20} className="animate-spin text-blue-400" /> : 
                     <Activity size={20} />}
                  </div>
                  <div>
                    <div className="text-white font-bold">{quality.quality}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter">{quality.status}</div>
                  </div>
                </div>
                {quality.workerId && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 bg-black/20 px-2 py-1 rounded-md">
                    <Cpu size={10} /> {quality.workerId.substring(0, 8)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mini Activity Log */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Activity size={20} className="text-blue-400" /> System Events
            </h3>
            <div className="bg-slate-950/50 border border-white/5 rounded-3xl p-2 h-[400px] overflow-hidden relative">
              <div className="h-full overflow-y-auto space-y-1 p-2 custom-scrollbar">
                {updates.map((update, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                    <div className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${update.status === 'FAILED' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                    <div>
                      <div className="text-xs text-slate-200 leading-relaxed font-medium">{update.message}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{new Date(update.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}