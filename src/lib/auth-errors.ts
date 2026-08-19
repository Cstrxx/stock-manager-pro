/**
 * Tradução de falhas de autenticação para linguagem do usuário.
 *
 * O Supabase devolve mensagens em inglês e voltadas a desenvolvedor
 * ("User already registered", "Database error saving new user"). Exibir
 * isso direto deixa o usuário sem saber o que aconteceu nem como resolver.
 *
 * Cada erro conhecido vira: o que aconteceu, por que, e qual o próximo
 * passo. O fallback nunca é genérico a ponto de não orientar.
 *
 * Nada aqui altera autenticação ou regra de negócio — é apenas leitura do
 * erro que o Supabase já retorna.
 */

export type AuthErrorAction = "go-login" | "recover-password" | "retry";

export type FriendlyError = {
  /** Frase principal: o que aconteceu. */
  title: string;
  /** Complemento: por que e como resolver. */
  description: string;
  /** Campo culpado, quando identificável — permite marcar o input. */
  field?: "email" | "password" | "doc" | "fullName" | "companyName";
  action?: AuthErrorAction;
};

type SupabaseLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

function text(e: SupabaseLike): string {
  return `${e.code ?? ""} ${e.message ?? ""}`.toLowerCase();
}

/** Falha de rede: a requisição nem chegou ao servidor. */
function isNetwork(e: SupabaseLike): boolean {
  const t = text(e);
  return (
    e.name === "AuthRetryableFetchError" ||
    e.name === "TypeError" ||
    t.includes("failed to fetch") ||
    t.includes("networkerror") ||
    t.includes("network request failed") ||
    t.includes("load failed")
  );
}

export function describeAuthError(raw: unknown): FriendlyError {
  const e = (raw ?? {}) as SupabaseLike;
  const t = text(e);

  /* --- Sem conexão ------------------------------------------------- */
  if (isNetwork(e)) {
    return {
      title: "Não foi possível conectar ao servidor.",
      description: "Verifique sua conexão com a internet e tente novamente.",
      action: "retry",
    };
  }

  /* --- E-mail já cadastrado ---------------------------------------- */
  if (
    t.includes("user already registered") ||
    t.includes("user_already_exists") ||
    t.includes("email address is already") ||
    t.includes("already been registered")
  ) {
    return {
      title: "Já existe uma conta utilizando este e-mail.",
      description: "Faça login ou utilize outro endereço de e-mail.",
      field: "email",
      action: "go-login",
    };
  }

  /* --- E-mail inválido ---------------------------------------------- */
  if (
    t.includes("unable to validate email") ||
    t.includes("invalid email") ||
    t.includes("email_address_invalid")
  ) {
    return {
      title: "O endereço informado não possui um formato válido.",
      description: "Confira se o e-mail está escrito corretamente, incluindo o @ e o domínio.",
      field: "email",
    };
  }

  /* --- Senha fraca --------------------------------------------------- */
  if (t.includes("weak_password") || t.includes("password should be") || t.includes("password is too short")) {
    const min = e.message?.match(/(\d+)\s*characters/)?.[1];
    return {
      title: `A senha precisa ter no mínimo ${min ?? 8} caracteres.`,
      description: "Escolha uma senha mais longa para proteger sua conta.",
      field: "password",
    };
  }

  if (t.includes("signup requires a valid password")) {
    return {
      title: "Informe uma senha para criar sua conta.",
      description: "O campo de senha não pode ficar em branco.",
      field: "password",
    };
  }

  /* --- Documento já vinculado --------------------------------------- */
  // Violação de unicidade vinda de trigger/constraint no cadastro.
  if (
    t.includes("23505") ||
    t.includes("duplicate key") ||
    ((t.includes("cnpj") || t.includes("cpf") || t.includes("document") || t.includes("doc")) &&
      t.includes("already"))
  ) {
    return {
      title: "Este CPF/CNPJ já está vinculado a outra conta.",
      description: "Se esta conta for sua, faça login ou recupere sua senha.",
      field: "doc",
      action: "go-login",
    };
  }

  /* --- Credenciais inválidas (login) --------------------------------- */
  if (t.includes("invalid login credentials") || t.includes("invalid_credentials")) {
    return {
      title: "E-mail ou senha incorretos.",
      description: "Confira os dados informados. Se esqueceu a senha, você pode recuperá-la.",
      field: "password",
      action: "recover-password",
    };
  }

  if (t.includes("email not confirmed") || t.includes("email_not_confirmed")) {
    return {
      title: "Seu e-mail ainda não foi confirmado.",
      description: "Procure a mensagem de confirmação na sua caixa de entrada — inclusive no spam.",
      field: "email",
    };
  }

  /* --- Limite de tentativas ------------------------------------------ */
  if (t.includes("rate limit") || t.includes("over_email_send_rate_limit") || e.status === 429) {
    const secs = e.message?.match(/after (\d+) seconds?/)?.[1];
    return {
      title: "Muitas tentativas em pouco tempo.",
      description: secs
        ? `Aguarde ${secs} segundos antes de tentar novamente.`
        : "Aguarde alguns instantes antes de tentar novamente.",
      action: "retry",
    };
  }

  /* --- Falha no servidor ao criar o usuário -------------------------- */
  // Normalmente um trigger de criação de empresa/perfil que falhou.
  if (t.includes("database error") || t.includes("unexpected_failure") || (e.status ?? 0) >= 500) {
    return {
      title: "Não foi possível concluir seu cadastro neste momento.",
      description:
        "Houve uma falha ao preparar sua conta. Tente novamente em alguns instantes — se persistir, entre em contato com o suporte.",
      action: "retry",
    };
  }

  /* --- Desconhecido: ainda assim orienta ----------------------------- */
  return {
    title: "Não foi possível concluir seu cadastro neste momento.",
    description: "Tente novamente em alguns instantes.",
    action: "retry",
  };
}

