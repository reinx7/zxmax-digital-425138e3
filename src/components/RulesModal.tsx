import React from "react";
import { X, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RULES = [
  "Venda de conteúdo adulto",
  "Lavagem de dinheiro dentro do site",
  "Venda de gore/cp ou qualquer outro conteúdo errado",
  "Conteúdo de ensino criminoso",
  "Não entregar o produto mesmo após a venda",
  "Xingamento contra a moderação e clientes do site",
];

export default function RulesModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card bg-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black text-foreground">Regras do site</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-foreground mb-4">
          Essas são as regras, qualquer uma quebrada será suspensão do site.
        </p>

        <h3 className="text-sm font-bold text-destructive uppercase tracking-wider mb-2">Proibido</h3>
        <ol className="space-y-2 mb-4">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="font-bold text-primary shrink-0">{i + 1}-</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>

        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
          <p className="text-xs font-bold text-destructive">
            Todos aqueles que quebrarem as 4 primeiras regras serão banidos permanentemente.
          </p>
        </div>

        <button
          onClick={onClose}
          className="btn-gradient w-full mt-5 py-3 text-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
