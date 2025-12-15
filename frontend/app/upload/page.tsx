'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, FileVideo, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadPage() {
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
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
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
      setStatus({ type: 'error', message: 'Please upload a valid video file.' });
      return;
    }
    setFile(file);
    setStatus({ type: null, message: '' });
  };

  const removeFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Main Upload Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setUploadedChunks(0);
    setStatus({ type: null, message: '' });

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

      setStatus({ type: 'success', message: `Video uploaded successfully! ID: ${video.id}` });
      
      // Reset
      setTitle('');
      setDescription('');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Error: ' + error });
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadedChunks(0);
      setTotalChunks(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">Upload Video</h1>
          <p className="text-gray-400 text-sm mt-1">Chunked upload enabled for large files</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Inputs */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
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

          {/* File Select */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Video File</label>
            
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
                  <p className="text-xs text-gray-500">Video files up to 10GB</p>
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

          {/* Progress Bar (Only visible when uploading) */}
          {uploading && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
               <div className="flex justify-between text-xs font-semibold text-gray-600">
                  <span>Uploading Chunk {uploadedChunks} of {totalChunks}</span>
                  <span>{progress.toFixed(0)}%</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full flex items-center justify-end"
                    style={{ width: `${progress}%` }}
                  >
                  </div>
               </div>
            </div>
          )}

          {/* Status Message */}
          {status.message && (
            <div className={`flex items-center gap-2 p-4 rounded-lg text-sm ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file}
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
  );
}