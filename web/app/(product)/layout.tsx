import { StoreProvider } from '@/lib/store';
import '../product.css';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="product">{children}</div>
    </StoreProvider>
  );
}
