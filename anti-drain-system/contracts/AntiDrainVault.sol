// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

contract AntiDrainVault {
    address public owner;    
    address public operator;

    uint256 public ethDailyLimit;
    mapping(address => uint256) public tokenDailyLimit;

    mapping(uint256 => uint256) public ethSpentByDay; // day → total spent

    mapping(address => bool) public targetWhitelist;

    bool public paused;

    event Executed(address operator, address target, uint256 value, bytes data);
    event Swept(address token, uint256 amount, address to);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    modifier notPaused() {
        require(!paused, "vault paused");
        _;
    }

    constructor(address _owner, address _operator, uint256 _ethLimit) {
        owner = _owner;
        operator = _operator;
        ethDailyLimit = _ethLimit;
    }

    // ===== OWNER FUNCTIONS =====

    function setTargetWhitelist(address target, bool allowed) external onlyOwner {
        targetWhitelist[target] = allowed;
    }

    function setOperator(address newOp) external onlyOwner {
        operator = newOp;
    }

    function setEthDailyLimit(uint256 limit) external onlyOwner {
        ethDailyLimit = limit;
    }

    function setTokenDailyLimit(address token, uint256 limit) external onlyOwner {
        tokenDailyLimit[token] = limit;
    }

    function setPaused(bool v) external onlyOwner {
        paused = v;
    }

    function emergencyWithdrawETH(address to) external onlyOwner {
        payable(to).transfer(address(this).balance);
    }

    function emergencyWithdrawToken(address token, address to) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(to, bal);
    }

    // ===== OPERATOR EXEC FUNCTION =====

    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyOperator
        notPaused
        returns (bytes memory)
    {
        require(targetWhitelist[target], "target not allowed");

        uint256 day = block.timestamp / 1 days;

        require(
            ethSpentByDay[day] + value <= ethDailyLimit,
            "eth limit exceeded"
        );

        ethSpentByDay[day] += value;

        (bool ok, bytes memory result) = target.call{value: value}(data);
        require(ok, "call failed");

        emit Executed(msg.sender, target, value, data);

        return result;
    }

    // ===== SWEEP FUNCTIONS =====

    function sweepETH(address to) external onlyOperator {
        uint256 bal = address(this).balance;
        payable(to).transfer(bal);
        emit Swept(address(0), bal, to);
    }

    function sweepToken(address token, address to) external onlyOperator {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(to, bal);
        emit Swept(token, bal, to);
    }

    receive() external payable {}
}
