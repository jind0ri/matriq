from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import CORS_ORIGINS, DATABASE_URL
from .database import init_db
from app.routers import auth, sample, validate, classify, audit, accounting, users, settings

app = FastAPI(title='Matriq AI Sample Management API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
def startup():
    init_db()


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            'success': False,
            'error': {
                'type': 'http_error',
                'code': exc.status_code,
                'message': exc.detail,
                'path': request.url.path,
            },
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={
            'success': False,
            'error': {
                'type': 'validation_error',
                'code': 400,
                'message': str(exc),
                'path': request.url.path,
            },
        },
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(
        status_code=503,
        content={
            'success': False,
            'error': {
                'type': 'system_error',
                'code': 503,
                'message': str(exc),
                'path': request.url.path,
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            'success': False,
            'error': {
                'type': 'internal_error',
                'code': 500,
                'message': 'An unexpected system error occurred.',
                'path': request.url.path,
            },
        },
    )


@app.get('/')
def root():
    return {
        'message': 'Welcome to the Matriq Sample Management API',
        'database_url_configured': bool(DATABASE_URL),
    }


@app.get('/health')
def health():
    return {'status': 'ok'}


app.include_router(auth.router)
app.include_router(classify.router)
app.include_router(sample.router)
app.include_router(validate.router)
app.include_router(audit.router)
app.include_router(accounting.router)
app.include_router(users.router)
app.include_router(settings.router)