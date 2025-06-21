// Install dependencies first:
// npm install react-player

import React, { useRef, useState, useEffect } from "react";
import ReactPlayer from "react-player";
import axios from "axios";

function Editor() {
  const playerRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime?.();
        if (time) setCurrentTime(time);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    try {
      setLoading(true);
      const { data } = await axios.post("https://decoupleservergit-1.onrender.com/upload", formData);
      setVideoUrl(data.url);
      setVideoFile(data.filename);
    } catch (error) {
      alert("Upload failed.");
      console.log(error)
    } finally {
      setLoading(false);
    }
  };

  const addClip = () => {
    if (start >= end) {
      alert("Start time must be less than end time.");
      return;
    }
    setClips([...clips, { start, end }]);
    setStart(0);
    setEnd(0);
  };

  const exportClips = async () => {
    if (!videoFile || clips.length === 0) {
      alert("Upload a video and add clips.");
      return;
    }
    try {
      setExporting(true);
      await axios.post("https://decoupleservergit-1.onrender.com/export", {
        filename: videoFile,
        clips,
      });
      alert("Exported successfully!");
    } catch (error) {
      alert("Export failed.");
      console.log(error)
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Video Editor</h2>

      <input type="file" accept="video/mp4" onChange={handleUpload} className="mb-4 text-white" />
      {loading && <p className="text-yellow-400">Uploading video...</p>}

      {videoUrl && (
        <>
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            controls
            width="100%"
            height="360px"
            className="my-4"
          />

          <div className="mt-6 bg-gray-800 rounded p-4 relative overflow-x-auto">
            <div className="flex items-center space-x-2 text-sm text-white">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-[100px] text-center">
                  {new Date(i * 1000).toISOString().substr(14, 5)}
                </div>
              ))}
            </div>
            <div className="relative mt-2 h-20 bg-black flex items-center">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-[100px] h-full border-r border-gray-700 bg-gradient-to-r from-gray-700 to-gray-900" />
              ))}

              {clips.map((clip, idx) => {
                const width = (clip.end - clip.start) * 10;
                const left = clip.start * 10;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 h-full bg-blue-500 bg-opacity-50 border border-blue-400 rounded"
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <div className="text-xs text-white text-center pt-2">
                      {clip.start}s - {clip.end}s
                    </div>
                  </div>
                );
              })}

              <div
                className="absolute top-0 w-[2px] h-full bg-white z-50"
                style={{ left: `${currentTime * 10}px` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 my-4">
            <input
              type="number"
              placeholder="Start (sec)"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded text-white"
            />
            <input
              type="number"
              placeholder="End (sec)"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded text-white"
            />
            <button onClick={addClip} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
              Add Clip
            </button>
          </div>

          <button
            onClick={exportClips}
            disabled={exporting}
            className={`px-4 py-2 rounded ${
              exporting ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {exporting ? "Exporting..." : "Export Clips"}
          </button>
        </>
      )}
    </div>
  );
}

export default Editor;
