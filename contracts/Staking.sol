//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./StakingReserve.sol";

contract Staking is Ownable{
    using Counters for Counters.Counter;
    
    event StakeUpdate(
        address account,
        uint256 packageId,
        uint256 amount,
        uint256 totalProfit
    );
    event StakeReleased(
        address account,
        uint256 packageId,
        uint256 amount,
        uint256 totalProfit
    );
    struct StakePackage {
        uint256 rate;
        uint256 decimal;
        uint256 minStaking;
        uint256 lockTime;
        bool isOffline;
    }
    struct StakingInfo {
        uint256 startTime;
        uint256 timePoint;
        uint256 amount;
        uint256 totalProfit;
    }

    IERC20 public immutable gold;
    StakingReserve public reserve;
    Counters.Counter private _stakePackageCounter;
    mapping(uint256 => StakePackage) public stakePackages;
    mapping(address => mapping(uint256 => StakingInfo)) public stakes;

    constructor(address goldAddress_) {
        require(goldAddress_ != address(0), "Invalid ERC20 address");   
        gold = IERC20(goldAddress_);
    } 

    function setReserve(address reserveAddress_) public onlyOwner {
        require(reserveAddress_ != address(0), "Staking: reserveAddress must be different from address(0)");
        reserve = StakingReserve(reserveAddress_);
    }

    function addStakePackage(uint256 aprRate_, uint256 aprDecimal_, uint256 minValue_, uint256 lockTime_) public onlyOwner {
        require(aprRate_ > 0, "APR should be positive");
        require(aprDecimal_ >= 0, "APR Decimal should not be negative");
        require(minValue_ > 0, "minValue should be positive");
        require(lockTime_ >= 0, "lockTime should not be negative");

        _stakePackageCounter.increment();
        uint256 _stakePackageId = _stakePackageCounter.current();

        stakePackages[_stakePackageId] = StakePackage(aprRate_, aprDecimal_, minValue_, lockTime_, false);
    }

    function removeStakePackage(uint256 packageId_) public onlyOwner {
        require(stakePackages[packageId_].minStaking > 0, "Staking: stakePackage is non-existent");
        require(stakePackages[packageId_].isOffline == false, "Staking: stakePackage is offline");
        stakePackages[packageId_].isOffline = true;
    }

    function stake(uint256 stakePackageId_, uint256 value_) public {
        StakePackage storage _stakePackage = stakePackages[stakePackageId_];
        require(_stakePackage.isOffline != true, "Staking: stakePackage is offline");
        require(value_ >= _stakePackage.minStaking, "Staking: value must be greater than minStaking");
        require(address(reserve) != address(0), "Staking: reserve address must be set");

        StakingInfo storage _stakingInfo = stakes[_msgSender()][stakePackageId_];
        gold.transferFrom(_msgSender(), address(reserve), value_);
        if (_stakingInfo.amount > 0) {
            _stakingInfo.totalProfit = calculateProfit(stakePackageId_);
            _stakingInfo.timePoint = block.timestamp;
            _stakingInfo.amount += value_;
        } else {
            _stakingInfo.startTime = block.timestamp;
            _stakingInfo.timePoint = block.timestamp;
            _stakingInfo.amount = value_;
            _stakingInfo.totalProfit = 0;
        }
        emit StakeUpdate(_msgSender(), stakePackageId_, _stakingInfo.amount, _stakingInfo.totalProfit);
    }

    function unstake(uint256 stakePackageId_) public {
        StakePackage memory _stakePackage = stakePackages[stakePackageId_];
        StakingInfo storage _stakingInfo = stakes[_msgSender()][stakePackageId_];
        require(_stakingInfo.amount > 0, "Staking: never stake before");
        require(_stakingInfo.timePoint + _stakePackage.lockTime >= block.timestamp, "Staking: still in locking time");
        uint256 _profit = calculateProfit(stakePackageId_);
        uint256 _amount = _stakingInfo.amount;
        _stakingInfo.amount = 0;
        _stakingInfo.totalProfit = 0;
        _stakingInfo.timePoint = 0;
        _stakingInfo.startTime = 0;
        reserve.distributeGold(_msgSender(), _amount + _profit);
        emit StakeReleased(_msgSender(), stakePackageId_, _amount, _profit);
    }

    function calculateProfit(uint256 stakePackageId_) public view returns (uint256) {
        StakePackage memory _stakePackage = stakePackages[stakePackageId_];
        StakingInfo memory _stakingInfo = stakes[_msgSender()][stakePackageId_];
        uint256 _stakeTime = block.timestamp - _stakingInfo.timePoint;
        uint256 profit = (_stakeTime * _stakePackage.rate * _stakingInfo.amount) / (365*60*60*24 * 10**_stakePackage.decimal);
        return profit + _stakingInfo.totalProfit;
    }
}