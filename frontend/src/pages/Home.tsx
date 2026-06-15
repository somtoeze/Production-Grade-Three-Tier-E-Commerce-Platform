import React from 'react';
import { useQuery } from 'react-query';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';

export const Home: React.FC = () => {
  const { data: featuredProducts, isLoading } = useQuery(
    'featured-products',
    () => api.getProducts({ featured: true, limit: 8 })
  );

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to Our Store
          </h1>
          <p className="text-xl mb-8">
            Premium products delivered to your door
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">
            Shop Now
          </button>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Featured Products
        </h2>
        
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};