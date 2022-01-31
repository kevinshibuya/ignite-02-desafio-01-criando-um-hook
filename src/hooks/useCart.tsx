import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const hasProduct = updatedCart.find(product => product.id === productId);

      const productStock = await api.get(`/stock/${productId}`)
        .then(stock => stock.data.amount);
      const productAmount = hasProduct ? hasProduct.amount : 0;
      const amount = productAmount + 1;

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (hasProduct) {
        hasProduct.amount = amount;
      } else {
        const productData = await api.get(`/products/${productId}`)
          .then(product => product.data)
          .catch(err => {
            return;
          })

        if (productData) {
          updatedCart.push({
            ...productData,
            amount: 1
          });
        } else {
          return;
        }
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const hasProduct = updatedCart.find(product => product.id === productId);

      if (hasProduct) {
        updatedCart.splice(updatedCart.indexOf(hasProduct), 1);
      } else {
        toast.error('Erro na remoção do produto');
        return;
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = useCallback(async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const updatedCart = [...cart];
      const hasProduct = updatedCart.find(product => product.id === productId);

      const productStock = await api.get(`/stock/${productId}`)
        .then(stock => stock.data.amount);

      if (productStock < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (hasProduct) {
        hasProduct.amount = amount;
      } else {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }


      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
