import * as helpers from '../helpers/contract-helpers';

import { expect } from 'chai';

const numberOfOperators = 4;
const operatorFee = 4;

let registryContract: any, operatorIDs: any, shares: any, owner: any;


describe('Liquidation Threshold Tests', () => {
  beforeEach(async () => {
    const contractData = await helpers.initializeContract(numberOfOperators, operatorFee);
    registryContract = contractData.contract;
    operatorIDs = contractData.operatorIDs;
    shares = contractData.shares;
  });

  it('Get liquidation threshold', async () => {

  });

  it('Change liquidation threshold', async () => {

  });

  it('Change liquidation threshold errors', async () => {

  });

  it('Liquidation threshold gas limits', async () => {

  });

});
