import { useEffect, useState } from 'react';

// Runtime checkout config: /public/checkout-config.json maps product ids to
// Stripe Payment Link URLs. Buttons fall back to the contact form until a
// URL is pasted in, so the site never shows a dead checkout.
export function useCheckoutConfig() {
    const [products, setProducts] = useState({});

    useEffect(() => {
        let cancelled = false;

        async function loadConfig() {
            try {
                const response = await fetch('/checkout-config.json', { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                if (!cancelled && payload?.products && typeof payload.products === 'object') {
                    setProducts(payload.products);
                }
            } catch {
                // The site keeps working without runtime checkout config.
            }
        }

        loadConfig();

        return () => {
            cancelled = true;
        };
    }, []);

    return products;
}

export function checkoutUrlFor(products, productId) {
    return String(products?.[productId]?.checkoutUrl || '').trim();
}
