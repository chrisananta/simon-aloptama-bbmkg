const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function readCSV(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filename} tidak ditemukan di: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').map(l => l.replace(/\r/g, ''));
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] !== undefined && values[i] !== '' ? values[i] : null;
    });
    return row;
  });
}

async function main() {
  console.log('Memulai import data master CSV...');

  // 1. Import Master Stasiun (UptStation)
  const stasiunList = readCSV('MASTER_STASIUN.csv');
  let stasiunCount = 0;
  for (const item of stasiunList) {
    if (!item.ID_STASIUN) continue;
    try {
      await prisma.uptStation.upsert({
        where: { code: item.ID_STASIUN },
        update: {
          name: item.NAMA_STASIUN,
          regionGroup: item.JENIS_STASIUN,
          location: item.KOTA,
        },
        create: {
          code: item.ID_STASIUN,
          name: item.NAMA_STASIUN,
          regionGroup: item.JENIS_STASIUN,
          location: item.KOTA,
          latitude: 0.0,
          longitude: 0.0,
        },
      });
      stasiunCount++;
    } catch (e) {
      console.error(`Gagal import stasiun ${item.ID_STASIUN}:`, e.message);
    }
  }
  console.log(`[OK] Berhasil mengimpor ${stasiunCount} Stasiun.`);

  // 2. Import Master Peralatan (Device)
  const alatList = readCSV('MASTER_PERALATAN.csv');
  let alatCount = 0;
  for (const item of alatList) {
    if (!item.ID_ALAT) continue;
    const lat = item.LATITUDE && !isNaN(parseFloat(item.LATITUDE)) ? parseFloat(item.LATITUDE) : 0.0;
    const lng = item.LONGITUDE && !isNaN(parseFloat(item.LONGITUDE)) ? parseFloat(item.LONGITUDE) : 0.0;

    try {
      await prisma.device.upsert({
        where: { id: item.ID_ALAT },
        update: {
          name: item.NAMA_PERALATAN || item.ID_ALAT,
          category: item.JENIS_PERALATAN || 'Umum',
          subCategory: item.MERK || '',
          uptStation: item.ID_STASIUN || '-',
          locationName: item.NAMA_PERALATAN || '-',
          latitude: lat,
          longitude: lng,
        },
        create: {
          id: item.ID_ALAT,
          name: item.NAMA_PERALATAN || item.ID_ALAT,
          category: item.JENIS_PERALATAN || 'Umum',
          subCategory: item.MERK || '',
          uptStation: item.ID_STASIUN || '-',
          locationName: item.NAMA_PERALATAN || '-',
          latitude: lat,
          longitude: lng,
          lastCalibrated: '2025-01-01',
          calibrationValidUntil: '2026-01-01',
          calibrationAgency: 'Balai Besar MKG Wilayah V',
        },
      });
      alatCount++;
    } catch (e) {
      console.error(`Gagal import alat ${item.ID_ALAT}:`, e.message);
    }
  }
  console.log(`[OK] Berhasil mengimpor ${alatCount} Peralatan.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());