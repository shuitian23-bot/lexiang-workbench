(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LxSmbConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clean(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function parseSpecs(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function pick(specs, keys) {
    for (const key of keys) {
      if (specs[key]) return clean(specs[key]);
    }
    return "";
  }

  function normalizeOs(value) {
    const source = clean(value);
    if (/Windows\s*11\s*专业版/i.test(source)) return "Windows 11 专业版";
    if (/Windows\s*11\s*家庭(?:中文)?版/i.test(source)) return "Windows 11 家庭中文版";
    if (/Windows\s*11/i.test(source)) return "Windows 11";
    return source || "系统以商品信息为准";
  }

  function extractVersion(specs, text) {
    const source = [pick(specs, ["model", "productModel", "product_model", "型号", "lvl5"]), text].join(" ");
    const match = source.match(/(?:ThinkPad\s*)?([A-Za-z]+\d{1,2}[A-Za-z-]*\s+20\d{2})/i);
    if (!match) return "当前版本";
    const parts = clean(match[1]).split(" ");
    const model = parts[0].replace(/^([a-z]+)/i, (prefix) => prefix.toUpperCase());
    return `${model} ${parts[1]}`;
  }

  function extractPart(specs, keys, segments, pattern) {
    const structured = pick(specs, keys);
    if (structured) return structured;
    const segment = segments.find((item) => pattern.test(item));
    return segment ? clean(segment) : "";
  }

  function extractCpu(specs, text) {
    const structured = pick(specs, ["cpu", "processor", "处理器"]);
    const source = clean(`${structured} ${text}`);
    const patterns = [
      /(?:英特尔\s*)?(?:酷睿\s*)?Ultra\s*[3579]\s*[- ]?\s*\d{3,4}[A-Z]*/gi,
      /(?:AMD\s*)?(?:Ryzen|锐龙)\s*(?:AI\s*)?[3579]\s*(?:PRO\s*)?\d{3,4}[A-Z]*/gi,
      /(?:AMD\s*)?R[3579]PRO\s*\d{3,4}[A-Z]*/gi,
      /i[3579][- ]?\d{4,5}[A-Z]*/gi,
      /(?:骁龙|天玑)\s*\d+(?:\s*(?:Gen\s*\d|Elite))?/gi
    ];
    const candidates = patterns.flatMap((pattern) => source.match(pattern) || []).map(clean);
    return candidates.sort((a, b) => b.length - a.length)[0] || structured;
  }

  function extractMemory(specs, text) {
    const structured = pick(specs, ["memory", "ram", "内存"]);
    if (structured) return structured;
    const matches = clean(text).match(/\d{1,3}\s*GB(?:\s+\d+\s*MT\/s)?\s*(?:LPDDR5X?|DDR[45])/gi) || [];
    return matches.map(clean).sort((a, b) => b.length - a.length)[0] || "";
  }

  function normalizeVariant(variant, index = 0) {
    const specs = parseSpecs(variant?.specs);
    const text = clean(`${variant?.name || ""} / ${variant?.description || ""}`);
    const segments = text.split(/[\/｜|，,]/).map(clean).filter(Boolean);
    const structuredOs = pick(specs, ["os", "operatingSystem", "operating_system", "操作系统"]);
    const osMatch = text.match(/Windows\s*11\s*(?:家庭中文版|家庭版|专业版)/i);
    const os = normalizeOs(structuredOs || osMatch?.[0]);
    const version = extractVersion(specs, text);
    const cpu = extractCpu(specs, text);
    const memory = extractMemory(specs, text);
    const disk = extractPart(specs, ["disk", "storage", "硬盘", "存储"], segments, /\d+(?:\.\d+)?\s*(?:TB|T|GB|G).*(?:SSD|固态|NVMe)/i);
    const gpu = extractPart(specs, ["gpu", "graphics", "显卡"], segments, /(?:RTX|GTX|Arc|Radeon|集成显卡|独显)/i);
    const config = [cpu, memory, disk, gpu].map(clean).filter(Boolean).join(" / ") || `配置 ${String(index + 1).padStart(2, "0")}`;
    return {
      sku: clean(variant?.sku),
      os,
      version,
      config,
      price: Number(variant?.price || 0),
      originalPrice: Number(variant?.original_price || 0),
      variant
    };
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function buildMatrix(variants) {
    const records = (variants || []).map(normalizeVariant).filter((record) =>
      record.sku &&
      record.os !== "系统以商品信息为准" &&
      record.version !== "当前版本" &&
      !/^配置\s+\d+$/.test(record.config)
    );
    return {
      records,
      options: {
        os: unique(records.map((record) => record.os)),
        version: unique(records.map((record) => record.version)),
        config: unique(records.map((record) => record.config))
      }
    };
  }

  function applySelection(_matrix, selection, dimension, value) {
    if (dimension === "os") return { os: value, version: "", config: "" };
    if (dimension === "version") return { os: selection.os, version: value, config: "" };
    return { os: selection.os, version: selection.version, config: value };
  }

  function availability(matrix, selection, dimension) {
    const options = matrix?.options?.[dimension] || [];
    const records = matrix?.records || [];
    return new Map(options.map((value) => {
      const available = records.some((record) => {
        if (dimension === "os") return record.os === value;
        if (dimension === "version") {
          return record.version === value && (!selection.os || record.os === selection.os);
        }
        return record.config === value &&
          (!selection.os || record.os === selection.os) &&
          (!selection.version || record.version === selection.version);
      });
      return [value, available];
    }));
  }

  function isBusinessRecord(record) {
    const specs = parseSpecs(record?.variant?.specs);
    return /企业购/.test(record?.variant?.name || "") || /^https?:\/\/b\.lenovo\.com\.cn\//i.test(clean(specs.url));
  }

  function resolveVariant(matrix, selection, preferredSku = "") {
    if (!selection?.os || !selection?.version || !selection?.config) return null;
    const candidates = (matrix?.records || []).filter((record) =>
      record.os === selection.os && record.version === selection.version && record.config === selection.config
    );
    if (!candidates.length) return null;
    const preferred = candidates.find((record) => record.sku === String(preferredSku || ""));
    if (preferred) return preferred;
    return candidates.slice().sort((a, b) => {
      const channelOrder = Number(isBusinessRecord(b)) - Number(isBusinessRecord(a));
      if (channelOrder) return channelOrder;
      if (a.price !== b.price) return a.price - b.price;
      return a.sku.localeCompare(b.sku);
    })[0];
  }

  return { normalizeVariant, buildMatrix, applySelection, availability, resolveVariant };
});
