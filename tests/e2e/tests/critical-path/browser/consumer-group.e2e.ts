import { Chance } from 'chance';
import { rte } from '../../../helpers/constants';
import { acceptLicenseTermsAndAddDatabase, deleteDatabase } from '../../../helpers/database';
import { BrowserPage, CliPage } from '../../../pageObjects';
import {
    commonUrl,
    ossStandaloneConfig
} from '../../../helpers/conf';

const browserPage = new BrowserPage();
const cliPage = new CliPage();
const chance = new Chance();

let keyName = chance.word({ length: 20 });
let consumerGroupName = chance.word({ length: 20 });
const keyField = chance.word({ length: 20 });
const keyValue = chance.word({ length: 20 });

fixture `Consumer group`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await acceptLicenseTermsAndAddDatabase(ossStandaloneConfig, ossStandaloneConfig.databaseName);
    })
    .afterEach(async t => {
        //Clear and delete database
        if (await t.expect(browserPage.closeKeyButton.visible).ok()){
            await t.click(browserPage.closeKeyButton);
        }
        await browserPage.deleteKeyByName(keyName);
        await deleteDatabase(ossStandaloneConfig.databaseName);
    });
test('Verify that user can create a new Consumer Group in the current Stream', async t => {
    const toolTip = [
        'Enter Valid ID, 0 or $',
        '\nSpecify the ID of the last delivered entry in the stream from the new group\'s perspective.',
        '\nOtherwise, ',
        '$',
        'represents the ID of the last entry in the stream,',
        '0',
        'fetches the entire stream from the beginning.'
    ];
    keyName = chance.word({ length: 20 });
    consumerGroupName = `qwerty123456${chance.word({ length: 20 })}!@#$%^&*()_+=`;
    // Add New Stream Key
    await browserPage.addStreamKey(keyName, keyField, keyValue);
    await t.click(browserPage.fullScreenModeButton);
    // Open Stream consumer groups and add group
    await t.click(browserPage.streamTabGroups);
    await browserPage.createConsumerGroup(consumerGroupName);
    await t.expect(browserPage.streamGroupsContainer.textContent).contains(consumerGroupName, 'The new Consumer Group is added');
    // Verify the tooltip under 'i' element
    await t.click(browserPage.addKeyValueItemsButton);
    await t.hover(browserPage.entryIdInfoIcon);
    for(const text of toolTip){
        await t.expect(await browserPage.tooltip.innerText).contains(text, 'The toolTip message');
    }
});
test('Verify that user can input the 0, $ and Valid Entry ID in the ID field', async t => {
    keyName = chance.word({ length: 20 });
    consumerGroupName = chance.word({ length: 20 });
    const entryIds = [
        '0',
        '$',
        '1654594146318-0'
    ];
    // Add New Stream Key
    await browserPage.addStreamKey(keyName, keyField, keyValue);
    await t.click(browserPage.fullScreenModeButton);
    // Open Stream consumer groups and add group with different IDs
    await t.click(browserPage.streamTabGroups);
    for(const entryId of entryIds){
        await browserPage.createConsumerGroup(`${consumerGroupName}${entryId}`, entryId);
        await t.expect(browserPage.streamGroupsContainer.textContent).contains(`${consumerGroupName}${entryId}`, 'The new Consumer Group is added');
    }
});
test('Verify that user can see the Consumer group columns (Group Name, Consumers, Pending, Last Delivered ID)', async t => {
    keyName = chance.word({ length: 20 });
    consumerGroupName = chance.word({ length: 20 });
    const groupColumns = [
        'Group Name',
        'Consumers',
        'Pending',
        'Last Delivered ID'
    ];
    // Add New Stream Key
    await browserPage.addStreamKey(keyName, keyField, keyValue);
    await t.click(browserPage.fullScreenModeButton);
    // Open Stream consumer groups and add group with different IDs
    await t.click(browserPage.streamTabGroups);
    await browserPage.createConsumerGroup(consumerGroupName);
    for(let i = 0; i < groupColumns.length; i++){
        await t.expect(browserPage.scoreButton.nth(i).textContent).eql(groupColumns[i], `The ${i} Consumer group column name`);
    }
});
test('Verify that user can see the message when there are no Consumers in the Consumer Group', async t => {
    keyName = chance.word({ length: 20 });
    consumerGroupName = chance.word({ length: 20 });
    const message = 'Your Consumer Group has no Consumers available.';
    // Add New Stream Key
    await browserPage.addStreamKey(keyName, keyField, keyValue);
    // Open Stream consumer group and check message
    await t.click(browserPage.streamTabGroups);
    await browserPage.createConsumerGroup(consumerGroupName);
    await t.click(browserPage.consumerGroup);
    await t.expect(browserPage.streamConsumersContainer.textContent).contains(message, 'The message for empty Consumer Group');
});
test('Verify that user can see the Consumer information columns (Consumer Name, Pendings, Idle Time,ms)', async t => {
    keyName = chance.word({ length: 20 });
    consumerGroupName = chance.word({ length: 20 });
    const cliCommands = [
        `XGROUP CREATE ${keyName} ${consumerGroupName} $ MKSTREAM`,
        `XADD ${keyName} * message apple`,
        `XREADGROUP GROUP ${consumerGroupName} Alice COUNT 1 STREAMS ${keyName} >`
    ];
    const consumerColumns = [
        'Consumer Name',
        'Pending',
        'Idle Time, ms'
    ];
    // Add New Stream Key with groups and consumers
    for(const command of cliCommands){
        await cliPage.sendCommandInCli(command);
    }
    // Open Stream consumer info view
    await browserPage.openKeyDetails(keyName);
    await t.click(browserPage.streamTabGroups);
    await t.click(browserPage.consumerGroup);
    for(let i = 0; i < consumerColumns.length; i++){
        await t.expect(browserPage.scoreButton.nth(i).textContent).eql(consumerColumns[i], `The ${i} Consumers info column name`);
    }
});
test('Verify that user can navigate to Consumer Groups screen using the link in the breadcrumbs', async t => {
    keyName = chance.word({ length: 20 });
    consumerGroupName = chance.word({ length: 20 });
    const cliCommands = [
        `XGROUP CREATE ${keyName} ${consumerGroupName} $ MKSTREAM`,
        `XADD ${keyName} * message apple`,
        `XREADGROUP GROUP ${consumerGroupName} Alice COUNT 1 STREAMS ${keyName} >`
    ];
    // Add New Stream Key with groups and consumers
    for(const command of cliCommands){
        await cliPage.sendCommandInCli(command);
    }
    // Open Stream consumer info view
    await browserPage.openKeyDetails(keyName);
    await t.click(browserPage.streamTabGroups);
    await t.click(browserPage.consumerGroup);
    // Check navigation
    await t.expect(browserPage.streamTabs.visible).ok('Stream navigation tabs visibility');
    await t.click(browserPage.streamTabGroups);
    await t.expect(browserPage.streamTabGroups.withAttribute('aria-selected', 'true').exists).ok('The Consumer Groups screen is opened');
});
