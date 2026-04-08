const hre = require("hardhat");

async function main() {
  console.log("Deploying CeloTip v2 contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "CELO");

  // cUSD on Celo Mainnet
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  
  // Platform wallet for fee collection
  const PLATFORM_WALLET = process.env.PLATFORM_WALLET || deployer.address;
  
  // Fee: 5% = 500 basis points
  const FEE_BPS = 500;
  
  // Boost price: 2 cUSD (18 decimals)
  const BOOST_PRICE = hre.ethers.parseUnits("2", 18);

  console.log("cUSD:", CUSD_ADDRESS);
  console.log("Platform wallet:", PLATFORM_WALLET);
  console.log("Fee:", FEE_BPS, "bps (5%)");
  console.log("Boost price: 2 cUSD");

  const CeloTip = await hre.ethers.getContractFactory("CeloTip");
  const celoTip = await CeloTip.deploy(CUSD_ADDRESS, PLATFORM_WALLET, FEE_BPS, BOOST_PRICE);

  await celoTip.waitForDeployment();
  const contractAddress = await celoTip.getAddress();
  console.log("✅ CeloTip v2 deployed to:", contractAddress);

  console.log("Waiting for confirmations...");
  await celoTip.deploymentTransaction().wait(5);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying on Celoscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [CUSD_ADDRESS, PLATFORM_WALLET, FEE_BPS, BOOST_PRICE],
      });
      console.log("✅ Verified");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract:", contractAddress);
  console.log("Platform Wallet:", PLATFORM_WALLET);
  console.log("Fee: 5%");
  console.log("Boost Price: 2 cUSD");
  console.log("\nUpdate src/lib/contracts.ts with:");
  console.log(`export const CELOTIP_CONTRACT_ADDRESS = "${contractAddress}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
