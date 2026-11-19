"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceBridge = exports.DeviceBridgeService = void 0;
const index_js_1 = require("../config/index.js");
class DeviceBridgeService {
    serviceHost;
    constructor() {
        this.serviceHost = index_js_1.config.mfs100ServiceHost || 'http://127.0.0.1:8004';
    }
    /**
     * Probes the local Mantra MFS100 Client Service running on the Windows machine.
     * Standard MFS100 client service runs on http://127.0.0.1:8004 or http://127.0.0.1:8003
     */
    async checkDeviceStatus() {
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
        }
        catch (error) {
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
exports.DeviceBridgeService = DeviceBridgeService;
exports.deviceBridge = new DeviceBridgeService();
