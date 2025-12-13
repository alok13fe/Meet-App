import os from 'os';
import * as mediasoupTypes from 'mediasoup/types';

const PUBLIC_IP = process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1';

export const config = {
  lisenIp: '0.0.0.0',
  listenPort: 3016,

  mediasoup: {
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 11000,
      logLevel: 'debug',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
      ] as mediasoupTypes.WorkerLogTag[]
    },

    router:  {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
          preferredPayloadType: 111
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          preferredPayloadType: 96,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        }
      ] as mediasoupTypes.RtpCodecCapability[]
    },

    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: PUBLIC_IP
        },
      ] as mediasoupTypes.TransportListenInfo[],
      maxIncomeBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000
    }
  }
}