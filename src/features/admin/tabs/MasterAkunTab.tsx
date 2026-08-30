import React from 'react';
import { Plus, Edit2, Trash2, Search, Filter, ShieldCheck, Users, User } from 'lucide-react';
import { AuthUser, UserRole } from '../../auth/authTypes';

interface MasterAkunTabProps {
  filteredUsers: AuthUser[];
  userSearch: string;
  setUserSearch: (value: string) => void;
  userRoleFilter: 'ALL' | UserRole;
  setUserRoleFilter: (value: 'ALL' | UserRole) => void;
  handleOpenAddUser: () => void;
  handleOpenEditUser: (u: AuthUser) => void;
  setDeleteConfirmUser: (u: AuthUser | null) => void;
}

export const MasterAkunTab: React.FC<MasterAkunTabProps> = ({
  filteredUsers,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  handleOpenAddUser,
  handleOpenEditUser,
  setDeleteConfirmUser,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Username, Nama, NIP, atau Stasiun UPT..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Peran Access Level</option>
                  <option value="ADMIN">ADMIN (Inskal &amp; Balai)</option>
                  <option value="UPT_PIMPINAN">UPT &amp; Pimpinan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleOpenAddUser}
                title="Tambah Akun Pengguna Baru"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-[#0052CC] hover:bg-blue-800 text-white cursor-pointer"
              >
                <Plus size={16} />
                <span>Tambah Akun Pengguna</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#0052CC]" />
                <h3 className="font-bold text-slate-800 text-sm">Daftar Akun Pengguna Sistem SIMON ({filteredUsers.length})</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Autentikasi Hak Akses Role-Based (RBAC) &amp; Session Management
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">Pengguna</th>
                    <th className="p-3.5">Username (ID Login)</th>
                    <th className="p-3.5 text-center">Peran Access Level</th>
                    <th className="p-3.5">Jabatan &amp; NIP</th>
                    <th className="p-3.5">Stasiun UPT</th>
                    <th className="p-3.5">Email Kontak</th>
                    <th className="p-3.5 pr-4 text-center">Aksi (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada akun pengguna yang memenuhi kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0052CC] flex items-center justify-center font-bold text-xs">
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-xs border border-slate-200">
                            @{u.username}
                          </span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <ShieldCheck size={12} /> ADMIN INSKAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <User size={12} /> UPT &amp; PIMPINAN
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{u.title}</div>
                          {u.nip && <div className="text-[10px] text-slate-400 font-mono">NIP: {u.nip}</div>}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {u.uptStation || '-'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {u.email || '-'}
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Ubah Nama & Username"
                              className="p-1.5 rounded-lg border transition-all bg-blue-50 text-[#0052CC] border-blue-200 hover:bg-blue-100 cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              title="Hapus Akun Pengguna"
                              className="p-1.5 rounded-lg border transition-all bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  );
};
