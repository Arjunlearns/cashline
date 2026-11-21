# FastAPI app, CORS, router include
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.reminders import router as reminders_router

app = FastAPI(title="Cashline API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reminders_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
