from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.database import get_db
from app.models.product import Product
from app.schemas.product_schema import ProductResponse, ProductListResponse

router = APIRouter()


@router.get("/", response_model=ProductListResponse)
async def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get paginated list of products with filtering"""

    query = db.query(Product).filter(Product.is_active is True)  # ← FIXED

    # Apply filters
    if category:
        query = query.filter(Product.category == category)

    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    if min_price:
        query = query.filter(Product.price >= min_price)

    if max_price:
        query = query.filter(Product.price <= max_price)

    if featured is True:  # ← FIXED (was: if featured:)
        query = query.filter(Product.is_featured is True)  # ← FIXED

    # Get total count
    total = query.count()

    # Get paginated results
    products = query.offset(skip).limit(limit).all()

    return {
        "items": products,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get single product by ID"""

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product
