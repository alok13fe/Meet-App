import mediasoupClient from 'mediasoup-client';

export interface IProducer {
  id: string;
  userId: string;
  kind: mediasoupClient.types.MediaKind;
  type: string;
}

export interface IConsumer {
  producerId: string;
  id: string;
  kind: mediasoupClient.types.MediaKind;
  rtpParameters: mediasoupClient.types.RtpParameters;
}

export interface ITransportCreated {
  params: {
    id: string;
    iceParameters: mediasoupClient.types.IceParameters;
    iceCandidates: mediasoupClient.types.IceCandidate[];
    dtlsParameters: mediasoupClient.types.DtlsParameters;
  }
}

export interface IJoinSuccess {
  users: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
  producers: IProducer[];
}

export interface IProducerAction {
  userId: string;
  type: 'audio' | 'video' | 'screen';
}