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
    uint256 public released = 0;
    uint256 public disputeId; // not in use ? keeping in this code for a while.

    event Register(
        address indexed client,
        address indexed provider,
        uint256 price
    );
    event Deposit(address indexed sender, uint256 amount);
    event Release(uint256 amount);
    event Withdraw(uint256 balance);
    event Cancel(address indexed sender);

    event PayByClient(uint256 providerAward);

    event Verified(address indexed client, address indexed invoice);

    // solhint-disable-next-line no-empty-blocks
    function initLock() external initializer {}

    function init(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime, // exact termination date in seconds since epoch
        address _wrappedNativeToken,
        bool _requireVerification
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
        wrappedNativeToken = _wrappedNativeToken;

        if (!_requireVerification) emit Verified(_client, address(this));

        emit Register(_client, _provider, price);
    }

    // Client verifies address before deposits
    function verify() external {
        require(msg.sender == client, "!client");
        emit Verified(client, address(this));
    }

    function getPrice() public view returns (uint256) {
        return price;
    }

/*
    function _release() internal {
        require(!canceled, "canceled");
        require(_msgSender() == client, "!client");

        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= price, "insufficient balance");

        IERC20(token).safeTransfer(provider, price);
        released = released + price;
        emit Release(price);
    }

    function release() external override nonReentrant {
        return _release();
    }

    // release non-invoice tokens
    function releaseTokens(address _token) external override nonReentrant {
        if (_token == token) {
            _release();
        } else {
            require(_msgSender() == client, "!client");
            uint256 balance = IERC20(_token).balanceOf(address(this));
            IERC20(_token).safeTransfer(provider, balance);
        }
    }

    function _withdraw() internal {
        require(!canceled, "canceled");
        require(block.timestamp > terminationTime, "!terminated");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "balance is 0");

        IERC20(token).safeTransfer(client, balance);

        emit Withdraw(balance);
    }

    // withdraw locker remainder to client if termination time passes & no lock
    function withdraw() external override nonReentrant {
        return _withdraw();
    }

    // withdraw non-invoice tokens
    function withdrawTokens(address _token) external override nonReentrant {
        if (_token == token) {
            _withdraw();
        } else {
            require(block.timestamp > terminationTime, "!terminated");
            uint256 balance = IERC20(_token).balanceOf(address(this));
            require(balance > 0, "balance is 0");

            IERC20(_token).safeTransfer(client, balance);
        }
    }
*/


    // cancel this invoice by client
    function cancel() external payable override nonReentrant {
        require(!canceled, "canceled");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "balance is 0");
        require(block.timestamp < terminationTime, "terminated");
        require(_msgSender() == provider, "!party");

        canceled = true;

        emit Cancel(_msgSender());
    }

        // deny this invoice by provider
    function denied() external payable override nonReentrant {
        require(!canceled, "canceled");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "balance is 0");
        require(block.timestamp < terminationTime, "terminated");
        require(_msgSender() == client, "!party");

        canceled = true;

        emit Cancel(_msgSender());
    }

    function payByClient(uint256 _providerAward)
        external
        override
        nonReentrant
    {
        // called by individual
        require(canceled, "!canceled");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "balance is 0");
        require(_msgSender() == client, "!client");

        if (_providerAward > 0) {
            IERC20(token).safeTransfer(provider, _providerAward);
        }

        canceled = false;

        emit PayByClient(_providerAward);
    }

    // receive eth transfers
    receive() external payable {
        require(!canceled, "canceled");
        require(token == wrappedNativeToken, "!wrappedNativeToken");
        IWRAPPED(wrappedNativeToken).deposit{value: msg.value}();
        emit Deposit(_msgSender(), msg.value);
    }
}
