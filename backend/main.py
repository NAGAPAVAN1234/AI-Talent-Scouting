from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import router

app = FastAPI(
    title="AI Talent Scout",
    description="AI-Powered Talent Scouting & Engagement Agent",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def on_startup():
    from seed import seed
    await seed()


@app.get("/")
def root():
    return {
        "message": "AI Talent Scout API v2.0 is running",
        "docs": "/docs",
        "endpoints": [
            "POST /api/upload-jd",
            "POST /api/match",
            "GET  /api/candidates",
            "POST /api/candidates",
            "POST /api/chat/init",
            "POST /api/chat/reply",
            "POST /api/chat/simulate",
            "GET  /api/chat/{candidate_id}",
            "GET  /api/shortlist"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)