import React from 'react';
import { AdminMasterView } from './AdminMasterView';
import { AdminMasterPageProps } from './AdminMasterTypes';

export const AdminMasterPage: React.FC<AdminMasterPageProps> = (props) => {
  return <AdminMasterView {...props} />;
};
