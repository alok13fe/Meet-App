import dotenv from 'dotenv';
dotenv.config();

import { WebSocket, WebSocketServer } from 'ws';
import { createWorker } from './lib/worker';
import { connectDB, User, IUser } from "@repo/db/main";
import * as mediasoupTypes from 'mediasoup/types';
import { createWebRTCTransport } from './lib/createWebRTCTransport';
import jwt from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';

interface PeerData {
  id: string;
  firstName: string;
  lastName: string;
  producerTransport: mediasoupTypes.Transport | null;
  consumerTransport: mediasoupTypes.Transport | null;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

let mediasoupRouter: mediasoupTypes.Router;

const rooms: Record<string, Set<WebSocket>> = {};
const peers = new Map<WebSocket, PeerData>();

async function authenticateUser(token: string): Promise<HydratedDocument<IUser> | null>{
  try {
    if(!process.env.JWT_TOKEN_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }
  
    const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
    if(typeof decoded === 'string'){
      return null;
    }
    if(!decoded || !decoded.id){
      return null;
    }

    /* Check if User Exists */
    const user: HydratedDocument<IUser> | null = await User.findById({
      _id: decoded.id
    }).select('firstName lastName');

    if(!user){
      return null;
    }

    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function getUsers(roomId: string, ws: WebSocket){
  if(!rooms[roomId]){
    return [];
  }

  const users = Array.from(rooms[roomId]).reduce((acc: any[], socket) => {
    if(socket === ws){
      return acc;
    }

    const peer = peers.get(socket);
    if(!peer){
      return acc;
    }

    acc.push({
      id: peer.id,
      firstName: peer.firstName,
      lastName: peer.lastName
    });
    return acc;
  },[]);

  return users;
}

function getProducer(producerId: string){
  for(const peer of peers.values()){
    if(peer.producers.has(producerId)){
      return peer.producers.get(producerId);
    }
  }
  return null;
}

function getAllProducers(roomId: string, ws: WebSocket){
  if(!rooms[roomId]){
    return;
  }

  const producers =  Array.from(rooms[roomId]).reduce((acc: any[], socket) => {
    if(socket === ws){
      return acc;
    }

    const peer = peers.get(socket);
    peer?.producers.forEach(producer => {
      acc.push({
        id: producer.id,
        userId: peer.id,
        kind: producer.kind,
        type: producer.appData.type
      });
    });
    return acc;
  },[]);

  return producers;
}

function broadcastMessage(roomId: string, message: object, excludeClient?: WebSocket): void{
  if(rooms[roomId]){
    rooms[roomId].forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
        client.send(JSON.stringify(message));
      }
    })
  }
}

function onJoinRoom(payload: any, user: HydratedDocument<IUser>, ws: WebSocket){
  try {
    const { roomId } = payload;
    
    if(!roomId || typeof(roomId) !== 'string'){
      ws.send(JSON.stringify({
        type: 'error',
        payload: {
          message: 'Room Id is required.'
        }
      }));
      return;
    }

    if(!rooms[roomId]){
      rooms[roomId] = new Set<WebSocket>();
    }

    if(!rooms[roomId].has(ws)){
      rooms[roomId].add(ws);
    }

    const users = getUsers(roomId, ws);
    const producers = getAllProducers(roomId, ws);
    ws.send(JSON.stringify({
      type: 'join-success',
      payload: {
        users,
        producers
      }
    }));

    const joinNotification = {
      type: 'user-joined',
      payload: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName
        },
        message: 'new user joined room'
      }
    }
    console.log(`User ${user.id} joined room:${roomId}.`);
    broadcastMessage(roomId, joinNotification, ws);
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message: 'Invalid Message Format'
      }
    }));
  }
}

function onLeaveRoom(payload: { roomId: string }, user: HydratedDocument<IUser>, ws: WebSocket){
  const { roomId } = payload;

  if(!roomId || typeof(roomId) !== 'string'){
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message: 'Room Id is required.'
      }
    }));
    return;
  }

  if(rooms[roomId] && rooms[roomId].has(ws)){
    rooms[roomId].delete(ws);
    if (rooms[roomId].size === 0) {
      delete rooms[roomId];
    }

    const peer = peers.get(ws);
    if(peer){
      /* Closing Producers */
      peer.producers.forEach(producer => {
        producer.close();
      });

      /* Closing Consumers */
      peer.consumers.forEach(consumer => {
        consumer.close();
      });
      
      /* Closing Transports */
      peer.producerTransport?.close();
      peer.consumerTransport?.close();

      peer.producerTransport = null;
      peer.consumerTransport = null;
      peer.producers = new Map();
      peer.consumers = new Map();
    }

    if(rooms[roomId]){
      const leaveNotification = {
        type: 'user-left',
        payload: {
          user: {
            id: user.id,
          },
          message: 'user left the room'
        }
      }
      console.log(`User ${user.id} left room:${roomId}.`);
      broadcastMessage(roomId, leaveNotification, ws);
    } 
  }
}

