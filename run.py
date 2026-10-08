import subprocess
import sys
import time
import os
import signal

import socket

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def run():
    print("=" * 65)
    print("Social Media Brand Sentiment & OLAP Analytics Platform")
    print("Next.js + Tailwind CSS v3 + shadcn/ui + FastAPI Backend")
    print("=" * 65)

    if is_port_in_use(8000):
        print("\n[WARNING] Port 8000 is already in use by an active server.")
        print("FastAPI server is already running on http://localhost:8000")
        print("If you want to restart it, please stop the existing process or task first.\n")
        return
    
    # 1. Check if database exists
    if not os.path.exists("database/warehouse.db"):
        print("\n[ETL] Database not found. Populating Star Schema warehouse...")
        subprocess.run([sys.executable, "-m", "scripts.populate_database"], check=True)
    else:
        print("\n[OK] Star Schema Data Warehouse verified (289,324 rows).")
        
    # 2. Check if ML models exist
    if not os.path.exists("ml/models/sentiment_model.pkl"):
        print("\n[ML] Training sentiment model...")
        subprocess.run([sys.executable, "-m", "ml.train"], check=True)
    else:
        print("\n[OK] Sentiment model & TF-IDF vectorizer verified.")
        
    # Set UTF-8 encoding for Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    # 3. Inform endpoints
    print("\n[ENDPOINTS]")
    print("  [*] Next.js + shadcn/ui UI: http://localhost:3000")
    print("  [*] FastAPI REST API:      http://localhost:8000")
    print("  [*] Swagger Documentation:  http://localhost:8000/docs")
    print("=" * 65)
    
    # Start Next.js frontend in background
    next_proc = None
    if os.path.exists("next-frontend"):
        try:
            print("\nStarting Next.js Dev Server on port 3000...")
            next_proc = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd="next-frontend",
                shell=True
            )
        except Exception as e:
            print(f"Could not auto-start Next.js server: {e}")
            
    try:
        import uvicorn
        uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
    finally:
        if next_proc:
            try:
                next_proc.terminate()
            except Exception:
                pass

if __name__ == "__main__":
    run()
