import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart, Tag, Trash2, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { hasMinLength, isBlank } from "@/lib/validation";
import type { DeliveryDetails, MarketOrder, PaymentMethod, Product } from "@/lib/types";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market — Edutopia" },
      { name: "description", content: "Shop curated educational products, build a cart, and finish checkout with promo codes, payment, and delivery details." },
      { property: "og:title", content: "Market — Edutopia" },
      { property: "og:description", content: "Curated products and a complete checkout flow." },
    ],
  }),
  component: MarketPage,
});

const tagLabels: Record<string, string> = {
  bestseller: "Bestseller",
  new: "New",
  limited: "Limited",
  promo: "Promo",
};

const CART_STORAGE_KEY = "market-cart";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash_on_delivery: "Cash on delivery",
  card: "Card payment",
  bank_transfer: "Bank transfer",
};

type CartItem = {
  product_id: number;
  quantity: number;
};

type PromoValidation = {
  valid: boolean;
  discount_percent: number;
  product_id: number | null;
};

type DeliveryErrors = Partial<Record<keyof DeliveryDetails, string>>;

const INITIAL_DELIVERY: DeliveryDetails = {
  full_name: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  notes: "",
};

function formatPrice(value: number) {
  return `EUR ${value.toFixed(2)}`;
}

