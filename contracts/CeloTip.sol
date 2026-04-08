// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CeloTip
 * @notice Discovery + Tipping platform on Celo. Users tip with cUSD, platform takes a fee.
 * @dev Users approve cUSD, then call tip() directly. Fee split happens on-chain.
 */
contract CeloTip is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- Events ---
    event Tipped(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee
    );

    event Boosted(
        address indexed user,
        uint256 amount
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event BoostPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // --- State ---
    IERC20 public immutable cUSD;
    address public platformWallet;
    uint256 public feeBps; // basis points, e.g. 500 = 5%
    uint256 public boostPrice; // in cUSD wei (18 decimals)

    // --- Errors ---
    error InvalidAddress();
    error InvalidAmount();
    error SelfTipNotAllowed();
    error InsufficientAllowance();
    error FeeTooHigh();

    /**
     * @param _cUSD Address of the cUSD token on Celo
     * @param _platformWallet Address to receive platform fees
     * @param _feeBps Fee in basis points (e.g. 500 = 5%)
     * @param _boostPrice Price to boost a profile in cUSD (18 decimals)
     */
    constructor(
        address _cUSD,
        address _platformWallet,
        uint256 _feeBps,
        uint256 _boostPrice
    ) Ownable(msg.sender) {
        if (_cUSD == address(0) || _platformWallet == address(0)) revert InvalidAddress();
        if (_feeBps > 2000) revert FeeTooHigh(); // max 20%

        cUSD = IERC20(_cUSD);
        platformWallet = _platformWallet;
        feeBps = _feeBps;
        boostPrice = _boostPrice;
    }

    /**
     * @notice Tip a recipient in cUSD. Platform fee is deducted automatically.
     * @param to Recipient address
     * @param amount Total cUSD amount (before fee)
     */
    function tip(address to, uint256 amount) external whenNotPaused nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (msg.sender == to) revert SelfTipNotAllowed();

        uint256 fee = (amount * feeBps) / 10000;
        uint256 recipientAmount = amount - fee;

        // Transfer from sender
        cUSD.safeTransferFrom(msg.sender, to, recipientAmount);
        if (fee > 0) {
            cUSD.safeTransferFrom(msg.sender, platformWallet, fee);
        }

        emit Tipped(msg.sender, to, amount, fee);
    }

    /**
     * @notice Pay to boost your profile. Full amount goes to platform.
     */
    function boost() external whenNotPaused nonReentrant {
        if (boostPrice == 0) revert InvalidAmount();

        cUSD.safeTransferFrom(msg.sender, platformWallet, boostPrice);

        emit Boosted(msg.sender, boostPrice);
    }

    // --- Owner functions ---

    function setFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 2000) revert FeeTooHigh();
        uint256 old = feeBps;
        feeBps = _feeBps;
        emit FeeUpdated(old, _feeBps);
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        if (_wallet == address(0)) revert InvalidAddress();
        address old = platformWallet;
        platformWallet = _wallet;
        emit PlatformWalletUpdated(old, _wallet);
    }

    function setBoostPrice(uint256 _price) external onlyOwner {
        uint256 old = boostPrice;
        boostPrice = _price;
        emit BoostPriceUpdated(old, _price);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency withdrawal (contract shouldn't hold funds normally)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