async function onCreateProducerTransport(ws: WebSocket){
  try {
    const { transport, params } = await createWebRTCTransport(mediasoupRouter);

    peers.get(ws)!.producerTransport = transport;
    ws.send(JSON.stringify({
      type: 'producerTransportCreated',
      payload: {
        params: params
      }
    }));
  } catch (error) {
    console.log(error);
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message: 'Failed to create producer transport'
      }
    }));
  }
}

async function onConnectProducerTransport(payload: any, ws: WebSocket) {
  const peer = peers.get(ws);
  if(!peer || !peer.producerTransport){
    return;
  } 

  await peer.producerTransport.connect({dtlsParameters: payload.dtlsParameters});

  ws.send(JSON.stringify({
    type: 'producerConnected',
    payload: {
      message: 'Producer connected successfully!'
    }
  }));
}

async function onProduce(payload: any, ws: WebSocket) {
  const peer = peers.get(ws);
  if(!peer || !peer.producerTransport){
    return;
  } 

  const { kind, rtpParameters, appData } = payload;
  const producer = await peer.producerTransport.produce({
    kind,
    rtpParameters,
    appData: {
      ...appData,
      userId: peer.id
    }
  });
  
  peer.producers.set(producer.id, producer);

  ws.send(JSON.stringify({
    type: 'produced',
    payload: {
      id: producer.id
    }
  }));

  const newProducerMessage = {
    type: 'newProducer', 
    payload: {
      id: producer.id,
      userId: peer.id,
      kind,
      type: appData.type
    }
  }
  broadcastMessage(appData.roomId, newProducerMessage, ws);
}

async function onCreateConsumerTransport(ws: WebSocket){
  try {
    const { transport, params } = await createWebRTCTransport(mediasoupRouter);

    peers.get(ws)!.consumerTransport = transport;
    ws.send(JSON.stringify({
      type: 'subTransportCreated',
      payload: {
        params
      }
    }));
  } catch (error) {
    console.log(error);
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message: 'Failed to Create ConsumerTransport'
      }
    }));
  }
}

async function onConnectConsumerTransport(payload: any, ws: WebSocket) {
  const peer = peers.get(ws);
  if(!peer || !peer.consumerTransport){
    return;
  } 

  await peer.consumerTransport.connect({dtlsParameters: payload.dtlsParameters});

  ws.send(JSON.stringify({
    type: 'subConnected',
    payload: {
      message: 'Consumer connected successfully!'
    }
  }));
}

async function onConsume(payload: any, ws: WebSocket){
  const { producerId, rtpCapabilities } = payload;

  const producer = getProducer(producerId);
  if(!producer){
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message: 'Producer not found'
      }
    }))
    return;
  }

  const consumer = await createConsumer(ws, producer, rtpCapabilities);

  ws.send(JSON.stringify({
    type: 'subscribed',
    payload: {
      consumer
    }
  }));
}

async function onResume(payload: any, ws: WebSocket){
  const peer = peers.get(ws);
  if(!peer){
    return;
  }
  
  const consumer  = peer.consumers.get(payload.id);
  if(!consumer){
    return;
  }

  await consumer.resume();
  
  ws.send(JSON.stringify({
    type: 'resumed',
    payload: {
      message: 'Resumed'
    }
  }));
}

async function createConsumer(ws: WebSocket, producer: mediasoupTypes.Producer, rtpCapabilities: mediasoupTypes.RtpCapabilities){
  if(!mediasoupRouter.canConsume({
    producerId: producer.id,
    rtpCapabilities
  })){
    console.error('Cannot consume');
    return;
  }
  
  const peer = peers.get(ws);
  if(!peer || !peer.consumerTransport){
    return;
  }

  let consumer;

  try {
    consumer = await peer.consumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: producer.kind === 'video'
    });

    peer.consumers.set(consumer.id, consumer);    
  } catch (error) {
    console.error('consumer failed!', error);
    return;
  }

  return {
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters
  }
}

