import { partial } from '../../../../../test/util';
import type { Release } from '../../../../modules/datasource/types';
import * as allVersioning from '../../../../modules/versioning';
import { filterVersions } from './filter';
import type { FilterConfig } from './types';

const versioning = allVersioning.get('semver');

describe('workers/repository/process/lookup/filter', () => {
  describe('.filterVersions()', () => {
    it('should filter versions allowed by semver syntax when allowedVersions is not valid version, range or pypi syntax', () => {
      const releases = [
        {
          version: '1.0.1',
          releaseTimestamp: '2021-01-01T00:00:01.000Z',
        },
        {
          version: '1.2.0',
          releaseTimestamp: '2021-01-03T00:00:00.000Z',
        },
        {
          version: '2.0.0',
          releaseTimestamp: '2021-01-05T00:00:00.000Z',
        },
        {
          version: '2.1.0',
          releaseTimestamp: '2021-01-07T00:00:00.000Z',
        },
        // for coverage
        {
          version: 'invalid.version',
          releaseTimestamp: '2021-01-07T00:00:00.000Z',
        },
      ] satisfies Release[];

      const config = partial<FilterConfig>({
        ignoreUnstable: false,
        ignoreDeprecated: false,
        respectLatest: false,
        allowedVersions: '>1',
      });
      const currentVersion = '1.0.0';
      const latestVersion = '2.0.0';

      const filteredVersions = filterVersions(
        config,
        currentVersion,
        latestVersion,
        releases,
        versioning,
      );

      expect(filteredVersions).toEqual([
        { version: '2.0.0', releaseTimestamp: '2021-01-05T00:00:00.000Z' },
        { version: '2.1.0', releaseTimestamp: '2021-01-07T00:00:00.000Z' },
      ]);
    });

    it('allows unstable major upgrades', () => {
      const nodeVersioning = allVersioning.get('node');

      const releases = [
        { version: '1.0.0-alpha' },
        { version: '1.2.3-beta' },
      ] satisfies Release[];

      const config = partial<FilterConfig>({
        ignoreUnstable: true,
        ignoreDeprecated: true,
      });
      const currentVersion = '1.0.0-alpha';
      const latestVersion = '1.2.3-beta';

      const filteredVersions = filterVersions(
        config,
        currentVersion,
        latestVersion,
        releases,
        nodeVersioning,
      );

      expect(filteredVersions).toEqual([{ version: '1.2.3-beta' }]);
    });

    it('ignores version insufficient prefixes', () => {
      const releases = [
        { version: '1.0.1' },
        { version: '1.2.0' },
        { version: '2.0.0', isDeprecated: true },
        { version: '2.1.0' },
      ] satisfies Release[];

      const config = partial<FilterConfig>({
        ignoreUnstable: true,
        ignoreDeprecated: true,
      });
      const currentVersion = 'v1.0.1';
      const latestVersion = 'v2.0.0';

      const filteredVersions = filterVersions(
        config,
        currentVersion,
        latestVersion,
        releases,
        versioning,
      );

      expect(filteredVersions).toEqual([
        { version: '1.2.0' },
        { version: '2.1.0' },
      ]);
    });
  });

  describe('.isVersionInRange()', () => {
    it('should return true for versions within the specified range', () => {
      const versioningApi = allVersioning.get('semver');
      expect(isVersionInRange('1.2.3', '>=1.0.0 <2.0.0', versioningApi)).toBe(true);
      expect(isVersionInRange('1.2.3', '^1.0.0', versioningApi)).toBe(true);
      expect(isVersionInRange('1.2.3', '1.x', versioningApi)).toBe(true);
    });

    it('should return false for versions outside the specified range', () => {
      const versioningApi = allVersioning.get('semver');
      expect(isVersionInRange('2.0.0', '>=1.0.0 <2.0.0', versioningApi)).toBe(false);
      expect(isVersionInRange('0.9.9', '^1.0.0', versioningApi)).toBe(false);
      expect(isVersionInRange('2.0.0', '1.x', versioningApi)).toBe(false);
    });

    it('should handle invalid ranges gracefully', () => {
      const versioningApi = allVersioning.get('semver');
      expect(isVersionInRange('1.2.3', 'invalid-range', versioningApi)).toBe(false);
    });
  });
});
