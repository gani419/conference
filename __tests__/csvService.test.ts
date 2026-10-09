import { csvService } from '../src/services/csvService';

describe('csvService', () => {
  it('correctly parses sample CSV content with quoted commas', () => {
    const sample = csvService.getSampleCsvContent();
    const result = csvService.parseCsv(sample);

    expect(result.totalParsed).toBe(5);
    expect(result.malformedCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.validCount).toBe(5);

    // Verify quoted name
    const taylor = result.drafts.find((d) => d.displayName === 'Taylor, Kim');
    expect(taylor).toBeDefined();
    expect(taylor?.role).toBe('co_host');
    expect(taylor?.email).toBe('taylor.kim@example.com');
  });

  it('normalizes roles like co-host to co_host', () => {
    const csv = 'display_name,email,role\nAlice,alice@test.com,co-host\nBob,bob@test.com,co_host\nCharlie,charlie@test.com,guest';
    const result = csvService.parseCsv(csv);

    expect(result.drafts[0]?.role).toBe('co_host');
    expect(result.drafts[1]?.role).toBe('co_host');
    expect(result.drafts[2]?.role).toBe('guest');
  });

  it('detects duplicate contacts in CSV', () => {
    const csv = 'display_name,email,role\nUser A,dup@test.com,guest\nUser B,dup@test.com,guest';
    const result = csvService.parseCsv(csv);

    expect(result.duplicateCount).toBe(1);
    expect(result.drafts[1]?.isValid).toBe(false);
    expect(result.drafts[1]?.errors?.contact).toContain('Duplicate contact');
  });

  it('marks rows without contact or name as malformed', () => {
    const csv = 'display_name,email,phone,role\n,someone@test.com,,guest\nValid Name,,,guest';
    const result = csvService.parseCsv(csv);

    expect(result.malformedCount).toBe(2);
    expect(result.drafts[0]?.isValid).toBe(false);
    expect(result.drafts[0]?.errors?.displayName).toBe('Name is required');
    expect(result.drafts[1]?.isValid).toBe(false);
    expect(result.drafts[1]?.errors?.contact).toBe('A valid email address is required');
  });
});

test('CSV rejects phone-only invitees and invalid emails',()=>{ const result=csvService.parseCsv('display_name,email,phone,role\nPhone User,,+14155550101,guest\nBad Email,bad-address,,guest');expect(result.validCount).toBe(0);expect(result.malformedCount).toBe(2);});
