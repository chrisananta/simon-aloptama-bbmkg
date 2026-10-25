import React from 'react';
import { ConfirmDialog } from '../../../shared/components/modals/ConfirmDialog';

interface DeleteConfirmModalProps {
  deleteConfirmTarget: { type: 'stasiun' | 'alat'; id: string; name: string };
  setDeleteConfirmTarget: (target: { type: 'stasiun' | 'alat'; id: string; name: string } | null) => void;
  handleConfirmDelete: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deleteConfirmTarget,
  setDeleteConfirmTarget,
  handleConfirmDelete,
}) => {
  const jenis = deleteConfirmTarget.type === 'stasiun' ? 'Stasiun UPT' : 'Peralatan';
  return (
    <ConfirmDialog
      title={`Hapus Data ${jenis}?`}
      onCancel={() => setDeleteConfirmTarget(null)}
      onConfirm={handleConfirmDelete}
    >
      Data master {jenis} <strong className="text-slate-900">{deleteConfirmTarget.name}</strong> akan dihapus permanen.
    </ConfirmDialog>
  );
};