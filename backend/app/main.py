from fastapi import FastAPI
from app.routers import auth, sample, validate, users

app = FastAPI(title="Matriq Sample Management API")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Matriq Sample Management API"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return {"message": "favicon not found"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(sample.router, prefix="/api/samples", tags=["Samples"])
app.include_router(validate.router, prefix="/api/validate", tags=["Validate"])