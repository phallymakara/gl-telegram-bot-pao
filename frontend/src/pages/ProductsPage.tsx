/**
 * @file ProductsPage.tsx
 * @description Master Data - Gold Products catalog page managing product names, conversion factors, and statuses with inline status toggling.
 */

import { useEffect, useState } from "react";
import { ProductData, productsApi } from "../api";
import ProductTable from "./products/ProductTable";
import ProductModal from "./products/ProductModal";

interface ProductsPageProps {
  /** Toast notification callback */
  notify: (msg: string) => void;
}

/**
 * Master Data Gold Products catalog page component.
 */
export default function ProductsPage({ notify }: ProductsPageProps) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);

  const [form, setForm] = useState({
    name: "",
    conversion_factor: "1.0",
    is_active: true,
  });

  function loadProducts() {
    productsApi
      .getProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openCreateModal() {
    setEditingProduct(null);
    setForm({
      name: "",
      conversion_factor: "1.0",
      is_active: true,
    });
    setIsOpen(true);
  }

  function openEditModal(p: ProductData) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      conversion_factor: String(p.conversion_factor ?? 1.0),
      is_active: p.is_active !== false,
    });
    setIsOpen(true);
  }

  function toggleStatus(p: ProductData) {
    const newStatus = p.is_active === false ? true : false;
    productsApi
      .updateProduct(p.id, { is_active: newStatus })
      .then((updated) => {
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        notify(`Product status changed to ${newStatus ? "Active" : "Inactive"}`);
      })
      .catch((e: Error) => notify(e.message));
  }

  function handleSave() {
    if (!form.name.trim()) {
      notify("Please enter Product Name");
      return;
    }

    const factorVal = parseFloat(form.conversion_factor) || 1.0;

    if (editingProduct) {
      productsApi
        .updateProduct(editingProduct.id, {
          name: form.name,
          conversion_factor: factorVal,
          is_active: form.is_active,
        })
        .then((updated) => {
          setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setIsOpen(false);
          notify("Gold product updated successfully");
        })
        .catch((e: Error) => notify(e.message));
    } else {
      productsApi
        .createProduct({
          name: form.name,
          conversion_factor: factorVal,
          is_active: form.is_active,
        })
        .then((created) => {
          setProducts((prev) => [...prev, created]);
          setIsOpen(false);
          notify("New gold product created successfully");
        })
        .catch((e: Error) => notify(e.message));
    }
  }

  function deleteProduct(id: number) {
    productsApi
      .deleteProduct(id)
      .then(() => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        notify("Product master record removed");
      })
      .catch((e: Error) => notify(e.message));
  }

  return (
    <div className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3.5 min-h-0">
      <ProductTable
        products={products}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        toggleStatus={toggleStatus}
        deleteProduct={deleteProduct}
      />

      <ProductModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        form={form}
        setForm={setForm}
        editingProduct={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
}
