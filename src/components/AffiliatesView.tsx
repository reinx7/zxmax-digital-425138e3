import React, { useState } from "react";
import { useStore } from "@/store/StoreContext";
import { Link2, Copy, X, Check } from "lucide-react";
import { toast } from "sonner";
import { StarEmoji } from "@/components/CustomEmojis";

export default function AffiliatesView() {
  const { state, affiliateProduct, unaffiliateProduct } = useStore();
  const [linkProductId, setLinkProductId] = useState<number | null>(null);

  const affiliable = state.products.filter((p) => p.approved && p.affiliateEnabled);
  const myAffEmail = state.currentUser?.email;
  const myAffs = (state.affiliations || []).filter((a) => a.affiliateEmail === myAffEmail);
  const isAffiliated = (productId: number) =>
    myAffs.some((a) => a.productId === productId);

  const linkProduct = linkProductId ? state.products.find((p) => p.id === linkProductId) : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refCode = myAffEmail ? encodeURIComponent(myAffEmail) : "";
  const shareLink = linkProduct ? `${origin}/?ref=${refCode}&product=${linkProduct.id}` : "";

  const handleAffiliate = (productId: number) => {
    if (!state.currentUser) {
      toast.error("Faça login para se afiliar.");
      return;
    }
    affiliateProduct(productId);
    toast.success("Você se afiliou ao produto");
    setLinkProductId(productId);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copiado!");
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-black text-foreground">Afiliados</h1>
          <Link2 className="w-7 h-7 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Divulgue produtos e ganhe comissão por venda. Comissão por último clique.
        </p>
      </div>

      {affiliable.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 text-center border-2 border-dashed border-border">
          <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground">Nenhum produto disponível para afiliação</h3>
          <p className="text-muted-foreground mt-2">Volte mais tarde — vendedores podem habilitar afiliação a qualquer momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {affiliable.map((p) => {
            const affiliated = isAffiliated(p.id);
            return (
              <div key={p.id} className="glass-card overflow-hidden flex flex-col">
                <div className="relative h-44 overflow-hidden">
                  <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[11px] font-black shadow">
                    {p.affiliateCommission}% de comissão
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-foreground leading-tight">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mb-1">por <span className="text-primary font-semibold">{p.seller}</span></p>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{p.description}</p>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Preço</p>
                      <p className="text-xl font-black text-foreground">R$ {p.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <StarEmoji className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold text-foreground">{p.rating || "Novo"}</span>
                    </div>
                  </div>
                  {affiliated ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLinkProductId(p.id)}
                        className="flex-1 btn-gradient py-2.5 text-sm flex items-center justify-center gap-1"
                      >
                        <Link2 className="w-4 h-4" /> Ver link
                      </button>
                      <button
                        onClick={() => { unaffiliateProduct(p.id); toast.success("Afiliação removida."); }}
                        className="px-3 py-2.5 text-sm rounded-xl bg-card border border-border/40 text-muted-foreground hover:text-destructive transition"
                        title="Remover afiliação"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAffiliate(p.id)}
                      className="w-full btn-gradient py-2.5 text-sm font-bold"
                    >
                      Afiliar-se
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link / divulgação modal */}
      {linkProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
          onClick={() => setLinkProductId(null)}
        >
          <div
            className="glass-card bg-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-success" />
                <h3 className="text-lg font-black text-foreground">Você se afiliou ao produto</h3>
              </div>
              <button onClick={() => setLinkProductId(null)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="bg-muted rounded-2xl overflow-hidden mb-4">
              <img src={linkProduct.banner || linkProduct.image} className="w-full h-40 object-cover" alt={linkProduct.name} />
              <div className="p-4">
                <h4 className="font-bold text-foreground text-lg">{linkProduct.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">por {linkProduct.seller}</p>
                <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{linkProduct.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-card p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Preço</p>
                    <p className="text-base font-black text-foreground">R$ {linkProduct.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-card p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Sua comissão</p>
                    <p className="text-base font-black text-primary">{linkProduct.affiliateCommission}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Seu link de divulgação
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 p-3 rounded-xl bg-muted text-foreground text-xs border border-border/40 outline-none"
                />
                <button onClick={copyLink} className="btn-gradient px-4 py-3 text-sm flex items-center gap-1">
                  <Copy className="w-4 h-4" /> Copiar
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Você recebe a comissão pelo último clique. Compartilhe esse link nas suas redes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
