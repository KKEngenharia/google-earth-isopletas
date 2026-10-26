# google-earth-isopletas

Dados de isopletas (velocidade básica do vento) e contorno dos estados do Brasil, usados pelo KKWeb.

Os arquivos `.kml` são a **fonte editável**. Uma GitHub Action converte os KMLs em **GeoJSON otimizado** na pasta `dist/`, que é o que o frontend consome.

> O Google Maps removeu a classe `KmlLayer` da Maps JavaScript API (a partir da v3.66), então o frontend não carrega mais KML direto. Ele lê o GeoJSON e desenha com `google.maps.Data`.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `ISOPLETAS_GEO_WGS84_v8.kml` | Fonte das isopletas (polígonos de área + linhas) |
| `brazilian-states_v2.kml` | Fonte do contorno dos estados |
| `dist/isopletas.geojson` | **Gerado.** Consumido pelo frontend |
| `dist/estados.geojson` | **Gerado.** Consumido pelo frontend |
| `scripts/convert.mjs` | Conversor KML → GeoJSON |
| `.github/workflows/build-geojson.yml` | Roda o conversor automaticamente |

Os demais `.kml` (v2 a v7, `brazilian-states.kml`) são versões antigas, mantidas só como histórico.

## Como atualizar as isopletas

1. Edite o KML (ou adicione uma nova versão) e faça commit/PR na `main`.
2. A Action roda sozinha, converte e commita o `dist/` atualizado.
3. O frontend passa a servir os dados novos. Não é preciso mexer no código dele.

Se subir uma **nova versão** do arquivo (ex.: `v9`), troque o nome em `SOURCES` no `scripts/convert.mjs`. Os nomes de saída (`isopletas.geojson`, `estados.geojson`) não mudam, então o frontend continua igual.

Em PR, a Action só valida o build (falha se o KML estiver quebrado) e não commita nada.

## Rodar localmente

```bash
npm ci
npm run build
```

Requer Node 22. O resultado vai para `dist/`.

## Contrato com o frontend

O frontend (`KKWeb-frontend`) lê:

- `https://raw.githubusercontent.com/KKEngenharia/google-earth-isopletas/main/dist/isopletas.geojson`
- `https://raw.githubusercontent.com/KKEngenharia/google-earth-isopletas/main/dist/estados.geojson`

Propriedades de cada feature: `name`, `stroke`, `stroke-opacity`, `stroke-width`, `fill`, `fill-opacity`.

O campo `name` das isopletas tem a faixa de velocidade, como `"35 - 40"` ou `"45"`. O frontend usa os **dois últimos caracteres** (`name.slice(-2)`) como vento máximo, então mantenha esse formato nos KMLs.
