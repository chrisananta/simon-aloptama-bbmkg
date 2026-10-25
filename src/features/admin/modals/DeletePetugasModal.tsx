import React from 'react';
import { ConfirmDialog } from '../../../shared/components/modals/ConfirmDialog';
import { PetugasItem } from '../../../shared/services/petugasService';

interface DeletePetugasModalProps {
  deleteConfirmPetugas: PetugasItem;
  setDeleteConfirmPetugas: (p: PetugasItem | null) => void;
  handleConfirmDeletePetugas: () => void;
}

export const DeletePetugasModal: React.FC<DeletePetugasModalProps> = ({
  deleteConfirmPetugas,
  setDeleteConfirmPetugas,
  handleConfirmDeletePetugas,
}) => (
  <ConfirmDialog
    title="Hapus Personil?"
    onCancel={() => setDeleteConfirmPetugas(null)}
    onConfirm={handleConfirmDeletePetugas}
  >
    Petugas <strong className="text-slate-900">{deleteConfirmPetugas.name}</strong> akan dihapus permanen dari
    daftar petugas.
  </ConfirmDialog>
);