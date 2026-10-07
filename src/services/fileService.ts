import { pick, types, keepLocalCopy, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { csvService } from './csvService';
import { CsvImportResult } from '../types/csv';

export const fileService = {
  async pickCsvFile(): Promise<{ fileName: string; content: string } | null> {
    try {
      const [res] = await pick({ type: [types.allFiles], allowMultiSelection: false });
      const [copy] = await keepLocalCopy({ destination:'cachesDirectory', files:[{uri:res.uri,fileName:res.name||'invitees.csv'}] });
      if(copy.status!=='success') throw new Error('Could not read the selected file');

      let content = '';
      if (copy.localUri) {
        // Fetch uri as blob/text
        const fileUri = copy.localUri;
        const response = await fetch(fileUri);
        content = await response.text();
      }

      return {
        fileName: res.name ?? 'invitees.csv',
        content,
      };
    } catch (err) {
      if (isErrorWithCode(err) && err.code===errorCodes.OPERATION_CANCELED) {
        return null;
      }
      throw err;
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
