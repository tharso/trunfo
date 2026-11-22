"""Gera as fotos das cartas (public/fotos/<slug>.webp) e os créditos (src/dados/fotos.json).

Entradas (pasta data/fotos/):
  <slug>.jpg ou <slug>.png  a foto original, baixada do Wikimedia Commons
  creditos.csv              slug, arquivo, autor, licença, página no Commons
  recorte.csv               onde fica o rosto: centro_x e centro_y (fração da
                            largura e da altura) e lado do quadrado (fração da largura)

Passos:
1. Corta um quadrado em volta do rosto (sem sair da foto).
2. Reduz para LADO_FINAL px e grava em WebP.
3. Escreve os créditos de cada foto usada, sempre iguais para os mesmos dados.

Carta sem foto (ou sem recorte) continua com as iniciais.

Rodar:  uv run --with pillow python scripts/gerar_fotos.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGEM = ROOT / "data" / "fotos"
SAIDA_FOTOS = ROOT / "public" / "fotos"
SAIDA_CREDITOS = ROOT / "src" / "dados" / "fotos.json"

# A foto aparece num círculo de ~104 px CSS; 288 px cobre telas de até ~2,8x.
LADO_FINAL = 288
QUALIDADE = 78


def ler_csv(caminho):
    with open(caminho, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def caixa_do_recorte(largura, altura, centro_x, centro_y, lado):
    """O quadrado (esquerda, topo, direita, baixo) em px, dentro da foto.

    `lado` é fração da largura; o quadrado nunca passa do menor lado da foto e,
    se sair da borda, é empurrado para dentro (o rosto fica um pouco fora do centro).
    """
    lado_px = min(round(lado * largura), largura, altura)
    esquerda = round(centro_x * largura - lado_px / 2)
    topo = round(centro_y * altura - lado_px / 2)
    esquerda = max(0, min(esquerda, largura - lado_px))
    topo = max(0, min(topo, altura - lado_px))
    return esquerda, topo, esquerda + lado_px, topo + lado_px


def original(slug):
    for extensao in (".jpg", ".png"):
        caminho = ORIGEM / f"{slug}{extensao}"
        if caminho.exists():
            return caminho
    return None


def gerar():
    from PIL import Image  # só aqui: os testes de caixa_do_recorte não precisam do Pillow

    creditos = {c["slug"]: c for c in ler_csv(ORIGEM / "creditos.csv")}
    SAIDA_FOTOS.mkdir(parents=True, exist_ok=True)
    usadas = {}
    for linha in ler_csv(ORIGEM / "recorte.csv"):
        slug = linha["slug"]
        caminho = original(slug)
        if caminho is None or slug not in creditos:
            print(f"sem foto ou sem crédito: {slug}")
            continue
        with Image.open(caminho) as foto:
            foto = foto.convert("RGB")
            caixa = caixa_do_recorte(*foto.size, float(linha["centro_x"]),
                                     float(linha["centro_y"]), float(linha["lado"]))
            final = foto.crop(caixa).resize((LADO_FINAL, LADO_FINAL), Image.LANCZOS)
            final.save(SAIDA_FOTOS / f"{slug}.webp", "WEBP", quality=QUALIDADE, method=6)
        c = creditos[slug]
        usadas[slug] = {"autor": c["autor"], "licenca": c["licenca"], "pagina": c["pagina_wikimedia"]}

    # Fotos velhas de quem saiu do recorte não ficam para trás.
    for velha in SAIDA_FOTOS.glob("*.webp"):
        if velha.stem not in usadas:
            velha.unlink()

    texto = json.dumps(dict(sorted(usadas.items())), ensure_ascii=False, indent=2) + "\n"
    SAIDA_CREDITOS.write_text(texto, encoding="utf-8")
    print(f"{len(usadas)} fotos em {SAIDA_FOTOS.relative_to(ROOT)}")


if __name__ == "__main__":
    gerar()
