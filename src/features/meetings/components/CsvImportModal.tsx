import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { ModalDialog } from '../../../components/layout/ModalDialog';
import { AppButton } from '../../../components/forms/AppButton';
import { InviteeDraft } from '../../../types/csv';
import { InviteePayload, InviteeRole } from '../../../types/meeting';
import { csvService } from '../../../services/csvService';
import { fileService } from '../../../services/fileService';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';

interface CsvImportModalProps {
  visible: boolean;
  onClose: () => void;
  onAddInvitees: (invitees: InviteePayload[]) => void;
  existingInvitees: InviteePayload[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  visible,
  onClose,
  onAddInvitees,
  existingInvitees,
}) => {
  const { tokens } = useResolvedTheme();
  const [drafts, setDrafts] = useState<InviteeDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    valid: number;
    malformed: number;
    duplicate: number;
  } | null>(null);

  const existingEmails = useMemo(
    () => new Set(existingInvitees.map((i) => i.email?.toLowerCase()).filter(Boolean)),
    [existingInvitees],
  );
  const existingPhones = useMemo(
    () => new Set(existingInvitees.map((i) => i.phoneE164).filter(Boolean)),
    [existingInvitees],
  );

  const handlePickFile = async () => {
    try {
      const file = await fileService.pickCsvFile();
      if (!file || !file.content) return;
      processCsvText(file.content);
    } catch {
      Alert.alert('Error', 'Failed to pick CSV file');
    }
  };

  const handleLoadSample = () => {
    const sample = csvService.getSampleCsvContent();
    processCsvText(sample);
  };

  const processCsvText = (text: string) => {
    const res = csvService.parseCsv(text);
    setDrafts(res.drafts);
    setErrors(res.errors);
    setStats({
      total: res.totalRows ?? res.totalParsed,
      valid: res.validCount ?? res.drafts.filter((d) => d.isValid).length,
      malformed: res.malformedCount,
      duplicate: res.duplicateCount,
    });
  };

  const handleRoleToggle = (clientId: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.clientId === clientId) {
          const nextRole: InviteeRole = d.role === 'co_host' ? 'guest' : 'co_host';
          return { ...d, role: nextRole };
        }
        return d;
      }),
    );
  };

  const handleImport = () => {
    const validDrafts = drafts.filter((d) => d.isValid);
    const results: InviteePayload[] = [];

    for (const d of validDrafts) {
      if (d.email && existingEmails.has(d.email.toLowerCase())) continue;
      if (d.phoneE164 && existingPhones.has(d.phoneE164)) continue;

      results.push({
        clientId: d.clientId,
        displayName: d.displayName,
        role: d.role,
        ...(d.email ? { email: d.email } : {}),
        ...(d.phoneE164 ? { phoneE164: d.phoneE164 } : {}),
      });
    }

    if (results.length === 0) {
      Alert.alert('No New Invitees', 'All valid invitees from this file are already in the list.');
      return;
    }

    onAddInvitees(results);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setDrafts([]);
    setErrors([]);
    setStats(null);
  };

  return (
    <ModalDialog
      visible={visible}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Import Invitees from CSV"
      testID="csv-import-modal"
    >
      <View style={styles.container}>
        <View style={styles.pickerActions}>
          <View style={styles.actionBtnWrap}>
            <AppButton
              title="📂 Choose File"
              onPress={handlePickFile}
              variant="secondary"
            />
          </View>
          <View style={styles.actionBtnWrap}>
            <AppButton
              title="📝 Load Sample"
              onPress={handleLoadSample}
              variant="ghost"
            />
          </View>
        </View>

        {stats && (
          <View style={[styles.statsCard, { backgroundColor: tokens.surfaceSubtle }]}>
            <Text style={[styles.statsHeader, { color: tokens.textMain }]}>
              Parse Summary
            </Text>
            <View style={styles.statsRow}>
              <Text style={[styles.statItem, { color: tokens.textMuted }]}>
                Total Rows: <Text style={{ color: tokens.textMain, fontWeight: '700' }}>{stats.total}</Text>
              </Text>
              <Text style={[styles.statItem, { color: tokens.success }]}>
                Valid: <Text style={{ fontWeight: '700' }}>{stats.valid}</Text>
              </Text>
              {stats.malformed > 0 && (
                <Text style={[styles.statItem, { color: tokens.danger }]}>
                  Errors: <Text style={{ fontWeight: '700' }}>{stats.malformed}</Text>
                </Text>
              )}
              {stats.duplicate > 0 && (
                <Text style={[styles.statItem, { color: tokens.warning }]}>
                  Duplicates: <Text style={{ fontWeight: '700' }}>{stats.duplicate}</Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {errors.length > 0 && (
          <View style={[styles.errorBox, { backgroundColor: tokens.dangerSurface }]}>
            {errors.slice(0, 3).map((err, i) => (
              <Text key={i} style={[styles.errorText, { color: tokens.danger }]}>
                • {err}
              </Text>
            ))}
          </View>
        )}

        {drafts.length > 0 && (
          <FlatList
            data={drafts}
            keyExtractor={(item) => item.clientId}
            style={styles.draftList}
            renderItem={({ item }) => {
              const isDupe =
                (item.email && existingEmails.has(item.email.toLowerCase())) ||
                (item.phoneE164 && existingPhones.has(item.phoneE164));

              return (
                <View
                  style={[
                    styles.draftItem,
                    {
                      borderColor: item.isValid ? tokens.borderSubtle : tokens.danger,
                      backgroundColor: tokens.surface,
                    },
                  ]}
                >
                  <View style={styles.draftInfo}>
                    <Text style={[styles.draftName, { color: tokens.textMain }]}>
                      {item.displayName || '(Unnamed)'}
                    </Text>
                    <Text style={[styles.draftSub, { color: tokens.textMuted }]}>
                      {item.email || item.phoneE164 || 'No contact'}
                    </Text>
                    {isDupe && (
                      <Text style={[styles.dupeBadge, { color: tokens.warning }]}>
                        Already in meeting
                      </Text>
                    )}
                    {!item.isValid && (
                      <Text style={[styles.rowError, { color: tokens.danger }]}>
                        {item.errors?.displayName || item.errors?.contact || 'Invalid row'}
                      </Text>
                    )}
                  </View>

                  {item.isValid && (
                    <TouchableOpacity
                      onPress={() => handleRoleToggle(item.clientId)}
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            item.role === 'co_host' ? tokens.primarySurface : tokens.surfaceSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {
                            color:
                              item.role === 'co_host' ? tokens.primary : tokens.textMuted,
                          },
                        ]}
                      >
                        {item.role === 'co_host' ? 'Co-Host' : 'Guest'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: tokens.borderSubtle }]}
            onPress={() => {
              handleReset();
              onClose();
            }}
          >
            <Text style={[styles.cancelBtnText, { color: tokens.textMain }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <View style={styles.importBtnContainer}>
            <AppButton
              title={`Import ${drafts.filter((d) => d.isValid).length} Invitees`}
              onPress={handleImport}
              variant="primary"
              disabled={drafts.filter((d) => d.isValid).length === 0}
            />
          </View>
        </View>
      </View>
    </ModalDialog>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    maxHeight: 500,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnWrap: {
    flex: 1,
  },
  statsCard: {
    padding: 10,
    borderRadius: 8,
  },
  statsHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    fontSize: 12,
  },
  errorBox: {
    padding: 8,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 11,
  },
  draftList: {
    maxHeight: 220,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  draftInfo: {
    flex: 1,
    marginRight: 8,
  },
  draftName: {
    fontSize: 13,
    fontWeight: '600',
  },
  draftSub: {
    fontSize: 12,
    marginTop: 1,
  },
  dupeBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  rowError: {
    fontSize: 11,
    marginTop: 2,
  },
  roleBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  importBtnContainer: {
    flex: 1.5,
  },
});
