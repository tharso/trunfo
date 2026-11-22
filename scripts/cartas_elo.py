"""Transforma a força por tipo de prova (Elo / Bradley-Terry) em notas de carta.

Entrada: data/raw/elo.json (saída de scripts/navegador/2_elo.js).
Nota da carta, por atributo:
- O melhor do atributo fica com 99.
- Quem tem menos de N_MIN provas no tipo fica com NOTA_SEM_PROVA (não há como medir).
- O resto fica numa reta entre o pior medido (NOTA_PIOR) e o melhor (99).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATRIBUTOS = [
    ("sprint", "Sprint"),
    ("colinas", "Explosão"),
    ("montanha", "Montanha"),
    ("crono", "Contrarrelógio"),
    ("pave", "Pavê"),
    ("voltas", "Voltas"),
]
N_MIN = 3
NOTA_PIOR = 15
NOTA_SEM_PROVA = 10


def carregar():
    return json.loads((ROOT / "data" / "raw" / "elo.json").read_text())


def notas(elo):
    """Devolve {slug: {cat: {"nota": 1-99, "elo": int, "provas": int}}}."""
    cats = elo["cats"]
    linhas = elo["linhas"]
    res = {s: {} for s in linhas}
    for k, cat in enumerate(cats):
        medidos = [v[k][0] for v in linhas.values() if v[k][1] >= N_MIN]
        lo, hi = min(medidos), max(medidos)
        for s, v in linhas.items():
            elo_v, n = v[k]
            if n < N_MIN:
                nota = NOTA_SEM_PROVA
            else:
                nota = round(NOTA_PIOR + (99 - NOTA_PIOR) * (elo_v - lo) / (hi - lo))
            res[s][cat] = {"nota": nota, "elo": elo_v, "provas": n}
    return res
