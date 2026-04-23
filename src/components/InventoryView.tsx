import React, { useState } from "react";
import { useStore } from "@/store/StoreContext";
import { PackageEmoji } from "@/components/CustomEmojis";
import { Plus, X, Trash2, Link2, Copy } from "lucide-react";
import { toast } from "sonner";

interface Variation {
  name: string;
  price: string;
}

export default function InventoryView() {
  const { state, addProduct } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showAffiliated, setShowAffiliated] = useState(false);
  const [form, setForm] = useState({
    name: "", category: state.config.categories[0] || "", description: "", price: "",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    banner: "",
    deliveryType: "manual" as "auto" | "manual", deliveryContent: "",
    affiliateEnabled: false,
    affiliateCommission: "10",
  });
  const [variations, setVariations] = useState<Variation[]>([]);

  const myProducts = state.products.filter((p) => p.sellerEmail === state.currentUser?.email);

  // Sales for the user
  const mySales = state.purchases.filter((p) => p.sellerEmail === state.currentUser?.email);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return toast.error("Preencha nome e preço.");
    const commission = parseFloat(form.affiliateCommission);
    if (form.affiliateEnabled && (isNaN(commission) || commission <= 0 || commission > 90)) {
      return toast.error("Defina uma comissão de afiliado válida (1-90%).");
    }
    const parsedVariations = variations.filter((v) => v.name && v.price).map((v) => ({ name: v.name, price: parseFloat(v.price) }));
    addProduct({
      name: form.name, category: form.category, description: form.description,
      price: parseFloat(form.price), image: form.image, banner: form.banner || undefined,
      seller: state.currentUser!.name, sellerEmail: state.currentUser!.email,
      deliveryType: form.deliveryType, deliveryContent: form.deliveryContent,
      variations: parsedVariations.length > 0 ? parsedVariations : undefined,
      affiliateEnabled: form.affiliateEnabled,
      affiliateCommission: form.affiliateEnabled ? commission : undefined,
    });
    toast.success("Produto criado! Aguardando aprovação do admin.");
    setShowForm(false);
    setForm({ name: "", category: state.config.categories[0] || "", description: "", price: "", image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400", banner: "", deliveryType: "manual", deliveryContent: "", affiliateEnabled: false, affiliateCommission: "10" });
    setVariations([]);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-black text-foreground">Meus Anúncios</h1>
            <PackageEmoji className="w-8 h-8" />
          </div>
          <p className="text-muted-foreground">Gerencie seus produtos e vendas.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAffiliated(true)} className="px-5 py-3 text-sm flex items-center gap-2 rounded-xl bg-card border border-border/40 text-foreground hover:bg-muted transition">
            <Link2 className="w-4 h-4" /> Produtos Afiliados
          </button>
          <button onClick={() => setShowForm(true)} className="btn-gradient px-5 py-3 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-card md:bg-foreground/40 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4">
          <div className="h-full w-full overflow-y-auto p-6 pb-24 md:glass-card md:w-full md:max-w-lg md:max-h-[90vh] md:h-auto md:pb-6 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Criar Produto</h3>
              <button onClick={() => setShowForm(false)} className="rounded-xl p-2 hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do Produto" className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm">
                {state.config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada" rows={3} className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm resize-none" />
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" placeholder="Preço (R$)" className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm" />
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="URL da Imagem Principal" className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm" />
              <input value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} placeholder="URL do Banner/Imagem de Destaque (opcional)" className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm" />

              {/* Variations */}
              <div className="border border-border/40 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Variações (opcional)</p>
                  <button type="button" onClick={() => setVariations([...variations, { name: "", price: "" }])} className="text-primary text-xs font-bold">+ Adicionar</button>
                </div>
                {variations.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={v.name} onChange={(e) => { const nv = [...variations]; nv[i].name = e.target.value; setVariations(nv); }} placeholder="Nome (ex: Premium)" className="flex-1 p-2 rounded-lg bg-muted text-foreground text-xs border-none outline-none" />
                    <input value={v.price} onChange={(e) => { const nv = [...variations]; nv[i].price = e.target.value; setVariations(nv); }} placeholder="Preço" type="number" step="0.01" className="w-24 p-2 rounded-lg bg-muted text-foreground text-xs border-none outline-none" />
                    <button type="button" onClick={() => setVariations(variations.filter((_, j) => j !== i))} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Affiliates */}
              <div className="border border-border/40 rounded-xl p-3">
                <label className="flex items-center gap-2 text-sm text-foreground font-bold">
                  <input
                    type="checkbox"
                    checked={form.affiliateEnabled}
                    onChange={(e) => setForm({ ...form, affiliateEnabled: e.target.checked })}
                  />
                  Permitir afiliados
                </label>
                {form.affiliateEnabled && (
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground block mb-1">Comissão do afiliado (%)</label>
                    <input
                      value={form.affiliateCommission}
                      onChange={(e) => setForm({ ...form, affiliateCommission: e.target.value })}
                      type="number"
                      min="1"
                      max="90"
                      placeholder="Ex: 10"
                      className="w-full p-2 rounded-lg bg-muted text-foreground text-sm border-none outline-none focus:ring-2 ring-primary"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Porcentagem do valor que o afiliado recebe por cada venda gerada.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="delivery" checked={form.deliveryType === "manual"} onChange={() => setForm({ ...form, deliveryType: "manual" })} /> Manual
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="delivery" checked={form.deliveryType === "auto"} onChange={() => setForm({ ...form, deliveryType: "auto" })} /> Automática
                </label>
              </div>
              {form.deliveryType === "auto" && (
                <input value={form.deliveryContent} onChange={(e) => setForm({ ...form, deliveryContent: e.target.value })} placeholder="Código/Key/Link de entrega" className="w-full p-3 rounded-xl bg-muted border-none focus:ring-2 ring-primary outline-none text-foreground text-sm" />
              )}
              <button type="submit" className="w-full btn-gradient p-3 text-sm">Criar Produto</button>
            </form>
          </div>
        </div>
      )}

      {myProducts.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 text-center border-2 border-dashed border-border">
          <PackageEmoji className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">Nenhum anúncio ativo</h3>
          <p className="text-muted-foreground mt-2">Comece a vender hoje mesmo!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {myProducts.map((p) => {
            const productSales = mySales.filter((s) => s.productId === p.id);
            const hasPending = productSales.some((s) => s.status === "paid");
            return (
              <div key={p.id} className="glass-card p-5 flex items-center gap-4">
                <img src={p.image} className="w-16 h-16 rounded-xl object-cover" alt={p.name} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                  <p className="text-xs text-muted-foreground">{p.category} · {p.sales} vendas</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {hasPending && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Vendas pendentes</span>
                    )}
                    {p.affiliateEnabled && (
                      <span className="text-[10px] font-bold text-accent-foreground bg-accent/40 px-2 py-0.5 rounded-full">Afiliáveis · {p.affiliateCommission}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">R$ {p.price.toFixed(2)}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.approved ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {p.approved ? "Aprovado" : "Pendente"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My Affiliations modal */}
      {showAffiliated && (
        <div className="fixed inset-0 z-[60] bg-card md:bg-foreground/40 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4" onClick={() => setShowAffiliated(false)}>
          <div className="h-full w-full overflow-y-auto p-6 pb-24 md:glass-card md:w-full md:max-w-2xl md:max-h-[90vh] md:h-auto md:pb-6 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Produtos Afiliados</h3>
              </div>
              <button onClick={() => setShowAffiliated(false)} className="rounded-xl p-2 hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <MyAffiliationsList />
          </div>
        </div>
      )}
    </div>
  );
}

function MyAffiliationsList() {
  const { state } = useStore();
  if (!state.currentUser) return null;
  const myAffs = (state.affiliations || []).filter((a) => a.affiliateEmail === state.currentUser!.email);
  const items = myAffs
    .map((a) => ({ aff: a, product: state.products.find((p) => p.id === a.productId) }))
    .filter((x) => x.product);

  if (items.length === 0) {
    return (
      <div className="bg-card md:bg-muted rounded-2xl p-8 text-center border border-border/40">
        <Link2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-foreground font-bold">Você ainda não se afiliou a nenhum produto.</p>
        <p className="text-xs text-muted-foreground mt-1">Acesse a aba Afiliados para descobrir produtos disponíveis.</p>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refCode = encodeURIComponent(state.currentUser.email);

  return (
    <div className="space-y-3">
      {items.map(({ aff, product }) => {
        const link = `${origin}/?ref=${refCode}&product=${product!.id}`;
        return (
          <div key={aff.id} className="bg-muted rounded-2xl p-4">
            <div className="flex gap-3 items-center">
              <img src={product!.image} className="w-14 h-14 rounded-xl object-cover" alt={product!.name} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{product!.name}</p>
                <p className="text-xs text-muted-foreground">Comissão: <span className="text-primary font-bold">{product!.affiliateCommission || 0}%</span></p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <input readOnly value={link} className="flex-1 p-2 rounded-lg bg-card text-foreground text-xs border border-border/40 outline-none" />
              <button
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado!"); }}
                className="btn-gradient px-3 py-2 text-xs flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
