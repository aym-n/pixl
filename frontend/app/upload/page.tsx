'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, FileVideo, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/header';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadPage() {
  const router = useRouter();
  // UI State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Helper: Slice file into chunks
  const chunkFile = (file: File): Blob[] => {
    const chunks: Blob[] = [];
    let start = 0;
    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }
    return chunks;
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const validateAndSetFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a valid video file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024 * 1024) {
      toast.error('File size exceeds 5GB limit.');
      return;
    }

    setFile(file);
  };

  const removeFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    toast.success('File removed successfully.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file){
      toast.error('No file selected for upload.');
      return;
    } 

    if(!title.trim()){
      toast.error('Please provide a title for the video.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadedChunks(0);

    try {
      // Step 1: Initiate
      const initiateResponse = await fetch('http://localhost:8080/api/videos/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          title,
          description,
        }),
      });

      if (!initiateResponse.ok) throw new Error('Failed to initiate upload');
      const { uploadId, totalChunks: total } = await initiateResponse.json();
      setTotalChunks(total);

      // Step 2: Chunk & Upload
      const chunks = chunkFile(file);

      for (let i = 0; i < chunks.length; i++) {
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkNumber', i.toString());
        formData.append('chunk', chunks[i]);

        const chunkResponse = await fetch('http://localhost:8080/api/videos/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!chunkResponse.ok) throw new Error(`Failed to upload chunk ${i}`);

        // Update Progress
        const progressData = await chunkResponse.json();
        setUploadedChunks(progressData.uploadedChunks);
        setProgress(progressData.progress);
      }

      // Step 3: Complete
      const completeResponse = await fetch(`http://localhost:8080/api/videos/upload/complete?uploadId=${uploadId}`, {
        method: 'POST'
      });

      if (!completeResponse.ok) throw new Error('Failed to complete upload');
      const video = await completeResponse.json();
      router.push(`/upload/progress/${video.id}`);

      toast.success('Upload completed successfully!');

      // Reset
      setTitle('');
      setDescription('');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';



    } catch (error) {
      console.error(error);
      toast.error("Oops! Upload failed " + (error instanceof Error ? `: ${error.message}` : ''));
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadedChunks(0);
      setTotalChunks(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      <Header />

      <div className="h-screen flex items-center justify-center z-10 relative py-20 px-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gray-900 px-8 py-3">
            <h1 className="text-2xl font-bold text-white">Upload Video</h1>
            <p className="text-gray-400 text-sm mt-1">Select and upload your video files</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-3">
            {/* Inputs */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
                className="w-full px-4 py-3 text-gray-500 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none disabled:bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={uploading}
                className="w-full px-4 py-3 text-gray-500 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none disabled:bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Video</label>

              {!file ? (
                <div
                  className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-gray-50
                  ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className={`w-10 h-10 mb-3 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">Video files up to 5GB</p>
                  </div>
                  <input ref={inputRef} type="file" className="hidden" accept="video/*" onChange={handleChange} />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FileVideo size={24} /></div>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium text-blue-900 truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-blue-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                  {!uploading && (
                    <button type="button" onClick={removeFile} className="p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between text-xs font-semibold text-gray-600">
                  <span>Uploading Chunk {uploadedChunks} of {totalChunks}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="w-full bg-gray-200 border border-gray-300 rounded-full" ></Progress>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-white font-medium transition-all
              ${uploading || !file
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 active:scale-[0.99]'
                }`}
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : 'Upload Video'}
            </button>
          </form>
        </div>

      </div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
    </div>
  );
}