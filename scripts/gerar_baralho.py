"""Gera o Baralho de 32 cartas que o jogo lê (src/dados/baralho.json).

Entradas:
  data/cartas.csv            notas por confronto direto dos 180 (scripts/cartas_elo.py)
  data/watts_estimados.csv   potência estimada (scripts/modelo_potencia.py), para o Pavê
  data/raw/pcs_perfil.json   slug e país (código ISO-2) de cada ciclista
  data/raw/joao_almeida.json João Almeida, que não está entre os 180
  data/baralho_ciclistas.csv as 32 cartas: slug, nome de exibição, iniciais, marca
  data/equipes_cores.csv     2 cores por equipe

Passos (o método está no README):
1. Junta os dados de cada uma das 32 cartas.
2. Pavê 10 ("nunca correu no pavê") vira estimativa pelos watts absolutos de 1 min.
3. Dá o código da carta (1A a 8D): Super Trunfo em 1A, o resto por força geral.
4. Escreve o JSON, sempre igual para os mesmos dados.

Rodar:  uv run python scripts/gerar_baralho.py
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SAIDA = ROOT / "src" / "dados" / "baralho.json"

ATRIBUTOS = [
    ("sprint", "Sprint"),
    ("explosao", "Explosão"),
    ("montanha", "Montanha"),
    ("contrarrelogio", "Contrarrelógio"),
    ("pave", "Pavê"),
    ("voltas", "Voltas"),
]

# Mesmos números de scripts/cartas_elo.py.
N_MIN = 3            # provas mínimas para a nota ser medida
NOTA_PIOR = 15       # nota do pior medido
NOTA_SEM_PROVA = 10  # "nunca correu" (menos de N_MIN provas)

# João Almeida não está nos 180. Enquanto as notas dele não chegam, a carta usa
# a média destes 4 ciclistas de perfil parecido (volta, bom crono, sem pavê).
# Também é deles a média de W/kg de 1 min usada para estimar o Pavê de Almeida,
# que não tem curva de potência no modelo.
REFERENCIAS_ALMEIDA = ["juan-ayuso-pesquera", "florian-lipowitz",
                       "mattias-skjelmose-jensen", "enric-mas"]

PAISES_ISO = {"Portugal": "PT"}  # países que não vêm do pcs_perfil.json

LETRAS = "ABCD"


def ler_csv(nome):
    with open(DATA / nome, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def carregar(almeida_path=None):
    """Lê todas as entradas. Devolve um dict com o que o montar() precisa."""
    perfil = json.loads((DATA / "raw" / "pcs_perfil.json").read_text(encoding="utf-8"))
    slug_por_rank = {str(p[0]): p[2] for p in perfil}
    iso_por_slug = {p[2]: p[3].upper() for p in perfil}
    watts = {slug_por_rank[w["rank_uci"]]: w for w in ler_csv("watts_estimados.csv")}
    cartas = {}
    for c in ler_csv("cartas.csv"):
        slug = slug_por_rank[c["rank_uci"]]
        cartas[slug] = {
            "slug": slug,
            "nome": c["nome"],
            "pais_nome": c["pais"],
            "pais": iso_por_slug[slug],
            "idade": int(c["idade"]),
            "equipe": c["equipe"],
            "peso_kg": float(watts[slug]["peso_kg"]),
            "w_1min": float(watts[slug]["1min_w"]),
            "notas": {k: int(c[rotulo]) for k, rotulo in ATRIBUTOS},
            "pave_provas": int(c["Pavê (provas)"]),
        }
    almeida_path = Path(almeida_path) if almeida_path else DATA / "raw" / "joao_almeida.json"
    return {
        "cartas": cartas,
        "almeida": json.loads(almeida_path.read_text(encoding="utf-8")),
        "baralho": ler_csv("baralho_ciclistas.csv"),
        "cores": {e["equipe"]: [e["cor1"], e["cor2"]] for e in ler_csv("equipes_cores.csv")},
    }


# ---------------------------------------------------------------------------
# Pavê: reta nota = a + b × watts de 1 min (absolutos), ajustada nos que têm
# Pavê medido. Watt absoluto = peso × W/kg: junta peso e potência num número só.
# No pavê o que conta é força bruta, e não W/kg (não há subida para punir o peso).
# ---------------------------------------------------------------------------
def ajustar_pave(cartas):
    pares = [(c["w_1min"], c["notas"]["pave"]) for c in cartas.values()
             if c["pave_provas"] >= N_MIN]
    n = len(pares)
    mx = sum(x for x, _ in pares) / n
    my = sum(y for _, y in pares) / n
    b = sum((x - mx) * (y - my) for x, y in pares) / sum((x - mx) ** 2 for x, _ in pares)
    a = my - b * mx
    medidos = sorted(y for _, y in pares)
    mediana = (medidos[(n - 1) // 2] + medidos[n // 2]) / 2
    # Piso: a nota do pior medido. Teto: a mediana dos medidos (quem nunca correu
    # no pavê não fica acima do ciclista típico que corre).
    return {"a": a, "b": b, "n": n, "teto": round(mediana), "piso": NOTA_PIOR}


def estimar_pave(w_1min, modelo):
    nota = round(modelo["a"] + modelo["b"] * w_1min)
    return max(modelo["piso"], min(modelo["teto"], nota))


def carta_almeida(almeida, cartas):
    """Monta os dados de João Almeida. Devolve (carta, provisoria)."""
    refs = [cartas[s] for s in REFERENCIAS_ALMEIDA]
    provisoria = almeida.get("notas") is None
    if provisoria:
        notas = {k: round(sum(r["notas"][k] for r in refs) / len(refs)) for k, _ in ATRIBUTOS}
    else:
        notas = {k: int(almeida["notas"][rotulo]) for k, rotulo in ATRIBUTOS}
    wkg_1min = sum(r["w_1min"] / r["peso_kg"] for r in refs) / len(refs)
    carta = {
        "slug": almeida["slug"],
        "nome": almeida["nome"],
        "pais_nome": almeida["pais"],
        "pais": PAISES_ISO[almeida["pais"]],
        "idade": int(almeida["idade"]),
        "equipe": almeida["equipe"],
        "peso_kg": float(almeida["peso_kg"]),
        "w_1min": float(almeida["peso_kg"]) * wkg_1min,
        "notas": notas,
        # Notas finais: Pavê 10 quer dizer "nunca correu", como nas outras cartas.
        "pave_provas": N_MIN if notas["pave"] != NOTA_SEM_PROVA else 0,
    }
    return carta, provisoria


def montar(dados):
    """Devolve (baralho, avisos). baralho é o dict que vira o JSON."""
    cartas = dados["cartas"]
    modelo = ajustar_pave(cartas)
    avisos = []
    almeida, provisoria = carta_almeida(dados["almeida"], cartas)
    if provisoria:
        avisos.append("AVISO: João Almeida está com notas PROVISÓRIAS (média de "
                      + ", ".join(REFERENCIAS_ALMEIDA)
                      + "). Troque data/raw/joao_almeida.json pelas notas finais e rode de novo.")
    todas = dict(cartas)
    todas[almeida["slug"]] = almeida

    lista = []
    for linha in dados["baralho"]:
        c = todas[linha["slug"]]
        notas = dict(c["notas"])
        estimadas = []
        if notas["pave"] == NOTA_SEM_PROVA and c["pave_provas"] < N_MIN:
            notas["pave"] = estimar_pave(c["w_1min"], modelo)
            estimadas.append("pave")
        if c["equipe"] not in dados["cores"]:
            raise ValueError(f"Equipe sem cores em data/equipes_cores.csv: {c['equipe']}")
        carta = {
            "codigo": None,
            "slug": c["slug"],
            "nome": linha["nome_exibicao"],
            "nomePcs": c["nome"],
            "iniciais": linha["iniciais"],
            "pais": c["pais"],
            "paisNome": c["pais_nome"],
            "idade": c["idade"],
            "equipe": c["equipe"],
            "cores": dados["cores"][c["equipe"]],
            "notas": notas,
            "estimadas": estimadas,
            "superTrunfo": linha["marca"] == "super_trunfo",
            "cartaA": linha["marca"] == "carta_a",
        }
        if c["slug"] == almeida["slug"] and provisoria:
            carta["provisoria"] = True
        lista.append(carta)

    # Código: Super Trunfo em 1A; as outras 31 por força geral (soma das 6 notas),
    # da mais forte à mais fraca, desempate pelo nome. 8 grupos × 4 letras.
    st = [c for c in lista if c["superTrunfo"]]
    resto = sorted((c for c in lista if not c["superTrunfo"]),
                   key=lambda c: (-sum(c["notas"].values()), c["nome"]))
    ordem = st + resto
    for i, c in enumerate(ordem):
        c["codigo"] = f"{i // 4 + 1}{LETRAS[i % 4]}"

    baralho = {
        "atributos": [{"chave": k, "nome": rotulo} for k, rotulo in ATRIBUTOS],
        "modeloPave": {"a": round(modelo["a"], 4), "b": round(modelo["b"], 6),
                       "ciclistasMedidos": modelo["n"], "piso": modelo["piso"],
                       "teto": modelo["teto"]},
        "cartas": ordem,
    }
    return baralho, avisos


def escrever(baralho, caminho=SAIDA):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(baralho, ensure_ascii=False, indent=2) + "\n"
    caminho.write_text(texto, encoding="utf-8")
    return texto


def main():
    baralho, avisos = montar(carregar())
    escrever(baralho)
    for a in avisos:
        print(a, file=sys.stderr)
    m = baralho["modeloPave"]
    print(f"Baralho: {len(baralho['cartas'])} cartas -> {SAIDA.relative_to(ROOT)}")
    print(f"Pavê estimado = {m['a']:.1f} + {m['b']:.4f} × watts de 1 min "
          f"({m['ciclistasMedidos']} medidos), entre {m['piso']} e {m['teto']}")
    for c in baralho["cartas"]:
        marca = " ST" if c["superTrunfo"] else (" A" if c["cartaA"] else "")
        est = " (Pavê estimado)" if c["estimadas"] else ""
        print(f"  {c['codigo']:>3} {c['nome']:<24} {list(c['notas'].values())}{marca}{est}")


if __name__ == "__main__":
    main()
