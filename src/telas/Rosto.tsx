// O rosto da carta: a foto do ciclista, ou as iniciais quando não há foto.
// Fica dentro de um círculo de quem usa (a carta e o duelo); a foto o preenche.
export function Rosto({ foto, iniciais }: { foto: string | null; iniciais: string }) {
  return foto ? <img class="rosto" src={foto} alt="" decoding="async" /> : <>{iniciais}</>;
}
