"""
FastAPI main application for the African Context Plagiarism Checker.

This module sets up the FastAPI application, database initialization,
and provides the plagiarism checking endpoint.
"""

from fastapi.middleware.cors import CORSMiddleware
# this block allows the frontend to talk to the backend
import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, SessionLocal, Base
from models import Document
from nlp_engine import PlagiarismDetector, compute_file_hash

# Initialize FastAPI app
app = FastAPI(
    title="African Context Plagiarism Checker",
    description="A plagiarism detection system specifically designed for African research contexts",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware
# app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Configure CORS middleware
# This allows the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # In case Next.js runs on different port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Explicitly allow required methods
    allow_headers=["*"],  # Allow all headers including Content-Type with boundary
    expose_headers=["*"],  # Expose all headers in response
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Your frontend URLs
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (POST, GET, etc.)
    allow_headers=["*"], # Allows all headers
)

# Initialize plagiarism detector (singleton instance)
plagiarism_detector = PlagiarismDetector()

# Dummy African Research Corpus for comparison
AFRICAN_RESEARCH_CORPUS = """
The economic impact of subsidy removal in Nigeria has been a subject of extensive research 
in recent years. The removal of fuel subsidies has led to significant changes in the 
economic landscape, affecting both urban and rural populations. Studies have shown that 
while subsidy removal aims to reduce government expenditure and promote market efficiency, 
it often results in increased inflation and reduced purchasing power for low-income households.

Agricultural development in Sub-Saharan Africa continues to face numerous challenges, 
including climate change, inadequate infrastructure, and limited access to modern 
farming technologies. Research institutions across the continent have been working 
on developing sustainable farming practices that are both economically viable and 
environmentally friendly.

Education systems in African countries have undergone significant reforms to improve 
access and quality. However, challenges remain in terms of teacher training, curriculum 
development, and resource allocation. Research has shown that investment in early childhood 
education yields long-term benefits for economic development.

Healthcare systems in many African nations struggle with limited resources and 
infrastructure. The COVID-19 pandemic highlighted the importance of robust healthcare 
systems and the need for increased investment in public health infrastructure. Research 
focuses on developing cost-effective healthcare solutions tailored to local contexts.

Regional integration and trade agreements have been key areas of research in African 
economic development. The African Continental Free Trade Area (AfCFTA) represents a 
significant milestone in promoting intra-African trade and economic cooperation.
"""


def get_db():
    """Dependency function to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup."""
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")


@app.get("/")
async def root():
    """Root endpoint to verify API is running."""
    return {
        "message": "African Context Plagiarism Checker API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/check-plagiarism/")
async def check_plagiarism(file: UploadFile = File(...)):
    try:
        # Read the content regardless of if it's a real file or a text blob
        content = await file.read()
        
        # If it's bytes, decode it to string
        if isinstance(content, bytes):
            text_content = content.decode('utf-8', errors='ignore')
        else:
            text_content = content

        # Check if the file is empty
        if not text_content.strip():
            return {"error": "The uploaded document or text is empty."}

        # YOUR EXISTING NLP LOGIC HERE
        # Example: similarity = model.calculate(text_content)
        
        return {
            "similarity_score": 25, # Replace with your actual logic
            "filename": file.filename,
            "status": "success"
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}, 500
    """
    Check uploaded document for plagiarism against African Research Corpus.
    
    Args:
        file: Uploaded file (PDF or DOCX)
        db: Database session dependency
    
    Returns:
        JSON response with similarity score and document metadata
    
    Raises:
        HTTPException: If file format is unsupported or processing fails
    """
    # Validate file type
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ['.pdf', '.docx']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats: .pdf, .docx"
        )
    
    # Create temporary directory for file uploads
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file to temporary location
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Compute file hash to check for duplicates
        file_hash = compute_file_hash(temp_file_path)
        
        # Check if file already exists in database
        existing_document = db.query(Document).filter(
            Document.file_hash == file_hash
        ).first()
        
        # Extract text from uploaded file
        try:
            extracted_text = plagiarism_detector.extract_text(temp_file_path)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Error extracting text from file: {str(e)}"
            )
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No text could be extracted from the uploaded file"
            )
        
        # Compare with African Research Corpus
        similarity_score = plagiarism_detector.compute_similarity(
            extracted_text,
            AFRICAN_RESEARCH_CORPUS
        )
        
        # Save document to database only if it doesn't already exist
        if existing_document:
            # Use existing document metadata
            db_document = existing_document
            message = "Plagiarism check completed successfully"
        else:
            # Create new document record
            db_document = Document(
                filename=file.filename,
                file_hash=file_hash
            )
            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            message = "Plagiarism check completed successfully"
        
        return {
            "message": message,
            "document_id": db_document.id,
            "filename": file.filename,
            "upload_timestamp": db_document.upload_timestamp.isoformat(),
            "similarity_score": similarity_score,
            "similarity_percentage": f"{similarity_score}%",
            "file_hash": file_hash,
            "text_extracted_length": len(extracted_text)
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    finally:
        # Clean up temporary file
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            os.rmdir(temp_dir)
        except Exception:
            pass  # Ignore cleanup errors

