# google-earth-isopletas

Repositório de dados do KKWeb: isopletas do vento e contorno dos estados. Não tem aplicação, só KML (fonte) → GeoJSON (gerado).

## Fluxo

- **Fonte editável:** `ISOPLETAS_GEO_WGS84_v8.kml` e `brazilian-states_v2.kml`.
- **Saída gerada:** `dist/isopletas.geojson` e `dist/estados.geojson`. Nunca editar à mão; é sobrescrita.
- **Conversor:** `scripts/convert.mjs` (`npm run build`, Node 22). Lista de arquivos em `SOURCES`.
- **Automação:** `.github/workflows/build-geojson.yml` converte e commita o `dist/` em push na `main` quando um KML/script muda. Em PR só valida o build.
- **Consumidor:** `KKWeb-frontend`, via `raw.githubusercontent.com/.../main/dist/*.geojson`, desenhando com `google.maps.Data`. O Google removeu o `KmlLayer` (v3.66+), por isso não se serve mais KML ao navegador.

## Regras

- Os nomes de saída (`isopletas.geojson`, `estados.geojson`) são o contrato com o frontend. Não renomear.
- Ao subir uma nova versão de KML (ex.: `v9`), só trocar o nome em `SOURCES`; manter os nomes de saída.
- O `name` das isopletas termina com a velocidade máxima (`"35 - 40"`, `"45"`). O frontend usa `name.slice(-2)`; manter esse formato.
- Propriedades mantidas no GeoJSON: `name`, `stroke*`, `fill*` (lista em `KEEP_PROPERTIES`). Pontos do KML são descartados de propósito (eram só âncora de rótulo no Google Earth).
- Coordenadas arredondadas (5 casas nas isopletas, 4 nos estados) e sem altitude, para o arquivo ficar leve.
- KMLs antigos (v2–v7, `brazilian-states.kml`) são histórico; não são consumidos.
- Commits do `dist/` vêm do bot `github-actions[bot]`. Se a `main` ganhar proteção de branch, o bot precisa de permissão para dar push.
