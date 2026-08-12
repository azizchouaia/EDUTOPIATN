import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart, Tag, Trash2, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api, { assetUrl } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { hasMinLength, isBlank } from "@/lib/validation";
import { GOVERNORATES, TUNISIA } from "@/lib/tunisia";
import type { DeliveryDetails, MarketOrder, OrderItem, PaymentMethod, Product } from "@/lib/types";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Marché — Edutopia" },
      { name: "description", content: "Achetez des produits éducatifs, constituez votre panier et finalisez votre commande avec des codes promo, un mode de paiement et les détails de livraison." },
      { property: "og:title", content: "Marché — Edutopia" },
      { property: "og:description", content: "Produits sélectionnés et processus de commande complet." },
    ],
  }),
  component: MarketPage,
});

const tagLabels: Record<string, string> = {
  bestseller: "Meilleure vente",
  new: "Nouveau",
  limited: "Limité",
  promo: "Promo",
};

const CART_STORAGE_KEY = "market-cart";
const HIDDEN_ORDERS_KEY = "market-hidden-orders";

const DELIVERY_FEE = 8; // 8 DT frais de livraison fixes

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash_on_delivery: "Paiement a la livraison",
  card: "Paiement par carte",         // kept for display on old orders only
  bank_transfer: "Virement bancaire",
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
  return `${value.toFixed(2)} DT`;
}

