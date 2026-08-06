import React from 'react';
import { SlaOlaView } from './SlaOlaView';
import { SlaOlaPageProps } from './SlaOlaTypes';

export const SlaOlaPage: React.FC<SlaOlaPageProps> = (props) => {
  return <SlaOlaView {...props} />;
};
