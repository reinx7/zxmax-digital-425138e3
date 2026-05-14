import React, { Component } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || "Erro desconhecido" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">
              ZX<span className="text-primary">MAX</span>
            </h1>
            <p className="text-destructive font-bold mb-2">Algo deu errado</p>
            <p className="text-muted-foreground text-sm mb-4">{this.state.error}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              className="btn-gradient px-6 py-3 rounded-xl font-bold text-sm"
            >
              Recarregar Pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
