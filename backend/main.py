import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routes import dashboard, brands, sentiment, olap, prediction, model_metrics

app = FastAPI(
    title="Social Media Brand Sentiment & OLAP Analytics API",
    description="Enterprise Data Warehouse, OLAP analytical queries, and ML sentiment inference for Social Media Brand Intelligence",
    version="1.0.0"
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard.router)
app.include_router(brands.router)
app.include_router(sentiment.router)
app.include_router(olap.router)
app.include_router(prediction.router)
app.include_router(model_metrics.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Social Media Brand Sentiment Analytics API"}

# Mount frontend build (prioritize Next.js exported build, fallback to frontend/dist)
next_out = os.path.join(os.path.dirname(__file__), "..", "next-frontend", "out")
vite_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(next_out):
    next_static = os.path.join(next_out, "_next")
    if os.path.exists(next_static):
        app.mount("/_next", StaticFiles(directory=next_static), name="next-static")
    
    @app.get("/{full_path:path}")
    async def serve_next(full_path: str):
        if full_path.startswith("api"):
            return None
        candidate = os.path.join(next_out, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        candidate_html = os.path.join(next_out, f"{full_path}.html")
        if os.path.isfile(candidate_html):
            return FileResponse(candidate_html)
        candidate_index = os.path.join(next_out, full_path, "index.html")
        if os.path.isfile(candidate_index):
            return FileResponse(candidate_index)
        index_file = os.path.join(next_out, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Social Media Brand Sentiment Analytics API. See /docs for Swagger documentation."}

elif os.path.exists(vite_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(vite_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            return None
        index_file = os.path.join(vite_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Social Media Brand Sentiment Analytics API. See /docs for Swagger documentation."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
