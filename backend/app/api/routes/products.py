"""
Products Master Data API routes.
Provides CRUD endpoints for gold products catalog management with conversion factor support.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.product import Product

router = APIRouter()


class ProductCreate(BaseModel):
    """Schema for adding a new gold product master record."""
    name: str
    conversion_factor: float | None = 1.0
    is_active: bool = True
    product_code: str | None = None
    purity: str | None = None
    category: str | None = None
    unit_weight_kg: float | None = None
    description: str | None = None


class ProductUpdate(BaseModel):
    """Schema for updating an existing gold product master record."""
    name: str | None = None
    conversion_factor: float | None = None
    is_active: bool | None = None
    product_code: str | None = None
    purity: str | None = None
    category: str | None = None
    unit_weight_kg: float | None = None
    description: str | None = None


class ProductResponse(BaseModel):
    """Schema representing gold product master data."""
    id: int
    name: str
    conversion_factor: float | None = 1.0
    is_active: bool = True
    product_code: str | None = None
    purity: str | None = None
    category: str | None = None
    unit_weight_kg: float | None = None
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    """
    Retrieve all gold product master records, ordered by ID ascending.
    """
    products = db.query(Product).order_by(Product.id.asc()).all()
    # Seed default products if empty
    if not products:
        default_items = [
            Product(product_code="PROD-001", name="Gold Bar 99.99% 1KG", conversion_factor=1.0, purity="99.99%", category="Kilobar", unit_weight_kg=1.0),
            Product(product_code="PROD-002", name="Gold Bar 500g", conversion_factor=0.5, purity="99.99%", category="Cast Bar", unit_weight_kg=0.5),
            Product(product_code="PROD-003", name="Baht Gold Bar", conversion_factor=0.01524, purity="96.5%", category="Baht Bar", unit_weight_kg=0.01524),
        ]
        db.add_all(default_items)
        db.commit()
        products = db.query(Product).order_by(Product.id.asc()).all()

    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single product master record by ID.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    """
    Create a new product master record.
    """
    code = body.product_code or f"PROD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    product = Product(
        product_code=code,
        name=body.name,
        conversion_factor=body.conversion_factor if body.conversion_factor is not None else 1.0,
        purity=body.purity,
        category=body.category,
        unit_weight_kg=body.unit_weight_kg,
        description=body.description,
        is_active=body.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, body: ProductUpdate, db: Session = Depends(get_db)):
    """
    Update an existing product master record by ID.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if body.name is not None:
        product.name = body.name
    if body.conversion_factor is not None:
        product.conversion_factor = body.conversion_factor
    if body.is_active is not None:
        product.is_active = body.is_active
    if body.product_code is not None:
        product.product_code = body.product_code
    if body.purity is not None:
        product.purity = body.purity
    if body.category is not None:
        product.category = body.category
    if body.unit_weight_kg is not None:
        product.unit_weight_kg = body.unit_weight_kg
    if body.description is not None:
        product.description = body.description

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """
    Remove a product master record by ID.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()
