import * as path from 'path';
import * as fs from 'fs-extra';
import { BasePage } from '../pageObjects';
import { syncFeaturesApi } from './api/api-info';
import { DatabaseScripts, DbTableParameters } from './database-scripts';

const basePage = new BasePage();
const dbTableParams: DbTableParameters = {
    tableName: 'features_config',
    columnName: 'controlNumber',
    conditionColumnName: 'id',
    conditionColumnValue: '1'
};

/**
 * Update features-config file for static server
 * @param filePath Path to feature config json
 */
export async function modifyFeaturesConfigJson(filePath: string): Promise<void> {
    const configFileName = 'features-config.json';
    const remoteConfigPath = process.env.REMOTE_FOLDER_PATH || './remote';
    const targetFilePath = path.join(remoteConfigPath, configFileName);

    return new Promise((resolve, reject) => {
        try {
            fs.ensureFileSync(targetFilePath);
            fs.writeFileSync(targetFilePath, fs.readFileSync(filePath));
            resolve();
        }
        catch (err: any) {
            reject(new Error(`Error updating remote config file: ${err.message}`));
        }
    });
}

/**
 * Update Control Number of current user and sync
 * @param controlNumber Control number to update
 */
export async function updateControlNumber(controlNumber: number): Promise<void> {
    await syncFeaturesApi();
    await DatabaseScripts.updateColumnValueInDBTable({ ...dbTableParams, rowValue: controlNumber });
    await syncFeaturesApi();
    await basePage.reloadPage();
}

/**
 * Refresh test data for features sync
 */
export async function refreshFeaturesTestData(): Promise<void> {
    const defaultConfigPath = path.join('.', 'test-data', 'features-configs', 'insights-default-remote.json');

    await modifyFeaturesConfigJson(defaultConfigPath);
    await DatabaseScripts.deleteRowsFromTableInDB(dbTableParams);
    await syncFeaturesApi();
}
