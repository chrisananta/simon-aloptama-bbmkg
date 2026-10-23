import React from 'react';
import { X, Users } from 'lucide-react';
import { UPTStation } from '../../../shared/types';
import { AuthUser, UserRole } from '../../auth/authTypes';

interface UserFormModalProps {
  stations: UPTStation[];
  editingUser: AuthUser | null;
  userForm: Partial<AuthUser>;
  setUserForm: (form: Partial<AuthUser>) => void;
  setIsUserModalOpen: (open: boolean) => void;
  handleSaveUser: (e: React.FormEvent) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  stations,
  editingUser,
  userForm,
  setUserForm,
  setIsUserModalOpen,
  handleSaveUser,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            <div className="bg-[#0A203C] p-3.5 sm:p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <h3 className="font-bold text-xs sm:text-sm">
                  {editingUser ? 'Edit Data Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-left text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Username ID Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      placeholder="contoh: admin.kalibrasi"
                      value={userForm.username || ''}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kata Sandi {editingUser ? <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span> : <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                    value={userForm.password || ''}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Wajib minimal 6 karakter{editingUser ? ' jika ingin mengganti sandi' : ''}.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: Ir. Ahmad Yani, M.T."
                  value={userForm.name || ''}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Peran Access Level (RBAC) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role || 'TEKNISI_UPT'}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0052CC] focus:bg-white"
                  >
                    <option value="TEKNISI_UPT">Teknisi UPT</option>
                    <option value="KAUPT_KABBMKG">KaUPT / KaBBMKG</option>
                    <option value="ADMIN_INSKAL">Admin Inskal</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    NIP / Nomor Identitas
                  </label>
                  <input
                    type="text"
                    placeholder="contoh: 19880101 201212 1 001"
                    value={userForm.nip || ''}
                    onChange={(e) => setUserForm({ ...userForm, nip: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Jabatan / Unit Kerja
                </label>
                <input
                  type="text"
                  placeholder="contoh: Teknisi Inskal / Kepala BBMKG Wilayah V"
                  value={userForm.title || ''}
                  onChange={(e) => setUserForm({ ...userForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Stasiun UPT Terkait
                  </label>
                  <select
                    value={userForm.uptStation || ''}
                    onChange={(e) => setUserForm({ ...userForm, uptStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0052CC] focus:bg-white"
                  >
                    <option value="BBMKG Wilayah V Papua">BBMKG Wilayah V Papua</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    placeholder="contoh: user@bmkg.go.id"
                    value={userForm.email || ''}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 space-y-1">
                <span className="font-bold block">Catatan Keamanan Sesi:</span>
                <p>Pengguna dapat langsung login ke aplikasi menggunakan username ini secara fleksibel.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingUser ? 'Simpan Akun' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
