const { getAddress } = require("@ethersproject/address");
const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Staking", function () {
    let [admin, staker1, staker2] = []
    let gold
    let reserve
    let reserveBalance = ethers.utils.parseEther("100000")
    let stakingBalance = ethers.utils.parseEther("100000")
    let staker1Balance = ethers.utils.parseEther("100")
    let staker2Balance = ethers.utils.parseEther("100")
    let address0 = "0x0000000000000000000000000000000000000000"
    beforeEach(async () => {
        [admin, staker1, staker2] = await ethers.getSigners();

        const Gold = await ethers.getContractFactory("Gold");
        gold = await Gold.deploy();
        await gold.deployed()

        const Staking = await ethers.getContractFactory("Staking");
        staking = await Staking.deploy(gold.address);
        await staking.deployed();

        const Reserve = await ethers.getContractFactory("StakingReserve");
        reserve = await Reserve.deploy(gold.address, staking.address);
        await reserve.deployed();

        // console.log("reserve: " + reserve.address);

        await gold.transfer(reserve.address, reserveBalance);
        await gold.transfer(staking.address, stakingBalance);
        await gold.transfer(staker1.address, staker1Balance)
        await gold.transfer(staker2.address, staker2Balance)

        await gold.connect(staker1).approve(staking.address, staker1Balance)
    })

    describe("setReserve", function () {
        it("only owner can set reserve", async function () {
            await staking.setReserve(reserve.address);
            expect(reserve.address).to.be.equal(await staking.reserve())
        })

        it("should not set reserve if it is not owner", async function () {
            staking.connect(staker1).setReserve(reserve.address)
            expect(await staking.reserve()).to.be.equal(address0)
        })

        it("should not set reserve with address 0", async function () {
            await expect(staking.setReserve(address0))
                .to.be.revertedWith("Staking: reserveAddress must be different from address(0)")
        })
    })

    describe("addStakePackage", function () {
        beforeEach(async () => {
            staking.setReserve(reserve.address);
        })

        it("should be reverted if adding stake package with rate is not positive", async function () {
            await expect()
        })

        it("should be reverted if adding stake package with decimal negative", async function () {

        })

        it("should be reverted if adding stake package with minValue is not positive", async function () {

        })

        it("should be reverted if adding stake package with lockTime is negative", async function () {

        })

        it("should be reverted if adding stake package with caller is not the owner", async function () {

        })

        it("should add stake package wich 30-day-locking time successfully", async function () {
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            let package = await staking.stakePackages(1)
            expect(package[0]).to.be.equal(6)
            expect(package[1]).to.be.equal(2)
            expect(package[2]).to.be.equal(BigNumber.from(100000000000000000n))
            expect(package[3]).to.be.equal(BigNumber.from(2592000n))
        })
    })

    describe("removeStakePackage", function () {
        it("should revert when removeStakePackage with caller is not the owner", async function () {
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            await expect(staking.connect(staker1).removeStakePackage(1)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("should revert when the package is non-existent", async function () {
            await expect(staking.removeStakePackage(2))
                .to
                .be
                .revertedWith("Staking: stakePackage is non-existent")
        })

        it("should revert when the package was removed", async function () {
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            await staking.removeStakePackage(1)
            await expect(staking.removeStakePackage(1))
                .to
                .be
                .revertedWith("Staking: stakePackage is offline")
        })

        it("should remove stake package successfully", async function () {
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            await staking.removeStakePackage(1)
            let package = await staking.stakePackages(1);
            expect(package[4]).to.be.equal(true);
        })
    })

    describe("stake", function () {

        it("should revert if stake package is offline", async function () {
            await staking.setReserve(reserve.address);
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            await staking.removeStakePackage(1)

            await expect(staking.connect(staker1).stake(1, ethers.utils.parseEther("2")))
                .to.be
                .revertedWith("Staking: stakePackage is offline")
        })

        it("should revert if stake package is non-existent", async function () {

        })

        it("should revert if stake value is less than minStaking", async function () {

        })

        it("should revert if reserve contract is not set", async function () {

        })

        it("should stake successfully", async function () {
            await staking.setReserve(reserve.address);
            await staking.addStakePackage(6, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
            await staking.connect(staker1).stake(1, ethers.utils.parseEther("20"))
            let stakeInfo = await staking.stakes(staker1.address, 1);
            expect(stakeInfo[2]).to.be.equal(ethers.utils.parseEther("20"))
            expect(await gold.balanceOf(staker1.address))
                .to
                .be
                .equal(ethers.utils.parseEther("80"))
        })

        it("should stake more at after stake 10 days of stakePackage 30 days locking time", async function () {
            await staking.setReserve(reserve.address);
            await staking.addStakePackage(365, 2, ethers.utils.parseEther("0.1"), 60 * 60 * 24 * 30);
        
            await staking.connect(staker1).stake(1, ethers.utils.parseEther("10"));
            const blockNumStart = await ethers.provider.getBlockNumber();
            const blockStart = await ethers.provider.getBlock(blockNumStart);
            const timestampStart = blockStart.timestamp;
            console.log("Start at: " + timestampStart);

            await network.provider.send("evm_increaseTime", [10 * 60 * 60 *24])
            
            await staking.connect(staker1).stake(1, ethers.utils.parseEther("10"));
            const blockNumEnd = await ethers.provider.getBlockNumber();
            const blockEnd = await ethers.provider.getBlock(blockNumEnd);
            const timestampEnd = blockEnd.timestamp;
            console.log("End at: " + timestampEnd);

            let stakeInfo = await staking.stakes(staker1.address, 1);
            let profit = (365 * 10 * 60 * 60 * 24 * 10)/(365 * 86400 * 10**2)
            expect(stakeInfo.totalProfit).to.be.equal(ethers.utils.parseEther(profit.toString()))
            expect(stakeInfo.timePoint).to.be.equal(timestampEnd)
            expect(stakeInfo.startTime).to.be.equal(timestampStart)
            expect(stakeInfo.amount).to.be.equal(ethers.utils.parseEther("20"))
        })

        afterEach(async () => {
            let balance = await gold.balanceOf(staker1.address);
            console.log("balance staker1: " + ethers.utils.formatEther(balance))

            let balanceReserve = await gold.balanceOf(reserve.address);
            console.log("balance reserve: " + ethers.utils.formatEther(balanceReserve))

            let balanceStaking = await gold.balanceOf(staking.address);
            console.log("balance staking: " + ethers.utils.formatEther(balanceStaking))

            let balanceAdmin = await gold.balanceOf(admin.address);
            console.log("balance admin: " + ethers.utils.formatEther(balanceAdmin))
        })
    })
})