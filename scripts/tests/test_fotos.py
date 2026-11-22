"""Testes do recorte das fotos. Rodar: uv run --with pytest pytest scripts/tests"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import gerar_fotos as gf  # noqa: E402


def test_quadrado_centrado_no_rosto():
    assert gf.caixa_do_recorte(1000, 2000, 0.5, 0.25, 0.4) == (300, 300, 700, 700)


def test_quadrado_que_sai_da_borda_volta_para_dentro():
    # Rosto no canto de cima à esquerda: o quadrado encosta nas bordas.
    assert gf.caixa_do_recorte(1000, 2000, 0.05, 0.01, 0.4) == (0, 0, 400, 400)
    # Rosto no canto de baixo à direita.
    assert gf.caixa_do_recorte(1000, 1000, 0.99, 0.99, 0.5) == (500, 500, 1000, 1000)


def test_quadrado_nunca_maior_que_o_menor_lado():
    esquerda, topo, direita, baixo = gf.caixa_do_recorte(1000, 600, 0.5, 0.5, 0.9)
    assert direita - esquerda == baixo - topo == 600
    assert (topo, baixo) == (0, 600)


def test_toda_foto_recortada_tem_credito():
    import csv

    def slugs(nome):
        with open(gf.ORIGEM / nome, newline="", encoding="utf-8") as f:
            return {linha["slug"] for linha in csv.DictReader(f)}

    assert slugs("recorte.csv") <= slugs("creditos.csv")
