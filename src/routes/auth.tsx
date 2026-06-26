import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="size-5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Estoq</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Controle total do seu estoque, em tempo real.
          </h1>
          <p className="text-muted-foreground max-w-md">
            Plataforma profissional de gestão para distribuidoras e pequenas empresas. Registre entradas, saídas e acompanhe relatórios claros.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Atualização automática do estoque</li>
            <li>• Alertas de produtos em falta</li>
            <li>• Relatórios de movimentação</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Estoq</p>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
              <Boxes className="size-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Estoq</span>
          </div>
          <h2 className="text-2xl font-semibold mb-1">Acesse sua conta</h2>
          <p className="text-sm text-muted-foreground mb-6">Entre ou crie sua empresa para começar.</p>
          <AuthTabs />
        </div>
      </div>
    </div>
  );
}

function AuthTabs() {
  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="login">Entrar</TabsTrigger>
        <TabsTrigger value="signup">Criar conta</TabsTrigger>
      </TabsList>
      <TabsContent value="login"><LoginForm /></TabsContent>
      <TabsContent value="signup"><SignupForm /></TabsContent>
    </Tabs>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("A senha precisa de pelo menos 8 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { company_name: companyName, full_name: fullName },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Redirecionando...");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="company">Nome da empresa</Label>
        <Input id="company" required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex.: Distribuidora ABC" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full">Seu nome</Label>
        <Input id="full" required value={fullName} onChange={e => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">E-mail</Label>
        <Input id="email2" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">Senha</Label>
        <Input id="password2" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