type OrderSummary = {
  order_id: number;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  items: CartItem[];
};

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
    phone: storedUser?.phone ?? "",
  });
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryErrors>({});
  const [governorate, setGovernorate] = useState("");
  const [delegation, setDelegation] = useState("");
  // Auth reads localStorage → only true after client mount (avoids SSR mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const authed = mounted && isAuthenticated();
  const [lastOrderSummary, setLastOrderSummary] = useState<OrderSummary | null>(null);
  const [badgePulse, setBadgePulse] = useState(false);
  const [promoFlash, setPromoFlash] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<Set<number>>(() => {
    try {
      const raw = window.localStorage.getItem(HIDDEN_ORDERS_KEY);
      const parsed = raw ? (JSON.parse(raw) as number[]) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const prevCartCount = useRef(0);

  const { data: products = [], isLoading, isError: productsError, refetch: refetchProducts } = useQuery<Product[]>({
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
    enabled: isAuthenticated(),
  });

  // Fresh profile — the localStorage copy can be stale (phone added/changed
  // after login), so pull the current account to prefill delivery details.
  const { data: me } = useQuery<{ first_name?: string; last_name?: string; phone?: string | null }>({
    queryKey: ["me-market"],
    queryFn: async () => (await api.get("/auth/me")).data,
    enabled: isAuthenticated(),
  });

  // Prefill phone / full name from the profile when the user hasn't typed them yet
  useEffect(() => {
    if (!me) return;
    setDelivery((prev) => ({
      ...prev,
      phone: prev.phone || (me.phone ?? ""),
      full_name: prev.full_name || [me.first_name, me.last_name].filter(Boolean).join(" "),
    }));
  }, [me]);

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

  // Remove stale cart items once product list loads
  useEffect(() => {
    if (products.length === 0) return;
    const activeIds = new Set(products.filter((p) => p.is_active).map((p) => p.id));
    setCart((current) => current.filter((item) => activeIds.has(item.product_id)));
  }, [products]);

  // Clear promo when the promo-specific product is removed from the cart
  useEffect(() => {
    if (!promoResult?.product_id) return;
    const stillInCart = cart.some((item) => item.product_id === promoResult.product_id);
    if (!stillInCart) {
      setPromoResult(null);
      setPromoCode("");
    }
  }, [cart, promoResult?.product_id]);

  // Pulse badge when item count increases
  const cartCount = cart.reduce((n, item) => n + item.quantity, 0);
  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setBadgePulse(true);
      const id = setTimeout(() => setBadgePulse(false), 600);
      return () => clearTimeout(id);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  // Flash promo summary when a code is first applied
  useEffect(() => {
    if (!promoResult) return;
    setPromoFlash(true);
    const id = setTimeout(() => setPromoFlash(false), 950);
    return () => clearTimeout(id);
  }, [promoResult?.discount_percent, promoResult?.product_id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const total = Math.max(0, subtotal - discountAmount) + DELIVERY_FEE;
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
    onSuccess: (res) => {
      const data = res.data;
      setLastOrderSummary({
        order_id: data.order_id,
        subtotal: data.subtotal,
        discount_amount: data.discount_amount,
        delivery_fee: data.delivery_fee ?? DELIVERY_FEE,
        total: data.total,
        payment_method: data.payment_method,
        items: [...cart],
      });
      toast.success(`Commande #${data.order_id} enregistree.`);
      setCart([]);
      setPromoCode("");
      setPromoResult(null);
      setPaymentMethod("cash_on_delivery");
      setDelivery({
        ...INITIAL_DELIVERY,
        full_name: storedUser ? `${storedUser.first_name} ${storedUser.last_name}` : "",
        phone: me?.phone ?? storedUser?.phone ?? "",
      });
      setGovernorate("");
      setDelegation("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Commande impossible."),
  });

  const hideOrder = (orderId: number) => {
    setHiddenOrderIds((prev) => {
      const next = new Set([...prev, orderId]);
      try { window.localStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    setConfirmDeleteId(null);
  };

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
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return;
    }
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
          <span className="font-semibold text-xs uppercase tracking-[0.3em] text-gold">Boutique</span>
          <h1 className="mt-3 font-display text-5xl font-bold md:text-6xl">Le Marché Edutopia</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="mx-auto max-w-2xl text-primary-foreground/80">
            Constituez votre panier, appliquez des codes promo, choisissez votre mode de paiement et saisissez vos informations de livraison avant de confirmer la commande.
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
              <p className="font-display text-lg font-semibold text-bordeaux">Vous avez un code promo ?</p>
              <p className="text-sm text-muted-foreground">
                {promoResult
                  ? `Applied: ${promoResult.discount_percent}% off${promoResult.product_id ? " on one matching product" : " on the whole cart"}`
                  : "Appliquez-le avant de valider pour économiser immédiatement."}
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
              {promoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <div>
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground">Produits à la une</h2>
                <p className="mt-2 text-sm text-muted-foreground">Ajoutez des produits au panier, puis validez avec les informations de livraison et de paiement.</p>
              </div>
              <Badge className={`w-fit bg-bordeaux/10 px-3 py-1 text-bordeaux hover:bg-bordeaux/10 transition-all${badgePulse ? " badge-pulse" : ""}`}>
                {cartCount} article{cartCount > 1 ? "s" : ""} dans le panier
              </Badge>
            </div>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden rounded-[28px] border border-border bg-card">
                    <div className="skeleton aspect-[4/3] rounded-none" />
                    <div className="space-y-3 p-6">
                      <div className="skeleton h-6 w-3/4" />
                      <div className="skeleton h-4 w-full" />
                      <div className="flex items-end justify-between pt-2">
                        <div className="skeleton h-8 w-24" />
                        <div className="skeleton h-10 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productsError ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-destructive">Impossible de charger les produits. Veuillez verifier votre connexion.</p>
                <Button variant="outline" size="sm" onClick={() => refetchProducts()}>Reessayer</Button>
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
                          <img src={assetUrl(product.image_url) ?? undefined} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                            {product.description ?? "Produit éducatif sélectionné par Edutopia."}
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
                            <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{product.category ?? "General"}</span>
                          <span className={product.stock === 0 ? "font-semibold text-destructive" : product.stock <= 5 ? "font-semibold text-amber-600 dark:text-amber-400" : undefined}>
                            {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Card className="border-border/70 bg-card/90 shadow-elegant">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Votre panier</CardTitle>
                <CardDescription>Ajoutez les produits souhaités avant de finaliser la commande.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                    Votre panier est vide. Ajoutez des produits pour commencer.
                  </div>
                ) : (
                  cartLines.map((line) => (
                    <div key={line.product.id} className="cart-item-enter rounded-2xl border border-border/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {line.product.image_url ? (
                            <img src={assetUrl(line.product.image_url) ?? undefined} alt={line.product.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux/10 text-xs font-display text-bordeaux/50">IMG</div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{line.product.name}</div>
                            <div className="text-xs text-muted-foreground">{formatPrice(Number(line.product.price))} l'unité</div>
                          </div>
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

            <Card className="border-border/70 bg-card/90 shadow-elegant">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Commande</CardTitle>
                <CardDescription>Choisissez le mode de paiement et renseignez les coordonnées de livraison.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="checkout-payment-method">Mode de paiement</Label>
                  <select
                    id="checkout-payment-method"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  >
                    <option value="cash_on_delivery">Paiement a la livraison</option>
                    <option value="bank_transfer">Virement bancaire</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-full-name">Nom complet</Label>
                    <Input id="delivery-full-name" value={delivery.full_name} onChange={(event) => setDeliveryField("full_name", event.target.value)} placeholder="Qui reçoit la commande ?" className={deliveryErrors.full_name ? "border-destructive" : undefined} />
                    {deliveryErrors.full_name ? <p className="text-xs text-destructive">{deliveryErrors.full_name}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-phone">Téléphone</Label>
                    <Input id="delivery-phone" value={delivery.phone} onChange={(event) => setDeliveryField("phone", event.target.value)} placeholder="+216 ..." className={deliveryErrors.phone ? "border-destructive" : undefined} />
                    {deliveryErrors.phone ? <p className="text-xs text-destructive">{deliveryErrors.phone}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-governorate">Gouvernorat</Label>
                    <select
                      id="delivery-governorate"
                      value={governorate}
                      onChange={(e) => {
                        const g = e.target.value;
                        setGovernorate(g);
                        setDelegation("");
                        setDeliveryField("city", "");
                      }}
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${deliveryErrors.city && !governorate ? "border-destructive" : "border-input"}`}
                    >
                      <option value="">— Choisir —</option>
                      {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-delegation">Délégation</Label>
                    <select
                      id="delivery-delegation"
                      value={delegation}
                      disabled={!governorate}
                      onChange={(e) => {
                        const d = e.target.value;
                        setDelegation(d);
                        setDeliveryField("city", d ? `${d}, ${governorate}` : "");
                      }}
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${deliveryErrors.city && governorate && !delegation ? "border-destructive" : "border-input"}`}
                    >
                      <option value="">{governorate ? "— Choisir —" : "Choisis d'abord un gouvernorat"}</option>
                      {(TUNISIA[governorate] ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {deliveryErrors.city ? <p className="text-xs text-destructive">{deliveryErrors.city}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-address">Adresse</Label>
                    <Input id="delivery-address" value={delivery.address} onChange={(event) => setDeliveryField("address", event.target.value)} placeholder="Rue, bâtiment, appartement" className={deliveryErrors.address ? "border-destructive" : undefined} />
                    {deliveryErrors.address ? <p className="text-xs text-destructive">{deliveryErrors.address}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-postal-code">Code postal</Label>
                    <Input id="delivery-postal-code" value={delivery.postal_code} onChange={(event) => setDeliveryField("postal_code", event.target.value)} placeholder="Optionnel" className={deliveryErrors.postal_code ? "border-destructive" : undefined} />
                    {deliveryErrors.postal_code ? <p className="text-xs text-destructive">{deliveryErrors.postal_code}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="delivery-notes">Instructions de livraison</Label>
                    <Textarea id="delivery-notes" value={delivery.notes} onChange={(event) => setDeliveryField("notes", event.target.value)} placeholder="Point de repère, étage ou instructions spéciales" />
                  </div>
                </div>

                <div className={`rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm${promoFlash ? " promo-flash" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span>Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="mt-2 flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Remise promo</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-muted-foreground">
                    <span>Frais de livraison</span>
                    <span>{formatPrice(DELIVERY_FEE)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 font-display text-xl font-bold text-bordeaux">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <Button type="button" className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={orderMutation.isPending || cartLines.length === 0} onClick={placeOrder}>
                  {orderMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmation en cours...</> : authed ? <><Truck className="mr-2 h-4 w-4" /> Confirmer la commande</> : "Se connecter pour commander"}
                </Button>

                {!authed ? (
                  <p className="text-center text-xs text-muted-foreground">Vous devez <a href="/login" className="font-medium text-bordeaux underline-offset-4 hover:underline">vous connecter</a> pour passer une commande.</p>
                ) : promoResult?.product_id && !matchingPromoProduct ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">This promo only applies when its matching product is in the cart.</p>
                ) : null}
              </CardContent>
            </Card>

            {lastOrderSummary ? (
              <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 shadow-elegant">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-emerald-700 dark:text-emerald-400">Order #{lastOrderSummary.order_id} confirmed</CardTitle>
                  <CardDescription className="text-emerald-600 dark:text-emerald-500">Votre commande a été enregistrée. Nous vous contacterons rapidement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {lastOrderSummary.items.map((item) => {
                    const product = productMap.get(item.product_id);
                    if (!product) return null;
                    return (
                      <div key={item.product_id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {product.image_url ? (
                            <img src={assetUrl(product.image_url) ?? undefined} alt={product.name} className="h-8 w-8 rounded object-cover" />
                          ) : null}
                          <span>{product.name} × {item.quantity}</span>
                        </div>
                        <span className="font-medium">{formatPrice(Number(product.price) * item.quantity)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-2 space-y-1">
                    {lastOrderSummary.discount_amount > 0 ? (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-500"><span>Remise</span><span>-{formatPrice(lastOrderSummary.discount_amount)}</span></div>
                    ) : null}
                    <div className="flex justify-between text-muted-foreground"><span>Livraison</span><span>{formatPrice(lastOrderSummary.delivery_fee ?? DELIVERY_FEE)}</span></div>
                    <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400"><span>Total</span><span>{formatPrice(lastOrderSummary.total)}</span></div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="w-full text-emerald-600 dark:text-emerald-500" onClick={() => setLastOrderSummary(null)}>Fermer</Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/70 bg-card/90 shadow-elegant">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-display text-2xl text-bordeaux">Commandes récentes</CardTitle>
                  <CardDescription>Vos dernières commandes et informations de livraison.</CardDescription>
                </div>
                {orders.filter((o) => !hiddenOrderIds.has(o.id)).length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllOrders((v) => !v)}
                    className="shrink-0 text-xs font-medium text-bordeaux underline-offset-4 hover:underline"
                  >
                    {showAllOrders ? "Voir moins" : `Tout voir (${orders.filter((o) => !hiddenOrderIds.has(o.id)).length})`}
                  </button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.filter((o) => !hiddenOrderIds.has(o.id)).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">Aucune commande pour l'instant.</div>
                ) : (
                  (showAllOrders
                    ? orders.filter((o) => !hiddenOrderIds.has(o.id))
                    : orders.filter((o) => !hiddenOrderIds.has(o.id)).slice(0, 4)
                  ).map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-foreground">Order #{order.id}</div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-bordeaux/10 text-bordeaux hover:bg-bordeaux/10">{order.status}</Badge>
                          {(order.status === "pending" || order.status === "cancelled") && confirmDeleteId !== order.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(order.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                              title="Supprimer la commande"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {confirmDeleteId === order.id && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => hideOrder(order.id)}
                                className="rounded px-2 py-0.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                Masquer
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-muted-foreground">{formatPrice(Number(order.total_amount))} via {paymentMethodLabels[order.payment_method]}</div>
                      <div className="mt-1 text-muted-foreground">{order.delivery_full_name ?? "Livraison en attente"} • {order.delivery_city ?? "Ville non renseignée"}</div>
                      {order.items && order.items.length > 0 ? (
                        <div className="mt-3 space-y-1 border-t border-border/50 pt-2">
                          {order.items.map((item: OrderItem) => (
                            <div key={item.product_id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.product_image_url ? (
                                <img src={assetUrl(item.product_image_url) ?? undefined} alt={item.product_name} className="h-6 w-6 rounded object-cover" />
                              ) : null}
                              <span>{item.product_name} × {item.quantity}</span>
                              <span className="ml-auto">{formatPrice(Number(item.unit_price) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
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
