import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { detectDocType, fetchCnpj, formatDoc, isValidDoc, onlyDigits } from "@/lib/cpf-cnpj";
import { AuthStage, AuthStageCompact } from "@/components/auth-stage";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  describeAuthError,
  passwordRules,
  passwordScore,
  validateConfirm,
  validateEmail,
  validatePassword,
  validateRequired,
  type FriendlyError,
} from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

type TabKey = "login" | "signup";

/**
 * Métrica dos campos desta tela.
 *
 * O sistema usa 36px de altura por ser um ERP denso; na porta de entrada a
 * densidade não ajuda ninguém. Aqui os campos vão a 44px com mais respiro,
 * aplicados num lugar só para não bifurcar o componente `Input` global.
 */
const AUTH_FIELDS = "[&_input]:h-11 [&_input]:rounded-lg [&_input]:px-3.5 [&_input]:text-[14px]";

/** Ação principal: 44px, largura total, tipografia um degrau acima. */
const AUTH_SUBMIT = "h-11 w-full rounded-lg text-[14px]";

/**
 * A partir daqui cabe a encenação completa ao lado do formulário. Abaixo
 * disso ela vira a versão compacta, acima do card. Só uma das duas é
 * montada — nada de dois relógios rodando para exibir um.
 */
const WIDE_VIEWPORT = "(min-width: 1024px)";

function AuthPage() {
  const [tab, setTab] = useState<TabKey>("login");
  const wide = useMediaQuery(WIDE_VIEWPORT);

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
      {wide && <AuthStage />}

      <div className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-10 lg:py-12 xl:px-16">
        <div className="w-full max-w-[440px]">
          {/* Em telas estreitas a demonstração vem antes do formulário: a
              prova de valor não pode existir só no desktop. */}
          {!wide && <AuthStageCompact />}

          {/* O formulário mora num card do sistema — mesma linguagem das telas
              internas, para que entrar já pareça estar dentro do produto. */}
          <div className="animate-enter relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-overlay)] sm:p-8 lg:mt-0">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
            />

            <h1
              className="animate-enter text-[26px] font-semibold leading-[1.2] tracking-[-0.022em] text-foreground"
              style={{ animationDelay: "60ms" }}
            >
              {tab === "login" ? "Acesse sua conta" : "Crie sua conta"}
            </h1>
            <p
              className="animate-enter mt-2 text-[14px] leading-relaxed text-muted-foreground"
              style={{ animationDelay: "110ms" }}
            >
              {tab === "login"
                ? "Entre para continuar gerenciando sua operação."
                : "Leva menos de um minuto. Nenhum cartão é necessário."}
            </p>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as TabKey)}
              className="animate-enter mt-8 w-full"
              style={{ animationDelay: "170ms" }}
            >
              <TabsList className="grid h-10 w-full grid-cols-2">
                <TabsTrigger value="login" className="h-9">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="h-9">
                  Criar conta
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignupForm onGoToLogin={() => setTab("login")} />
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] leading-none text-text-tertiary">
            <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            Conexão criptografada · dados isolados por empresa
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças de formulário                                                 */
/* ------------------------------------------------------------------ */

/** Aviso no topo do formulário. Explica o que houve e oferece a saída. */
function FormAlert({ error, onAction }: { error: FriendlyError; onAction?: () => void }) {
  return (
    <div
      role="alert"
      className="animate-enter flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/[0.07] px-3.5 py-3"
    >
      <AlertTriangle
        className="mt-px size-4 shrink-0 text-destructive"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-destructive">{error.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {error.description}
        </p>
        {error.action === "go-login" && onAction && (
          <Button variant="outline" size="sm" className="mt-2.5" onClick={onAction} type="button">
            Ir para Login
          </Button>
        )}
      </div>
    </div>
  );
}

