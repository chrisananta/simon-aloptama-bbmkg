/**
 * Seed akun Teknisi UPT & KaUPT untuk SEMUA UPT di MASTER_STASIUN.csv.
 *
 * Pola akun (permintaan pimpinan BBMKG, Sept 2026):
 *   - Teknisi UPT : username = password = kode UPT (mis. "MET001")
 *   - KaUPT       : username = password = "K-" + kode UPT (mis. "K-MET001")
 *
 * Password disimpan ter-hash (bcrypt) - nilai plaintext HANYA muncul di
 * log/CSV ringkasan hasil seed ini untuk dibagikan ke masing-masing UPT,
 * tidak pernah disimpan mentah di database.
 *
 * Jalankan dari folder simon-backend:
 *   node prisma/seedUptAccounts.cjs
 *
 * Aman dijalankan berkali-kali (idempotent) - akun yang sudah ada di-skip,
 * tidak akan menimpa password yang mungkin sudah diganti user.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function readCSV(filename) {
  const filePath = path.join(__dirname, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").map((l) => l.replace(/\r/g, ""));
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

async function main() {
  const stations = readCSV("MASTER_STASIUN.csv");
  console.log(`Ditemukan ${stations.length} UPT di MASTER_STASIUN.csv\n`);

  const summary = []; // untuk dicetak sebagai tabel/CSV ringkasan di akhir

  for (const st of stations) {
    const kode = st.ID_STASIUN;
    const namaStasiun = st.NAMA_STASIUN;
    if (!kode || !namaStasiun) continue;

    const accounts = [
      {
        username: kode.toLowerCase(),
        rawPassword: kode,
        name: `Teknisi UPT - ${namaStasiun}`,
        role: "TEKNISI_UPT",
        title: "Teknisi UPT",
      },
      {
        username: `k-${kode.toLowerCase()}`,
        rawPassword: `K-${kode}`,
        name: `KaUPT - ${namaStasiun}`,
        role: "KAUPT_KABBMKG",
        title: "Kepala UPT",
      },
    ];

    for (const acc of accounts) {
      const existing = await prisma.user.findUnique({ where: { username: acc.username } });
      if (existing) {
        console.log(`  - dilewati (sudah ada): ${acc.username}`);
        summary.push({ ...acc, uptStation: kode, status: "SUDAH_ADA" });
        continue;
      }

      const passwordHash = await bcrypt.hash(acc.rawPassword, SALT_ROUNDS);
      await prisma.user.create({
        data: {
          username: acc.username,
          passwordHash,
          name: acc.name,
          role: acc.role,
          title: acc.title,
          uptStation: kode,
        },
      });
      console.log(`  + dibuat: ${acc.username} (${acc.role}) - ${namaStasiun}`);
      summary.push({ ...acc, uptStation: kode, status: "DIBUAT" });
    }
  }

  // Cetak ringkasan CSV di akhir - salin ke file terpisah untuk dibagikan
  // ke masing-masing UPT (JANGAN commit file plaintext ini ke git).
  console.log("\n=== RINGKASAN AKUN (username,password,role,upt,status) ===");
  console.log("username,password,role,uptStation,status");
  summary.forEach((s) => {
    console.log(`${s.username},${s.rawPassword},${s.role},${s.uptStation},${s.status}`);
  });

  console.log(`\nSelesai. ${summary.filter((s) => s.status === "DIBUAT").length} akun baru dibuat, ${summary.filter((s) => s.status === "SUDAH_ADA").length} dilewati (sudah ada).`);
}

main()
  .catch((e) => {
    console.error("Gagal seed akun UPT:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
