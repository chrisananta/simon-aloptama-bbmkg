import React from 'react';
import { ActiveNavMenu } from '../shared/types';

interface RouterProps {
  activeMenu: ActiveNavMenu;
  renderView: (menu: ActiveNavMenu) => React.ReactNode;
}

export const AppRouter: React.FC<RouterProps> = ({ activeMenu, renderView }) => {
  return <>{renderView(activeMenu)}</>;
};
