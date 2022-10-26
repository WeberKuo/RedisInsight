import { acceptLicenseTerms } from '../../../helpers/database';
import {
    addNewStandaloneDatabasesApi,
    deleteStandaloneDatabasesApi,
    discoverSentinelDatabaseApi,
    addNewOSSClusterDatabaseApi,
    deleteOSSClusterDatabaseApi,
    deleteAllDatabasesByConnectionTypeApi
} from '../../../helpers/api/api-database';
import { MyRedisDatabasePage } from '../../../pageObjects';
import { rte } from '../../../helpers/constants';
import { commonUrl, ossStandaloneConfig, ossStandaloneV5Config, ossSentinelConfig, ossClusterConfig } from '../../../helpers/conf';
import { Common } from '../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const common = new Common();
const databasesForSearch = [
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: 'testSearch' },
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: 'testSecondSearch' },
    { host: ossStandaloneV5Config.host, port: ossStandaloneV5Config.port, databaseName: 'testV5' },
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: 'lastConnection' }
];
const databasesForAdding = [
    ossStandaloneConfig,
    databasesForSearch[0],
    databasesForSearch[1],
    databasesForSearch[2]
];

fixture `Database list search`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        // Add new databases using API
        await acceptLicenseTerms();
        await addNewStandaloneDatabasesApi(databasesForAdding);
        await addNewOSSClusterDatabaseApi(ossClusterConfig);
        await discoverSentinelDatabaseApi(ossSentinelConfig, 1);
        // Reload Page
        await common.reloadPage();
    })
    .afterEach(async() => {
        // Clear and delete databases
        await deleteStandaloneDatabasesApi(databasesForAdding);
        await deleteOSSClusterDatabaseApi(ossClusterConfig);
        await deleteAllDatabasesByConnectionTypeApi('SENTINEL');
    });
test('Verify DB list search', async t => {
    const searchedDBHostInvalid = 'invalid';
    const searchedDBName = 'Search';
    const searchedDBHost = ossStandaloneConfig.host;
    const searchedDBPort = ossSentinelConfig.sentinelPort;
    const searchedDBConType = 'OSS Cluster';
    const searchedDBFirst = 'less than a minute ago';
    const searchedDBSecond = '1 minute ago';
    const searchTimeout = 60 * 1000; // 60 sec to wait for changing Last Connection time
    const dbSelector = myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[2].databaseName);
    const startTime = Date.now();

    // Search for DB by Invalid search
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBHostInvalid, { replace: true });
    // Verify that user sees "No results found" message when pattern doesn`t match any database
    await t.expect(myRedisDatabasePage.noResultsFoundMessage.exists).ok('"No results found message" not displayed');
    await t.expect(myRedisDatabasePage.noResultsFoundText.exists).ok('"No databases matched your search" message not displayed');

    // Search for DB by name
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBName, { replace: true });
    // Verify that user can search DB by database name on the List of databases
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[0].databaseName).exists).ok('The database with alias not found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[1].databaseName).exists).ok('The database with alias not found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[2].databaseName).exists).notOk('The database with other alias is found', { timeout: 10000 });

    // Search for DB by host
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBHost, { replace: true });
    // Verify that user can search DB by host on the List of databases
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[0].databaseName).exists).ok('The database with host not found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[1].databaseName).exists).ok('The database with host not found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(ossSentinelConfig.name[0]).exists).notOk('The database with other host is found', { timeout: 10000 });

    // Search for DB by port
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBPort, { replace: true });
    // Verify that user can search DB by port on the List of databases
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[0].databaseName).exists).notOk('The database with port is found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[1].databaseName).exists).notOk('The database with port is found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(ossSentinelConfig.name[0]).exists).ok('The database with other port is not found', { timeout: 10000 });

    // Search for DB by connection type
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBConType, { replace: true });
    // Verify that user can search DB by Connection Type on the List of databases
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(ossClusterConfig.ossClusterDatabaseName).exists).ok('The database with connection type not found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[0].databaseName).exists).notOk('The database with other connection type found', { timeout: 10000 });
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[1].databaseName).exists).notOk('The database with other connection type found', { timeout: 10000 });

    // Search for DB by Last Connection
    await t.typeText(myRedisDatabasePage.searchInput, searchedDBFirst, { replace: true });
    // Verify that database added < 1min ago found on the list search by Last Connection
    await t.expect(myRedisDatabasePage.dbNameList.withExactText(databasesForSearch[1].databaseName).exists).ok('The database with Last Connection not found', { timeout: 10000 });
    // Verify that database added > 1min ago found on the list search by Last Connection
    do {
        await common.reloadPage();
        await t.typeText(myRedisDatabasePage.searchInput, searchedDBSecond, { replace: true });
    }
    while (!(await dbSelector.exists) && Date.now() - startTime < searchTimeout);
    // Verify that user can search DB by Last Connection on the List of databases
    await t.expect(dbSelector.exists).ok('The database with Last Connection not found', { timeout: 10000 });
});
