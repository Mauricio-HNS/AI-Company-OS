import type { BusinessFact } from './company-model';

export interface BridgeDevice {
  deviceId: string;
  companyId: string;
  bridgeVersion: string;
  platform: 'WINDOWS' | 'OTHER';
  lastSeenAt: string;
  status: 'ONLINE' | 'OFFLINE' | 'QUARANTINED';
}

export interface BridgeSyncEnvelope {
  protocolVersion: '1';
  device: BridgeDevice;
  sentAt: string;
  sequence: number;
  facts: BusinessFact[];
  sourceSummaries: Array<{
    connectorId: string;
    lastObservedAt?: string;
    factCount: number;
  }>;
}

export interface BridgeSyncReceipt {
  accepted: boolean;
  receivedAt: string;
  nextSequence: number;
  acceptedFactIds: string[];
  rejectedFactIds: string[];
  reason?: string;
}

export interface BridgeEnrollmentRequest {
  companyId: string;
  deviceName: string;
  bridgeVersion: string;
  platform: BridgeDevice['platform'];
}

export interface BridgeEnrollmentResult {
  deviceId: string;
  status: 'PENDING_AUTHORIZATION' | 'ACTIVE' | 'REJECTED';
  cloudEndpoint: string;
}
