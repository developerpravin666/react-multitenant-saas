import React, { useMemo } from "react";

export interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 128,
  className = "",
  fgColor = "#000000",
  bgColor = "#ffffff",
}) => {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch (e) {
      console.warn("Failed to generate QR Code matrix:", e);
      return null;
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-slate-300 text-[10px] text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR Error
      </div>
    );
  }

  const moduleCount = matrix.length;
  const cellSize = size / moduleCount;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.05}
              height={cellSize + 0.05}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
};

// --- QR CODE GENERATION ENGINE (Byte Mode, ECC L, Strict Typed) ---

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  EXP_TABLE[i + 255] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  const logA = LOG_TABLE[a] ?? 0;
  const logB = LOG_TABLE[b] ?? 0;
  return EXP_TABLE[logA + logB] ?? 0;
}

function getPoly(ecCount: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      const pVal = poly[j] ?? 0;
      const expVal = EXP_TABLE[i] ?? 0;
      next[j] = (next[j] ?? 0) ^ gmult(pVal, expVal);
      next[j + 1] = (next[j + 1] ?? 0) ^ pVal;
    }
    poly = next;
  }
  return poly;
}

interface VersionSpec {
  dataBytes: number;
  ecBytes: number;
}

const VERSION_SPECS: Record<number, VersionSpec> = {
  1: { dataBytes: 19, ecBytes: 7 },
  2: { dataBytes: 34, ecBytes: 10 },
  3: { dataBytes: 55, ecBytes: 15 },
  4: { dataBytes: 80, ecBytes: 20 },
  5: { dataBytes: 108, ecBytes: 26 },
  6: { dataBytes: 136, ecBytes: 18 },
  7: { dataBytes: 156, ecBytes: 20 },
  8: { dataBytes: 194, ecBytes: 24 },
  9: { dataBytes: 232, ecBytes: 30 },
  10: { dataBytes: 274, ecBytes: 18 },
  11: { dataBytes: 324, ecBytes: 20 },
  12: { dataBytes: 370, ecBytes: 24 },
  13: { dataBytes: 428, ecBytes: 26 },
  14: { dataBytes: 461, ecBytes: 30 },
};

