"""Modelo que estima a curva de potência de cada ciclista.

Ideia em 4 passos:
1. Tipo do ciclista: a fatia de cada especialidade nos pontos do ProCyclingStats
   (sprint, escalada+GC, crono, colinas, clássicas), virada em percentil entre os 180.
2. Nível atual: pontos UCI dos últimos 12 meses, em escala log (último = 0, Pogačar = 1).
3. Para cada duração, uma nota 0-1 mistura tipo e nível com pesos fixos (PESOS).
   A nota vira W/kg dentro de uma faixa realista de profissional (FAIXA_WKG).
4. Calibração: para cada duração, uma reta (a + b × nota) é ajustada aos números
   publicados, puxada para a faixa inicial quando há poucos dados (SHRINK).

Valor final da carta: o maior entre o estimado e o publicado.
O publicado prova que o ciclista consegue pelo menos aquilo.
"""
import math

DURACOES = ["5s", "1min", "5min", "10min", "20min", "40_60min"]

# Faixa de W/kg de um profissional do top 180: (nota 0, nota 1).
FAIXA_WKG = {
    "5s": (13.0, 24.0),
    "1min": (8.0, 12.0),
    "5min": (6.2, 8.0),
    "10min": (5.7, 7.5),
    "20min": (5.4, 7.2),
    "40_60min": (5.1, 6.9),
}

# Peso de cada ingrediente na nota de cada duração (soma = 1).
# sprint, climb (escalada+GC), tt (crono), hills (colinas), nivel (pontos UCI), leve (1 - percentil do peso)
# motor = o maior entre climb e tt: escalador e contrarrelogista têm o mesmo "motor" de esforço longo;
# a diferença entre eles aparece no peso (leve) e no watt absoluto.
PESOS = {
    "5s":       {"sprint": 0.60, "nivel": 0.15, "pesado": 0.25},
    "1min":     {"sprint": 0.35, "hills": 0.30, "nivel": 0.35},
    "5min":     {"hills": 0.30, "climb": 0.25, "nivel": 0.35, "leve": 0.10},
    "10min":    {"hills": 0.15, "climb": 0.40, "nivel": 0.35, "leve": 0.10},
    "20min":    {"climb": 0.45, "tt": 0.10, "nivel": 0.35, "leve": 0.10},
    "40_60min": {"motor": 0.45, "nivel": 0.30, "leve": 0.25},
}

# Mínimo de cada duração em relação à seguinte (ex.: 5 min ≥ 1,04 × 10 min).
FATOR_CURVA = {"5s": 1.40, "1min": 1.25, "5min": 1.04, "10min": 1.03, "20min": 1.03}

# Força da âncora na faixa inicial, em "ciclistas equivalentes".
SHRINK = 8


def percentis(valores):
    """Percentil 0-1 de cada valor dentro da lista (empates ficam com a média)."""
    ordem = sorted(valores)
    n = len(ordem)
    res = []
    for v in valores:
        abaixo = sum(1 for x in ordem if x < v)
        iguais = sum(1 for x in ordem if x == v)
        res.append((abaixo + (iguais - 1) / 2) / (n - 1) if n > 1 else 0.5)
    return res


def ingredientes(linhas):
    """Calcula tipo, nível e peso (percentis) de cada ciclista."""
    def share(l, *cols):
        tot = sum(float(l[c] or 0) for c in
                  ("pcs_classicas", "pcs_gc", "pcs_crono", "pcs_sprint", "pcs_escalada", "pcs_colinas"))
        return sum(float(l[c] or 0) for c in cols) / tot if tot else 0

    sprint = percentis([share(l, "pcs_sprint") for l in linhas])
    climb = percentis([share(l, "pcs_escalada", "pcs_gc") for l in linhas])
    tt = percentis([share(l, "pcs_crono") for l in linhas])
    hills = percentis([share(l, "pcs_colinas", "pcs_classicas") for l in linhas])
    peso = percentis([l["peso_final"] for l in linhas])

    pts = [float(l["pontos_uci"]) for l in linhas]
    lo, hi = math.log(min(pts)), math.log(max(pts))
    nivel = [(math.log(p) - lo) / (hi - lo) for p in pts]

    return [
        {"sprint": sprint[i], "climb": climb[i], "tt": tt[i], "hills": hills[i],
         "nivel": nivel[i], "leve": 1 - peso[i], "pesado": peso[i],
         "motor": max(climb[i], tt[i])}
        for i in range(len(linhas))
    ]


def nota(ing, dur):
    return sum(peso * ing[k] for k, peso in PESOS[dur].items())


def calibrar(notas, reais, dur):
    """Ajusta W/kg = a + b × nota aos números publicados, com âncora na faixa inicial."""
    lo, hi = FAIXA_WKG[dur]
    a0, b0 = lo, hi - lo
    pares = [(notas[i], reais[i]) for i in range(len(notas)) if reais[i] is not None]
    n = len(pares)
    # Pontos virtuais da faixa inicial: SHRINK pontos espalhados na reta a0 + b0 × x.
    virtuais = [(k / (SHRINK - 1), a0 + b0 * k / (SHRINK - 1)) for k in range(SHRINK)]
    todos = pares + virtuais
    mx = sum(x for x, _ in todos) / len(todos)
    my = sum(y for _, y in todos) / len(todos)
    sxx = sum((x - mx) ** 2 for x, _ in todos)
    sxy = sum((x - mx) * (y - my) for x, y in todos)
    b = sxy / sxx if sxx else b0
    b = max(b, 0.3 * b0)  # nota maior nunca pode dar potência menor
    a = my - b * mx
    erro = (sum(abs(a + b * x - y) for x, y in pares) / n) if n else None
    return a, b, n, erro


