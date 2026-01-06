"""
NLP Engine for Plagiarism Detection.

This module handles text extraction from documents and similarity computation
using sentence-transformers for semantic comparison.
"""

import hashlib
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from pypdf import PdfReader
from docx import Document as DocxDocument


class PlagiarismDetector:
    """Plagiarism detection engine using semantic similarity."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize the plagiarism detector with a sentence transformer model.
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        self.model = SentenceTransformer(model_name)
        print(f"Loaded model: {model_name}")
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts.
        
        Args:
            text1: First text to compare
            text2: Second text to compare
        
        Returns:
            Similarity score as a float between 0 and 100 (percentage)
        """
        if not text1.strip() or not text2.strip():
            return 0.0
        
        # Generate embeddings for both texts
        embedding1 = self.model.encode(text1, convert_to_numpy=True)
        embedding2 = self.model.encode(text2, convert_to_numpy=True)
        
        # Compute cosine similarity
        similarity = cosine_similarity(
            embedding1.reshape(1, -1),
            embedding2.reshape(1, -1)
        )[0][0]
        
        # Convert to percentage (0-100)
        return round(float(similarity * 100), 2)
    
    def load_pdf(self, file_path: str) -> str:
        """
        Extract text from a PDF file.
        
        Args:
            file_path: Path to the PDF file
        
        Returns:
            Extracted text as a string
        
        Raises:
            Exception: If PDF cannot be read or is corrupted
        """
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error reading PDF file: {str(e)}")
    
    def load_docx(self, file_path: str) -> str:
        """
        Extract text from a DOCX file.
        
        Args:
            file_path: Path to the DOCX file
        
        Returns:
            Extracted text as a string
        
        Raises:
            Exception: If DOCX cannot be read or is corrupted
        """
        try:
            doc = DocxDocument(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            raise Exception(f"Error reading DOCX file: {str(e)}")
    
    def extract_text(self, file_path: str) -> str:
        """
        Extract text from a file (PDF or DOCX) based on file extension.
        
        Args:
            file_path: Path to the file
        
        Returns:
            Extracted text as a string
        
        Raises:
            ValueError: If file format is not supported
            Exception: If file cannot be read
        """
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self.load_pdf(file_path)
        elif file_extension == '.docx':
            return self.load_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}. Supported formats: .pdf, .docx")


def compute_file_hash(file_path: str) -> str:
    """
    Compute SHA-256 hash of a file to detect duplicates.
    
    Args:
        file_path: Path to the file
    
    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

