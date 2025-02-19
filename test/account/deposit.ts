// Declare imports
import * as helpers from '../helpers/contract-helpers';
import { progressBlocks } from '../helpers/utils';
import { expect } from 'chai';
import { trackGas, GasGroup } from '../helpers/gas-usage';

// Declare globals
let ssvNetworkContract: any, ssvViews: any, cluster1: any, minDepositAmount: any;

describe('Deposit Tests', () => {
  beforeEach(async () => {
    // Initialize contract
    const metadata = (await helpers.initializeContract());
    ssvNetworkContract = metadata.contract;
    ssvViews = metadata.ssvViews;

    // Register operators
    await helpers.registerOperators(0, 12, helpers.CONFIG.minimalOperatorFee);

    // Define the operator fee
    minDepositAmount = (helpers.CONFIG.minimalBlocksBeforeLiquidation + 10) * helpers.CONFIG.minimalOperatorFee * 4;

    // cold register
    await helpers.DB.ssvToken.connect(helpers.DB.owners[6]).approve(helpers.DB.ssvNetwork.contract.address, '1000000000000000');
    await ssvNetworkContract.connect(helpers.DB.owners[6]).registerValidator(
      '0x221111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111119',
      [1, 2, 3, 4],
      helpers.DataGenerator.shares(4),
      '1000000000000000',
      {
        validatorCount: 0,
        networkFeeIndex: 0,
        index: 0,
        balance: 0,
        active: true
      }
    );
    // Register validators
    cluster1 = await helpers.registerValidators(4, 1, minDepositAmount, helpers.DataGenerator.cluster.new(), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
  });

  it('Deposit to a non liquidated cluster I own emits "ClusterDeposited"', async () => {
    expect(await ssvViews.isLiquidated(cluster1.args.owner, cluster1.args.operatorIds, cluster1.args.cluster)).to.equal(false);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).deposit(
      helpers.DB.owners[4].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      cluster1.args.cluster)).to.emit(ssvNetworkContract, 'ClusterDeposited');
  });

  it('Deposit to a cluster I own gas limits', async () => {
    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await trackGas(ssvNetworkContract.connect(helpers.DB.owners[4]).deposit(
      helpers.DB.owners[4].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      cluster1.args.cluster), [GasGroup.DEPOSIT]);
  });

  it('Deposit to a cluster I do not own emits "ClusterDeposited"', async () => {
    await helpers.DB.ssvToken.connect(helpers.DB.owners[0]).approve(ssvNetworkContract.address, minDepositAmount);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[0]).deposit(
      helpers.DB.owners[4].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      cluster1.args.cluster)).to.emit(ssvNetworkContract, 'ClusterDeposited');
  });

  it('Deposit to a cluster I do not own gas limits', async () => {
    await helpers.DB.ssvToken.connect(helpers.DB.owners[0]).approve(ssvNetworkContract.address, minDepositAmount);
    await trackGas(ssvNetworkContract.connect(helpers.DB.owners[0]).deposit(
      helpers.DB.owners[4].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      cluster1.args.cluster), [GasGroup.DEPOSIT]);
  });

  it('Deposit to a cluster I do own with a cluster that does not exist reverts "ClusterDoesNotExists"', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[1]).deposit(
      helpers.DB.owners[1].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      cluster1.args.cluster)).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterDoesNotExists');
  });

  it('Deposit to a cluster I do not own with a cluster that does not exist reverts "ClusterDoesNotExists"', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).deposit(
      helpers.DB.owners[1].address,
      [1, 2, 4, 5],
      minDepositAmount,
      cluster1.args.cluster)).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterDoesNotExists');
  });

  

  it('Deposit to a liquidated cluster emits "ClusterDeposited"', async () => {
    await progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      cluster1.args.owner,
      cluster1.args.operatorIds,
      cluster1.args.cluster
    ));
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    expect(await ssvViews.isLiquidated(cluster1.args.owner, cluster1.args.operatorIds, updatedCluster.cluster)).to.equal(true);

    await helpers.DB.ssvToken.connect(helpers.DB.owners[4]).approve(ssvNetworkContract.address, minDepositAmount);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[4]).deposit(
      helpers.DB.owners[4].address,
      cluster1.args.operatorIds,
      minDepositAmount,
      updatedCluster.cluster)).to.emit(ssvNetworkContract, 'ClusterDeposited');
  });
});