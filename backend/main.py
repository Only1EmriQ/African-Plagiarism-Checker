from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
import requests
import io
from pypdf import PdfReader

app = FastAPI()

# Allow your Next.js frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the NLP Model (This will download on first run)
print("Loading NLP Model... Please wait.")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model Loaded Successfully!")

def search_journal_database(query_text):
    """
    Queries the CrossRef API for real academic papers matching the input.
    """
    # Clean and shorten the query for the API
    search_query = query_text[:200].replace("\n", " ").strip()
    if not search_query:
        return []

    # API searches CrossRef metadata (AJOL and other African journals are indexed here)
    api_url = f"https://api.crossref.org/works?query={search_query}&rows=4"
    
    try:
        response = requests.get(api_url, timeout=10)
        data = response.json()
        results = []
        
        for item in data.get('message', {}).get('items', []):
            # Extract clean title and journal name
            title = item.get('title', ['Unnamed Research'])[0]
            journal = item.get('container-title', ['Academic Repository'])[0]
            url = item.get('URL', '#')
            
            # We assign a plausible score based on how well the API matched it
            results.append({
                "text": f"Reference: {title}",
                "source_name": journal,
                "url": url,
                "score": 0.78 # Constant for demo, or logic can be added here
            })
        return results
    except Exception as e:
        print(f"API Search Error: {e}")
        return []

@app.get("/")
def read_root():
    return {"status": "running", "engine": "Live Journal Search Active"}

from sentence_transformers import util # Ensure this is at the top

import docx # <--- MAKE SURE THIS IS AT THE VERY TOP OF YOUR FILE

@app.post("/check-plagiarism/")
async def check_plagiarism(
    file: UploadFile = File(None), 
    text_content: str = Form(None)
):
    extracted_text = ""

    # 1. NEW & IMPROVED Handle Input (PDF or DOCX or Text)
    if file:
        content = await file.read()
        filename = file.filename.lower()
        
        try:
            if filename.endswith('.pdf'):
                # Handle PDF
                pdf = PdfReader(io.BytesIO(content))
                for page in pdf.pages:
                    extracted_text += page.extract_text()
            
            elif filename.endswith('.docx'):
                # Handle Word Document
                doc = docx.Document(io.BytesIO(content))
                extracted_text = "\n".join([para.text for para in doc.paragraphs])
            
            else:
                # Treat as plain text (like if the frontend sends a .txt)
                extracted_text = content.decode('utf-8', errors='ignore')
                
        except Exception as e:
            print(f"Extraction Error: {e}")
            return {"similarity_score": 0, "matches": [], "error": "Could not read file format"}

    elif text_content:
        extracted_text = text_content

    # --- THE REST OF the LOGIC REMAINS THE SAME ---
    if not extracted_text or len(extracted_text.strip()) < 20:
        return {"similarity_score": 0, "matches": []}

    # 2. Get Potential Matches from API
    raw_matches = search_journal_database(extracted_text)
    
    final_matches = []
    total_similarity = 0

    # 3. THE "SMART" COMPARISON
    user_embedding = model.encode(extracted_text, convert_to_tensor=True)

    for match in raw_matches:
        match_embedding = model.encode(match['text'], convert_to_tensor=True)
        actual_similarity = util.pytorch_cos_sim(user_embedding, match_embedding).item()

        if actual_similarity > 0.65:
            match['score'] = actual_similarity
            final_matches.append(match)
            total_similarity += actual_similarity

    # 4. Final Score Logic 
    if not final_matches:
        display_score = 5 
    else:
        avg_score = (total_similarity / len(final_matches)) * 100
        display_score = min(round(avg_score), 95) 

    return {
        "similarity_score": display_score,
        "matches": final_matches
    }