def estimar(linhas, reais_por_duracao):
    """Devolve, para cada linha, um dict com W/kg e W estimados e finais por duração.

    reais_por_duracao: {dur: [W/kg publicado ou None, na ordem das linhas]}
    """
    ings = ingredientes(linhas)
    saida = [{} for _ in linhas]
    calib = {}
    for dur in DURACOES:
        notas = [nota(g, dur) for g in ings]
        reais = reais_por_duracao[dur]
        a, b, n, erro = calibrar(notas, reais, dur)
        calib[dur] = {"a": round(a, 2), "b": round(b, 2), "n_reais": n,
                      "erro_medio_wkg": round(erro, 2) if erro is not None else None}
        for i, l in enumerate(linhas):
            est = round(a + b * notas[i], 2)
            real = reais[i]
            final = max(est, real) if real is not None else est
            origem = "publicado" if real is not None and real >= est else "modelo"
            saida[i][dur] = {"est_wkg": est, "final_wkg": round(final, 2), "origem": origem}
    # A curva não pode subir com o tempo: quem segura X W/kg por 10 min segura
    # pelo menos um pouco mais por 5 min. Vai da duração longa para a curta.
    for s, l in zip(saida, linhas):
        for curta, longa in zip(reversed(DURACOES[:-1]), reversed(DURACOES[1:])):
            piso = round(s[longa]["final_wkg"] * FATOR_CURVA[curta], 2)
            if s[curta]["final_wkg"] < piso:
                s[curta]["final_wkg"] = piso
                s[curta]["origem"] = "ajustado"
        for d in DURACOES:
            s[d]["final_w"] = round(s[d]["final_wkg"] * l["peso_final"])
    return saida, calib, ings


# ---------------------------------------------------------------------------
# Contrarrelógio: velocidade estimada num crono plano de 40 km.
#
# Em terreno plano, quase toda a força vai contra o ar. Por isso conta o watt
# absoluto (não o W/kg) e o tamanho do corpo contra o vento (CdA, em m²).
# 1. Potência: a de 40-60 min (um crono de 40 km dura ~45-50 min).
# 2. CdA: fórmula de Bassett (1999) pela altura e peso, reescalada para que o
#    ciclista mediano do grupo tenha CDA_MEDIANO (valor típico de profissional).
# 3. Técnica: quem tem mais pontos de crono no PCS tem posição mais aerodinâmica
#    e segura mais watts deitado na bike de crono. O CdA vai de -AERO_TECNICA
#    (maior especialista) a +AERO_TECNICA (menor); os watts, de +POT_TECNICA a -POT_TECNICA.
# 4. Física: P = ½·ρ·CdA·v³ + Crr·m·g·v, resolvida para v.
# ---------------------------------------------------------------------------
CDA_MEDIANO = 0.215   # m², profissional em posição de crono
AERO_TECNICA = 0.07   # ±7 % no CdA conforme a especialidade de crono
POT_TECNICA = 0.03    # ±3 % nos watts conforme a especialidade de crono
RHO = 1.20            # densidade do ar, kg/m³
CRR = 0.0030          # resistência de rolagem
MASSA_BIKE = 8.0      # kg


def _cda_bassett(altura, peso):
    return 0.0293 * altura ** 0.725 * peso ** 0.425 + 0.0604


def _velocidade(p, cda, massa):
    """Resolve P = ½ρ·CdA·v³ + Crr·m·g·v por bisseção. Devolve km/h."""
    lo, hi = 0.0, 30.0
    for _ in range(60):
        v = (lo + hi) / 2
        if 0.5 * RHO * cda * v ** 3 + CRR * massa * 9.81 * v > p:
            hi = v
        else:
            lo = v
    return v * 3.6


def crono(linhas, saida, ings):
    """Devolve, para cada linha, CdA estimado e velocidade de crono plano (km/h)."""
    imcs = sorted(l["peso_kg"] / l["altura_m"] ** 2 for l in linhas if l["peso_kg"] and l["altura_m"])
    imc_med = imcs[len(imcs) // 2]
    alturas = [l["altura_m"] or (l["peso_final"] / imc_med) ** 0.5 for l in linhas]
    brutos = [_cda_bassett(h, l["peso_final"]) for h, l in zip(alturas, linhas)]
    mediana = sorted(brutos)[len(brutos) // 2]
    res = []
    for l, s, g, bruto in zip(linhas, saida, ings, brutos):
        cda = bruto / mediana * CDA_MEDIANO * (1 + AERO_TECNICA * (1 - 2 * g["tt"]))
        p = s["40_60min"]["final_w"] * (1 + POT_TECNICA * (2 * g["tt"] - 1))
        res.append({"cda": round(cda, 3), "w": round(p),
                    "kmh": round(_velocidade(p, cda, l["peso_final"] + MASSA_BIKE), 1)})
    return res
