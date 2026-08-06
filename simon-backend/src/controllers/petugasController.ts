import { Request, Response } from 'express';

export interface PetugasItem {
  id: string;
  name: string;
  nip?: string;
  jabatan?: string;
}

let petugasStore: PetugasItem[] = [
  { id: '1', name: 'Asrul Sani Arifin, S.Tr', nip: '19950312 201801 1 001', jabatan: 'Staf Inskal & Kalibrasi' },
  { id: '2', name: 'M. Rizky R, S.Tr', nip: '19960724 201902 1 002', jabatan: 'Staf Operasional Aloptama' },
  { id: '3', name: 'Fajar Nur, M.T.', nip: '19850412 201012 1 001', jabatan: 'Admin INSKAL BMKG V' },
];

export const petugasController = {
  getAll: async (req: Request, res: Response) => {
    return res.json({ success: true, data: petugasStore });
  },

  create: async (req: Request, res: Response) => {
    const { name, nip, jabatan } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama petugas wajib diisi.' });
    }
    const newItem: PetugasItem = {
      id: `PET-${Date.now()}`,
      name,
      nip,
      jabatan,
    };
    petugasStore.push(newItem);
    return res.status(201).json({ success: true, data: newItem, list: petugasStore });
  },

  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, nip, jabatan } = req.body;
    const index = petugasStore.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan.' });
    }
    petugasStore[index] = {
      ...petugasStore[index],
      ...(name !== undefined ? { name } : {}),
      ...(nip !== undefined ? { nip } : {}),
      ...(jabatan !== undefined ? { jabatan } : {}),
    };
    return res.json({ success: true, data: petugasStore[index], list: petugasStore });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params;
    petugasStore = petugasStore.filter((p) => p.id !== id);
    return res.json({ success: true, list: petugasStore });
  },
};
