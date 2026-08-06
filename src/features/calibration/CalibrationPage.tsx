import React from 'react';
import { CalibrationView } from './CalibrationView';
import { CalibrationPageProps } from './CalibrationTypes';

export const CalibrationPage: React.FC<CalibrationPageProps> = (props) => {
  return <CalibrationView {...props} />;
};
