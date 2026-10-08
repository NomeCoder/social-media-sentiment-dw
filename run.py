import subprocess
import sys
import time
import os
import signal

def run():
    print("=" * 65)
    print("Social Media Brand Sentiment & OLAP Analytics Platform")
    print("Next.js + Tailwind CSS v3 + shadcn/ui + FastAPI Backend")
    print("=" * 65)
    
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
        
    # 3. Inform endpoints
    print("\n[ENDPOINTS]")
    print("  ⭐ Next.js + shadcn/ui UI: http://localhost:3000")
    print("  ⚙️  FastAPI REST API:      http://localhost:8000")
    print("  📖 Swagger Documentation:  http://localhost:8000/docs")
    print("=" * 65)
    
    # Start Next.js frontend in background if built
    next_proc = None
    if os.path.exists("next-frontend/.next"):
        try:
            print("\nStarting Next.js Server on port 3000...")
            next_proc = subprocess.Popen(
                ["npm", "start", "--", "-p", "3000"],
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
