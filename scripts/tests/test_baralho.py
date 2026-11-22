"""Testes do Baralho. Rodar: uv run --with pytest pytest scripts/tests"""
import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import gerar_baralho as gb  # noqa: E402

ALMEIDA_FINAL = {
    "slug": "joao-almeida", "nome": "ALMEIDA João", "pais": "Portugal",
    "equipe": "UAE Team Emirates - XRG", "idade": 28, "peso_kg": 63, "altura_m": 1.78,
    "notas": {"Sprint": 40, "Explosão": 71, "Montanha": 84, "Contrarrelógio": 80,
              "Pavê": 10, "Voltas": 86},
    "elo": None, "fonte": "teste", "provisorio": False,
}


@pytest.fixture(scope="module")
def baralho():
    return gb.montar(gb.carregar())[0]


def test_32_cartas_com_codigos_1A_a_8D(baralho):
    codigos = [c["codigo"] for c in baralho["cartas"]]
    assert len(codigos) == 32
    assert sorted(codigos) == sorted(f"{g}{l}" for g in range(1, 9) for l in "ABCD")


def test_notas_de_1_a_99_nos_6_atributos(baralho):
    chaves = [a["chave"] for a in baralho["atributos"]]
    assert len(chaves) == 6
    for c in baralho["cartas"]:
        assert list(c["notas"]) == chaves
        assert all(isinstance(n, int) and 1 <= n <= 99 for n in c["notas"].values()), c["nome"]


def test_um_super_trunfo_e_quatro_cartas_a(baralho):
    st = [c["nome"] for c in baralho["cartas"] if c["superTrunfo"]]
    a = sorted(c["nome"] for c in baralho["cartas"] if c["cartaA"])
    assert st == ["Valentin Paret-Peintre"]
    assert a == ["Jasper Philipsen", "Jonathan Milan", "Paul Magnier", "Tim Merlier"]


def test_nenhum_pave_10_sem_estimativa(baralho):
    for c in baralho["cartas"]:
        if c["notas"]["pave"] == gb.NOTA_SEM_PROVA:
            assert "pave" in c["estimadas"], c["nome"]
    # E quem nunca correu no pavê recebeu mesmo uma estimativa.
    assert any("pave" in c["estimadas"] for c in baralho["cartas"])


def test_toda_equipe_tem_2_cores_hex(baralho):
    for c in baralho["cartas"]:
        assert len(c["cores"]) == 2
        assert all(re.fullmatch(r"#[0-9A-F]{6}", cor) for cor in c["cores"]), c["equipe"]


def test_carta_tem_pais_iso2_iniciais_nome_e_idade(baralho):
    for c in baralho["cartas"]:
        assert re.fullmatch(r"[A-Z]{2}", c["pais"]), c["nome"]
        assert re.fullmatch(r"[A-Z]{2,4}", c["iniciais"]), c["nome"]
        assert c["nome"] and c["nomePcs"] and c["equipe"]
        assert 18 <= c["idade"] <= 45


def test_arquivo_gerado_esta_em_dia_e_e_deterministico(baralho):
    texto = json.dumps(baralho, ensure_ascii=False, indent=2) + "\n"
    de_novo = json.dumps(gb.montar(gb.carregar())[0], ensure_ascii=False, indent=2) + "\n"
    assert texto == de_novo
    assert gb.SAIDA.read_text(encoding="utf-8") == texto, \
        "src/dados/baralho.json está velho: rode scripts/gerar_baralho.py"


def test_almeida_com_notas_finais_usa_as_notas_e_estima_o_pave(tmp_path):
    arq = tmp_path / "joao_almeida.json"
    arq.write_text(json.dumps(ALMEIDA_FINAL, ensure_ascii=False), encoding="utf-8")
    baralho, avisos = gb.montar(gb.carregar(arq))
    almeida = next(c for c in baralho["cartas"] if c["slug"] == "joao-almeida")
    assert avisos == []
    assert "provisoria" not in almeida
    assert almeida["notas"]["voltas"] == 86 and almeida["notas"]["montanha"] == 84
    assert almeida["estimadas"] == ["pave"] and almeida["notas"]["pave"] != 10
    assert almeida["pais"] == "PT" and almeida["nome"] == "João Almeida"


def test_almeida_sem_notas_fica_provisorio_com_aviso(tmp_path):
    arq = tmp_path / "joao_almeida.json"
    arq.write_text(json.dumps({**ALMEIDA_FINAL, "notas": None, "provisorio": True}),
                   encoding="utf-8")
    baralho, avisos = gb.montar(gb.carregar(arq))
    almeida = next(c for c in baralho["cartas"] if c["slug"] == "joao-almeida")
    assert almeida["provisoria"] is True
    assert len(avisos) == 1 and "PROVISÓRIAS" in avisos[0]
