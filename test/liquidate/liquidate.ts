// Decalre imports
import * as helpers from '../helpers/contract-helpers';
import * as utils from '../helpers/utils';
import { expect } from 'chai';
import { trackGas, GasGroup } from '../helpers/gas-usage';

let ssvNetworkContract: any, ssvViews: any, minDepositAmount: any, firstCluster: any;

// Declare globals
describe('Liquidate Tests', () => {
  beforeEach(async () => {
    // Initialize contract
    const metadata = (await helpers.initializeContract());
    ssvNetworkContract = metadata.contract;
    ssvViews = metadata.ssvViews;

    // Register operators
    await helpers.registerOperators(0, 12, helpers.CONFIG.minimalOperatorFee);

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

    // first validator
    await helpers.DB.ssvToken.connect(helpers.DB.owners[1]).approve(ssvNetworkContract.address, minDepositAmount);
    const register = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[1]).registerValidator(
      helpers.DataGenerator.publicKey(1),
      [1, 2, 3, 4],
      helpers.DataGenerator.shares(4),
      minDepositAmount,
      {
        validatorCount: 0,
        networkFeeIndex: 0,
        index: 0,
        balance: 0,
        active: true
      }
    ), [GasGroup.REGISTER_VALIDATOR_NEW_STATE]);
    firstCluster = register.eventsByName.ValidatorAdded[0].args;
  });

  it('Liquidate a cluster via liquidation threshold emits "ClusterLiquidated"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);

    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    )).to.emit(ssvNetworkContract, 'ClusterLiquidated')
      .to.emit(helpers.DB.ssvToken, 'Transfer').withArgs(
        ssvNetworkContract.address,
        helpers.DB.owners[0].address,
        minDepositAmount - (helpers.CONFIG.minimalOperatorFee * 4 * (helpers.CONFIG.minimalBlocksBeforeLiquidation + 1))
      );
  });

  it('Liquidate a cluster via minimum liquidation collateral emits "ClusterLiquidated"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation - 2);

    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    )).to.emit(ssvNetworkContract, 'ClusterLiquidated')
      .to.emit(helpers.DB.ssvToken, 'Transfer').withArgs(
        ssvNetworkContract.address,
        helpers.DB.owners[0].address,
        minDepositAmount - (helpers.CONFIG.minimalOperatorFee * 4 * (helpers.CONFIG.minimalBlocksBeforeLiquidation + 1 - 2))
      );
  });

  it('Liquidate a cluster after liquidation period emits "ClusterLiquidated"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10);

    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    )).to.emit(ssvNetworkContract, 'ClusterLiquidated')
      .to.not.emit(helpers.DB.ssvToken, 'Transfer');
  });

  it('Liquidatable with removed operator', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.removeOperator(1);
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(true);
  });

  it('Liquidatable with removed operator after liquidation period', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10);
    await ssvNetworkContract.removeOperator(1);
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(true);
  });

  it('Liquidate validator with removed operator in a cluster', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await ssvNetworkContract.removeOperator(1);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;
    expect(await ssvViews.isLiquidatable(updatedCluster.owner, updatedCluster.operatorIds, updatedCluster.cluster)).to.be.equals(false);
  });

  it('Liquidate and register validator in a disabled cluster reverts "ClusterIsLiquidated"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    await helpers.DB.ssvToken.connect(helpers.DB.owners[1]).approve(ssvNetworkContract.address, `${minDepositAmount * 2}`);
    await expect(ssvNetworkContract.connect(helpers.DB.owners[1]).registerValidator(
      helpers.DataGenerator.publicKey(2),
      updatedCluster.operatorIds,
      helpers.DataGenerator.shares(4),
      `${minDepositAmount * 2}`,
      updatedCluster.cluster
    )).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterIsLiquidated');
  });

  it('Liquidate cluster and check isLiquidated true', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    expect(await ssvViews.isLiquidated(firstCluster.owner, firstCluster.operatorIds, updatedCluster.cluster)).to.equal(true);
  });

  it('Liquidate a non liquidatable cluster that I own', async () => {
    const liquidatedCluster = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[1]).liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    expect(await ssvViews.isLiquidated(firstCluster.owner, firstCluster.operatorIds, updatedCluster.cluster)).to.equal(true);
  });

  it('Liquidate cluster that I own', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[1]).liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    expect(await ssvViews.isLiquidated(firstCluster.owner, firstCluster.operatorIds, updatedCluster.cluster)).to.equal(true);
  });

  it('Liquidate cluster that I own after liquidation period', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10);
    const liquidatedCluster = await trackGas(ssvNetworkContract.connect(helpers.DB.owners[1]).liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    expect(await ssvViews.isLiquidated(firstCluster.owner, firstCluster.operatorIds, updatedCluster.cluster)).to.equal(true);
  });

  it('Get if the cluster is liquidatable', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(true);
  });

  it('Get if the cluster is liquidatable after liquidation period', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10);
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(true);
  });

  it('Get if the cluster is not liquidatable', async () => {
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(false);
  });

  it('Liquidate a cluster that is not liquidatable reverts "ClusterNotLiquidatable"', async () => {
    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    )).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterNotLiquidatable');
    expect(await ssvViews.isLiquidatable(firstCluster.owner, firstCluster.operatorIds, firstCluster.cluster)).to.equal(false);
  });

  it('Liquidate a cluster that is not liquidatable reverts "IncorrectClusterState"', async () => {
    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      {
        validatorCount: 0,
        networkFeeIndex: 0,
        index: 0,
        balance: 0,
        active: true
      }
    )).to.be.revertedWithCustomError(ssvNetworkContract, 'IncorrectClusterState');
  });

  it('Liquidate already liquidated cluster reverts "ClusterIsLiquidated"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    await expect(ssvNetworkContract.liquidate(
      firstCluster.owner,
      updatedCluster.operatorIds,
      updatedCluster.cluster
    )).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterIsLiquidated');
  });

  it('Is liquidated reverts "ClusterDoesNotExists"', async () => {
    await utils.progressBlocks(helpers.CONFIG.minimalBlocksBeforeLiquidation);
    const liquidatedCluster = await trackGas(ssvNetworkContract.liquidate(
      firstCluster.owner,
      firstCluster.operatorIds,
      firstCluster.cluster
    ), [GasGroup.LIQUIDATE_POD]);
    const updatedCluster = liquidatedCluster.eventsByName.ClusterLiquidated[0].args;

    await expect(ssvViews.isLiquidated(helpers.DB.owners[0].address, firstCluster.operatorIds, updatedCluster.cluster)).to.be.revertedWithCustomError(ssvNetworkContract, 'ClusterDoesNotExists');
  });
});