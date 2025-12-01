// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CeloTip
 * @notice Automated tipping contract for Farcaster interactions on Celo
 * @dev Users approve tokens, relayer executes tips based on social interactions
 */
contract CeloTip is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event TipSent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        string interactionType,
        string castHash
    );

    event TokensRevoked(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    // State variables
    address public relayer;
    
    // Mapping to track user's approved relayer status
    mapping(address => mapping(address => bool)) public userTokenApprovals;

    // Errors
    error Unauthorized();
    error InvalidAmount();
    error InvalidAddress();
    error TransferFailed();
    error InsufficientAllowance();

    /**
     * @notice Constructor sets the relayer address
     * @param _relayer Address authorized to execute tips
     */
    constructor(address _relayer) {
        if (_relayer == address(0)) revert InvalidAddress();
        relayer = _relayer;
    }

    /**
     * @notice Modifier to restrict functions to relayer only
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert Unauthorized();
        _;
    }

    /**
     * @notice Execute a tip from one user to another
     * @param from Address of the tipper
     * @param to Address of the recipient
     * @param tokenAddress Address of the ERC20 token
     * @param amount Amount to tip
     * @param interactionType Type of interaction (like, comment, recast, etc.)
     * @param castHash Hash of the cast being tipped
     */
    function sendTip(
        address from,
        address to,
        address tokenAddress,
        uint256 amount,
        string memory interactionType,
        string memory castHash
    ) external onlyRelayer whenNotPaused nonReentrant {
        if (from == address(0) || to == address(0) || tokenAddress == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) revert InvalidAmount();
        if (from == to) revert InvalidAddress(); // Cannot tip yourself

        IERC20 token = IERC20(tokenAddress);
        
        // Check allowance
        uint256 allowance = token.allowance(from, address(this));
        if (allowance < amount) revert InsufficientAllowance();

        // Transfer tokens from tipper to recipient
        token.safeTransferFrom(from, to, amount);

        emit TipSent(from, to, tokenAddress, amount, interactionType, castHash);
    }

    /**
     * @notice Batch send multiple tips in one transaction
     * @param froms Array of tipper addresses
     * @param tos Array of recipient addresses
     * @param tokenAddresses Array of token addresses
     * @param amounts Array of tip amounts
     * @param interactionTypes Array of interaction types
     * @param castHashes Array of cast hashes
     */
    function sendBatchTips(
        address[] memory froms,
        address[] memory tos,
        address[] memory tokenAddresses,
        uint256[] memory amounts,
        string[] memory interactionTypes,
        string[] memory castHashes
    ) external onlyRelayer whenNotPaused nonReentrant {
        uint256 length = froms.length;
        require(
            length == tos.length &&
            length == tokenAddresses.length &&
            length == amounts.length &&
            length == interactionTypes.length &&
            length == castHashes.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            if (froms[i] == address(0) || tos[i] == address(0) || tokenAddresses[i] == address(0)) {
                continue; // Skip invalid addresses
            }
            if (amounts[i] == 0 || froms[i] == tos[i]) {
                continue; // Skip invalid amounts or self-tips
            }

            IERC20 token = IERC20(tokenAddresses[i]);
            uint256 allowance = token.allowance(froms[i], address(this));
            
            if (allowance >= amounts[i]) {
                try token.safeTransferFrom(froms[i], tos[i], amounts[i]) {
                    emit TipSent(
                        froms[i],
                        tos[i],
                        tokenAddresses[i],
                        amounts[i],
                        interactionTypes[i],
                        castHashes[i]
                    );
                } catch {
                    // Silently continue on failure to not block other tips
                    continue;
                }
            }
        }
    }

    /**
     * @notice Users can revoke approval by setting allowance to 0
     * @dev This is a convenience function - users can also revoke via token contract
     * @param tokenAddress Address of the token to revoke approval for
     */
    function revokeApproval(address tokenAddress) external nonReentrant {
        if (tokenAddress == address(0)) revert InvalidAddress();
        
        IERC20 token = IERC20(tokenAddress);
        uint256 currentAllowance = token.allowance(msg.sender, address(this));
        
        if (currentAllowance > 0) {
            // User needs to approve 0 themselves via token contract
            // This function just emits an event for tracking
            emit TokensRevoked(msg.sender, tokenAddress, currentAllowance);
        }
    }

    /**
     * @notice Get user's current allowance for a specific token
     * @param user Address of the user
     * @param tokenAddress Address of the token
     * @return Current allowance amount
     */
    function getUserAllowance(address user, address tokenAddress) 
        external 
        view 
        returns (uint256) 
    {
        IERC20 token = IERC20(tokenAddress);
        return token.allowance(user, address(this));
    }

    /**
     * @notice Update the relayer address (only owner)
     * @param newRelayer New relayer address
     */
    function updateRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert InvalidAddress();
        address oldRelayer = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal function (only owner)
     * @dev Should only be used in emergencies, as this contract shouldn't hold funds
     * @param tokenAddress Address of token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(owner(), amount);
    }
}
