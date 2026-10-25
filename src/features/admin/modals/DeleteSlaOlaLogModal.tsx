import React from 'react';
import { ConfirmDialog } from '../../../shared/components/modals/ConfirmDialog';
import { SlaOlaLogRow } from '../types';

interface DeleteSlaOlaLogModalProps {
  deleteConfirmLog: SlaOlaLogRow;
  setDeleteConfirmLog: (log: SlaOlaLogRow | null) => void;
  handleConfirmDeleteLog: () => void;
}

export const DeleteSlaOlaLogModal: React.FC<DeleteSlaOlaLogModalProps> = ({
  deleteConfirmLog,
  setDeleteConfirmLog,
  handleConfirmDeleteLog,
}) => (
  <ConfirmDialog
    title="Hapus Data SLA/OLA?"
    onCancel={() => setDeleteConfirmLog(null)}
    onConfirm={handleConfirmDeleteLog}
  >
    Entri tanggal <strong className="text-slate-900">{deleteConfirmLog.reportDate || '-'}</strong> untuk{' '}
    <strong className="text-slate-900">{deleteConfirmLog.namaAlat}</strong> ({deleteConfirmLog.kodeAlat}) akan
    dihapus permanen.
  </ConfirmDialog>
);