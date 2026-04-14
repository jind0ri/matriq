from fastapi import FastAPI
from app.routers import auth, sample

app = FastAPI(title="Matriq Sample Management API")

# Add a root route
@app.get("/")
def read_root():
    return {"message": "Welcome to the Matriq Sample Management API"}

# Ignore favicon.ico request
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return {"message": "favicon not found"}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(sample.router, prefix="/api/samples", tags=["Samples"])