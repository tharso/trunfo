"""Monta a tabela dos 180 primeiros do ranking UCI.

Entradas (em data/raw/):
  pcs_perfil.json        perfil de cada ciclista (ProCyclingStats, ranking UCI de 17/11/2026)
  potencia_pesquisa.json dados de potência achados pela pesquisa na web (cada número com fonte)

Saídas (em data/):
  ciclistas.csv          uma linha por ciclista
  potencia_fontes.csv    todos os números de potência achados, com URL da fonte
  SuperTrunfo_Ciclistas.xlsx  planilha com as abas Tabela, Fontes e Legenda
"""
import csv
import json
import re
from datetime import date
from pathlib import Path

import cartas_elo
from modelo_potencia import CDA_MEDIANO, DURACOES, FAIXA_WKG, PESOS, crono, estimar

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"

MESES = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}

# Faixas de duração (segundos) usadas para escolher o melhor número de cada coluna.
FAIXAS = [
    ("5s", 1, 15),
    ("1min", 45, 90),
    ("5min", 180, 420),
    ("10min", 480, 900),
    ("20min", 960, 1800),
    ("40_60min", 1860, 4500),
]

PCS_COLS = ["rank", "name", "slug", "nat", "country", "team", "points", "dob", "weight",
            "height", "oneday", "gc", "tt", "sprint", "climber", "hills", "pcs_rank",
            "alltime", "strava"]


def parse_dob(s):
    if not s:
        return None, None
    m = re.match(r"(\d+)\D*?([A-Z][a-z]+)\s+(\d{4})\s*\((\d+)\)", s)
    if not m:
        return None, None
    d, mes, ano, idade = m.groups()
    return date(int(ano), MESES[mes], int(d)).isoformat(), int(idade)


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def carregar_pcs():
    rows = json.loads((RAW / "pcs_perfil.json").read_text())
    return [dict(zip(PCS_COLS, r)) for r in rows]


def carregar_potencia():
    p = RAW / "potencia_pesquisa.json"
    if not p.exists():
        return {}
    data = json.loads(p.read_text())
    return {r["slug"]: r for r in data["riders"]}


def melhor_por_faixa(points, peso):
    """Para cada faixa, devolve o maior W/kg documentado (e o W), com tipo e fonte."""
    res = {}
    for nome, lo, hi in FAIXAS:
        cands = []
        for p in points:
            if p["metric"] not in ("power", "sprint_peak", "critical_power", "ftp"):
                continue
            dur = p.get("duration_s")
            if p["metric"] == "sprint_peak" and dur is None:
                dur = 5
            if p["metric"] == "ftp" and dur is None:
                dur = 3600  # FTP = potência que se segura por ~1 hora
            if dur is None or not (lo <= dur <= hi):
                continue
            w = wkg = None
            if p["unit"] == "W":
                w = p["value"]
                wkg = round(w / peso, 2) if peso else None
            elif p["unit"] == "W/kg":
                wkg = p["value"]
                w = round(wkg * peso) if peso else None
            if wkg is None and w is None:
                continue
            cands.append((wkg or 0, w or 0, p))
        if cands:
            wkg, w, p = max(cands, key=lambda c: (c[0], c[1]))
            res[nome] = (wkg or None, w or None, p)
    return res


def valor_simples(points, metric, unit):
    vals = [p for p in points if p["metric"] == metric and p["unit"] == unit]
    if not vals:
        return None
    return max(vals, key=lambda p: p["value"])


