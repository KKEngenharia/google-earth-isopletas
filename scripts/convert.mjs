// Converte os KMLs de origem em GeoJSON otimizado para o frontend (google.maps.Data).
// Uso: npm run build
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";

// Unico lugar a editar ao trocar a versao de um KML.
// A saida tem nome estavel, entao o frontend nao muda quando o KML muda de versao.
const SOURCES = [
  { input: "ISOPLETAS_GEO_WGS84_v8.kml", output: "isopletas.geojson", precision: 5 },
  { input: "brazilian-states_v2.kml", output: "estados.geojson", precision: 4 },
];

// Propriedades que o frontend usa (nome + estilo). O resto e descartado.
const KEEP_PROPERTIES = ["name", "stroke", "stroke-opacity", "stroke-width", "fill", "fill-opacity"];

const OUT_DIR = "dist";

function roundCoords(coords, precision) {
  if (typeof coords[0] === "number") {
    // descarta altitude e arredonda lng/lat
    return [Number(coords[0].toFixed(precision)), Number(coords[1].toFixed(precision))];
  }
  const rounded = coords.map((c) => roundCoords(c, precision));
  // remove pontos consecutivos repetidos apos o arredondamento
  if (typeof rounded[0]?.[0] === "number") {
    return rounded.filter((p, i) => i === 0 || p[0] !== rounded[i - 1][0] || p[1] !== rounded[i - 1][1]);
  }
  return rounded;
}

// Pontos do KML so servem de ancora de rotulo no Google Earth; no mapa viram marcadores indesejados.
function flattenGeometry(geometry, precision) {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") {
    const parts = geometry.geometries
      .map((g) => flattenGeometry(g, precision))
      .filter(Boolean);
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : { type: "GeometryCollection", geometries: parts };
  }
  if (geometry.type === "Point" || geometry.type === "MultiPoint") return null;
  return { type: geometry.type, coordinates: roundCoords(geometry.coordinates, precision) };
}

function convert({ input, output, precision }) {
  const dom = new DOMParser().parseFromString(readFileSync(input, "utf8"), "text/xml");
  const source = kml(dom);

  const features = [];
  for (const feature of source.features) {
    const geometry = flattenGeometry(feature.geometry, precision);
    if (!geometry) continue;

    const properties = {};
    for (const key of KEEP_PROPERTIES) {
      if (feature.properties?.[key] !== undefined) properties[key] = feature.properties[key];
    }
    features.push({ type: "Feature", properties, geometry });
  }

  if (!features.length) throw new Error(`${input}: nenhuma feature valida encontrada`);

  const json = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(`${OUT_DIR}/${output}`, json);
  console.log(`${input} -> ${OUT_DIR}/${output} (${features.length} features, ${(json.length / 1024).toFixed(1)} KB)`);
}

mkdirSync(OUT_DIR, { recursive: true });
SOURCES.forEach(convert);
