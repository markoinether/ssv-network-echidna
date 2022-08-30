import * as helpers from '../helpers/contract-helpers';

import { expect } from 'chai';
import { runTx } from '../helpers/utils';

const numberOfOperators = 8;
const operatorFee = 4;

let registryContract: any, operatorIDs: any, shares: any, owner: any;

describe('Register Validator Tests', () => {
  beforeEach(async () => {
    const contractData = await helpers.initializeContract(numberOfOperators, operatorFee);
    registryContract = contractData.contract;
    operatorIDs = contractData.operatorIDs;
    shares = contractData.shares;
  });

  it('Register validator in empty pod', async () => {
    const validatorPK = '0x98765432109876543210987654321098765432109876543210987654321098765432109876543210987654321098100';
    const { gasUsed } = await runTx(registryContract.registerValidator(
      `${validatorPK}0`,
      operatorIDs.slice(0, 4),
      shares[0],
      '10000'
    ));
    expect(gasUsed).lessThan(400000);
  });

  it('Register two validators in same pod', async () => {
    const validatorPK = '0x98765432109876543210987654321098765432109876543210987654321098765432109876543210987654321098100';
    const firstValidator = await runTx(registryContract.registerValidator(
      `${validatorPK}0`,
      operatorIDs.slice(0, 4),
      shares[0],
      '10000'
    ));
    expect(firstValidator.gasUsed).lessThan(400000);

    const secondValidator = await runTx(registryContract.registerValidator(
      `${validatorPK}1`,
      operatorIDs.slice(0, 4),
      shares[0],
      '10000'
    ));
    expect(secondValidator.gasUsed).lessThan(220000);

  });

  it('Register two validators in different pods', async () => {
    const validatorPK = '0x98765432109876543210987654321098765432109876543210987654321098765432109876543210987654321098100';
    const firstValidator = await runTx(registryContract.registerValidator(
      `${validatorPK}0`,
      operatorIDs.slice(0, 4),
      shares[0],
      '10000'
    ));
    expect(firstValidator.gasUsed).lessThan(400000);

    const secondValidator = await runTx(registryContract.registerValidator(
      `${validatorPK}1`,
      operatorIDs.slice(4, 8),
      shares[0],
      '10000'
    ));
    expect(secondValidator.gasUsed).lessThan(400000);
  });
});
