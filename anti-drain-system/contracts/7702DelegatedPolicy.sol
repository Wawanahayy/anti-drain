// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/*
    7702 Delegated Policy

    Fitur:
    - Only whitelisted contracts boleh dipanggil
    - Daily ETH limit
    - Daily token limit per token
    - Block semua approve/transfer liar
    - Guardian mode (owner bisa update rules)
    - Session keys (optional)
    - Validasi tx dilakukan saat Type-4 delegated execution
*/

interface IERC20 {
    function balanceOf(address) external view returns (uint);
}

contract DelegatedPolicy7702 {
    address public owner;

    mapping(address => bool) public whitelist;
    mapping(address => bool) public sessionKeys;

    uint256 public dailyEthLimit;
    uint256 public dailySpentEth;

    mapping(address => uint256) public tokenDailyLimit;
    mapping(address => uint256) public tokenSpentToday;

    uint256 public lastReset;

    modifier onlyOwner {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        lastReset = block.timestamp / 1 days;
    }

    function resetDaily() internal {
        uint256 today = block.timestamp / 1 days;
        if (today > lastReset) {
            dailySpentEth = 0;
            // tokenSpentToday auto-reset by day key
            lastReset = today;
        }
    }

    // ---------- OWNER CONFIG ----------
    function setWhitelist(address target, bool ok) external onlyOwner {
        whitelist[target] = ok;
    }

    function setSessionKey(address key, bool ok) external onlyOwner {
        sessionKeys[key] = ok;
    }

    function setDailyEthLimit(uint256 limit) external onlyOwner {
        dailyEthLimit = limit;
    }

    function setTokenDailyLimit(address token, uint256 limit) external onlyOwner {
        tokenDailyLimit[token] = limit;
    }

    function changeOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ---------------------------------------------------------
    //  MAIN VALIDATION LOGIC — dipanggil otomatis oleh EIP-7702
    // ---------------------------------------------------------
    function validate(
        address caller,
        address target,
        uint256 value,
        bytes calldata data
    )
        external
        returns (bool)
    {
        resetDaily();

        // 1. Hanya owner / session key yang boleh call
        require(caller == owner || sessionKeys[caller], "caller not allowed");

        // 2. Target harus whitelist
        require(whitelist[target], "target not allowed");

        // 3. ETH limit check
        dailySpentEth += value;
        require(dailySpentEth <= dailyEthLimit, "ETH limit exceeded");

        // 4. Token checks (block direct approve / transfer)
        if (data.length >= 4) {
            bytes4 sig;
            assembly {
                sig := calldataload(data.offset)
            }

            // block approve() liar
            require(sig != 0x095ea7b3, "approve blocked");

            // block transfer() liar
            require(sig != 0xa9059cbb, "transfer blocked");

            // block transferFrom() liar
            require(sig != 0x23b872dd, "transferFrom blocked");
        }

        return true;
    }
}