function MarketPage() {
  const queryClient = useQueryClient();
  const storedUser = getStoredUser();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    ...INITIAL_DELIVERY,
    full_name: storedUser ? `${storedUser.first_name} ${storedUser.last_name}` : "",
  });
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryErrors>({});

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get<Product[]>("/market/products");
      return res.data;
    },
  });

  const { data: orders = [] } = useQuery<MarketOrder[]>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await api.get<MarketOrder[]>("/market/orders");
      return res.data;
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setCart(parsed.filter((item) => Number(item.product_id) > 0 && Number(item.quantity) > 0));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const cartLines = useMemo(
    () => cart
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) return null;
        return {
          item,
          product,
          lineTotal: Number(product.price) * item.quantity,
        };
      })
      .filter((line): line is { item: CartItem; product: Product; lineTotal: number } => Boolean(line)),
    [cart, productMap]
  );

  const subtotal = useMemo(() => cartLines.reduce((sum, line) => sum + line.lineTotal, 0), [cartLines]);
  const promoEligibleSubtotal = useMemo(() => {
    if (!promoResult) return 0;
    return cartLines.reduce((sum, line) => {
      if (promoResult.product_id && promoResult.product_id !== line.product.id) return sum;
      return sum + line.lineTotal;
    }, 0);
  }, [cartLines, promoResult]);
  const discountAmount = promoResult ? promoEligibleSubtotal * (promoResult.discount_percent / 100) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const matchingPromoProduct = promoResult?.product_id ? cartLines.some((line) => line.product.id === promoResult.product_id) : true;

  const promoMutation = useMutation({
    mutationFn: () => api.post<PromoValidation>("/market/validate-promo", { code: promoCode }),
    onSuccess: (res) => {
      const data = res.data;
      setPromoResult(data);
      const suffix = data.product_id ? " sur le produit selectionne" : " sur tout le panier";
      toast.success(`Code promo applique : -${data.discount_percent}%${suffix}`);
    },
    onError: (err: any) => {
      setPromoResult(null);
      toast.error(err?.response?.data?.message ?? "Code promo invalide.");
    },
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      api.post("/market/orders", {
        items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        promo_code: promoResult ? promoCode : undefined,
        payment_method: paymentMethod,
        delivery,
      }),
    onSuccess: () => {
      toast.success("Commande enregistree.");
      setCart([]);
      setPromoCode("");
      setPromoResult(null);
      setPaymentMethod("cash_on_delivery");
      setDelivery({
        ...INITIAL_DELIVERY,
        full_name: storedUser ? `${storedUser.first_name} ${storedUser.last_name}` : "",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Commande impossible."),
  });

  const addToCart = (productId: number) => {
    const product = productMap.get(productId);
    if (!product) return;

    setCart((current) => {
      const existing = current.find((item) => item.product_id === productId);
      if (!existing) return [...current, { product_id: productId, quantity: 1 }];
      if (existing.quantity >= product.stock) return current;
      return current.map((item) => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item);
    });
    toast.success("Produit ajoute au panier");
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.product_id !== productId) return [item];
        const product = productMap.get(productId);
        if (!product) return [];
        const nextQuantity = Math.max(0, Math.min(item.quantity + delta, product.stock));
        if (nextQuantity === 0) return [];
        return [{ ...item, quantity: nextQuantity }];
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.product_id !== productId));
  };

  const setDeliveryField = <K extends keyof DeliveryDetails>(field: K, value: DeliveryDetails[K]) => {
    setDelivery((prev) => ({ ...prev, [field]: value }));
    setDeliveryErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateDelivery = () => {
    const nextErrors: DeliveryErrors = {};

    if (!hasMinLength(delivery.full_name, 3)) {
      nextErrors.full_name = "Le nom complet est obligatoire";
    }
    if (!/^\+?[0-9 ]{8,15}$/.test(delivery.phone.trim())) {
      nextErrors.phone = "Saisissez un numero de telephone valide";
    }
    if (!hasMinLength(delivery.city, 2)) {
      nextErrors.city = "La ville est obligatoire";
    }
    if (!hasMinLength(delivery.address, 8)) {
      nextErrors.address = "L'adresse doit contenir au moins 8 caracteres";
    }
    if (!isBlank(delivery.postal_code) && !/^[0-9A-Za-z -]{4,10}$/.test(delivery.postal_code.trim())) {
      nextErrors.postal_code = "Le format du code postal est invalide";
    }

    setDeliveryErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      toast.error("Ajoutez d'abord au moins un produit au panier.");
      return;
    }
    if (promoResult?.product_id && !matchingPromoProduct) {
      toast.error("Ce code promo exige le produit correspondant dans le panier.");
      return;
    }
    if (!validateDelivery()) {
      toast.error("Corrigez le formulaire de livraison avant de confirmer la commande.");
      return;
    }
    orderMutation.mutate();
  };

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="font-semibold text-xs uppercase tracking-[0.3em] text-gold">Shop</span>
          <h1 className="mt-3 font-display text-5xl font-bold md:text-6xl">The Edutopia Market</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="mx-auto max-w-2xl text-primary-foreground/80">
            Build a real pannier, apply promo codes, choose how you want to pay, and add the delivery coordinates before confirming the order.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-gold bg-gold/5 p-6 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-gold text-bordeaux-deep">
              <Tag className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-bordeaux">Have a promo code?</p>
              <p className="text-sm text-muted-foreground">
                {promoResult
                  ? `Applied: ${promoResult.discount_percent}% off${promoResult.product_id ? " on one matching product" : " on the whole cart"}`
                  : "Apply it before checkout to save instantly on your basket."}
              </p>
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="EDUTOPIA10"
              className="border-gold/40 md:w-56"
            />
            <Button
              type="button"
              onClick={() => promoMutation.mutate()}
              disabled={!promoCode || promoMutation.isPending}
              className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
            >
              {promoMutation.isPending ? "..." : "Apply"}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <div>
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground">Featured Products</h2>
                <p className="mt-2 text-sm text-muted-foreground">Collect products in the cart first, then checkout once with delivery and payment details.</p>
              </div>
              <Badge className="w-fit bg-bordeaux/10 px-3 py-1 text-bordeaux hover:bg-bordeaux/10">
                {cart.reduce((count, item) => count + item.quantity, 0)} items in cart
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-bordeaux" />
              </div>
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">No products available.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {products.map((product) => {
                  const discountedPrice = promoResult && (!promoResult.product_id || promoResult.product_id === product.id)
                    ? Number(product.price) * (1 - promoResult.discount_percent / 100)
                    : Number(product.price);

                  return (
                    <article key={product.id} className="group overflow-hidden rounded-[28px] border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant">
                      <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-br from-bordeaux/10 via-gold/10 to-bordeaux/5">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-5xl font-display text-bordeaux/30">BOOK</div>
                        )}
                        {product.tag && product.tag !== "none" ? (
                          <Badge className="absolute left-4 top-4 border-0 bg-gold text-gold-foreground hover:bg-gold">
                            {tagLabels[product.tag] ?? product.tag}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-4 p-6">
                        <div>
                          <h3 className="font-display text-2xl font-semibold text-foreground">{product.name}</h3>
                          <p className="mt-2 min-h-[40px] text-sm text-muted-foreground">
                            {product.description ?? "Curated learning product from the Edutopia marketplace."}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="font-display text-3xl font-bold text-bordeaux">{formatPrice(discountedPrice)}</div>
                            {discountedPrice !== Number(product.price) ? (
                              <div className="text-xs text-muted-foreground line-through">{formatPrice(Number(product.price))}</div>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                            onClick={() => addToCart(product.id)}
                            disabled={product.stock === 0}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{product.category ?? "General"}</span>
                          <span>{product.stock > 0 ? `${product.stock} left in stock` : "Out of stock"}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Card className="border-border/70 bg-white/90 shadow-elegant">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Your cart</CardTitle>
                <CardDescription>Collect the products you want before finishing the order.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                    Your cart is empty. Add products from the shop to start checkout.
                  </div>
                ) : (
                  cartLines.map((line) => (
                    <div key={line.product.id} className="rounded-2xl border border-border/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{line.product.name}</div>
                          <div className="text-xs text-muted-foreground">{formatPrice(Number(line.product.price))} each</div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeFromCart(line.product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(line.product.id, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-6 text-center font-medium text-foreground">{line.item.quantity}</span>
                          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(line.product.id, 1)} disabled={line.item.quantity >= line.product.stock}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="font-semibold text-bordeaux">{formatPrice(line.lineTotal)}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/90 shadow-elegant">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Checkout</CardTitle>
                <CardDescription>Choose the payment method and fill in the delivery coordinates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="checkout-payment-method">Payment method</Label>
                  <select
                    id="checkout-payment-method"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  >
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-full-name">Full name</Label>
                    <Input id="delivery-full-name" value={delivery.full_name} onChange={(event) => setDeliveryField("full_name", event.target.value)} placeholder="Who receives the order?" className={deliveryErrors.full_name ? "border-destructive" : undefined} />
                    {deliveryErrors.full_name ? <p className="text-xs text-destructive">{deliveryErrors.full_name}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-phone">Phone</Label>
                    <Input id="delivery-phone" value={delivery.phone} onChange={(event) => setDeliveryField("phone", event.target.value)} placeholder="+216 ..." className={deliveryErrors.phone ? "border-destructive" : undefined} />
                    {deliveryErrors.phone ? <p className="text-xs text-destructive">{deliveryErrors.phone}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-city">City</Label>
                    <Input id="delivery-city" value={delivery.city} onChange={(event) => setDeliveryField("city", event.target.value)} placeholder="Tunis" className={deliveryErrors.city ? "border-destructive" : undefined} />
                    {deliveryErrors.city ? <p className="text-xs text-destructive">{deliveryErrors.city}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-address">Address</Label>
                    <Input id="delivery-address" value={delivery.address} onChange={(event) => setDeliveryField("address", event.target.value)} placeholder="Street, building, apartment" className={deliveryErrors.address ? "border-destructive" : undefined} />
                    {deliveryErrors.address ? <p className="text-xs text-destructive">{deliveryErrors.address}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-postal-code">Postal code</Label>
                    <Input id="delivery-postal-code" value={delivery.postal_code} onChange={(event) => setDeliveryField("postal_code", event.target.value)} placeholder="Optional" className={deliveryErrors.postal_code ? "border-destructive" : undefined} />
                    {deliveryErrors.postal_code ? <p className="text-xs text-destructive">{deliveryErrors.postal_code}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-notes">Delivery notes</Label>
                    <Textarea id="delivery-notes" value={delivery.notes} onChange={(event) => setDeliveryField("notes", event.target.value)} placeholder="Landmark, floor, or special instructions" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-emerald-700">
                    <span>Promo discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 font-display text-xl font-bold text-bordeaux">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <Button type="button" className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={orderMutation.isPending || cartLines.length === 0} onClick={placeOrder}>
                  {orderMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming order...</> : <><Truck className="mr-2 h-4 w-4" /> Confirm order</>}
                </Button>

                {promoResult?.product_id && !matchingPromoProduct ? (
                  <p className="text-xs text-amber-700">This promo only applies when its matching product is in the cart.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/90 shadow-elegant">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Recent orders</CardTitle>
                <CardDescription>Your latest market requests and delivery details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">No orders yet.</div>
                ) : (
                  orders.slice(0, 4).map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-foreground">Order #{order.id}</div>
                        <Badge className="bg-bordeaux/10 text-bordeaux hover:bg-bordeaux/10">{order.status}</Badge>
                      </div>
                      <div className="mt-2 text-muted-foreground">{formatPrice(Number(order.total_amount))} via {paymentMethodLabels[order.payment_method]}</div>
                      <div className="mt-1 text-muted-foreground">{order.delivery_full_name ?? "Delivery pending"} • {order.delivery_city ?? "No city"}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

    </>
  );
}
