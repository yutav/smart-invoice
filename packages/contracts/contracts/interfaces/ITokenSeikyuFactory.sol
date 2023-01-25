// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITokenSeikyuFactory {
    function create(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime,
        bytes32 _details,
        bool _requireVerification
    ) external returns (address);

    function createDeterministic(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime,
        bytes32 _details,
        bytes32 _salt,
        bool _requireVerification
    ) external returns (address);

    function predictDeterministicAddress(bytes32 _salt)
        external
        returns (address);
}
