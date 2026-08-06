// Bloqueio de escrita quando o período de teste expira.
// Leitura/navegação permanecem liberadas — apenas ações de criar/editar/excluir
// disparam o modal de upgrade.

let locked = false;

export const TRIAL_BLOCKED_EVENT = "estoq:trial-blocked";
export const TRIAL_BLOCKED_MESSAGE = "Seu período de teste terminou — assine para continuar";

export function setTrialLocked(value: boolean) {
  locked = value;
}

export function isTrialLocked() {
  return locked;
}

export class TrialBlockedError extends Error {
  constructor() {
    super(TRIAL_BLOCKED_MESSAGE);
    this.name = "TrialBlockedError";
  }
}

/** Chame no início de qualquer mutação de escrita. */
export function assertWriteAllowed() {
  if (!locked) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRIAL_BLOCKED_EVENT));
  }
  throw new TrialBlockedError();
}
