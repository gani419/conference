import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { VideoTrack } from '@livekit/react-native';
import { mediaService } from '../../services/mediaService';
import { LiveKitMediaAdapter } from '../../services/livekitMedia';

export function LiveVideo({ userId }: { userId?: string | undefined }) {
  const [, update] = useState(0);
  useEffect(
    () => mediaService.onTrackStateChange(() => update(n => n + 1)),
    [],
  );
  const ref =
    mediaService instanceof LiveKitMediaAdapter && userId
      ? mediaService.getVideo(userId)
      : undefined;
  if (!ref) return null;
  return <VideoTrack trackRef={ref} style={StyleSheet.absoluteFill} />;
}
