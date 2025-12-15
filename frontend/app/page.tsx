import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Video Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload, transcode, and stream videos
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/upload"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            Upload Video
          </Link>
          <Link
            href="/videos"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
          >
            My Videos
          </Link>
        </div>
      </div>
    </div>
  );
}