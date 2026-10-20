import { prisma } from '../db/prisma.js';
import { ADMIN_ACTOR_FALLBACK, normalizeActor } from './slaOlaMonthly.js';

/**
 * Kumpulan nama `actor` yang dianggap Admin: nama & username semua akun
 * Super Admin / Admin Inskal, ditambah daftar cadangan (mis. akun yang sudah
 * dihapus). Dipakai untuk membedakan log rekap bulanan admin dari log
 * pengisian UPT (lihat utils/slaOlaMonthly.ts).
 */
export async function loadAdminActorSet(): Promise<Set<string>> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN_INSKAL'] } },
    select: { name: true, username: true },
  });
  const set = new Set<string>(ADMIN_ACTOR_FALLBACK.map(normalizeActor));
  for (const u of admins) {
    set.add(normalizeActor(u.name));
    set.add(normalizeActor(u.username));
  }
  set.delete('');
  return set;
}