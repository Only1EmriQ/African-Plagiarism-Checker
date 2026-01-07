"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle, AlertCircle, ExternalLink, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlagiarismChecker() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const MAX_CHARS = 10000;

  // --- NEW DRAG & DROP LOGIC ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(droppedFile);
      setText(""); // Clear text area if a file is dropped
      setError("");
    } else {
      setError("Please upload only PDF or DOCX files.");
    }
  };
  // -----------------------------

  const handleUpload = async () => {
    if (!text && !file) {
      setError("Please provide text or upload a file.");
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      formData.append('file', blob, 'pasted-text.txt');
    }

    try {
      // UPDATED: Using full URL to ensure connection
      const response = await axios.post('http://localhost:8000/check-plagiarism/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Ensure backend is running at http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  const mockMatches = [
    { text: "The impact of digital literacy on academic performance in Nigerian universities...", source: "https://academic-nigeria.edu/journals/01", match: "85%" },
    { text: "Research methodologies in the sub-Saharan context require localized data sets...", source: "https://african-research-gate.org/paper/442", match: "92%" }
  ];

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setResult(null)} className="flex items-center text-blue-600 mb-6 hover:underline">
            <RefreshCcw className="w-4 h-4 mr-2" /> Start New Scan
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> Context Analysis
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Database:</span> <span className="font-medium text-slate-800">African Research Corpus</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">File Name:</span> <span className="font-medium text-slate-800">{file?.name || 'Pasted Text'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status:</span> <span className="text-green-600 font-bold">Analysis Complete</span></div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-sm text-blue-700 font-medium mb-2 text-center">Scan another document?</p>
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-100 transition" onClick={() => setResult(null)}>
                  <UploadCloud className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                  <span className="text-xs text-blue-500">Click to upload</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Similarity Score</h2>
                  <p className="text-slate-500">Total detected matches in the database</p>
                  <div className="mt-4 flex gap-4">
                    <div className="flex items-center text-xs"><div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div> Plagiarized</div>
                    <div className="flex items-center text-xs"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div> Unique Content</div>
                  </div>
                </div>
                
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-red-500" strokeWidth="4" strokeDasharray={`${result.similarity_score}, 100`} strokeLinecap="round"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-black text-slate-800">{result.similarity_score}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Detailed Matches</h3>
                <div className="space-y-6">
                  {mockMatches.map((match, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border-l-4 border-red-400">
                      <p className="text-slate-700 italic mb-3">"{match.text}"</p>
                      <div className="flex justify-between items-center">
                        <a href={match.source} target="_blank" className="text-blue-600 text-xs flex items-center hover:underline">
                          Source: {match.source} <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">{match.match} Match</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 mb-2">African Academic Plagiarism Checker</h1>
        <p className="text-slate-500 text-lg">Specialized for Higher Education Research</p>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          {/* UPDATED DIV WITH ON-DROP LISTENERS */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 p-6 transition-all hover:border-blue-400"
          >
            <textarea
              className="w-full h-64 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 resize-none"
              placeholder="Paste your research text here or drag a file into this area..."
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX_CHARS));
                if (e.target.value) setFile(null); // Clear file if user starts typing
              }}
            />
            
            <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-400">
              <span className={text.length >= MAX_CHARS ? 'text-red-500' : ''}>{text.length.toLocaleString()}</span> / {MAX_CHARS.toLocaleString()} Characters
            </div>

            {!text && !file && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <UploadCloud className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Drag & Drop your document (PDF, DOCX)</p>
              </div>
            )}
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> {error}</div>}

          <div className="mt-8 flex gap-4">
            <button 
              onClick={handleUpload}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:bg-slate-300 shadow-lg shadow-blue-200"
            >
              {loading ? "Scanning Database..." : "Scan for Plagiarism"}
            </button>
            <label className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition">
              Upload File
              <input type="file" className="hidden" onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setText(""); // Clear text area
              }} accept=".pdf,.docx" />
            </label>
          </div>
          {file && <p className="mt-4 text-center text-sm text-slate-500">Selected: <span className="font-bold text-blue-600">{file.name}</span></p>}
        </div>
      </div>
    </div>
  );
}