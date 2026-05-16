import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-page p-4">
      <div className="text-center glass-card p-10 max-w-md">
        <h1 className="text-5xl font-black tracking-tighter text-foreground mb-4">
          ZX<span className="text-primary">MAX</span>
        </h1>
        <h2 className="text-6xl font-black text-primary mb-4">404</h2>
        <p className="text-xl text-muted-foreground mb-8">Pagina nao encontrada</p>
        <a href="/" className="btn-gradient px-8 py-4 rounded-2xl text-sm font-bold inline-block">
          Voltar para o Inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
