import React from 'react';
import { ConfirmDialog } from '../../../shared/components/modals/ConfirmDialog';
import { AuthUser } from '../../auth/authTypes';

interface DeleteUserModalProps {
  deleteConfirmUser: AuthUser;
  setDeleteConfirmUser: (u: AuthUser | null) => void;
  handleConfirmDeleteUser: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  deleteConfirmUser,
  setDeleteConfirmUser,
  handleConfirmDeleteUser,
}) => (
  <ConfirmDialog
    title="Hapus Akun Pengguna?"
    onCancel={() => setDeleteConfirmUser(null)}
    onConfirm={handleConfirmDeleteUser}
  >
    Akun <strong className="text-slate-900">{deleteConfirmUser.name}</strong> (@{deleteConfirmUser.username}) akan
    dihapus permanen.
  </ConfirmDialog>
);