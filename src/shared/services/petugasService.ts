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

  add: (item: Omit<PetugasItem, 'id'>, actor = 'Admin INSKAL'): PetugasItem => {
    const newItem: PetugasItem = {
      ...item,
      id: `PET-${Date.now()}`,
    };
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

    // Write to backend API
    authFetch('/api/petugas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
      .then(async (res) => {
        if (res.ok) {
          await petugasService.fetch();
        }
      })
      .catch((e) => console.warn('Backend petugas add sync error:', e));

    return newItem;
  },

  update: (id: string, updatedFields: Partial<PetugasItem>, actor = 'Admin INSKAL'): boolean => {
    const index = memoryPetugasStore.findIndex((p) => p.id === id);
    if (index === -1) return false;

    const old = memoryPetugasStore[index];
    const updated: PetugasItem = { ...old, ...updatedFields };
    memoryPetugasStore[index] = updated;
    window.dispatchEvent(new Event('petugas_list_updated'));

    apiClient.auditLogs.add({
      table: 'master_petugas',
      action: 'EDIT',
      recordId: id,
      recordName: updated.name,
      actor,
      details: `Pembaruan data Personil Petugas Monitoring: "${old.name}" -> "${updated.name}"`,
    });

    // Write to backend API
    authFetch(`/api/petugas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields),
    })
      .then(async (res) => {
        if (res.ok) {
          await petugasService.fetch();
        }
      })
      .catch((e) => console.warn('Backend petugas update sync error:', e));

    return true;
  },

  delete: (id: string, actor = 'Admin INSKAL'): boolean => {
    const target = memoryPetugasStore.find((p) => p.id === id);
    if (!target) return false;

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

    // Write to backend API
    authFetch(`/api/petugas/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (res.ok) {
          await petugasService.fetch();
        }
      })
      .catch((e) => console.warn('Backend petugas delete sync error:', e));

    return true;
  },
};

// Initial fetch from backend API
petugasService.fetch().catch((e) => console.warn('Initial petugas fetch error:', e));
