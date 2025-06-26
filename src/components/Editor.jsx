// Install dependencies first:
// npm install react-player axios

import React, { useRef, useState, useEffect } from "react";
import ReactPlayer from "react-player";
import axios from "axios";

function Editor() {
  const playerRef = useRef(null);
  const timelineRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipIndex, setSelectedClipIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [resize, setResize] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);

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
      const { data } = await axios.post(
        "https://decoupleservergit-1.onrender.com/upload",
        formData
      );
      setVideoUrl(data.url);
      setVideoFile(data.filename);

      // Generate thumbnail frames
      const thumbRes = await axios.get(
        `https://decoupleservergit-1.onrender.com/thumbnails/${data.filename}`
      );
      setThumbnails(thumbRes.data.thumbnails);
    } catch (error) {
      alert("Upload failed.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const addClip = () => {
    if (start >= end) return alert("Start time must be less than end time.");
    setClips([...clips, { start, end }]);
    setStart(0);
    setEnd(0);
  };

  const selectClip = (idx) => {
    setSelectedClipIndex(idx);
    setStart(clips[idx].start);
    setEnd(clips[idx].end);
  };

  const updateClip = () => {
    if (start >= end) return alert("Start time must be less than end time.");
    const updated = [...clips];
    updated[selectedClipIndex] = { start, end };
    setClips(updated);
    setSelectedClipIndex(null);
    setStart(0);
    setEnd(0);
  };

  const exportClips = async () => {
    if (!videoFile || clips.length === 0)
      return alert("Upload a video and add clips.");
    try {
      setExporting(true);
      await axios.post("https://decoupleservergit-1.onrender.com/export", {
        filename: videoFile,
        clips,
      });
      alert("Exported successfully!");
    } catch (error) {
      alert("Export failed.");
      console.log(error);
    } finally {
      setExporting(false);
    }
  };

  const isOverlapping = (clipA, idxA) =>
    clips.some(
      (clipB, idxB) =>
        idxA !== idxB && !(clipA.end <= clipB.start || clipA.start >= clipB.end)
    );

  const handleMouseMove = (e) => {
    if (draggingIndex !== null && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const newStart = Math.max(0, Math.floor(offsetX / 10));
      const duration = clips[draggingIndex].end - clips[draggingIndex].start;
      const updated = [...clips];
      updated[draggingIndex] = { start: newStart, end: newStart + duration };
      setClips(updated);
    }
  };

  const handleResize = (e) => {
    if (!resize) return;
    const { idx, direction } = resize;
    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const time = Math.floor(offsetX / 10);
    const updated = [...clips];
    if (direction === "left")
      updated[idx].start = Math.min(time, updated[idx].end - 1);
    if (direction === "right")
      updated[idx].end = Math.max(time, updated[idx].start + 1);
    setClips(updated);
  };

  useEffect(() => {
    const handleUp = () => {
      setDraggingIndex(null);
      setResize(null);
    };
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mousemove", handleResize);
    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mousemove", handleResize);
    };
  }, [resize]);

  return (
    <div className="p-4 md:p-6 text-white bg-gray-900 min-h-screen w-full">
      <h2 className="text-3xl font-bold mb-6">Video Editor</h2>

      <input
        type="file"
        accept="video/mp4"
        onChange={handleUpload}
        className="mb-4 w-full max-w-md bg-gray-700 text-white p-2 rounded"
      />

      {loading && <p className="text-yellow-400">Uploading video...</p>}

      {videoUrl && (
        <>
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            controls
            width="100%"
            height="360px"
            className="my-4 rounded-lg overflow-hidden shadow-lg"
          />

          <div className="mt-6 bg-gray-800 rounded-lg p-4 overflow-x-auto">
            {/* Thumbnails */}
            <div
              ref={timelineRef}
              className="relative h-24 bg-black flex items-center border border-gray-700 rounded"
            >
              {thumbnails.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`frame-${i}`}
                  className="w-[100px] h-full object-cover border-r border-gray-700"
                />
              ))}

              {/* Current Time Indicator */}
              <div
                className="absolute top-0 w-[2px] h-full bg-white z-50"
                style={{ left: `${currentTime * 10}px` }}
              />
            </div>

            {/* Time Labels */}
            <div className="flex space-x-2 text-sm text-white mt-1">
              {[...Array(thumbnails.length)].map((_, i) => (
                <div key={i} className="w-[100px] text-center">
                  {new Date(i * 1000).toISOString().substr(14, 5)}
                </div>
              ))}
            </div>

            {/* Clip Bars - now BELOW thumbnails */}
            <div
              className="relative h-12 mt-2 bg-gray-700 border border-gray-600 rounded"
              onMouseMove={handleMouseMove}
              onMouseUp={() => setDraggingIndex(null)}
            >
              {clips.map((clip, idx) => {
                const left = clip.start * 10;
                const width = (clip.end - clip.start) * 10;
                const overlapping = isOverlapping(clip, idx);
                return (
                  <div
                    key={idx}
                    onMouseDown={() => setDraggingIndex(idx)}
                    onDoubleClick={() => selectClip(idx)}
                    className={`absolute top-0 h-full ${
                      overlapping ? "bg-red-500" : "bg-blue-500"
                    } bg-opacity-50 border border-white rounded cursor-move`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 bg-white cursor-ew-resize"
                      onMouseDown={() => setResize({ idx, direction: "left" })}
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 bg-white cursor-ew-resize"
                      onMouseDown={() => setResize({ idx, direction: "right" })}
                    />
                    <div className="text-xs text-white text-center pt-2">
                      {clip.start}s - {clip.end}s
                    </div>
                    <button
                      onClick={() =>
                        playerRef.current?.seekTo(clip.start, "seconds")
                      }
                      className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-70 px-1 rounded"
                    >
                      ▶
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 my-4">
            <input
              type="number"
              placeholder="Start (sec)"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded text-white w-32"
            />
            <input
              type="number"
              placeholder="End (sec)"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded text-white w-32"
            />
            {selectedClipIndex !== null ? (
              <button
                onClick={updateClip}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
              >
                Update Clip
              </button>
            ) : (
              <button
                onClick={addClip}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Add Clip
              </button>
            )}
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
