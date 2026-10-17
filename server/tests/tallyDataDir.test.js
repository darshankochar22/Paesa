// Locating TallyPrime company folders (dataDir.js) and what tally:pickFolder reports.
const mockShowOpenDialog = jest.fn();
jest.mock('electron', () => ({
  dialog: { showOpenDialog: (...a) => mockShowOpenDialog(...a) },
  BrowserWindow: { getFocusedWindow: () => null, getAllWindows: () => [] },
}));

const fs = require('fs');
const path = require('path');
const { resolveTallyDataDir, dataDirError } = require('../integrations/tally/dataDir');
const { pickTallyFolder } = require('../integrations/tally/tallyController');
const { makeTallyFolder } = require('./tallyFixtures');

describe('Tally data folder resolution', () => {
  let one;
  let two;

  beforeAll(() => {
    one = makeTallyFolder({ companies: ['10000'] });
    two = makeTallyFolder({ companies: ['10000', '10001'] });
  });
  afterAll(() => {
    one.remove();
    two.remove();
  });

  it('accepts a company folder itself, or a folder with a single company in it', () => {
    expect(resolveTallyDataDir(one.dirs['10000'])).toEqual({
      dir: one.dirs['10000'],
      candidates: [],
    });
    expect(resolveTallyDataDir(one.root)).toEqual({ dir: one.dirs['10000'], candidates: [] });
  });

  it('lists the companies when a folder holds several', () => {
    const r = resolveTallyDataDir(two.root);
    expect(r.dir).toBeNull();
    expect(r.candidates.map((c) => path.basename(c)).sort()).toEqual(['10000', '10001']);
    expect(dataDirError(r.candidates)).toMatch(/holds 2 companies/);
  });

  it('finds nothing in a folder without Tally files, or one that does not exist', () => {
    const empty = fs.mkdtempSync(path.join(two.root, 'empty-'));
    expect(resolveTallyDataDir(empty)).toEqual({ dir: null, candidates: [] });
    expect(resolveTallyDataDir(path.join(two.root, 'missing'))).toEqual({
      dir: null,
      candidates: [],
    });
  });

  it('pickFolder returns the company folder names for a multi-company folder', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [two.root] });
    const res = await pickTallyFolder();

    expect(res).toMatchObject({ success: true, valid: false, dataDir: null, folder: two.root });
    expect(res.candidates.sort()).toEqual(['10000', '10001']);
    expect(res.error).toMatch(/holds 2 companies/);
  });

  it('pickFolder returns the data folder and no candidates for a single company', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [one.root] });
    const res = await pickTallyFolder();

    expect(res).toMatchObject({ valid: true, dataDir: one.dirs['10000'], candidates: [] });
  });
});