/* ------------------------------------------------------------------ */
/* Validação de formulário                                             */
/* ------------------------------------------------------------------ */

/** Formato de e-mail: um @ com domínio contendo ponto e TLD plausível. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Informe seu e-mail.";
  if (!EMAIL_RE.test(v)) return "O endereço informado não possui um formato válido.";
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `Informe ${label}.`;
}

export type PasswordRule = { id: string; label: string; met: boolean; required: boolean };

/**
 * Requisitos de senha.
 *
 * Apenas o comprimento mínimo bloqueia o envio — é a regra que já existia
 * no sistema. Maiúscula, número e caractere especial entram como
 * recomendação de segurança: endurecê-las mudaria quem consegue se
 * cadastrar, o que seria alterar regra de negócio.
 */
export const PASSWORD_MIN = 8;

export function passwordRules(value: string): PasswordRule[] {
  return [
    { id: "len", label: `Mínimo de ${PASSWORD_MIN} caracteres`, met: value.length >= PASSWORD_MIN, required: true },
    { id: "upper", label: "Uma letra maiúscula", met: /[A-ZÀ-Þ]/.test(value), required: false },
    { id: "digit", label: "Um número", met: /\d/.test(value), required: false },
    { id: "special", label: "Um caractere especial", met: /[^\w\s]/.test(value), required: false },
  ];
}

export function validatePassword(value: string): string | null {
  if (!value) return "Informe uma senha.";
  if (value.length < PASSWORD_MIN) return `A senha precisa ter no mínimo ${PASSWORD_MIN} caracteres.`;
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Confirme sua senha.";
  if (password !== confirm) return "As senhas informadas não coincidem.";
  return null;
}

/** Força da senha, de 0 a 4 — usada apenas como indicador visual. */
export function passwordScore(value: string): number {
  return passwordRules(value).filter((r) => r.met).length;
}
