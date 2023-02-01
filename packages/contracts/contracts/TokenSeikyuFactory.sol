// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/ITokenSeikyuFactory.sol";
import "./interfaces/ITokenSeikyu.sol";

contract TokenSeikyuFactory is ITokenSeikyuFactory {
    uint256 public invoiceCount = 0;
    mapping(uint256 => address) internal _invoices;

    event LogNewInvoice(uint256 indexed index, address invoice, uint256 price);

    address public immutable implementation;
    address public immutable wrappedNativeToken;

    constructor(address _implementation, address _wrappedNativeToken) {
        require(_implementation != address(0), "invalid implementation");
        require(
            _wrappedNativeToken != address(0),
            "invalid wrappedNativeToken"
        );
        implementation = _implementation;
        wrappedNativeToken = _wrappedNativeToken;
    }

    function _init(
        address _invoiceAddress,
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime,
        bytes32 _details
    ) internal {
        ITokenSeikyu(_invoiceAddress).init(
            _client,
            _provider,
            _token,
            _price,
            _terminationTime,
            _details,
            wrappedNativeToken
        );

        uint256 invoiceId = invoiceCount;
        _invoices[invoiceId] = _invoiceAddress;
        invoiceCount = invoiceCount + 1;

        emit LogNewInvoice(invoiceId, _invoiceAddress, _price);
    }

    function create(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime,
        bytes32 _details
    ) external override returns (address) {
        address invoiceAddress = Clones.clone(implementation);

        _init(
            invoiceAddress,
            _client,
            _provider,
            _token,
            _price,
            _terminationTime,
            _details
        );

        return invoiceAddress;
    }

    function predictDeterministicAddress(bytes32 _salt)
        external
        view
        override
        returns (address)
    {
        return Clones.predictDeterministicAddress(implementation, _salt);
    }

    function createDeterministic(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime,
        bytes32 _details,
        bytes32 _salt
    ) external override returns (address) {
        address invoiceAddress = Clones.cloneDeterministic(
            implementation,
            _salt
        );

        _init(
            invoiceAddress,
            _client,
            _provider,
            _token,
            _price,
            _terminationTime,
            _details
        );

        return invoiceAddress;
    }

    function getInvoiceAddress(uint256 _index) public view returns (address) {
        return _invoices[_index];
    }
}
