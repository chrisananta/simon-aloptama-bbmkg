import { prisma } from './db/prisma.js';

async function main() {
  console.log('🌱 Seeding SIMON Aloptama PostgreSQL database...');

  // 1. Seed Users
  await prisma.user.upsert({
    where: { username: 'admin.inskal' },
    update: {
      passwordHash: 'inskal123',
    },
    create: {
      id: 'USR-ADMIN-001',
      username: 'admin.inskal',
      passwordHash: 'inskal123', // Password default
      name: 'Ir. Fajar Nur, M.T.',
      role: 'ADMIN',
      title: 'Admin INSKAL & Kalibrasi BBMKG V',
      nip: '19850412 201012 1 001',
      email: 'fajar.nur@bmkg.go.id',
      uptStation: 'BBMKG Wilayah V Papua',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    },
  });

  await prisma.user.upsert({
    where: { username: 'upt.jayapura' },
    update: {
      passwordHash: 'bmkg123',
    },
    create: {
      id: 'USR-UPT-001',
      username: 'upt.jayapura',
      passwordHash: 'bmkg123', // Password default
      name: 'Agus Prasetyo, S.Tr.',
      role: 'UPT_PIMPINAN',
      title: 'Operator UPT Stamet Dok II Jayapura',
      nip: '19920815 201503 1 002',
      email: 'stamet.jayapura@bmkg.go.id',
      uptStation: 'Stasiun Meteorologi Dok II Jayapura',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    },
  });

  await prisma.user.upsert({
    where: { username: 'pimpinan.balai' },
    update: {},
    create: {
      id: 'USR-PIMP-001',
      username: 'pimpinan.balai',
      name: 'Dr. Yosafat, M.Si.',
      role: 'UPT_PIMPINAN',
      title: 'Kepala BBMKG Wilayah V Papua',
      nip: '19760310 199903 1 001',
      email: 'pimpinan.balai5@bmkg.go.id',
      uptStation: 'BBMKG Wilayah V Papua',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    },
  });

  // 2. Seed UPT Stations
  const stations = [
    { code: 'MET001', name: 'Stasiun Meteorologi DEO Sorong', regionGroup: 'Papua Barat Daya', location: 'Sorong', latitude: -0.89, longitude: 131.286 },
    { code: 'MET002', name: 'Stasiun Meteorologi Torea - Fakfak', regionGroup: 'Papua Barat', location: 'Fakfak', latitude: -2.555, longitude: 132.526 },
    { code: 'MET003', name: 'Stasiun Meteorologi Utarom - Kaimana', regionGroup: 'Papua Barat', location: 'Kaimana', latitude: -3.645, longitude: 133.694 },
    { code: 'MET004', name: 'Stasiun Meteorologi Serui', regionGroup: 'Papua', location: 'Serui', latitude: -1.83, longitude: 136.064 },
    { code: 'MET005', name: 'Stasiun Meteorologi Frans Kaisiepo Biak', regionGroup: 'Papua', location: 'Biak', latitude: -1.191, longitude: 136.104 },
    { code: 'MET006', name: 'Stasiun Meteorologi Sentani', regionGroup: 'Papua', location: 'Kab. Jayapura', latitude: -2.576, longitude: 140.518 },
    { code: 'MET007', name: 'Stasiun Meteorologi Rendani Manokwari', regionGroup: 'Papua Barat', location: 'Manokwari', latitude: -0.892, longitude: 134.051 },
    { code: 'MET008', name: 'Stasiun Meteorologi Timika', regionGroup: 'Papua Tengah', location: 'Timika', latitude: -4.53, longitude: 136.893 },
    { code: 'MET009', name: 'Stasiun Meteorologi Mopah Merauke', regionGroup: 'Papua Selatan', location: 'Merauke', latitude: -8.515, longitude: 140.415 },
    { code: 'MET012', name: 'Stasiun Meteorologi Dok II Jayapura', regionGroup: 'Papua', location: 'Kota Jayapura', latitude: -2.533, longitude: 140.717 },
  ];

  for (const st of stations) {
    await prisma.uptStation.upsert({
      where: { code: st.code },
      update: {},
      create: st,
    });
  }

  // 3. Seed Sample Devices
  const initialDevices = [
    {
      id: 'ALT0001',
      name: 'AWOS Dok II Jayapura',
      category: 'AWOS',
      subCategory: 'Vaisala Kat III',
      uptStation: 'Stasiun Meteorologi Dok II Jayapura',
      locationName: 'Bandara & Kantor Dok II',
      latitude: -2.533,
      longitude: 140.717,
      conditionStatus: 'NORMAL' as const,
      calibrationStatus: 'VALID' as const,
      lastCalibrated: '2025-06-15',
      calibrationValidUntil: '2026-06-15',
      calibrationAgency: 'Tim INSKAL BBMKG Wilayah V Jayapura',
    },
    {
      id: 'ALT0002',
      name: 'Radar Weather Sentani',
      category: 'Radar Cuaca',
      subCategory: 'Baron C-Band',
      uptStation: 'Stasiun Meteorologi Sentani',
      locationName: 'Bukit Pos 7 Sentani',
      latitude: -2.576,
      longitude: 140.518,
      conditionStatus: 'NORMAL' as const,
      calibrationStatus: 'VALID' as const,
      lastCalibrated: '2025-02-10',
      calibrationValidUntil: '2026-02-10',
      calibrationAgency: 'Tim INSKAL & Vendor Baron',
    },
    {
      id: 'ALT0003',
      name: 'Seismometer Biak',
      category: 'Seismometer',
      subCategory: 'Nanometrics Trillium',
      uptStation: 'Stasiun Meteorologi Frans Kaisiepo Biak',
      locationName: 'Stasiun Geofisika Biak',
      latitude: -1.191,
      longitude: 136.104,
      conditionStatus: 'NORMAL' as const,
      calibrationStatus: 'VALID' as const,
      lastCalibrated: '2024-11-20',
      calibrationValidUntil: '2025-11-20',
      calibrationAgency: 'Pusat Seismologi Teknik BMKG',
    },
  ];

  for (const dev of initialDevices) {
    await prisma.device.upsert({
      where: { id: dev.id },
      update: {},
      create: dev,
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
