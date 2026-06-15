import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = {
  // Products
  getProducts: async (params?: any) => {
    const response = await axios.get(`${API_BASE_URL}/api/products`, { params });
    return response.data;
  },
  
  getProduct: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/api/products/${id}`);
    return response.data;
  },
  
  // Cart
  getCart: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/cart`);
    return response.data;
  },
  
  addToCart: async (productId: number, quantity: number) => {
    const response = await axios.post(`${API_BASE_URL}/api/cart/items`, {
      product_id: productId,
      quantity
    });
    return response.data;
  },
  
  // Checkout
  createCheckout: async (items: any[]) => {
    const response = await axios.post(`${API_BASE_URL}/api/checkout`, { items });
    return response.data;
  }
};