def main():
    pcs = carregar_pcs()
    pot = carregar_potencia()

    linhas, fontes = [], []
    for r in pcs:
        nasc, idade = parse_dob(r["dob"])
        peso = num(r["weight"])
        altura = num(r["height"])
        info = pot.get(r["slug"], {"datapoints": [], "coverage": "nenhuma", "note": "sem pesquisa"})
        pts = info["datapoints"]
        faixas = melhor_por_faixa(pts, peso or imputar_peso(pcs, altura))
        vo2 = valor_simples(pts, "vo2max", "ml/kg/min")
        ftp_w = valor_simples(pts, "ftp", "W")
        ftp_wkg = valor_simples(pts, "ftp", "W/kg")

        linha = {
            "rank_uci": r["rank"],
            "pontos_uci": r["points"],
            "nome": r["name"],
            "pais": r["country"] or r["nat"].upper(),
            "equipe": r["team"],
            "idade": idade,
            "nascimento": nasc,
            "peso_kg": peso,
            "altura_m": altura,
            "imc": round(peso / altura ** 2, 1) if peso and altura else None,
            "pcs_rank": r["pcs_rank"],
            "pcs_classicas": r["oneday"],
            "pcs_gc": r["gc"],
            "pcs_crono": r["tt"],
            "pcs_sprint": r["sprint"],
            "pcs_escalada": r["climber"],
            "pcs_colinas": r["hills"],
        }
        for nome, _, _ in FAIXAS:
            v = faixas.get(nome)
            linha[f"p{nome}_wkg"] = v[0] if v else None
            linha[f"p{nome}_w"] = v[1] if v else None
            linha[f"p{nome}_tipo"] = v[2]["kind"] if v else None
        linha["ftp_w"] = ftp_w["value"] if ftp_w else None
        linha["ftp_wkg"] = ftp_wkg["value"] if ftp_wkg else (
            round(ftp_w["value"] / peso, 2) if ftp_w and peso else None)
        linha["vo2max"] = vo2["value"] if vo2 else None
        linha["vo2max_tipo"] = vo2["kind"] if vo2 else None
        linha["n_dados_potencia"] = len(pts)
        linha["cobertura"] = info["coverage"]
        linha["nota_pesquisa"] = info["note"]
        linha["slug_pcs"] = r["slug"]
        linhas.append(linha)

        for p in pts:
            fontes.append({
                "rank_uci": r["rank"], "nome": r["name"], "metrica": p["metric"],
                "duracao_s": p.get("duration_s"), "valor": p["value"], "unidade": p["unit"],
                "tipo": p["kind"], "contexto": p["context"], "ano": p.get("year"),
                "fonte": p["source_url"],
            })

    for l in linhas:
        l["peso_final"] = l["peso_kg"] or imputar_peso(pcs, l["altura_m"])
    cartas, calib = montar_cartas(linhas)

    elo = cartas_elo.notas(cartas_elo.carregar())
    cartas_jogo = []
    for l in linhas:
        e = elo[l["slug_pcs"]]
        c = {"rank_uci": l["rank_uci"], "nome": l["nome"], "pais": l["pais"], "equipe": l["equipe"],
             "idade": l["idade"], "peso_kg": l["peso_kg"], "altura_m": l["altura_m"]}
        for cat, rotulo in cartas_elo.ATRIBUTOS:
            c[rotulo] = e[cat]["nota"]
        for cat, rotulo in cartas_elo.ATRIBUTOS:
            c[f"{rotulo} (Elo)"] = e[cat]["elo"]
            c[f"{rotulo} (provas)"] = e[cat]["provas"]
        cartas_jogo.append(c)
    escrever_csv(OUT / "cartas.csv", cartas_jogo)
    escrever_csv(OUT / "watts_estimados.csv", cartas)
    escrever_csv(OUT / "ciclistas.csv", [{k: v for k, v in l.items() if k != "peso_final"} for l in linhas])
    escrever_csv(OUT / "potencia_fontes.csv", fontes)
    escrever_xlsx(OUT / "SuperTrunfo_Ciclistas.xlsx", cartas_jogo, cartas, [{k: v for k, v in l.items() if k != "peso_final"} for l in linhas], fontes, calib)

    print("Calibração (W/kg = a + b × nota):")
    for d, c in calib.items():
        print(f"  {d:>8}: a={c['a']} b={c['b']} | {c['n_reais']} números publicados | erro médio {c['erro_medio_wkg']} W/kg")

    com = sum(1 for l in linhas if l["n_dados_potencia"])
    print(f"{len(linhas)} ciclistas | {com} com algum dado de potência | {len(fontes)} números com fonte")
    for nome, _, _ in FAIXAS:
        print(f"  p{nome}: {sum(1 for l in linhas if l[f'p{nome}_wkg'])} preenchidos")
    print(f"  vo2max: {sum(1 for l in linhas if l['vo2max'])} | ftp: {sum(1 for l in linhas if l['ftp_w'] or l['ftp_wkg'])}")
    print(f"  sem peso: {sum(1 for l in linhas if not l['peso_kg'])} | sem altura: {sum(1 for l in linhas if not l['altura_m'])}")


