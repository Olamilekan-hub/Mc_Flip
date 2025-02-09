from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.import_routes import router as import_router
from routes.post_routes import router as post_router
from routes.get_bulk_url_route import router as bulk_url_router
from routes.check_listings_routes import router as listings_router
from routes.delete_listings_routes import router as delete_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://172.20.10.8:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."))

# Include the routers
app.include_router(import_router, prefix="/api")
app.include_router(post_router, prefix="/api")
app.include_router(bulk_url_router, prefix="/api")
app.include_router(listings_router, prefix="/api"   )
app.include_router(delete_router, prefix="/api"   )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
