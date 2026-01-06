'use client';

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PlagiarismResult {
  message: string;
  document_id: number;
  filename: string;
  upload_timestamp: string;
  similarity_score: number | null;
  similarity_percentage?: string;
  file_hash?: string;
  text_extracted_length?: number;
  note?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.pdf', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a PDF or DOCX file only.');
      return;
    }

    setFile(file);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<PlagiarismResult>(
        'http://localhost:8000/check-plagiarism/',
        formData,
        {
          // Don't set Content-Type header - let browser set it automatically with boundary
          // This is required for multipart/form-data to work correctly with CORS
        }
      );

      setResult(response.data);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to the server. Please ensure the backend is running.');
      } else {
        setError('An error occurred while checking the document. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-green-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-red-50 border-red-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
            African Academic Plagiarism Checker
          </h1>
          <p className="text-lg md:text-xl text-slate-600">
            Specialized for Higher Education Research
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-300
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : file
                ? 'border-slate-300 bg-white'
                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700 underline"
                  >
                    Remove file
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      Drag & drop your document here
                    </p>
                    <p className="text-sm text-slate-500">
                      or click to browse (PDF, DOCX)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button */}
          {file && !isUploading && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleUpload}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Check for Plagiarism
            </motion.button>
          )}

          {/* Loading State */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 w-full bg-white border border-slate-200 rounded-lg p-8"
            >
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-lg font-semibold text-slate-900">Scanning Document...</p>
                <p className="text-sm text-slate-500">Please wait while we analyze your document</p>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Similarity Score Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={`bg-white rounded-xl p-8 border-2 ${result.similarity_score !== null ? getScoreBgColor(result.similarity_score) : 'bg-slate-50 border-slate-200'} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Similarity Score</h2>
                </div>
                <div className="mt-6">
                  {result.similarity_score !== null ? (
                    <>
                      <div className={`text-5xl font-bold ${getScoreColor(result.similarity_score)} mb-2`}>
                        {result.similarity_score.toFixed(1)}%
                      </div>
                      <p className="text-sm text-slate-600">
                        {result.similarity_score >= 70
                          ? 'High similarity detected - Review required'
                          : result.similarity_score >= 40
                          ? 'Moderate similarity - Review recommended'
                          : 'Low similarity - Original content'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl font-bold text-slate-600 mb-2">
                        N/A
                      </div>
                      <p className="text-sm text-slate-600">
                        {result.note || 'This file has already been checked previously'}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Context Analysis Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Context Analysis</h2>
                </div>
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      African Research Database Match
                    </p>
                    <p className="text-sm text-slate-600">
                      Compared against specialized African academic research corpus
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Document Details</p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>Filename: <span className="font-medium">{result.filename}</span></p>
                      {result.text_extracted_length && (
                        <p>Text Length: <span className="font-medium">{result.text_extracted_length.toLocaleString()} characters</span></p>
                      )}
                      <p>Checked: <span className="font-medium">{new Date(result.upload_timestamp).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Button (shown when results are displayed) */}
        <AnimatePresence>
          {result && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleReset}
              className="mt-8 w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Check Another Document
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
