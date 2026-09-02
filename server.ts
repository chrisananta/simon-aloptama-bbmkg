import dotenv from "dotenv";

dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import { prisma } from "./simon-backend/src/db/prisma.js";
import apiRouter from "./simon-backend/src/routes/index.js";
import { CORS_ORIGINS } from "./simon-backend/src/config/env.js";
import {
  SEED_DEVICES,
  SEED_UPT_STATIONS,
} from "./simon-backend/src/db/seedData.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Bikin password acak yang aman & gampang dibaca manusia
function generateRandomPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Aplikasi ini bisa jalan di belakang reverse proxy (mis. saat nanti
// dideploy ke server dengan Nginx/Caddy di depannya). Tanpa "trust proxy",
// Express membaca req.ip dari koneksi TCP langsung (yaitu alamat proxy
// itu sendiri, BUKAN alamat klien asli) - akibatnya:
//   1. loginRateLimiter (rate-limit login per-IP) akan menganggap SEMUA
//      pengguna datang dari satu "IP" yang sama (IP proxy), sehingga satu
//      pengguna yang salah password berkali-kali bisa mengunci pengguna
//      lain yang berbagi proxy yang sama.
//   2. req.ip yang dicatat di audit log (ipOrSource) jadi tidak berguna
//      untuk forensik/investigasi.
// "1" berarti percaya SATU hop proxy di depan app. Express lalu membaca
// IP asli dari header X-Forwarded-For yang disuntik oleh proxy tepercaya tsb.
app.set('trust proxy', 2);

// 1. Header keamanan standar (CSP dimatikan agar aset inline Vite/dist tidak terblokir)
app.use(helmet({ contentSecurityPolicy: false }));

// 2. CORS: hanya izinkan origin dari whitelist env var (CORS_ORIGIN) dan localhost.
//
// PENTING: pencocokan HARUS berbasis hostname yang sudah di-parse, BUKAN
// origin.includes("...") mentah. String.includes() mencocokkan substring di
// posisi manapun, jadi origin jahat seperti "https://notlocalhost.evil.com"
// akan ikut lolos karena mengandung "localhost" sebagai substring - padahal
// itu bukan domain localhost yang sebenarnya. Di bawah ini kita parse origin
// jadi hostname asli lalu cek exact match, supaya tidak bisa dikelabui seperti itu.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isAllowedHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

app.use(
  cors({
    origin(origin, callback) {
      // Request tanpa header Origin (misal curl, server-to-server, health check, atau same-origin asset)
      if (!origin) return callback(null, true);

      // Origin dari whitelist env var (CORS_ORIGIN) - exact match, ini paling aman.
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);

      // Izinkan localhost, tapi berdasarkan HOSTNAME yang benar-benar
      // di-parse dari origin, bukan substring cocok-cocokan di string mentah.
      try {
        const { hostname } = new URL(origin);
        if (isAllowedHostname(hostname)) return callback(null, true);
      } catch {
        // Origin tidak bisa di-parse sebagai URL valid -> tolak di bawah.
      }

      // Jangan lempar Error() agar tidak menjadi JSON 500 pada file CSS/JS
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());

import cookieParser from 'cookie-parser';

app.use(express.json());
app.use(cookieParser()); // Pasang middleware pembaca cookie

// Auto-seed database when empty
async function autoSeedDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log(
        "🌱 Database PostgreSQL kosong. Melakukan auto-seeding data awal SIMON Aloptama..."
      );

      const adminPassword = generateRandomPassword();
      const uptPassword = generateRandomPassword();
      const pimpinanPassword = generateRandomPassword();

      const adminHash = await bcrypt.hash(adminPassword, 10);
      const uptHash = await bcrypt.hash(uptPassword, 10);
      const pimpinanHash = await bcrypt.hash(pimpinanPassword, 10);

      // 1. Users
      await prisma.user.upsert({
        where: { username: "admin.inskal" },
        update: {},
        create: {
          id: "USR-ADMIN-001",
          username: "admin.inskal",
          passwordHash: adminHash,
          name: "Ir. Fajar Nur, M.T.",
          role: "ADMIN_INSKAL",
          title: "Admin INSKAL & Kalibrasi BBMKG V",
          nip: "19850412 201012 1 001",
          email: "fajar.nur@bmkg.go.id",
          uptStation: "BBMKG Wilayah V Papua",
          avatarUrl:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        },
      });

      await prisma.user.upsert({
        where: { username: "upt.jayapura" },
        update: {},
        create: {
          id: "USR-UPT-001",
          username: "upt.jayapura",
          passwordHash: uptHash,
          name: "Agus Prasetyo, S.Tr.",
          role: "TEKNISI_UPT",
          title: "Operator UPT Stamet Dok II Jayapura",
          nip: "19920815 201503 1 002",
          email: "stamet.jayapura@bmkg.go.id",
          uptStation: "Stasiun Meteorologi Dok II Jayapura",
          avatarUrl:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
        },
      });

      await prisma.user.upsert({
        where: { username: "pimpinan.balai" },
        update: {},
        create: {
          id: "USR-PIMP-001",
          username: "pimpinan.balai",
          passwordHash: pimpinanHash,
          name: "Dr. Yosafat, M.Si.",
          role: "KAUPT_KABBMKG",
          title: "Kepala BBMKG Wilayah V Papua",
          nip: "19760310 199903 1 001",
          email: "pimpinan.balai5@bmkg.go.id",
          uptStation: "BBMKG Wilayah V Papua",
          avatarUrl:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
        },
      });

      console.log(
        "\n════════════════════════════════════════════════════════════"
      );
      console.log(
        "🔑  AKUN AWAL BERHASIL DIBUAT - CATAT PASSWORD INI SEKARANG!"
      );
      console.log(
        "    Password ini HANYA ditampilkan sekali dan TIDAK disimpan"
      );
      console.log("    dalam bentuk terbaca di mana pun setelah ini.");
      console.log(
        "────────────────────────────────────────────────────────────"
      );
      console.log(`    admin.inskal    : ${adminPassword}`);
      console.log(`    upt.jayapura    : ${uptPassword}`);
      console.log(`    pimpinan.balai  : ${pimpinanPassword}`);
      console.log(
        "════════════════════════════════════════════════════════════\n"
      );

      // 2. Stations
      for (const st of SEED_UPT_STATIONS) {
        await prisma.uptStation.upsert({
          where: { stationid: st.code },
          update: {},
          create: {
            stationid: st.code,
            name: st.name,
            regionGroup: st.regionGroup || "Papua",
            location: st.location || st.name,
            latitude: Number(st.latitude) || -2.54,
            longitude: Number(st.longitude) || 140.7,
          },
        });
      }

      // 3. Initial Devices
      for (const dev of SEED_DEVICES) {
        await prisma.device.upsert({
          where: { devicesId: dev.id },
          update: {},
          create: {
            devicesId: dev.id,
            site: dev.name,
            category: dev.category,
            merk: dev.subCategory || null,
            uptStation: dev.uptStation,
            locationName: dev.locationName || dev.uptStation,
            latitude: Number(dev.latitude) || -2.54,
            longitude: Number(dev.longitude) || 140.7,
            conditionStatus: (dev.conditionStatus || "NORMAL") as any,
            calibrationStatus: (dev.calibrationStatus || "VALID") as any,
            lastCalibrated: new Date(dev.lastCalibrated || "2025-06-15"),
            calibrationValidUntil: new Date(dev.calibrationValidUntil || "2026-06-15"),
            timkalibrasi: dev.calibrationAgency || "INSKAL BBMKG V",
            issueDescription: null,
            downtimeDuration: null,
            slaScore: dev.slaScore || 100,
            olaScore: dev.olaScore || 100,
          },
        });
      }

      console.log(
        "✅ Auto-seeding PostgreSQL SIMON Aloptama berhasil selesai!"
      );
    }
  } catch (err) {
    console.warn("Auto-seed check notification:", err);
  }
}

// Mount Centralized API Router
app.use("/api", apiRouter);
app.use("/api/v1", apiRouter);

async function startServer() {
  // Setup Frontend: Mode Dev (Vite Middleware) vs Production (Static Dist)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler ditaruh setelah rute static/API
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("❌ Unhandled Server Error:", err);
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Terjadi kesalahan internal pada server.",
      });
    }
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server BMKG Aloptama (PostgreSQL DB Enabled) running on http://0.0.0.0:${PORT}`
    );
    autoSeedDatabase().catch((err) =>
      console.warn("Auto-seed check notification:", err)
    );
  });
}

startServer();