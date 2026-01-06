"""
Database models for the Plagiarism Checker.

This module defines the SQLAlchemy models used in the application,
specifically the Document model for tracking uploaded files.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class Document(Base):
    """Document model representing uploaded files in the database."""
    
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False, index=True)
    upload_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    file_hash = Column(String, unique=True, nullable=False, index=True)
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', upload_timestamp='{self.upload_timestamp}')>"



