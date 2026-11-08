"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { EnrichedCart } from "@/lib/cart";

interface CartContextType {
  cart: EnrichedCart | null;
  isLoading: boolean;
  isDrawerOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<EnrichedCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }
    } catch (err) {
      console.warn("Failed to fetch cart:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openCart = () => setIsDrawerOpen(true);
  const closeCart = () => setIsDrawerOpen(false);

  const addToCart = async (variantId: string, quantity: number = 1) => {
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add to cart");
      }
      setCart(data.cart);
      setIsDrawerOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding item to bag");
      throw err;
    }
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    try {
      const res = await fetch("/api/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update quantity");
      }
      setCart(data.cart);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating quantity");
    }
  };

  const removeFromCart = async (variantId: string) => {
    try {
      const res = await fetch("/api/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart(data.cart);
      }
    } catch (err) {
      console.warn("Error removing item:", err);
    }
  };

  const itemCount = cart?.itemCount || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isDrawerOpen,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

