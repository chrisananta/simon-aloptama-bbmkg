import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
}) => {
  return (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 sm:p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-900">{deleteConfirmUser.name}</span> (@{deleteConfirmUser.username})? Tindakan ini akan dicatat dalam audit log.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
  );
};
