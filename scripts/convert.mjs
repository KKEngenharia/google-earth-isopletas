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

// Separa a geometria em pontos e o resto (linhas/poligonos).
// Nas isopletas, o Point dentro do MultiGeometry e a ancora do rotulo com a velocidade
// (o numero que o Google Earth/KmlLayer mostrava como icone).
function splitGeometry(geometry, precision) {
  if (!geometry) return { shape: null, points: [] };
  if (geometry.type === "GeometryCollection") {
    const parts = geometry.geometries.map((g) => splitGeometry(g, precision));
    const shapes = parts.map((p) => p.shape).filter(Boolean);
    const points = parts.flatMap((p) => p.points);
    const shape = !shapes.length ? null : shapes.length === 1 ? shapes[0] : { type: "GeometryCollection", geometries: shapes };
    return { shape, points };
  }
  if (geometry.type === "Point") return { shape: null, points: [roundCoords(geometry.coordinates, precision)] };
  if (geometry.type === "MultiPoint") return { shape: null, points: geometry.coordinates.map((c) => roundCoords(c, precision)) };
  return { shape: { type: geometry.type, coordinates: roundCoords(geometry.coordinates, precision) }, points: [] };
}

// Texto do rotulo: o icone de cada estilo traz o ultimo numero do id do estilo
// ("...\30" -> 30, "...\31 - 35" -> 35). Sem estilo, usa o ultimo numero do nome.
function labelText(properties) {
  const source = properties?.styleUrl || properties?.name || "";
  const numbers = source.match(/\d+/g);
  return numbers ? numbers[numbers.length - 1] : null;
}

function convert({ input, output, precision }) {
  const dom = new DOMParser().parseFromString(readFileSync(input, "utf8"), "text/xml");
  const source = kml(dom);

  const features = [];
  for (const feature of source.features) {
    const { shape, points } = splitGeometry(feature.geometry, precision);

    const properties = {};
    for (const key of KEEP_PROPERTIES) {
      if (feature.properties?.[key] !== undefined) properties[key] = feature.properties[key];
    }
    if (shape) features.push({ type: "Feature", properties, geometry: shape });

    // Pontos so viram rotulo quando o estilo do KML tem icone (caso das isopletas);
    // nos estados os pontos nao tem significado e sao descartados.
    const label = feature.properties?.icon ? labelText(feature.properties) : null;
    if (label) {
      for (const coordinates of points) {
        features.push({ type: "Feature", properties: { name: properties.name, label }, geometry: { type: "Point", coordinates } });
      }
    }
  }

  if (!features.length) throw new Error(`${input}: nenhuma feature valida encontrada`);

  const json = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(`${OUT_DIR}/${output}`, json);
  console.log(`${input} -> ${OUT_DIR}/${output} (${features.length} features, ${(json.length / 1024).toFixed(1)} KB)`);
}

mkdirSync(OUT_DIR, { recursive: true });
SOURCES.forEach(convert);
