import { apiClient } from '../api/apiClient';
import { authFetch } from '../api/http';

export interface PetugasItem {
  id: string;
  name: string;
  nip?: string;
  jabatan?: string;
}

export const INITIAL_PETUGAS_LIST: PetugasItem[] = [
  { id: '1', name: 'Asrul Sani Arifin, S.Tr', nip: '19950312 201801 1 001', jabatan: 'Staf Inskal & Kalibrasi' },
  { id: '2', name: 'M. Rizky R, S.Tr', nip: '19960724 201902 1 002', jabatan: 'Staf Operasional Aloptama' },
  { id: '3', name: 'Fajar Nur, M.T.', nip: '19850412 201012 1 001', jabatan: 'Admin INSKAL BMKG V' },
];

let memoryPetugasStore: PetugasItem[] = [...INITIAL_PETUGAS_LIST];

export const petugasService = {
  // Sync/Fetch from Backend Database API
  fetch: async (): Promise<PetugasItem[]> => {
    try {
      const res = await authFetch('/api/petugas');
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          memoryPetugasStore = json.data;
          window.dispatchEvent(new Event('petugas_list_updated'));
          return json.data;
        }
      }
    } catch (e) {
      console.warn('petugasService.fetch error:', e);
    }
    return memoryPetugasStore;
  },

  getAll: (): PetugasItem[] => {
    return memoryPetugasStore;
  },

  saveAll: (list: PetugasItem[]): void => {
    memoryPetugasStore = list;
    window.dispatchEvent(new Event('petugas_list_updated'));
  },

  add: async (item: Omit<PetugasItem, 'id'>, actor = 'Admin INSKAL'): Promise<PetugasItem> => {
    // PENTING: tunggu konfirmasi server DULU sebelum update tampilan - kalau
    // langsung update tampilan tanpa nunggu, data bisa kelihatan "berhasil
    // ditambah" padahal sebenarnya gagal tersimpan di server (mis. token
    // sudah tidak valid), dan baru ketahuan hilang setelah refresh/reopen.
    const response = await authFetch('/api/petugas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      let message = 'Gagal menyimpan petugas ke server.';
      if (response.status === 401) {
        message = 'Sesi login sudah tidak valid. Silakan logout lalu login kembali, baru coba lagi.';
      } else {
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          // ignore
        }
      }
      throw new Error(message);
    }

    const resData = await response.json();
    const newItem: PetugasItem = resData?.data || { ...item, id: `PET-${Date.now()}` };

    memoryPetugasStore = [...memoryPetugasStore, newItem];
    window.dispatchEvent(new Event('petugas_list_updated'));

    apiClient.auditLogs.add({
      table: 'master_petugas',
      action: 'TAMBAH',
      recordId: newItem.id,
      recordName: newItem.name,
      actor,
      details: `Penambahan Personil Petugas Monitoring Baru: "${newItem.name}" (${newItem.jabatan || 'Staf Operasional'})`,
    });

    await petugasService.fetch();

    return newItem;
  },

  update: async (id: string, updatedFields: Partial<PetugasItem>, actor = 'Admin INSKAL'): Promise<boolean> => {
    const old = memoryPetugasStore.find((p) => p.id === id);
    if (!old) return false;

    const response = await authFetch(`/api/petugas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields),
    });

    if (!response.ok) {
      let message = 'Gagal memperbarui petugas di server.';
      if (response.status === 401) {
        message = 'Sesi login sudah tidak valid. Silakan logout lalu login kembali, baru coba lagi.';
      } else {
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          // ignore
        }
      }
      throw new Error(message);
    }

    const updated: PetugasItem = { ...old, ...updatedFields };
    memoryPetugasStore = memoryPetugasStore.map((p) => (p.id === id ? updated : p));
    window.dispatchEvent(new Event('petugas_list_updated'));

    apiClient.auditLogs.add({
      table: 'master_petugas',
      action: 'EDIT',
      recordId: id,
      recordName: updated.name,
      actor,
      details: `Pembaruan data Personil Petugas Monitoring: "${old.name}" -> "${updated.name}"`,
    });

    await petugasService.fetch();

    return true;
  },

  delete: async (id: string, actor = 'Admin INSKAL'): Promise<boolean> => {
    const target = memoryPetugasStore.find((p) => p.id === id);
    if (!target) return false;

    const response = await authFetch(`/api/petugas/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      let message = 'Gagal menghapus petugas di server.';
      if (response.status === 401) {
        message = 'Sesi login sudah tidak valid. Silakan logout lalu login kembali, baru coba lagi.';
      } else if (response.status === 403) {
        message = 'Aksi ini hanya diizinkan untuk Admin INSKAL.';
      } else {
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          // ignore
        }
      }
      throw new Error(message);
    }

    memoryPetugasStore = memoryPetugasStore.filter((p) => p.id !== id);
    window.dispatchEvent(new Event('petugas_list_updated'));

    apiClient.auditLogs.add({
      table: 'master_petugas',
      action: 'HAPUS',
      recordId: id,
      recordName: target.name,
      actor,
      details: `Penghapusan Personil Petugas Monitoring: "${target.name}"`,
    });

    await petugasService.fetch();

    return true;
  },
};

// Initial fetch from backend API
petugasService.fetch().catch((e) => console.warn('Initial petugas fetch error:', e));
