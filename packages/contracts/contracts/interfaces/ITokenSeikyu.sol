// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITokenSeikyu {
    function init(
        address _client,
        address _provider,
        address _token,
        uint256 _price,
        uint256 _terminationTime, // exact termination date in seconds since epoch
        address _wrappedNativeToken,
        bool _requireVerification
    ) external;

    function release() external;

    function releaseTokens(address _token) external;

    function withdraw() external;

    function withdrawTokens(address _token) external;

    function lock() external payable;

    function payByClient(uint256 _clientAward, uint256 _providerAward) external;
}
