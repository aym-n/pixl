import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';

export default function Home() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        <Header />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8 group hover:bg-white/10 transition-all duration-300 cursor-pointer">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-slate-300">Now available worldwide</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 max-w-5xl leading-tight">
            Build something
            <span className="block bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              amazing.
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            The ultimate video platform to upload, transcode, and stream your videos with ease.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105"
            >
              <Link href="upload" className="flex items-center gap-2 text-white">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg rounded-full bg-white/5 backdrop-blur-sm border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <Link href="/videos" className="flex items-center gap-2 text-white">
                Video Library
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-8 mt-16 text-sm">
            <div className="text-slate-400">
              <span className="text-2xl font-bold text-white block">50K+</span>
              Active users
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="text-slate-400">
              <span className="text-2xl font-bold text-white block">4.9★</span>
              Rating
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="text-slate-400">
              <span className="text-2xl font-bold text-white block">99.9%</span>
              Uptime
            </div>
          </div>
        </div>

        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>
    </>
  );
}