def imputar_peso(pcs, altura):
    """Peso que falta no PCS: IMC mediano dos outros × altura², ou peso mediano se não há altura."""
    pares = [(num(r["weight"]), num(r["height"])) for r in pcs if num(r["weight"]) and num(r["height"])]
    if altura:
        imcs = sorted(w / h ** 2 for w, h in pares)
        return round(imcs[len(imcs) // 2] * altura ** 2, 1)
    pesos = sorted(w for w, _ in pares)
    return pesos[len(pesos) // 2]


def montar_cartas(linhas):
    reais = {d: [l[f"p{d}_wkg"] for l in linhas] for d in DURACOES}
    est, calib, ings = estimar(linhas, reais)
    cronos = crono(linhas, est, ings)
    cartas = []
    for l, e, cr in zip(linhas, est, cronos):
        c = {
            "rank_uci": l["rank_uci"], "nome": l["nome"], "pais": l["pais"], "equipe": l["equipe"],
            "idade": l["idade"], "peso_kg": l["peso_final"],
            "peso_origem": "PCS" if l["peso_kg"] else "estimado",
            "altura_m": l["altura_m"],
        }
        for d in DURACOES:
            c[f"{d}_w"] = e[d]["final_w"]
            c[f"{d}_wkg"] = e[d]["final_wkg"]
        for d in DURACOES:
            c[f"{d}_origem"] = e[d]["origem"]
        c["ftp_est_w"] = e["40_60min"]["final_w"]
        c["ftp_est_wkg"] = e["40_60min"]["final_wkg"]
        # VO2max pela fórmula do ACSM a partir da potência de 5 min: 10,8 × W/kg + 7.
        c["vo2max_est"] = round(10.8 * e["5min"]["final_wkg"] + 7, 1)
        c["crono_kmh"] = cr["kmh"]
        c["crono_w"] = cr["w"]
        c["cda_est_m2"] = cr["cda"]
        c["n_numeros_publicados"] = sum(1 for d in DURACOES if e[d]["origem"] == "publicado")
        cartas.append(c)
    return cartas, calib


def escrever_csv(path, rows):
    if not rows:
        path.write_text("")
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


LEGENDA = [
    ("ABA CARTAS (o jogo)", "Notas de 1 a 99 por tipo de prova, pelos resultados de 2023 a 2026 no ProCyclingStats. O melhor de cada atributo tem 99."),
    ("Como a nota é feita", "Confronto direto: em cada prova, quem chegou na frente de quem, só entre os 180. Os confrontos de todas as provas são resolvidos de uma vez (Bradley-Terry, a versão 'de uma vez só' do Elo). Peso da prova: Mundial, Olimpíada e Grande Volta 1,5; WorldTour 1,0; ProSeries 0,7; .1 0,5. Classificação geral de Grande Volta vale o dobro. Peso do ano: 2026 1,0; 2025 0,8; 2024 0,6; 2023 0,4."),
    ("Tipos de prova", "Sprint = etapa ou prova plana (perfil p1 do PCS). Explosão = chegada em subida curta (p3) e clássicas de colinas. Montanha = p4 e p5. Contrarrelógio = crono individual. Pavê = Flandres, Roubaix e outras clássicas de paralelepípedo. Voltas = classificação geral final."),
    ("Só os primeiros contam em ordem", "Até o 25º (40º no crono) a ordem conta. Quem chegou depois perde para todos esses, mas não briga entre si."),
    ("(Elo) e (provas)", "Força calculada (já com desconto por pouca prova) e número de provas daquele tipo. Menos de 3 provas = nota 10 (sem como medir)."),
    ("ABA WATTS ESTIMADOS", "O modelo antigo de watts. Serve de ficha técnica, não para a disputa."),
    ("ABA CARTAS", "Valores prontos para o jogo. Todos os 180 têm todos os números."),
    ("5s ... 40_60min (_w e _wkg)", "Potência em watts e em watts por quilo para cada duração. Verde = veio de número publicado. Branco = estimado pelo modelo."),
    ("_origem", "publicado = número de uma fonte (e maior que o estimado). modelo = estimado pelo modelo da aba Modelo. ajustado = subiu para a curva não crescer com o tempo (ex.: 5 min nunca abaixo de 10 min)."),
    ("ftp_est", "FTP estimado = potência de 40-60 min."),
    ("vo2max_est", "VO2max estimado pela fórmula do ACSM: 10,8 × W/kg de 5 min + 7. É uma aproximação."),
    ("crono_kmh", f"Contrarrelógio: velocidade estimada num crono plano de 40 km. Usa os watts de 40-60 min e o CdA (tamanho do corpo contra o vento). O CdA sai da altura e do peso (fórmula de Bassett), reescalado para mediana de {CDA_MEDIANO} m², e fica até 7% menor para quem é especialista em crono no PCS. Os watts de crono (crono_w) ficam até 3% maiores ou menores pelo mesmo critério."),
    ("cda_est_m2", "Área contra o vento estimada (CdA). Menor = mais aerodinâmico."),
    ("peso_origem", "PCS = peso declarado no ProCyclingStats. estimado = faltava; calculado pela altura e IMC mediano."),
    ("COMO O MODELO ESTIMA", "Tipo do ciclista (fatia de sprint, escalada, crono e colinas nos pontos do PCS) + nível (pontos UCI dos últimos 12 meses) + peso viram uma nota de 0 a 1 por duração. A nota vira W/kg com uma reta calibrada nos números publicados. Ver aba Modelo."),
    ("ABA DADOS REAIS", "Só números públicos achados na pesquisa, sem estimativa."),
    ("rank_uci / pontos_uci", "Posição e pontos no ranking individual UCI de 17/11/2026 (via ProCyclingStats)."),
    ("idade, nascimento, peso_kg, altura_m", "Perfil no ProCyclingStats. Peso é o declarado, pode estar desatualizado."),
    ("imc", "Peso ÷ altura². Calculado aqui."),
    ("pcs_*", "Pontos de especialidade do ProCyclingStats (carreira inteira): clássicas, GC, crono, sprint, escalada, colinas. Quanto maior, mais forte no tipo de prova."),
    ("pXX_wkg / pXX_w", "Melhor potência PUBLICADA por uma fonte na faixa de duração. 5s = 1-15 s; 1min = 45-90 s; 5min = 3-7 min; 10min = 8-15 min; 20min = 16-30 min; 40_60min = 31-75 min. Quando a fonte deu só W ou só W/kg, o outro foi convertido com o peso do PCS."),
    ("pXX_tipo", "medido = arquivo do próprio atleta, equipe ou laboratório. estimado_por_fonte = cálculo de jornalista/analista a partir de tempo de subida."),
    ("ftp_*, vo2max", "Só quando uma fonte publicou o número. Vazio = não achado."),
    ("cobertura", "boa / parcial / nenhuma: quanto dado público a pesquisa achou. nao_pesquisado = a cota de buscas acabou antes; falta pesquisar."),
    ("Vazio", "Vazio quer dizer: não existe número público achado. Nada foi inventado."),
]


def escrever_xlsx(path, cartas_jogo, cartas, linhas, fontes, calib):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter
    except ImportError:
        print("openpyxl não instalado: pulei o .xlsx")
        return
    azul = PatternFill("solid", fgColor="1F4E78")
    verde = PatternFill("solid", fgColor="C6EFCE")

    def aba(wb, title, rows, freeze, first=False):
        ws = wb.active if first else wb.create_sheet(title)
        ws.title = title
        if not rows:
            return ws
        cols = list(rows[0].keys())
        ws.append(cols)
        for r in rows:
            ws.append([r[c] for c in cols])
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = azul
        ws.freeze_panes = freeze
        ws.auto_filter.ref = ws.dimensions
        for i, c in enumerate(cols, 1):
            width = max(len(str(c)), *(len(str(r[c] or "")) for r in rows[:60]))
            ws.column_dimensions[get_column_letter(i)].width = min(max(width + 2, 8), 45)
        return ws

    wb = Workbook()
    aba(wb, "Cartas", cartas_jogo, "C2", first=True)
    ws = aba(wb, "Watts estimados", cartas, "C2")
    # Pinta de verde os valores que vieram de número publicado.
    cols = list(cartas[0].keys())
    for d in DURACOES:
        cw, ck, co = cols.index(f"{d}_w") + 1, cols.index(f"{d}_wkg") + 1, cols.index(f"{d}_origem") + 1
        for row in range(2, len(cartas) + 2):
            if ws.cell(row, co).value == "publicado":
                ws.cell(row, cw).fill = verde
                ws.cell(row, ck).fill = verde
    aba(wb, "Dados reais", linhas, "E2")
    aba(wb, "Fontes", fontes, "C2")

    ws = wb.create_sheet("Modelo")
    ws.append(["Duração", "Faixa inicial (W/kg)", "Pesos da nota", "a", "b",
               "Números publicados usados", "Erro médio (W/kg)"])
    for d in DURACOES:
        c = calib[d]
        ws.append([d, f"{FAIXA_WKG[d][0]} a {FAIXA_WKG[d][1]}",
                   ", ".join(f"{k} {v:.0%}" for k, v in PESOS[d].items()),
                   c["a"], c["b"], c["n_reais"], c["erro_medio_wkg"]])
    for c in ws[1]:
        c.font = Font(bold=True)
    for col, w in zip("ABCDEFG", (10, 20, 60, 8, 8, 26, 18)):
        ws.column_dimensions[col].width = w

    ws = wb.create_sheet("Legenda")
    ws.append(["Coluna", "O que é"])
    for row in LEGENDA:
        ws.append(list(row))
    ws.column_dimensions["A"].width = 38
    ws.column_dimensions["B"].width = 120
    for c in ws[1]:
        c.font = Font(bold=True)
    wb.save(path)


if __name__ == "__main__":
    main()
