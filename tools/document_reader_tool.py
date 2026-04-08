import os
import pandas as pd
from pypdf import PdfReader
from crewai.tools import BaseTool

class DocumentReaderTool(BaseTool):
    name: str = "document_reader"
    description: str = (
        "A versatile tool for reading content from PDF, CSV, and Text files. "
        "Input should be the absolute or relative file path to the document. "
        "Returns the text format of the document, handling extraction automatically."
    )

    def _run(self, filepath: str) -> str:
        try:
            if not os.path.exists(filepath):
                return f"Error: File not found at path '{filepath}'. Ensure the path is correct."
            
            ext = os.path.splitext(filepath)[1].lower()
            
            if ext == ".pdf":
                reader = PdfReader(filepath)
                text = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text.append(f"--- Page {idx + 1} ---\n{page_text}")
                return "\n".join(text) if text else "No text found in the PDF."
                
            elif ext == ".csv":
                df = pd.read_csv(filepath)
                # Return top rows and some stats to avoid context window explosion
                summary = df.head(50).to_string()
                info = f"Total rows: {len(df)}, Columns: {list(df.columns)}\n\nFirst 50 rows:\n{summary}"
                return info
                
            elif ext in [".txt", ".md", ".json", ".log"]:
                with open(filepath, "r", encoding="utf-8") as f:
                    return f.read()
            else:
                return f"Error: Unsupported file format {ext}. Supported formats are .pdf, .csv, .txt, .md."
        except Exception as e:
            return f"Error reading file '{filepath}': {str(e)}"

document_reader_tool = DocumentReaderTool()