async function onProducerPaused(payload: any, user: HydratedDocument<IUser>, ws: WebSocket){
  const { roomId, type } = payload;

  if(rooms[roomId] && rooms[roomId].has(ws)){
    const peer = peers.get(ws);
    if(peer){
      peer.producers?.forEach(producer => {
        if(producer.appData.type === type){
          producer.pause();
        }
      });
    }

    const producerPausedNotification = {
      type: 'producerPaused',
      payload: {
        userId: user.id,
        type
      }
    }
    broadcastMessage(roomId, producerPausedNotification, ws);
  }
}

async function onProducerResumed(payload: any, user: HydratedDocument<IUser>, ws: WebSocket){
  const { roomId, type } = payload;

  if(rooms[roomId] && rooms[roomId].has(ws)){
    const peer = peers.get(ws);
    if(peer){
      peer.producers?.forEach(producer => {
        if(producer.appData.type === type){
          producer.resume();
        }
      });
    }

    const producerPausedNotification = {
      type: 'producerResumed',
      payload: {
        userId: user.id,
        type
      }
    }
    broadcastMessage(roomId, producerPausedNotification, ws);
  }
}

async function onProducerClosed(payload: any, user: HydratedDocument<IUser>, ws: WebSocket) {
  const { roomId, type } = payload;

  if(rooms[roomId] && rooms[roomId].has(ws)){
    const peer = peers.get(ws);
    if(peer){
      peer.producers?.forEach(producer => {
        if(producer.appData.type === type){
          producer.close();
          peer.producers.delete(producer.id);
        }
      });
    }

    const producerClosedNotification = {
      type: 'producerClosed',
      payload: {
        userId: user.id,
        type
      }
    }
    broadcastMessage(roomId, producerClosedNotification, ws);
  }
}

async function startServer(){
  /* Connecting to Database */
  await connectDB();

  /* Creating Mediasoup Router */
  try {
    mediasoupRouter = await createWorker();
  } catch (error) {
    console.log('Failed to create mediasoup router:', error);
    process.exit(1);
  }

  /* Creating WebSocket Server */
  const wss = new WebSocketServer({ port: 8080 });

  wss.on('connection', async function connection(ws, req){
    const token = req.url?.split('token=')[1];
    if(!token){
      ws.close(1008, 'Authentication Token Required');
      return;
    }
    
    const user = await authenticateUser(token);
    if(!user){
      ws.close(1008, 'Invalid ');
      return;
    }
  
    if(!peers.has(ws)){
      peers.set(ws, {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        producerTransport: null,
        consumerTransport: null,
        producers: new Map(),
        consumers: new Map()
      });
    }
  
    ws.on('message', (data, isBinary) => {
      /* Input Validation */
      const message = isBinary ? data : data.toString();
      if(typeof message !== 'string'){
        return;
      }
  
      let parsedData, type, payload;
      try {
        parsedData = JSON.parse(message);
        type = parsedData.type;
        payload = parsedData.payload;
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }
  
      switch(type) {
        case 'join-room':
          onJoinRoom(payload, user, ws);
          break;
        case 'leave-room':
          onLeaveRoom(parsedData.payload, user, ws);
          break;
        case 'chat':
          broadcastMessage(parsedData.payload.roomId, {
            type: 'chat',
            payload: {
              ...parsedData.payload,
              firstName: user.firstName,
              lastName: user.lastName
            }
          }, ws);
          break;
        case 'getRouterRtpCapabilities':
          ws.send(JSON.stringify({
            type: 'routerCapabilities',
            payload: {
              rtpCapabilities: mediasoupRouter.rtpCapabilities
            }
          }));
          break;
        case 'createProducerTransport':
          onCreateProducerTransport(ws);
          break;
        case 'connectProducerTransport':
          onConnectProducerTransport(payload, ws);  
          break;
        case 'produce':
          onProduce(payload, ws);
          break;
        case 'createConsumerTransport':
          onCreateConsumerTransport(ws);
          break;
        case 'connectConsumerTransport':
          onConnectConsumerTransport(payload, ws);
          break;
        case 'consume':
          onConsume(payload, ws);
          break;
        case 'resume':
          onResume(payload, ws);
          break;
        case 'producerPaused':
          onProducerPaused(payload, user, ws);
          break;
        case 'producerResumed':
          onProducerResumed(payload, user, ws);
          break;
        case 'producerClosed':
          onProducerClosed(payload, user, ws);
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
      for (const roomId in rooms) {
        if (rooms[roomId]?.has(ws)) {
          onLeaveRoom({ roomId }, user, ws);
        }
      }
    });
  });
}

startServer();