/** Campo com rótulo, erro inline e ligação acessível entre os dois. */
function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1 text-[11px] leading-snug text-destructive"
        >
          <XCircle className="mt-px size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <div id={`${id}-hint`}>{hint}</div>
      )}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        error={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-text-tertiary transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOff className="size-3.5" strokeWidth={1.75} />
        ) : (
          <Eye className="size-3.5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

/** Requisitos de senha, com o que já foi atendido marcado em tempo real. */
function PasswordChecklist({ value }: { value: string }) {
  const rules = passwordRules(value);
  const score = passwordScore(value);
  return (
    <div className="space-y-2 pt-0.5">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-200 ease-out",
              i < score
                ? score <= 1
                  ? "bg-destructive"
                  : score <= 2
                    ? "bg-warning"
                    : "bg-primary"
                : "bg-secondary",
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((r) => (
          <li
            key={r.id}
            className={cn(
              "flex items-center gap-1 text-[11px] leading-tight transition-colors duration-150",
              r.met ? "text-primary" : r.required ? "text-muted-foreground" : "text-text-tertiary",
            )}
          >
            <Check
              className={cn(
                "size-3 shrink-0 transition-opacity duration-150",
                r.met ? "opacity-100" : "opacity-30",
              )}
              strokeWidth={2.5}
              aria-hidden="true"
            />
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const navigate = useNavigate();

  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password && !password ? "Informe sua senha." : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = [validateEmail(email), password ? null : "Informe sua senha."].filter(Boolean);
    if (errs.length > 0) return;

    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setFormError(describeAuthError(error));
        return;
      }
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      // Falha de rede rejeita a promise: sem este catch o botão trava.
      setFormError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", AUTH_FIELDS)} noValidate>
      {formError && <FormAlert error={formError} />}

      <Field id="email" label="E-mail" error={emailError} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />
      </Field>

      <Field id="password" label="Senha" error={passwordError} required>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" disabled={loading} className={AUTH_SUBMIT}>
        {loading && <Loader2 className="animate-spin" strokeWidth={2} />}
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Cadastro                                                            */
/* ------------------------------------------------------------------ */

function SignupForm({ onGoToLogin }: { onGoToLogin: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [docInput, setDocInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const navigate = useNavigate();

  const docDigits = useMemo(() => onlyDigits(docInput), [docInput]);
  const docType = detectDocType(docDigits);
  const docValid = docDigits.length === 0 ? null : isValidDoc(docDigits);

  // Auto-fill company name from BrasilAPI on valid CNPJ
  const lastFetchedRef = useRef("");
  useEffect(() => {
    if (docType !== "CNPJ" || !docValid) return;
    if (docDigits === lastFetchedRef.current) return;
    lastFetchedRef.current = docDigits;
    const ctrl = new AbortController();
    setCnpjLoading(true);
    fetchCnpj(docDigits, ctrl.signal)
      .then((info) => {
        if (!info) return;
        if (!companyName.trim() && (info.nome_fantasia || info.razao_social)) {
          setCompanyName(info.nome_fantasia || info.razao_social || "");
          toast.success("Dados da empresa preenchidos pelo CNPJ");
        }
      })
      .finally(() => setCnpjLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docDigits, docType, docValid]);

  /* --- Validação em tempo real (após o primeiro blur) --------------- */
  const docError = touched.doc
    ? !docDigits
      ? "Informe o CPF ou CNPJ da empresa."
      : !docValid
        ? "O CPF/CNPJ informado não é válido. Confira os números digitados."
        : null
    : null;
  const companyError = touched.companyName
    ? validateRequired(companyName, "o nome da empresa")
    : null;
  const nameError = touched.fullName ? validateRequired(fullName, "seu nome") : null;
  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const confirmError = touched.confirm ? validateConfirm(password, confirm) : null;

  function allErrors() {
    return [
      !docDigits ? "doc" : !docValid ? "doc" : null,
      validateRequired(companyName, "o nome da empresa") ? "companyName" : null,
      validateRequired(fullName, "seu nome") ? "fullName" : null,
      validateEmail(email) ? "email" : null,
      validatePassword(password) ? "password" : null,
      validateConfirm(password, confirm) ? "confirm" : null,
    ].filter(Boolean) as string[];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      doc: true,
      companyName: true,
      fullName: true,
      email: true,
      password: true,
      confirm: true,
    });
    if (allErrors().length > 0) {
      setFormError(null);
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { company_name: companyName, full_name: fullName, company_doc: docDigits },
        },
      });
      if (error) {
        setFormError(describeAuthError(error));
        return;
      }
      setSucceeded(true);
      // Deixa a confirmação visível antes de trocar de tela.
      setTimeout(() => navigate({ to: "/dashboard" }), 1400);
    } catch (err) {
      setFormError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (succeeded) {
    return (
      <div className="animate-enter flex flex-col items-center py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="mt-4 text-[16px] font-semibold tracking-[-0.014em] text-foreground">
          Conta criada com sucesso.
        </p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">Estamos preparando seu ambiente.</p>
        <Loader2
          className="mt-5 size-4 animate-spin text-text-tertiary"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", AUTH_FIELDS)} noValidate>
      {formError && <FormAlert error={formError} onAction={onGoToLogin} />}

      <fieldset className="space-y-5">
        <legend className="sr-only">Dados da empresa</legend>

        <Field
          id="doc"
          label="CPF ou CNPJ da empresa"
          error={docError}
          required
          hint={
            docType && docValid === true ? (
              <p className="text-[11px] text-primary">{docType} válido</p>
            ) : null
          }
        >
          <div className="relative">
            <Input
              id="doc"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              placeholder="00.000.000/0000-00"
              value={docInput}
              error={!!docError}
              aria-describedby={docError ? "doc-error" : undefined}
              onChange={(e) => setDocInput(formatDoc(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, doc: true }))}
              onPaste={(e) => {
                e.preventDefault();
                setDocInput(formatDoc(e.clipboardData.getData("text")));
              }}
              className={cn(
                "pr-9 tabular-nums",
                docValid === true && "border-primary/60 focus-visible:ring-primary/30",
              )}
            />
            {cnpjLoading && (
              <Loader2
                className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-label="Buscando dados do CNPJ"
              />
            )}
            {!cnpjLoading && docValid === true && (
              <CheckCircle2
                className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
            )}
            {!cnpjLoading && docValid === false && (
              <XCircle
                className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-destructive"
                aria-hidden="true"
              />
            )}
          </div>
        </Field>

        <Field id="company" label="Nome da empresa" error={companyError} required>
          <Input
            id="company"
            required
            value={companyName}
            error={!!companyError}
            aria-describedby={companyError ? "company-error" : undefined}
            placeholder="Ex.: Distribuidora ABC"
            onChange={(e) => setCompanyName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, companyName: true }))}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="sr-only">Seus dados de acesso</legend>

        <Field id="full" label="Seu nome" error={nameError} required>
          <Input
            id="full"
            required
            autoComplete="name"
            value={fullName}
            error={!!nameError}
            aria-describedby={nameError ? "full-error" : undefined}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
          />
        </Field>

        <Field id="email2" label="E-mail" error={emailError} required>
          <Input
            id="email2"
            type="email"
            required
            autoComplete="email"
            value={email}
            error={!!emailError}
            aria-describedby={emailError ? "email2-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
        </Field>

        <Field
          id="password2"
          label="Senha"
          error={passwordError}
          required
          hint={<PasswordChecklist value={password} />}
        >
          <PasswordInput
            id="password2"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            autoComplete="new-password"
          />
        </Field>

        <Field id="confirm" label="Confirme a senha" error={confirmError} required>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            error={confirmError}
            autoComplete="new-password"
          />
        </Field>
      </fieldset>

      <Button type="submit" disabled={loading} className={AUTH_SUBMIT}>
        {loading && <Loader2 className="animate-spin" strokeWidth={2} />}
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-text-tertiary">
        Ao criar sua conta você inicia o período de teste gratuito. Nenhum cartão é solicitado.
      </p>
    </form>
  );
}
