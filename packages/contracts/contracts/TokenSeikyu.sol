// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time, max-states-count

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/ITokenSeikyu.sol";
import "./interfaces/IWRAPPED.sol";
import "hardhat/console.sol";

contract TokenSeikyu is ITokenSeikyu, Initializable, Context, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_TERMINATION_TIME = 63113904; // 2-year limit on locker
    address public wrappedNativeToken;

    address public client;
    address public provider;
    address public token;
    uint256 public terminationTime;

    uint256 public price = 0;
    bool public canceled;
    bool public denied;
    bool public accepted;
    bytes32 public details;

    event Register(
        address indexed client,
        address indexed provider,
        uint256 price
    );
    event Deposit(address indexed sender, uint256 amount);
    event Cancel(address indexed sender);
    event Deny(address indexed sender);
    event Accept(address indexed sender);
    event TokenBalance(uint256 tokenBalance);

    // solhint-disable-next-line no-empty-blocks
    function initLock() external initializer {}

    function init(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime, // exact termination date in seconds since epoch
        bytes32 _details,
        address _wrappedNativeToken
    ) external override initializer {
        require(_client != address(0), "invalid client");
        require(_provider != address(0), "invalid provider");
        require(_token != address(0), "invalid token");
        require(_terminationTime > block.timestamp, "duration ended");
        require(
            _terminationTime <= block.timestamp + MAX_TERMINATION_TIME,
            "duration too long"
        );
        require(
            _wrappedNativeToken != address(0),
            "invalid wrappedNativeToken"
        );

        client = _client;
        provider = _provider;
        token = _token;
        price = _price;
        terminationTime = _terminationTime;
        details = _details;
        wrappedNativeToken = _wrappedNativeToken;

        emit Register(_client, _provider, price);
    }


    function getPrice() public view returns (uint256) {
        return price;
    }

    // cancel this invoice by client
    function cancel() external override nonReentrant {
        require(!canceled, "canceled");
        require(!accepted, "accepted");
        require(!denied, "denied");
        require(block.timestamp < terminationTime, "terminated");
        require(_msgSender() == provider, "!party");

        canceled = true;

        emit Cancel(_msgSender());
    }

        // deny this invoice by provider
    function deny() external override nonReentrant {
        require(!canceled, "canceled");
        require(!accepted, "accepted");
        require(!denied, "denied");
        require(block.timestamp < terminationTime, "terminated");
        require(_msgSender() == client, "!party");

        denied = true;

        emit Deny(_msgSender());
    }

    function accept() external override nonReentrant {
        require(!canceled, "canceled");
        require(!accepted, "accepted");
        require(!denied, "denied");
        require(block.timestamp < terminationTime, "terminated");
        require(_msgSender() == client, "!party");

        accepted = true;

        emit Accept(_msgSender());
    }


    function tokenBalance(address user, address checkToken) external override nonReentrant {
        uint256 balance = IERC20(checkToken).balanceOf(user);
        emit TokenBalance(balance);
    }

    // receive eth transfers
    receive() external payable {
        require(!canceled, "canceled");
        require(token == wrappedNativeToken, "!wrappedNativeToken");
        IWRAPPED(wrappedNativeToken).deposit{value: msg.value}();
        emit Deposit(_msgSender(), msg.value);
    }
}
