"use client";

import type React from "react";

import Image from "next/image";
import { motion } from "framer-motion";

// Define the type for related products
interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  discount: number;
  image: string;
}

// Static data for related products
const relatedProducts: RelatedProduct[] = [
  {
    id: "shoes004men",
    name: "أسلوبك الخاص",
    price: 179,
    discount: 250,
    image: "/images/related-2.png", // Replace with actual image path
  },
  {
    id: "shoes02men",
    name: "الحذاء الرياضي المميز",
    price: 229,
    discount: 300,
    image: "/images/related-4.jpg", // Replace with actual image path
  },
  {
    id: "shoes005men",
    name: "أحذية النخبة",
    price: 299,
    discount: 450,
    image: "/images/related-3.jpg", // Replace with actual image path
  },
  {
    id: "shoes",
    name: "حذاء رياضي مريح وأنيق",
    price: 219,
    discount: 300,
    image: "/images/related-5.jpg", // Replace with actual image path
  },
];

interface RelatedProductsProps {
  isLoaded: boolean;
}

const RelatedProducts = () => {
  return (
    <section className="mt-16 mb-12">
      <h2 className="text-3xl font-bold text-yellow-400 text-center mb-8">
        المزيد من المنتجات
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="group"
          >
            <a
              href={`https://me3rouf.com/products/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-800 rounded-lg overflow-hidden h-full border border-gray-700 hover:border-yellow-400 transition-all duration-300"
            >
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                  {Math.round(
                    ((product.discount - product.price) / product.discount) *
                      100
                  )}
                  % خصم
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-3 group-hover:text-yellow-400 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-bold text-xl">
                      {product.price} درهم
                    </span>
                    <span className="text-gray-400 line-through text-sm">
                      {product.discount} درهم
                    </span>
                  </div>
                  <div className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
