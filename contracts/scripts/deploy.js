const hre = require("hardhat");

async function main() {
  console.log("Deploying CeloTip contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "CELO");

  // Relayer address (you'll use this address to execute tips)
  // IMPORTANT: Replace this with your actual relayer wallet address
  const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS || deployer.address;
  
  console.log("Relayer address:", RELAYER_ADDRESS);

  // Deploy the contract
  const CeloTip = await hre.ethers.getContractFactory("CeloTip");
  const celoTip = await CeloTip.deploy(RELAYER_ADDRESS);

  await celoTip.waitForDeployment();

  const contractAddress = await celoTip.getAddress();
  console.log("✅ CeloTip deployed to:", contractAddress);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await celoTip.deploymentTransaction().wait(5);

  // Verify contract on Celoscan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying contract on Celoscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [RELAYER_ADDRESS],
      });
      console.log("✅ Contract verified on Celoscan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", contractAddress);
  console.log("Relayer Address:", RELAYER_ADDRESS);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update src/lib/contracts.ts with this contract address:");
  console.log(`   export const CELOTIP_CONTRACT_ADDRESS = "${contractAddress}";`);
  console.log("2. Fund the relayer wallet with CELO for gas fees");
  console.log("3. Store the relayer private key securely as a secret");
  console.log("4. Test token approval and tipping functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
