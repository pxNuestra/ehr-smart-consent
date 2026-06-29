// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InformedConsent
 * @notice On-chain informed consent registry for EHR access control.
 * Stores only pseudonymous IDs, hashes, and audit metadata — never raw clinical data.
 */
contract InformedConsent {
    enum ConsentStatus {
        Active,
        Limited,
        Revoked,
        Expired
    }

    struct ConsentRecord {
        uint256 id;
        bytes32 patientId;
        bytes32 requesterId;
        string role;
        string dataType;
        string purpose;
        uint256 startTime;
        uint256 endTime;
        bytes32 recordHash;
        bytes32 metadataHash;
        ConsentStatus status;
        string limitationType;
        string limitedValue;
    }

    struct AccessLogEntry {
        uint256 id;
        bytes32 patientId;
        bytes32 requesterId;
        string dataType;
        string purpose;
        string biometricStatus;
        string decision;
        bytes32 metadataHash;
        uint256 timestamp;
    }

    uint256 public nextConsentId = 1;
    uint256 public nextAccessLogId = 1;

    mapping(uint256 => ConsentRecord) public consents;

    event ConsentGranted(
        uint256 indexed consentId,
        bytes32 indexed patientId,
        bytes32 indexed requesterId,
        string role,
        string dataType,
        string purpose,
        uint256 startTime,
        uint256 endTime,
        bytes32 recordHash,
        bytes32 metadataHash
    );

    event ConsentLimited(
        uint256 indexed consentId,
        string limitationType,
        string newValue
    );

    event ConsentRevoked(uint256 indexed consentId, bytes32 indexed patientId);

    event ConsentChecked(
        bytes32 indexed patientId,
        bytes32 indexed requesterId,
        string dataType,
        string purpose,
        bool allowed,
        string reason,
        uint256 timestamp
    );

    event AccessLogged(
        uint256 indexed logId,
        bytes32 indexed patientId,
        bytes32 indexed requesterId,
        string dataType,
        string purpose,
        string biometricStatus,
        string decision,
        bytes32 metadataHash,
        uint256 timestamp
    );

    modifier consentExists(uint256 consentId) {
        require(consents[consentId].id != 0, "Consent not found");
        _;
    }

    function grantAccess(
        bytes32 patientId,
        bytes32 requesterId,
        string calldata role,
        string calldata dataType,
        string calldata purpose,
        uint256 startTime,
        uint256 endTime,
        bytes32 recordHash,
        bytes32 metadataHash
    ) external returns (uint256 consentId) {
        require(patientId != bytes32(0), "Invalid patient ID");
        require(requesterId != bytes32(0), "Invalid requester ID");
        require(bytes(role).length > 0, "Role required");
        require(bytes(dataType).length > 0, "Data type required");
        require(bytes(purpose).length > 0, "Purpose required");
        require(startTime < endTime, "Invalid time range");
        require(endTime > block.timestamp, "End time must be in future");

        consentId = nextConsentId++;
        consents[consentId] = ConsentRecord({
            id: consentId,
            patientId: patientId,
            requesterId: requesterId,
            role: role,
            dataType: dataType,
            purpose: purpose,
            startTime: startTime,
            endTime: endTime,
            recordHash: recordHash,
            metadataHash: metadataHash,
            status: ConsentStatus.Active,
            limitationType: "",
            limitedValue: ""
        });

        emit ConsentGranted(
            consentId,
            patientId,
            requesterId,
            role,
            dataType,
            purpose,
            startTime,
            endTime,
            recordHash,
            metadataHash
        );
    }

    function limitAccess(
        uint256 consentId,
        string calldata limitationType,
        string calldata newValue
    ) external consentExists(consentId) {
        ConsentRecord storage consent = consents[consentId];
        require(
            consent.status == ConsentStatus.Active ||
                consent.status == ConsentStatus.Limited,
            "Consent not modifiable"
        );
        require(bytes(limitationType).length > 0, "Limitation type required");

        if (
            keccak256(bytes(limitationType)) ==
            keccak256(bytes("endTime"))
        ) {
            uint256 newEndTime = _parseUint(newValue);
            require(newEndTime > block.timestamp, "New end time must be future");
            require(newEndTime <= consent.endTime, "Cannot extend beyond original end");
            consent.endTime = newEndTime;
        } else if (
            keccak256(bytes(limitationType)) ==
            keccak256(bytes("dataType"))
        ) {
            consent.dataType = newValue;
        } else if (
            keccak256(bytes(limitationType)) ==
            keccak256(bytes("purpose"))
        ) {
            consent.purpose = newValue;
        } else {
            revert("Unknown limitation type");
        }

        consent.status = ConsentStatus.Limited;
        consent.limitationType = limitationType;
        consent.limitedValue = newValue;

        emit ConsentLimited(consentId, limitationType, newValue);
    }

    function revokeAccess(uint256 consentId) external consentExists(consentId) {
        ConsentRecord storage consent = consents[consentId];
        require(
            consent.status == ConsentStatus.Active ||
                consent.status == ConsentStatus.Limited,
            "Already revoked or expired"
        );

        consent.status = ConsentStatus.Revoked;
        emit ConsentRevoked(consentId, consent.patientId);
    }

    function checkConsent(
        bytes32 patientId,
        bytes32 requesterId,
        string calldata dataType,
        string calldata purpose,
        uint256 timestamp
    ) external returns (bool allowed, uint256 matchedConsentId, string memory reason) {
        allowed = false;
        matchedConsentId = 0;
        reason = "No active consent";

        for (uint256 i = 1; i < nextConsentId; i++) {
            ConsentRecord storage c = consents[i];
            if (c.id == 0) continue;
            if (c.patientId != patientId) continue;
            if (c.requesterId != requesterId) continue;

            if (c.status == ConsentStatus.Revoked) {
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    false,
                    "Consent revoked",
                    timestamp
                );
                return (false, i, "Consent revoked");
            }

            if (timestamp > c.endTime || timestamp < c.startTime) {
                if (c.status != ConsentStatus.Revoked) {
                    c.status = ConsentStatus.Expired;
                }
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    false,
                    "Consent expired",
                    timestamp
                );
                return (false, i, "Consent expired");
            }

            if (
                keccak256(bytes(c.dataType)) != keccak256(bytes(dataType))
            ) {
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    false,
                    "Data type mismatch",
                    timestamp
                );
                return (false, i, "Data type mismatch");
            }

            if (keccak256(bytes(c.purpose)) != keccak256(bytes(purpose))) {
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    false,
                    "Purpose mismatch",
                    timestamp
                );
                return (false, i, "Purpose mismatch");
            }

            if (
                c.status == ConsentStatus.Active ||
                c.status == ConsentStatus.Limited
            ) {
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    true,
                    "Consent valid",
                    timestamp
                );
                return (true, i, "Consent valid");
            }
        }

        emit ConsentChecked(
            patientId,
            requesterId,
            dataType,
            purpose,
            false,
            reason,
            timestamp
        );
    }

    function checkConsentWithRole(
        bytes32 patientId,
        bytes32 requesterId,
        string calldata role,
        string calldata dataType,
        string calldata purpose,
        uint256 timestamp
    ) external returns (bool allowed, uint256 matchedConsentId, string memory reason) {
        for (uint256 i = 1; i < nextConsentId; i++) {
            ConsentRecord storage c = consents[i];
            if (c.id == 0) continue;
            if (c.patientId != patientId) continue;
            if (c.requesterId != requesterId) continue;

            if (keccak256(bytes(c.role)) != keccak256(bytes(role))) {
                emit ConsentChecked(
                    patientId,
                    requesterId,
                    dataType,
                    purpose,
                    false,
                    "Role mismatch",
                    timestamp
                );
                return (false, i, "Role mismatch");
            }
        }

        (allowed, matchedConsentId, reason) = this.checkConsent(
            patientId,
            requesterId,
            dataType,
            purpose,
            timestamp
        );
    }

    function logAccess(
        bytes32 patientId,
        bytes32 requesterId,
        string calldata dataType,
        string calldata purpose,
        string calldata biometricStatus,
        string calldata decision,
        bytes32 metadataHash
    ) external returns (uint256 logId) {
        logId = nextAccessLogId++;
        emit AccessLogged(
            logId,
            patientId,
            requesterId,
            dataType,
            purpose,
            biometricStatus,
            decision,
            metadataHash,
            block.timestamp
        );
    }

    function getConsent(
        uint256 consentId
    ) external view returns (ConsentRecord memory) {
        require(consents[consentId].id != 0, "Consent not found");
        return consents[consentId];
    }

    function _parseUint(string calldata s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        require(b.length > 0, "Empty value");
        uint256 result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            require(c >= 48 && c <= 57, "Invalid number");
            result = result * 10 + (c - 48);
        }
        return result;
    }
}
