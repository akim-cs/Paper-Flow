from fastapi import FastAPI, UploadFile, File
from services.pdf_service import extract_text_from_pdf

app = FastAPI()

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
  contents = await file.read()
  text = extract_text_from_pdf(contents);
  return {"text": text}