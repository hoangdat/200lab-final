//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingReserve is Ownable {
    IERC20 public mainToken;
    address public stakeAddress;

    constructor(address tokenAddress_, address stakeAddress_) {
        require(tokenAddress_ != address(0), "StakingReserve: token address must be different from address(0)");
        mainToken = IERC20(tokenAddress_);
        stakeAddress = stakeAddress_;
    }

    function getBalanceOfReserve() public view returns(uint256) {
        return mainToken.balanceOf(address(this));
    }

    function distributeGold(address _recipient, uint256 _amount) public {
        require(_msgSender() == stakeAddress, "StakingReserve: invalid stakeAddress");
        mainToken.transfer(_recipient, _amount);
    }
}