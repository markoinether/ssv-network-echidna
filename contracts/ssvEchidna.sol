pragma solidity 0.8.18;

import "./SSVNetwork.sol";
import "./mocks/SSVTokenMock.sol";

contract SSVNetworkEchidna is SSVNetwork {
    // We will send ETHER_IN_POOL to the flash loan pool.
    uint256 constant ETHER_IN_POOL = 1000e18;
    // We will send ETHER_IN_RECEIVER to the flash loan receiver.
    uint256 constant ETHER_IN_RECEIVER = 10e18;

    // SSVTokenMock token;

    string initialVersion;
    uint256 amount = 100 * 10 ** 18;

    // IERC20 token;
    // operatorMaxFeeIncrease = 3;
    // declareOperatorFeePeriod = 259200;
    // executeOperatorFeePeriod = 345600;
    // minimumBlocksBeforeLiquidation = 100800;
    // minimumLiquidationCollateral = 345600;

    // SSVTokenMock private token;

    // FlashLoanReceiver receiver;

    // Setup echidna test by deploying the flash loan pool and receiver and sending them some ether.
    constructor() payable // operatorMaxFeeIncrease,
    // declareOperatorFeePeriod,
    // executeOperatorFeePeriod,
    // minimumBlocksBeforeLiquidation,
    // minimumLiquidationCollateral
    {
        validatorsPerOperatorLimit = 2_000;
        operatorMaxFeeIncrease = 3;
        declareOperatorFeePeriod = 259200;
        executeOperatorFeePeriod = 345600;
        minimumBlocksBeforeLiquidation = 100800;
        minimumLiquidationCollateral = 345600;

        version = bytes32(abi.encodePacked("0.3.0"));

        _token = new SSVTokenMock();
        _token.transfer(address(this), amount);
        // this.initialize("0.3.0", payable(token), 3, 259200, 345600, 100800, 345600);

        // token.transfer(address(this), amount);
        // deposit();
        // liquidate();
        // receiver = new FlashLoanReceiver((address(pool)));
        // (address(pool)).sendValue(ETHER_IN_POOL);
        // (address(receiver)).sendValue(ETHER_IN_RECEIVER);
    }

    // Sample  test
    function echidna_test_token_balance() public view returns (bool) {
        // return true;
        return _token.balanceOf(address(this)) == amount;
    }

    // test all / most of cutoff variables
    // uint32 public validatorsPerOperatorLimit;
    // uint64 public declareOperatorFeePeriod;
    // uint64 public executeOperatorFeePeriod;
    // uint64 public operatorMaxFeeIncrease;
    // uint64 public minimumBlocksBeforeLiquidation;
    // uint64 public minimumLiquidationCollateral;

    // sanity checks

    // withdraw fn
    // staker must withdraw less / equal than cluster balance

    // staker cannot withdraw if cluster is liquidated

    //  cluster index can never decrease

    // code
    //  ?if (cluster.isLiquidatable) => why is this check not at beginning of the fn?

    // function updateNetworkFee(uint256 fee)
    // there seem to be no checks regarding what could network fee bet set to is this warranted?

    // dao_.networkTotalEarnings(network.networkFee); => this cannot be negative, can it be zero? would it cause any problems?

    //     _withdrawOperatorEarnings()
    //     operator cannot withdraw more than his balance => amount >= operator.snapshot.balance

    // function _declareOperatorFee()
    //         if (fee != 0 && fee < MINIMAL_OPERATOR_FEE) revert FeeTooLow(); => should not there be OR || ?

    //     ?would there be any problem if operator set up 1 wei fee???

    // operator cannot increase by more than maxAllowedFee

    //?
    //
}
