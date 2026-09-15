from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import connect_db
from app.routes import auth, upload, vault, search, reminders, cards, family, sharing, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    yield


app = FastAPI(title="Doc Vault API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(cards.router)
app.include_router(vault.router)
app.include_router(search.router)
app.include_router(reminders.router)
app.include_router(family.router)
app.include_router(sharing.router)
app.include_router(settings.router)


@app.get("/")
def root():
    return {"message": "Doc Vault API is running ✅"}
