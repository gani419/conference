import DocumentPicker from 'react-native-document-picker';
import { csvService } from './csvService';
import { CsvImportResult } from '../types/csv';

export const fileService = {
  async pickCsvFile(): Promise<{ fileName: string; content: string } | null> {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles, 'text/csv', 'text/comma-separated-values'],
        copyTo: 'cachesDirectory',
      });

      let content = '';
      if (res.fileCopyUri || res.uri) {
        // Fetch uri as blob/text
        const fileUri = res.fileCopyUri || res.uri;
        const response = await fetch(fileUri);
        content = await response.text();
      }

      return {
        fileName: res.name ?? 'invitees.csv',
        content,
      };
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        return null;
      }
      return null;
    }
  },

  async pickAndParseCsv(): Promise<CsvImportResult | null> {
    const file = await this.pickCsvFile();
    if (!file || !file.content) {
      return null;
    }
    return csvService.parseCsv(file.content);
  },
};
