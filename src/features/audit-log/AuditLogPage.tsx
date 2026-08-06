import React from 'react';
import { AuditLogView } from './AuditLogView';
import { AuditLogPageProps } from './AuditLogTypes';

export const AuditLogPage: React.FC<AuditLogPageProps> = (props) => {
  return <AuditLogView {...props} />;
};
