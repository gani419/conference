import React from 'react';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useDashboardController } from './useDashboardController';
import { DashboardMobile } from './DashboardMobile';
import { DashboardTablet } from './DashboardTablet';
import { DashboardChromebook } from './DashboardChromebook';

export const DashboardScreen: React.FC = () => {
  const { mode } = useLayoutMode();
  const controller = useDashboardController();

  const renderContent = () => {
    switch (mode) {
      case 'chromebook':
        return <DashboardChromebook {...controller} />;
      case 'tablet':
        return <DashboardTablet {...controller} />;
      case 'mobile':
      default:
        return <DashboardMobile {...controller} />;
    }
  };

  return (
    <ScreenContainer
      scrollable={false}
      padded={false}
      testID="dashboard-screen"
    >
      {renderContent()}
    </ScreenContainer>
  );
};
