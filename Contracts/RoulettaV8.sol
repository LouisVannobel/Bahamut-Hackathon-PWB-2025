// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface ErinaceusVRFInterface {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

contract RouletteV8 {
    address public owner;
    IERC20 public lbrToken;
    ErinaceusVRFInterface public vrf;
    uint64 public subId;
    bytes32 public keyHash;

    // -------------------------------------------
    // BET STRUCT AND MAPPINGS
    // -------------------------------------------

    struct Bet {
        address player;      // Address of the player
        bool betOnRed;       // true if bet on red, false if on black
        bool isFTNBet;       // true if bet was made in FTN, false if in LBR
        uint256 amount;      // Amount wagered, in FTN or LBR
    }

    // requestId => Bet
    mapping(uint256 => Bet) public pendingBets;

    // Prevents users from placing a new bet while waiting for resolution
    mapping(address => bool) public waitingForResult;

    // Pending winnings or consolation amounts
    mapping(address => uint256) public pendingWithdrawalsFTN;
    mapping(address => uint256) public pendingWithdrawalsLBR;

    // -------------------------------------------
    // EVENTS
    // -------------------------------------------

    // Emitted when a player places a bet
    event BetPlaced(
        address indexed player,
        bool betOnRed,
        bool isFTNBet,
        uint256 requestId,
        uint256 betValue
    );

    // Emitted when the bet result is determined
    event ResultGenerated(
        address indexed player,
        bool won,
        uint8 result,
        bool isFTNBet,
        uint256 betAmount,
        uint256 payoutFTN,
        uint256 payoutLBR
    );

    // Emitted when a player withdraws their pending balances
    event FundsWithdrawn(
        address indexed player,
        uint256 ftnAmount,
        uint256 lbrAmount
    );

    // Emitted when the owner updates VRF info
    event VRFUpdated(address newVRF);
    event KeyHashUpdated(bytes32 newKeyHash);
    event SubIdUpdated(uint64 newSubId);

    // Emitted for owner deposits/withdrawals
    event OwnerWithdrewFTN(uint256 amount);
    event OwnerWithdrewLBR(uint256 amount);
    event OwnerDepositedLBR(uint256 amount);
    event OwnerDepositedFTN(uint256 amount);

    // -------------------------------------------
    // MODIFIER
    // -------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // -------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------

    constructor(
        address _vrfAddress,
        bytes32 _keyHash,
        uint64 _subId,
        address _lbrToken
    ) {
        owner = msg.sender;
        vrf = ErinaceusVRFInterface(_vrfAddress);
        keyHash = _keyHash;
        subId = _subId;
        lbrToken = IERC20(_lbrToken);
    }

    // -------------------------------------------
    // MAIN BET FUNCTION
    // -------------------------------------------

    /**
     * @dev A player can bet on red or black with either FTN or LBR.
     *      If msg.value > 0, it is an FTN bet.
     *      If msg.value == 0, it is an LBR bet with _amount.
     *
     * Rules:
     *   - FTN bet:
     *       * The user sends some FTN, indicated by msg.value == _amount.
     *       * If they win, they receive 2x their bet in FTN.
     *       * If they lose, they receive the same amount in LBR.
     *   - LBR bet:
     *       * The user must have approved the contract for _amount of LBR.
     *       * If they win, they receive 2x their bet in LBR.
     *       * If they lose, they receive the same amount in FTN.
     */
    function bet(bool _betOnRed, uint256 _amount) external payable {
        require(!waitingForResult[msg.sender], "Pending bet not resolved");

        bool ftnBet = (msg.value > 0);
        if (ftnBet) {
            // FTN bet
            require(msg.value == _amount, "Parameter _amount must match msg.value");
            require(_amount > 0, "Bet amount must be > 0");

            // Check contract liquidity
            require(address(this).balance >= 2 * _amount, "Not enough FTN in contract");
            require(lbrToken.balanceOf(address(this)) >= _amount, "Not enough LBR in contract");
        } else {
            // LBR bet
            require(msg.value == 0, "Do not send FTN for an LBR bet");
            require(_amount > 0, "Bet amount must be > 0");
            bool ok = lbrToken.transferFrom(msg.sender, address(this), _amount);
            require(ok, "Failed to transfer LBR");

            // Check contract liquidity
            require(lbrToken.balanceOf(address(this)) >= 2 * _amount, "Not enough LBR in contract");
            require(address(this).balance >= _amount, "Not enough FTN in contract");
        }

        // Request randomness
        uint256 requestId = vrf.requestRandomWords(
            keyHash,
            subId,
            3,       // confirmations
            2000000,  // callback gas
            1        // 1 random word
        );

        // Record the bet
        pendingBets[requestId] = Bet({
            player: msg.sender,
            betOnRed: _betOnRed,
            isFTNBet: ftnBet,
            amount: _amount
        });

        waitingForResult[msg.sender] = true;

        emit BetPlaced(msg.sender, _betOnRed, ftnBet, requestId, _amount);
    }

    // -------------------------------------------
    // VRF CALLBACK
    // -------------------------------------------

    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(vrf), "Only VRF can fulfill");

        Bet memory betInfo = pendingBets[requestId];
        require(betInfo.player != address(0), "Bet not found");

        // Clear bet
        waitingForResult[betInfo.player] = false;
        delete pendingBets[requestId];

        // Spin outcome (10 possible outcomes)
        uint8 spin = uint8(randomWords[0] % 10);
        uint8 result;
        // 0..3 => Red (40%)
        // 4..7 => Black (40%)
        // 8..9 => Green (20%)
        if (spin < 4) {
            result = 0; // red
        } else if (spin < 8) {
            result = 1; // black
        } else {
            result = 2; // green
        }

        // Determine if won
        bool won = false;
        if ((result == 0 && betInfo.betOnRed) || (result == 1 && !betInfo.betOnRed)) {
            won = true;
        }

        uint256 payoutFTN = 0;
        uint256 payoutLBR = 0;

        // Payout logic
        if (betInfo.isFTNBet) {
            if (won) {
                // Win: 2x FTN
                payoutFTN = betInfo.amount * 2;
            } else {
                // Lose: same amount in LBR
                payoutLBR = betInfo.amount;
            }
        } else {
            // Bet in LBR
            if (won) {
                // Win: 0.3333333x FTN
                payoutFTN = betInfo.amount / 3;
            }
        }

        // Assign to pending
        pendingWithdrawalsFTN[betInfo.player] += payoutFTN;
        pendingWithdrawalsLBR[betInfo.player] += payoutLBR;

        emit ResultGenerated(
            betInfo.player,
            won,
            result,
            betInfo.isFTNBet,
            betInfo.amount,
            payoutFTN,
            payoutLBR
        );
    }

    // -------------------------------------------
    // WITHDRAW FUNCTIONS (PLAYERS)
    // -------------------------------------------

    function withdrawFunds() external {
        uint256 ftnAmount = pendingWithdrawalsFTN[msg.sender];
        uint256 lbrAmount = pendingWithdrawalsLBR[msg.sender];
        require(ftnAmount > 0 || lbrAmount > 0, "No funds to withdraw");

        // Reset to zero before sending
        pendingWithdrawalsFTN[msg.sender] = 0;
        pendingWithdrawalsLBR[msg.sender] = 0;

        // Send FTN
        if (ftnAmount > 0) {
            (bool success, ) = msg.sender.call{value: ftnAmount}("");
            require(success, "Failed to send FTN");
        }

        // Send LBR
        if (lbrAmount > 0) {
            bool ok = lbrToken.transfer(msg.sender, lbrAmount);
            require(ok, "Failed to send LBR");
        }

        emit FundsWithdrawn(msg.sender, ftnAmount, lbrAmount);
    }

    // -------------------------------------------
    // OWNER (ADMIN) FUNCTIONS
    // -------------------------------------------

    // Allows the owner to withdraw FTN from the contract
    function ownerWithdrawFTN(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to withdraw FTN");
        emit OwnerWithdrewFTN(amount);
    }

    // Allows the owner to withdraw LBR tokens from the contract
    function ownerWithdrawLBR(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        bool ok = lbrToken.transfer(owner, amount);
        require(ok, "Failed to withdraw LBR");
        emit OwnerWithdrewLBR(amount);
    }

    // Allows the owner to deposit LBR tokens into the contract
    // Must have approved this contract for 'amount'
    function ownerDepositLBR(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        bool ok = lbrToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "Failed to deposit LBR");
        emit OwnerDepositedLBR(amount);
    }

    // Allows the owner to deposit FTN into the contract
    // The owner just calls this function with value > 0
    function ownerDepositFTN() external payable onlyOwner {
        require(msg.value > 0, "Must send some FTN");
        emit OwnerDepositedFTN(msg.value);
    }

    // VRF config updates
    function updateVRF(address newVRFAddress) external onlyOwner {
        require(newVRFAddress != address(0), "Invalid VRF");
        vrf = ErinaceusVRFInterface(newVRFAddress);
        emit VRFUpdated(newVRFAddress);
    }

    function updateKeyHash(bytes32 newKeyHash) external onlyOwner {
        keyHash = newKeyHash;
        emit KeyHashUpdated(newKeyHash);
    }

    function updateSubId(uint64 newSubId) external onlyOwner {
        subId = newSubId;
        emit SubIdUpdated(newSubId);
    }

    // -------------------------------------------
    // RECEIVE FTN (fallback)
    // -------------------------------------------

    receive() external payable {
        // Accept FTN deposits from anyone
    }
}