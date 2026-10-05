import { Share as RNShare } from 'react-native';
import Share from 'react-native-share';

export interface ShareMeetingOptions {
  title: string;
  meetingCode: string;
  shareLink: string;
  scheduledTime?: string;
}

export const shareService = {
  async shareMeetingLink(options: ShareMeetingOptions): Promise<boolean> {
    const message = `Join my meeting: ${options.title}\nMeeting Code: ${options.meetingCode}\nLink: ${options.shareLink}${
      options.scheduledTime ? `\nStarts at: ${options.scheduledTime}` : ''
    }`;

    try {
      await Share.open({
        title: options.title,
        message,
        url: options.shareLink,
      });
      return true;
    } catch (error) {
      // User cancelled or share-sheet closed, or fallback to standard RN Share
      try {
        await RNShare.share({
          title: options.title,
          message,
        });
        return true;
      } catch {
        return false;
      }
    }
  },

  async shareSampleCsv(csvContent: string): Promise<boolean> {
    try {
      await RNShare.share({
        title: 'sample_invitees.csv',
        message: csvContent,
      });
      return true;
    } catch {
      return false;
    }
  },
};
