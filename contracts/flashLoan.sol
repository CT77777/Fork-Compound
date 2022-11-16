//SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./contracts_AAVEv2/flashloan/base/FlashLoanReceiverBase.sol";
import "./contracts_compound/CTokenInterfaces.sol";

contract falshLoan is FlashLoanReceiverBase {
    constructor(ILendingPoolAddressesProvider _providerAddress) FlashLoanReceiverBase(_providerAddress) public {};
    
    address public userBeLiquidated; //user1
    CErc20Interface public cTokenBeLiquidated; //cUSDC
    CErc20Interface public cTokenIncentive; //cUNI
    
    function setTarget(address _userBeliquidated, CErc20Interface _cTokenBeLiquidated, CErc20Interface _cTokenIncentive) external {
        userBeLiquidated = _userBeliquidated;
        cTokenBeLiquidated = _cTokenBeLiquidated;
        cTokenIncentive = _cTokenIncentive;
    }

    //premium 0.09%, call FLASHLOAN_PREMIUM_TOTAL() on the LendingPool contract
    function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  ) external override returns (bool) {

    //liquidate USDC of user1
    cTokenBeLiquidated.liquidateBorrow(userBeLiquidated, amounts[0], cTokenIncentive);
    
    //redeem UNI 
    uint256 redeemAmount = cTokenIncentive.balanceOf(address(this));
    cTokenIncentive.redeem(redeemAmount);

    //exchange UNI for USDC by uniSwap



    for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }

    return true;
  };

  function myFlashLoanCall() external returns (bool) {
    address receiverAddress = address(this);

    //USDC address
    address[] memory assets = new address[](1);
    assets[0] = address(0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48);

    //borrow 2500 USDC
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 2500*10**6;

    //no debt
    uint256[] memory modes = new uint256[](1);
    modes[0] = 0;

    address onBehalfOf = address(this);
    bytes memory params = "";
    uint16 referralCode = 0;

    LENDING_POOL.flashloan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
  }

  function ADDRESSES_PROVIDER() external view override returns (ILendingPoolAddressesProvider) {
    return ADDRESSES_PROVIDER;
  };

  function LENDING_POOL() external view override returns (ILendingPool) {
    return LENDING_POOL;
  };
}