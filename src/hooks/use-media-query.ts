import { useEffect, useState } from "react";

/**
 * Media query como estado do React.
 *
 * O valor inicial já sai correto: sem isso, todo componente que decide o
 * que montar por breakpoint renderiza uma vez errado e corrige no efeito —
 * o usuário vê a piscada. Só é seguro porque as rotas que usam isto são
 * client-only (`ssr: false`); `window` existe no primeiro render.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    /* Rede de segurança: em alguns contextos (viewport emulado, algumas
       WebViews) o evento `change` não chega numa mudança de tamanho. Reler
       a query no resize é barato e o React descarta o estado idêntico. */
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [query]);

  return matches;
}
