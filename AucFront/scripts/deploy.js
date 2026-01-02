const hre = require('hardhat');
const ethers = hre.ethers;
const fs = require('fs');
const path = require('path');

async function main() {
    if (network.name === 'hardhat') {
        console.warn(
            "u are trying to deploy a contract to the hardhat network" +
            "which gets automatically created and destroyed every time" +
            "use the hardhat option '--network localhost'"
        );
    }

    const [deployer] = await ethers.getSigners();

    console.log("deploying with: ", await deployer.getAddress());

    const AucEngine = await ethers.getContractFactory("AucEngine", deployer);
    const auction = await AucEngine.deploy;
    await auction.deployed
}