function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const dataLen = rawBytes.length;

  let version = 1;
  while (version <= 14) {
    const s = VERSION_SPECS[version];
    if (s && dataLen + 3 <= s.dataBytes) break;
    version++;
  }
  if (version > 14) version = 14;

  const spec: VersionSpec = VERSION_SPECS[version] ?? { dataBytes: 461, ecBytes: 30 };
  const size = version * 4 + 17;

  // Build bitstream (Byte mode 0100)
  const bits: number[] = [0, 1, 0, 0];
  const countBits = version < 10 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((dataLen >> i) & 1);
  }
  for (let i = 0; i < rawBytes.length; i++) {
    const byteVal = rawBytes[i] ?? 0;
    for (let b = 7; b >= 0; b--) {
      bits.push((byteVal >> b) & 1);
    }
  }

  // Terminator
  const totalDataBits = spec.dataBytes * 8;
  const termLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes (0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    const p = padPatterns[padIdx % 2] ?? 0xec;
    for (let b = 7; b >= 0; b--) bits.push((p >> b) & 1);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataWords = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let word = 0;
    for (let b = 0; b < 8; b++) {
      const bitVal = bits[i * 8 + b] ?? 0;
      word = (word << 1) | bitVal;
    }
    dataWords[i] = word;
  }

  // Compute EC codewords using Reed-Solomon
  const poly = getPoly(spec.ecBytes);
  const ecWords = new Uint8Array(spec.ecBytes);
  for (let i = 0; i < dataWords.length; i++) {
    const dVal = dataWords[i] ?? 0;
    const ecVal0 = ecWords[0] ?? 0;
    const factor = dVal ^ ecVal0;
    for (let j = 0; j < spec.ecBytes - 1; j++) {
      const nextEc = ecWords[j + 1] ?? 0;
      const polyVal = poly[j] ?? 0;
      ecWords[j] = nextEc ^ gmult(polyVal, factor);
    }
    const lastPolyVal = poly[spec.ecBytes - 1] ?? 0;
    ecWords[spec.ecBytes - 1] = gmult(lastPolyVal, factor);
  }

  // Interleave and create full codeword array
  const allWords = new Uint8Array(spec.dataBytes + spec.ecBytes);
  allWords.set(dataWords, 0);
  allWords.set(ecWords, spec.dataBytes);

  // Initialize Matrix
  const grid: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Function: Place Finder Pattern
  const placeFinder = (startX: number, startY: number) => {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const r = startY + y;
        const c = startX + x;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const row = grid[r];
          if (!row) continue;
          if (x >= 0 && x <= 6 && y >= 0 && y <= 6) {
            row[c] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
          } else {
            row[c] = false;
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Timing Patterns
  const row6 = grid[6];
  if (row6) {
    for (let i = 8; i < size - 8; i++) {
      if (row6[i] === null) row6[i] = i % 2 === 0;
      const colRow = grid[i];
      if (colRow && colRow[6] === null) colRow[6] = i % 2 === 0;
    }
  }

  // Dark module
  const darkRow = grid[4 * version + 9];
  if (darkRow) darkRow[8] = true;

  // Alignment Patterns (for version >= 2)
  if (version >= 2) {
    const alignPos: number[] = [6, size - 7];
    for (const r of alignPos) {
      for (const c of alignPos) {
        const checkRow = grid[r];
        if (checkRow && checkRow[c] !== null) continue;
        for (let y = -2; y <= 2; y++) {
          for (let x = -2; x <= 2; x++) {
            const aRow = grid[r + y];
            if (aRow) {
              aRow[c + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
            }
          }
        }
      }
    }
  }

  // Reserve format bits
  for (let i = 0; i < 9; i++) {
    const r8 = grid[8];
    if (r8) {
      if (r8[i] === null) r8[i] = false;
      if (r8[size - 1 - i] === null) r8[size - 1 - i] = false;
    }
    const ri = grid[i];
    if (ri && ri[8] === null) ri[8] = false;
    const rEnd = grid[size - 1 - i];
    if (rEnd && rEnd[8] === null) rEnd[8] = false;
  }

  // Place data bits with Zig-Zag scan and Mask 0 ((row + col) % 2 === 0)
  const fullBits: number[] = [];
  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i] ?? 0;
    for (let b = 7; b >= 0; b--) {
      fullBits.push((w >> b) & 1);
    }
  }

  let bitIdx = 0;
  let dir = -1; // up
  let x = size - 1;

  while (x > 0) {
    if (x === 6) x--; // Skip timing column
    const colA = x;
    const colB = x - 1;

    let y = dir === -1 ? size - 1 : 0;
    const endY = dir === -1 ? -1 : size;

    while (y !== endY) {
      const row = grid[y];
      if (row) {
        for (const c of [colA, colB]) {
          if (row[c] === null) {
            const bit = bitIdx < fullBits.length ? (fullBits[bitIdx++] ?? 0) : 0;
            // Apply mask 0: (row + col) % 2 == 0
            const mask = (y + c) % 2 === 0;
            row[c] = (bit === 1) !== mask;
          }
        }
      }
      y += dir === -1 ? -1 : 1;
    }
    dir = -dir;
    x -= 2;
  }

  // Apply fixed ECC L, mask 0 format information: 111011111000100
  const formatStr = "111011111000100";
  const r8 = grid[8];
  for (let i = 0; i < 15; i++) {
    const val = formatStr[i] === "1";
    // Top-left
    if (i <= 5 && r8) r8[i] = val;
    else if (i === 6 && r8) r8[7] = val;
    else if (i === 7 && r8) r8[8] = val;
    else if (i === 8) {
      const r7 = grid[7];
      if (r7) r7[8] = val;
    } else {
      const rIdx = grid[14 - i];
      if (rIdx) rIdx[8] = val;
    }

    // Split across top-right & bottom-left
    if (i < 8) {
      const rBottom = grid[size - 1 - i];
      if (rBottom) rBottom[8] = val;
    } else if (r8) {
      r8[size - 15 + i] = val;
    }
  }

  return grid.map((row) => row.map((cell) => cell ?? false));
}

