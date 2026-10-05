import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useMeetingRoomController } from './useMeetingRoomController';
import { MeetingRoomMobile } from './MeetingRoomMobile';
import { MeetingRoomTablet } from './MeetingRoomTablet';
import { MeetingRoomChromebook } from './MeetingRoomChromebook';

type MeetingRoomRouteProp = RouteProp<RootStackParamList, typeof ROUTES.MEETING_ROOM>;

export const MeetingRoomScreen: React.FC = () => {
  const route = useRoute<MeetingRoomRouteProp>();
  const { meetingId } = route.params;
  const { mode } = useLayoutMode();
  const controller = useMeetingRoomController(meetingId);

  const renderContent = () => {
    switch (mode) {
      case 'chromebook':
        return <MeetingRoomChromebook {...controller} />;
      case 'tablet':
        return <MeetingRoomTablet {...controller} />;
      case 'mobile':
      default:
        return <MeetingRoomMobile {...controller} />;
    }
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="meeting-room-screen">
      {renderContent()}
    </ScreenContainer>
  );
};
