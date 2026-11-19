import { config } from '../config/index.js';

export interface DeviceStatus {
  connected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SERVICE_NOT_RUNNING' | 'DRIVER_NOT_WORKING' | 'DEVICE_NOT_DETECTED';
  deviceName: string;
  driverInstalled: boolean;
  serviceRunning: boolean;
  message: string;
  details?: any;
}

export class DeviceBridgeService {
  private serviceHost: string;

  constructor() {
    this.serviceHost = config.mfs100ServiceHost || 'http://127.0.0.1:8004';
  }

  /**
   * Probes the local Mantra MFS100 Client Service running on the Windows machine.
   * Standard MFS100 client service runs on http://127.0.0.1:8004 or http://127.0.0.1:8003
   */
  async checkDeviceStatus(): Promise<DeviceStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.serviceHost}/rd/info`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        return {
          connected: true,
          status: 'CONNECTED',
          deviceName: 'Mantra MFS100 Fingerprint Scanner',
          driverInstalled: true,
          serviceRunning: true,
          message: 'Scanner Connected and Ready for Biometric Capture',
          details: text,
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.cause?.code === 'ECONNREFUSED') {
        return {
          connected: false,
          status: 'SERVICE_NOT_RUNNING',
          deviceName: 'Mantra MFS100',
          driverInstalled: true,
          serviceRunning: false,
          message: 'MFS100 Client Service is not running on 127.0.0.1:8004. Open services.msc and restart MFS100 Client Service.',
        };
      }
    }

    return {
      connected: false,
      status: 'DRIVER_NOT_WORKING',
      deviceName: 'Mantra MFS100',
      driverInstalled: false,
      serviceRunning: false,
      message: 'Myntra MFS100 Driver installed but Not Working or Device Not Detected.',
    };
  }
}

export const deviceBridge = new DeviceBridgeService();
